"use strict";

// frontend/model/contracts/group.js
import {
  sbp,
  Vue,
  arrayOf,
  mapOf,
  objectOf,
  objectMaybeOf,
  optional,
  string,
  number,
  boolean,
  object,
  unionOf,
  tupleOf,
  votingRules,
  ruleType,
  VOTE_FOR,
  VOTE_AGAINST,
  RULE_PERCENTAGE,
  RULE_DISAGREEMENT,
  proposals,
  proposalType,
  proposalSettingsType,
  archiveProposal,
  PROPOSAL_INVITE_MEMBER,
  PROPOSAL_REMOVE_MEMBER,
  PROPOSAL_GROUP_SETTING_CHANGE,
  PROPOSAL_PROPOSAL_SETTING_CHANGE,
  PROPOSAL_GENERIC,
  STATUS_OPEN,
  STATUS_CANCELLED,
  paymentStatusType,
  paymentType,
  PAYMENT_COMPLETED,
  Errors,
  merge,
  deepEqualJSONType,
  omit,
  addTimeToDate,
  dateToPeriodStamp,
  dateFromPeriodStamp,
  isPeriodStamp,
  comparePeriodStamps,
  periodStampGivenDate,
  dateIsWithinPeriod,
  DAYS_MILLIS,
  vueFetchInitKV,
  unadjustedDistribution,
  adjustedDistribution,
  currencies,
  saferFloat,
  L,
  inviteType,
  chatRoomAttributesType,
  INVITE_INITIAL_CREATOR,
  INVITE_STATUS,
  PROFILE_STATUS,
  INVITE_EXPIRES_IN_DAYS,
  ChelErrorDBBadPreviousHEAD
} from "/assets/js/common.js";
function initGroupProfile(contractID, joinedDate) {
  return {
    globalUsername: "",
    contractID,
    joinedDate,
    nonMonetaryContributions: [],
    status: PROFILE_STATUS.ACTIVE,
    departedDate: null
  };
}
function initPaymentPeriod({ getters }) {
  return {
    initialCurrency: getters.groupMincomeCurrency,
    mincomeExchangeRate: 1,
    paymentsFrom: {},
    lastAdjustedDistribution: null,
    haveNeedsSnapshot: null
  };
}
function clearOldPayments({ state, getters }) {
  const sortedPeriodKeys = Object.keys(state.paymentsByPeriod).sort();
  while (sortedPeriodKeys.length > 2) {
    const period = sortedPeriodKeys.shift();
    for (const paymentHash of getters.paymentHashesForPeriod(period)) {
      Vue.delete(state.payments, paymentHash);
    }
    Vue.delete(state.paymentsByPeriod, period);
  }
}
function initFetchPeriodPayments({ meta, state, getters }) {
  const period = getters.periodStampGivenDate(meta.createdDate);
  const periodPayments = vueFetchInitKV(state.paymentsByPeriod, period, initPaymentPeriod({ getters }));
  clearOldPayments({ state, getters });
  return periodPayments;
}
function updateCurrentDistribution({ meta, state, getters }) {
  const curPeriodPayments = initFetchPeriodPayments({ meta, state, getters });
  const period = getters.periodStampGivenDate(meta.createdDate);
  const noPayments = Object.keys(curPeriodPayments.paymentsFrom).length === 0;
  if (comparePeriodStamps(period, getters.groupSettings.distributionDate) > 0) {
    getters.groupSettings.distributionDate = period;
  }
  if (noPayments || !curPeriodPayments.haveNeedsSnapshot) {
    curPeriodPayments.haveNeedsSnapshot = getters.haveNeedsForThisPeriod(period);
  }
  if (!noPayments) {
    updateAdjustedDistribution({ period, getters });
  }
}
function updateAdjustedDistribution({ period, getters }) {
  const payments = getters.groupPeriodPayments[period];
  if (payments && payments.haveNeedsSnapshot) {
    const minimize = getters.groupSettings.minimizeDistribution;
    payments.lastAdjustedDistribution = adjustedDistribution({
      distribution: unadjustedDistribution({ haveNeeds: payments.haveNeedsSnapshot, minimize }),
      payments: getters.paymentsForPeriod(period),
      dueOn: getters.dueDateForPeriod(period)
    });
  }
}
function memberLeaves(state, username, dateLeft) {
  state.profiles[username].status = PROFILE_STATUS.REMOVED;
  state.profiles[username].departedDate = dateLeft;
}
sbp("chelonia/defineContract", {
  name: "gi.contracts/group",
  metadata: {
    validate: objectOf({
      createdDate: string,
      username: string,
      identityContractID: string
    }),
    create() {
      const { username, identityContractID } = sbp("state/vuex/state").loggedIn;
      return {
        createdDate: new Date().toISOString(),
        username,
        identityContractID
      };
    }
  },
  getters: {
    currentGroupState(state) {
      return state;
    },
    groupSettings(state, getters) {
      return getters.currentGroupState.settings || {};
    },
    groupProfile(state, getters) {
      return (username) => {
        const profiles = getters.currentGroupState.profiles;
        return profiles && profiles[username];
      };
    },
    groupProfiles(state, getters) {
      const profiles = {};
      for (const username in getters.currentGroupState.profiles || {}) {
        const profile = getters.groupProfile(username);
        if (profile.status === PROFILE_STATUS.ACTIVE) {
          profiles[username] = profile;
        }
      }
      return profiles;
    },
    groupMincomeAmount(state, getters) {
      return getters.groupSettings.mincomeAmount;
    },
    groupMincomeCurrency(state, getters) {
      return getters.groupSettings.mincomeCurrency;
    },
    periodStampGivenDate(state, getters) {
      return (recentDate) => {
        if (typeof recentDate !== "string") {
          recentDate = recentDate.toISOString();
        }
        const { distributionDate, distributionPeriodLength } = getters.groupSettings;
        return periodStampGivenDate({
          recentDate,
          periodStart: distributionDate,
          periodLength: distributionPeriodLength
        });
      };
    },
    periodBeforePeriod(state, getters) {
      return (periodStamp) => {
        const len = getters.groupSettings.distributionPeriodLength;
        return dateToPeriodStamp(addTimeToDate(dateFromPeriodStamp(periodStamp), -len));
      };
    },
    periodAfterPeriod(state, getters) {
      return (periodStamp) => {
        const len = getters.groupSettings.distributionPeriodLength;
        return dateToPeriodStamp(addTimeToDate(dateFromPeriodStamp(periodStamp), len));
      };
    },
    dueDateForPeriod(state, getters) {
      return (periodStamp) => {
        return dateToPeriodStamp(addTimeToDate(dateFromPeriodStamp(getters.periodAfterPeriod(periodStamp)), -DAYS_MILLIS));
      };
    },
    paymentTotalFromUserToUser(state, getters) {
      return (fromUser, toUser, periodStamp) => {
        const payments = getters.currentGroupState.payments;
        const periodPayments = getters.groupPeriodPayments;
        const { paymentsFrom, mincomeExchangeRate } = periodPayments[periodStamp] || {};
        const total = (((paymentsFrom || {})[fromUser] || {})[toUser] || []).reduce((a, hash) => {
          const payment = payments[hash];
          let { amount, exchangeRate, status } = payment.data;
          if (status !== PAYMENT_COMPLETED) {
            return a;
          }
          const paymentCreatedPeriodStamp = getters.periodStampGivenDate(payment.meta.createdDate);
          if (periodStamp !== paymentCreatedPeriodStamp) {
            if (paymentCreatedPeriodStamp !== getters.periodBeforePeriod(periodStamp)) {
              console.warn(`paymentTotalFromUserToUser: super old payment shouldn't exist, ignoring! (curPeriod=${periodStamp})`, JSON.stringify(payment));
              return a;
            }
            exchangeRate *= periodPayments[paymentCreatedPeriodStamp].mincomeExchangeRate;
          }
          return a + amount * exchangeRate * mincomeExchangeRate;
        }, 0);
        return saferFloat(total);
      };
    },
    paymentHashesForPeriod(state, getters) {
      return (periodStamp) => {
        const periodPayments = getters.groupPeriodPayments[periodStamp];
        if (periodPayments) {
          let hashes = [];
          const { paymentsFrom } = periodPayments;
          for (const fromUser in paymentsFrom) {
            for (const toUser in paymentsFrom[fromUser]) {
              hashes = hashes.concat(paymentsFrom[fromUser][toUser]);
            }
          }
          return hashes;
        }
      };
    },
    groupMembersByUsername(state, getters) {
      return Object.keys(getters.groupProfiles);
    },
    groupMembersCount(state, getters) {
      return getters.groupMembersByUsername.length;
    },
    groupMembersPending(state, getters) {
      const invites = getters.currentGroupState.invites;
      const pendingMembers = {};
      for (const inviteId in invites) {
        const invite = invites[inviteId];
        if (invite.status === INVITE_STATUS.VALID && invite.creator !== INVITE_INITIAL_CREATOR) {
          pendingMembers[invites[inviteId].invitee] = {
            invitedBy: invites[inviteId].creator
          };
        }
      }
      return pendingMembers;
    },
    groupShouldPropose(state, getters) {
      return getters.groupMembersCount >= 3;
    },
    groupProposalSettings(state, getters) {
      return (proposalType2 = PROPOSAL_GENERIC) => {
        return getters.groupSettings.proposals[proposalType2];
      };
    },
    groupCurrency(state, getters) {
      const mincomeCurrency = getters.groupMincomeCurrency;
      return mincomeCurrency && currencies[mincomeCurrency];
    },
    groupMincomeFormatted(state, getters) {
      return getters.withGroupCurrency?.(getters.groupMincomeAmount);
    },
    groupMincomeSymbolWithCode(state, getters) {
      return getters.groupCurrency?.symbolWithCode;
    },
    groupPeriodPayments(state, getters) {
      return getters.currentGroupState.paymentsByPeriod || {};
    },
    withGroupCurrency(state, getters) {
      return getters.groupCurrency?.displayWithCurrency;
    },
    getChatRooms(state, getters) {
      return getters.currentGroupState.chatRooms;
    },
    generalChatRoomId(state, getters) {
      return getters.currentGroupState.generalChatRoomId;
    },
    haveNeedsForThisPeriod(state, getters) {
      return (currentPeriod) => {
        const groupProfiles = getters.groupProfiles;
        const haveNeeds = [];
        for (const username in groupProfiles) {
          const { incomeDetailsType, joinedDate } = groupProfiles[username];
          if (incomeDetailsType) {
            const amount = groupProfiles[username][incomeDetailsType];
            const haveNeed = incomeDetailsType === "incomeAmount" ? amount - getters.groupMincomeAmount : amount;
            let when = dateFromPeriodStamp(currentPeriod).toISOString();
            if (dateIsWithinPeriod({
              date: joinedDate,
              periodStart: currentPeriod,
              periodLength: getters.groupSettings.distributionPeriodLength
            })) {
              when = joinedDate;
            }
            haveNeeds.push({ name: username, haveNeed, when });
          }
        }
        return haveNeeds;
      };
    },
    paymentsForPeriod(state, getters) {
      return (periodStamp) => {
        const hashes = getters.paymentHashesForPeriod(periodStamp);
        const events = [];
        if (hashes && hashes.length > 0) {
          const payments = getters.currentGroupState.payments;
          for (const paymentHash of hashes) {
            const payment = payments[paymentHash];
            if (payment.data.status === PAYMENT_COMPLETED) {
              events.push({
                from: payment.meta.username,
                to: payment.data.toUser,
                hash: paymentHash,
                amount: payment.data.amount,
                isLate: !!payment.data.isLate,
                when: payment.data.completedDate
              });
            }
          }
        }
        return events;
      };
    }
  },
  actions: {
    "gi.contracts/group": {
      validate: objectMaybeOf({
        invites: mapOf(string, inviteType),
        settings: objectMaybeOf({
          groupName: string,
          groupPicture: string,
          sharedValues: string,
          mincomeAmount: number,
          mincomeCurrency: string,
          distributionDate: isPeriodStamp,
          distributionPeriodLength: number,
          minimizeDistribution: boolean,
          proposals: objectOf({
            [PROPOSAL_INVITE_MEMBER]: proposalSettingsType,
            [PROPOSAL_REMOVE_MEMBER]: proposalSettingsType,
            [PROPOSAL_GROUP_SETTING_CHANGE]: proposalSettingsType,
            [PROPOSAL_PROPOSAL_SETTING_CHANGE]: proposalSettingsType,
            [PROPOSAL_GENERIC]: proposalSettingsType
          })
        })
      }),
      process({ data, meta }, { state, getters }) {
        const initialState = merge({
          payments: {},
          paymentsByPeriod: {},
          invites: {},
          proposals: {},
          settings: {
            groupCreator: meta.username,
            distributionPeriodLength: 30 * DAYS_MILLIS,
            inviteExpiryProposal: INVITE_EXPIRES_IN_DAYS.PROPOSAL
          },
          profiles: {
            [meta.username]: initGroupProfile(meta.identityContractID, meta.createdDate)
          },
          chatRooms: {}
        }, data);
        for (const key in initialState) {
          Vue.set(state, key, initialState[key]);
        }
        initFetchPeriodPayments({ meta, state, getters });
      }
    },
    "gi.contracts/group/payment": {
      validate: objectMaybeOf({
        toUser: string,
        amount: number,
        currencyFromTo: tupleOf(string, string),
        exchangeRate: number,
        txid: string,
        status: paymentStatusType,
        paymentType,
        details: optional(object),
        memo: optional(string)
      }),
      process({ data, meta, hash }, { state, getters }) {
        if (data.status === PAYMENT_COMPLETED) {
          console.error(`payment: payment ${hash} cannot have status = 'completed'!`, { data, meta, hash });
          throw new Errors.GIErrorIgnoreAndBan("payments cannot be instantly completed!");
        }
        Vue.set(state.payments, hash, {
          data: {
            ...data,
            groupMincome: getters.groupMincomeAmount
          },
          meta,
          history: [[meta.createdDate, hash]]
        });
        const { paymentsFrom } = initFetchPeriodPayments({ meta, state, getters });
        const fromUser = vueFetchInitKV(paymentsFrom, meta.username, {});
        const toUser = vueFetchInitKV(fromUser, data.toUser, []);
        toUser.push(hash);
      }
    },
    "gi.contracts/group/paymentUpdate": {
      validate: objectMaybeOf({
        paymentHash: string,
        updatedProperties: objectMaybeOf({
          status: paymentStatusType,
          details: object,
          memo: string
        })
      }),
      process({ data, meta, hash }, { state, getters }) {
        const payment = state.payments[data.paymentHash];
        if (!payment) {
          console.error(`paymentUpdate: no payment ${data.paymentHash}`, { data, meta, hash });
          throw new Errors.GIErrorIgnoreAndBan("paymentUpdate without existing payment");
        }
        if (meta.username !== payment.meta.username && meta.username !== payment.data.toUser) {
          console.error(`paymentUpdate: bad username ${meta.username} != ${payment.meta.username} != ${payment.data.username}`, { data, meta, hash });
          throw new Errors.GIErrorIgnoreAndBan("paymentUpdate from bad user!");
        }
        payment.history.push([meta.createdDate, hash]);
        merge(payment.data, data.updatedProperties);
        if (data.updatedProperties.status === PAYMENT_COMPLETED) {
          payment.data.completedDate = meta.createdDate;
          const updatePeriodStamp = getters.periodStampGivenDate(meta.createdDate);
          const paymentPeriodStamp = getters.periodStampGivenDate(payment.meta.createdDate);
          if (comparePeriodStamps(updatePeriodStamp, paymentPeriodStamp) > 0) {
            updateAdjustedDistribution({ period: paymentPeriodStamp, getters });
          } else {
            updateCurrentDistribution({ meta, state, getters });
          }
        }
      }
    },
    "gi.contracts/group/proposal": {
      validate: (data, { state, meta }) => {
        objectOf({
          proposalType,
          proposalData: object,
          votingRule: ruleType,
          expires_date_ms: number
        })(data);
        const dataToCompare = omit(data.proposalData, ["reason"]);
        for (const hash in state.proposals) {
          const prop = state.proposals[hash];
          if (prop.status !== STATUS_OPEN || prop.data.proposalType !== data.proposalType) {
            continue;
          }
          if (deepEqualJSONType(omit(prop.data.proposalData, ["reason"]), dataToCompare)) {
            throw new TypeError(L("There is an identical open proposal."));
          }
        }
      },
      process({ data, meta, hash }, { state }) {
        Vue.set(state.proposals, hash, {
          data,
          meta,
          votes: { [meta.username]: VOTE_FOR },
          status: STATUS_OPEN,
          payload: null
        });
      }
    },
    "gi.contracts/group/proposalVote": {
      validate: objectOf({
        proposalHash: string,
        vote: string,
        passPayload: optional(unionOf(object, string))
      }),
      process(message, { state }) {
        const { data, hash, meta } = message;
        const proposal = state.proposals[data.proposalHash];
        if (!proposal) {
          console.error(`proposalVote: no proposal for ${data.proposalHash}!`, { data, meta, hash });
          throw new Errors.GIErrorIgnoreAndBan("proposalVote without existing proposal");
        }
        Vue.set(proposal.votes, meta.username, data.vote);
        if (new Date(meta.createdDate).getTime() > proposal.data.expires_date_ms) {
          console.warn("proposalVote: vote on expired proposal!", { proposal, data, meta });
          return;
        }
        const result = votingRules[proposal.data.votingRule](state, proposal.data.proposalType, proposal.votes);
        if (result === VOTE_FOR || result === VOTE_AGAINST) {
          proposals[proposal.data.proposalType][result](state, message);
        }
      }
    },
    "gi.contracts/group/proposalCancel": {
      validate: objectOf({
        proposalHash: string
      }),
      process({ data, meta }, { state }) {
        const proposal = state.proposals[data.proposalHash];
        if (!proposal) {
          console.error(`proposalCancel: no proposal for ${data.proposalHash}!`, { data, meta });
          throw new Errors.GIErrorIgnoreAndBan("proposalVote without existing proposal");
        } else if (proposal.meta.username !== meta.username) {
          console.error(`proposalCancel: proposal ${data.proposalHash} belongs to ${proposal.meta.username} not ${meta.username}!`, { data, meta });
          throw new Errors.GIErrorIgnoreAndBan("proposalWithdraw for wrong user!");
        }
        Vue.set(proposal, "status", STATUS_CANCELLED);
        archiveProposal(state, data.proposalHash);
      }
    },
    "gi.contracts/group/removeMember": {
      validate: (data, { state, getters, meta }) => {
        objectOf({
          member: string,
          reason: optional(string),
          proposalHash: optional(string),
          proposalPayload: optional(objectOf({
            secret: string
          }))
        })(data);
        const memberToRemove = data.member;
        const membersCount = getters.groupMembersCount;
        if (!state.profiles[memberToRemove]) {
          throw new TypeError(L("Not part of the group."));
        }
        if (membersCount === 1 || memberToRemove === meta.username) {
          throw new TypeError(L("Cannot remove yourself."));
        }
        if (membersCount < 3) {
          if (meta.username !== state.settings.groupCreator) {
            throw new TypeError(L("Only the group creator can remove members."));
          }
        } else {
          const proposal = state.proposals[data.proposalHash];
          if (!proposal) {
            throw new TypeError(L("Admin credentials needed and not implemented yet."));
          }
          if (!proposal.payload || proposal.payload.secret !== data.proposalPayload.secret) {
            throw new TypeError(L("Invalid associated proposal."));
          }
        }
      },
      process({ data, meta }, { state }) {
        memberLeaves(state, data.member, meta.createdDate);
      },
      sideEffect({ data, meta, contractID }, { state, getters }) {
        const rootState = sbp("state/vuex/state");
        const contracts = rootState.contracts || {};
        const { username } = rootState.loggedIn;
        if (data.member === username) {
          if (sbp("okTurtles.data/get", "JOINING_GROUP")) {
            return;
          }
          const groupIdToSwitch = Object.keys(contracts).find((cID) => contracts[cID].type === "gi.contracts/group" && cID !== contractID && rootState[cID].settings) || null;
          sbp("state/vuex/commit", "setCurrentChatRoomId", {});
          sbp("state/vuex/commit", "setCurrentGroupId", groupIdToSwitch);
          sbp("chelonia/contract/remove", contractID).catch((e) => {
            console.error(`sideEffect(removeMember): ${e.name} thrown by /remove ${contractID}:`, e);
          });
          sbp("okTurtles.eventQueue/queueEvent", contractID, ["gi.actions/identity/saveOurLoginState"]).then(function() {
            const router = sbp("controller/router");
            const switchFrom = router.currentRoute.path;
            const switchTo = groupIdToSwitch ? "/dashboard" : "/";
            if (switchFrom !== "/join" && switchFrom !== switchTo) {
              router.push({ path: switchTo }).catch(console.warn);
            }
          }).catch((e) => {
            console.error(`sideEffect(removeMember): ${e.name} thrown during queueEvent to ${contractID} by saveOurLoginState:`, e);
          });
        } else {
        }
      }
    },
    "gi.contracts/group/removeOurselves": {
      validate: objectMaybeOf({
        reason: string
      }),
      process({ data, meta, contractID }, { state }) {
        memberLeaves(state, meta.username, meta.createdDate);
        sbp("gi.contracts/group/pushSideEffect", contractID, ["gi.contracts/group/removeMember/sideEffect", {
          meta,
          data: { member: meta.username, reason: data.reason || "" },
          contractID
        }]);
      }
    },
    "gi.contracts/group/invite": {
      validate: inviteType,
      process({ data, meta }, { state }) {
        Vue.set(state.invites, data.inviteSecret, data);
      }
    },
    "gi.contracts/group/inviteAccept": {
      validate: objectOf({
        inviteSecret: string
      }),
      process({ data, meta }, { state }) {
        console.debug("inviteAccept:", data, state.invites);
        const invite = state.invites[data.inviteSecret];
        if (invite.status !== INVITE_STATUS.VALID) {
          console.error(`inviteAccept: invite for ${meta.username} is: ${invite.status}`);
          return;
        }
        Vue.set(invite.responses, meta.username, true);
        if (Object.keys(invite.responses).length === invite.quantity) {
          invite.status = INVITE_STATUS.USED;
        }
        Vue.set(state.profiles, meta.username, initGroupProfile(meta.identityContractID, meta.createdDate));
      },
      async sideEffect({ meta }, { state }) {
        const rootState = sbp("state/vuex/state");
        if (meta.username === rootState.loggedIn.username) {
          for (const name in state.profiles) {
            if (name !== rootState.loggedIn.username) {
              await sbp("chelonia/contract/sync", state.profiles[name].contractID);
            }
          }
        } else {
          await sbp("chelonia/contract/sync", meta.identityContractID);
        }
      }
    },
    "gi.contracts/group/inviteRevoke": {
      validate: (data, { state, meta }) => {
        objectOf({
          inviteSecret: string
        })(data);
        if (!state.invites[data.inviteSecret]) {
          throw new TypeError(L("The link does not exist."));
        }
      },
      process({ data, meta }, { state }) {
        const invite = state.invites[data.inviteSecret];
        Vue.set(invite, "status", INVITE_STATUS.REVOKED);
      }
    },
    "gi.contracts/group/updateSettings": {
      validate: objectMaybeOf({
        groupName: (x) => typeof x === "string",
        groupPicture: (x) => typeof x === "string",
        sharedValues: (x) => typeof x === "string",
        mincomeAmount: (x) => typeof x === "number" && x > 0,
        mincomeCurrency: (x) => typeof x === "string"
      }),
      process({ meta, data }, { state }) {
        for (const key in data) {
          Vue.set(state.settings, key, data[key]);
        }
      }
    },
    "gi.contracts/group/groupProfileUpdate": {
      validate: objectMaybeOf({
        incomeDetailsType: (x) => ["incomeAmount", "pledgeAmount"].includes(x),
        incomeAmount: (x) => typeof x === "number" && x >= 0,
        pledgeAmount: (x) => typeof x === "number" && x >= 0,
        nonMonetaryAdd: string,
        nonMonetaryEdit: objectOf({
          replace: string,
          with: string
        }),
        nonMonetaryRemove: string,
        paymentMethods: arrayOf(objectOf({
          name: string,
          value: string
        }))
      }),
      process({ data, meta }, { state, getters }) {
        const groupProfile = state.profiles[meta.username];
        const nonMonetary = groupProfile.nonMonetaryContributions;
        for (const key in data) {
          const value = data[key];
          switch (key) {
            case "nonMonetaryAdd":
              nonMonetary.push(value);
              break;
            case "nonMonetaryRemove":
              nonMonetary.splice(nonMonetary.indexOf(value), 1);
              break;
            case "nonMonetaryEdit":
              nonMonetary.splice(nonMonetary.indexOf(value.replace), 1, value.with);
              break;
            default:
              Vue.set(groupProfile, key, value);
          }
        }
        if (data.incomeDetailsType) {
          updateCurrentDistribution({ meta, state, getters });
        }
      }
    },
    "gi.contracts/group/updateAllVotingRules": {
      validate: objectMaybeOf({
        ruleName: (x) => [RULE_PERCENTAGE, RULE_DISAGREEMENT].includes(x),
        ruleThreshold: number,
        expires_ms: number
      }),
      process({ data, meta }, { state }) {
        if (data.ruleName && data.ruleThreshold) {
          for (const proposalSettings in state.settings.proposals) {
            Vue.set(state.settings.proposals[proposalSettings], "rule", data.ruleName);
            Vue.set(state.settings.proposals[proposalSettings].ruleSettings[data.ruleName], "threshold", data.ruleThreshold);
          }
        }
      }
    },
    "gi.contracts/group/addChatRoom": {
      validate: objectOf({
        chatRoomID: string,
        attributes: chatRoomAttributesType
      }),
      process({ data, meta }, { state }) {
        const { name, type, privacyLevel } = data.attributes;
        Vue.set(state.chatRooms, data.chatRoomID, {
          creator: meta.username,
          name,
          type,
          privacyLevel,
          deletedDate: null,
          users: []
        });
        if (!state.generalChatRoomId) {
          Vue.set(state, "generalChatRoomId", data.chatRoomID);
        }
      }
    },
    "gi.contracts/group/deleteChatRoom": {
      validate: (data, { getters, meta }) => {
        objectOf({ chatRoomID: string })(data);
        if (getters.getChatRooms[data.chatRoomID].creator !== meta.username) {
          throw new TypeError(L("Only the channel creator can delete channel."));
        }
      },
      process({ data, meta }, { state }) {
        Vue.delete(state.chatRooms[data.chatRoomID]);
      }
    },
    "gi.contracts/group/leaveChatRoom": {
      validate: objectOf({
        chatRoomID: string,
        member: string,
        leavingGroup: boolean
      }),
      process({ data, meta }, { state }) {
        Vue.set(state.chatRooms[data.chatRoomID], "users", state.chatRooms[data.chatRoomID].users.filter((u) => u !== data.member));
      },
      async sideEffect({ meta, data }, { state }) {
        const rootState = sbp("state/vuex/state");
        if (meta.username === rootState.loggedIn.username && !sbp("okTurtles.data/get", "JOINING_GROUP")) {
          const sendingData = data.leavingGroup ? { member: data.member } : { member: data.member, username: meta.username };
          await sbp("gi.actions/chatroom/leave", { contractID: data.chatRoomID, data: sendingData });
        }
      }
    },
    "gi.contracts/group/joinChatRoom": {
      validate: objectMaybeOf({
        username: string,
        chatRoomID: string
      }),
      process({ data, meta }, { state }) {
        const username = data.username || meta.username;
        state.chatRooms[data.chatRoomID].users.push(username);
      },
      async sideEffect({ meta, data }, { state }) {
        const rootState = sbp("state/vuex/state");
        const username = data.username || meta.username;
        if (username === rootState.loggedIn.username) {
          if (!sbp("okTurtles.data/get", "JOINING_GROUP") || sbp("okTurtles.data/get", "READY_TO_JOIN_CHATROOM")) {
            sbp("okTurtles.data/set", "JOINING_CHATROOM", true);
            await sbp("chelonia/contract/sync", data.chatRoomID);
            sbp("okTurtles.data/set", "JOINING_CHATROOM", false);
            sbp("okTurtles.data/set", "READY_TO_JOIN_CHATROOM", false);
          }
        }
      }
    },
    "gi.contracts/group/renameChatRoom": {
      validate: objectOf({
        chatRoomID: string,
        name: string
      }),
      process({ data, meta }, { state, getters }) {
        Vue.set(state.chatRooms, data.chatRoomID, {
          ...getters.getChatRooms[data.chatRoomID],
          name: data.name
        });
      }
    },
    ...{
      "gi.contracts/group/forceDistributionDate": {
        validate: optional,
        process({ meta }, { state, getters }) {
          getters.groupSettings.distributionDate = dateToPeriodStamp(meta.createdDate);
        }
      },
      "gi.contracts/group/malformedMutation": {
        validate: objectOf({ errorType: string, sideEffect: optional(boolean) }),
        process({ data }) {
          const ErrorsTypes = { ChelErrorDBBadPreviousHEAD, ...Errors };
          const ErrorType = ErrorsTypes[data.errorType];
          if (data.sideEffect)
            return;
          if (ErrorType) {
            throw new ErrorType("malformedMutation!");
          } else {
            throw new Error(`unknown error type: ${data.errorType}`);
          }
        },
        sideEffect(message, { state }) {
          if (!message.data.sideEffect)
            return;
          sbp("gi.contracts/group/malformedMutation/process", {
            ...message,
            data: omit(message.data, ["sideEffect"])
          }, state);
        }
      }
    }
  }
});
