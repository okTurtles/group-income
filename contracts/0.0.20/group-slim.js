"use strict";
(() => {
  var __create = Object.create;
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getProtoOf = Object.getPrototypeOf;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
    get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
  }) : x)(function(x) {
    if (typeof require !== "undefined")
      return require.apply(this, arguments);
    throw new Error('Dynamic require of "' + x + '" is not supported');
  });
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target, mod));

  // frontend/model/contracts/group.js
  var import_sbp3 = __toESM(__require("@sbp/sbp"));
  var import_common3 = __require("@common/common.js");

  // frontend/model/contracts/misc/flowTyper.js
  var EMPTY_VALUE = Symbol("@@empty");
  var isEmpty = (v) => v === EMPTY_VALUE;
  var isNil = (v) => v === null;
  var isUndef = (v) => typeof v === "undefined";
  var isBoolean = (v) => typeof v === "boolean";
  var isNumber = (v) => typeof v === "number";
  var isString = (v) => typeof v === "string";
  var isObject = (v) => !isNil(v) && typeof v === "object";
  var isFunction = (v) => typeof v === "function";
  var getType = (typeFn, _options) => {
    if (isFunction(typeFn.type))
      return typeFn.type(_options);
    return typeFn.name || "?";
  };
  var TypeValidatorError = class extends Error {
    expectedType;
    valueType;
    value;
    typeScope;
    sourceFile;
    constructor(message, expectedType, valueType, value, typeName = "", typeScope = "") {
      const errMessage = message || `invalid "${valueType}" value type; ${typeName || expectedType} type expected`;
      super(errMessage);
      this.expectedType = expectedType;
      this.valueType = valueType;
      this.value = value;
      this.typeScope = typeScope || "";
      this.sourceFile = this.getSourceFile();
      this.message = `${errMessage}
${this.getErrorInfo()}`;
      this.name = this.constructor.name;
      if (Error.captureStackTrace) {
        Error.captureStackTrace(this, TypeValidatorError);
      }
    }
    getSourceFile() {
      const fileNames = this.stack.match(/(\/[\w_\-.]+)+(\.\w+:\d+:\d+)/g) || [];
      return fileNames.find((fileName) => fileName.indexOf("/flowTyper-js/dist/") === -1) || "";
    }
    getErrorInfo() {
      return `
    file     ${this.sourceFile}
    scope    ${this.typeScope}
    expected ${this.expectedType.replace(/\n/g, "")}
    type     ${this.valueType}
    value    ${this.value}
`;
    }
  };
  var validatorError = (typeFn, value, scope, message, expectedType, valueType) => {
    return new TypeValidatorError(message, expectedType || getType(typeFn), valueType || typeof value, JSON.stringify(value), typeFn.name, scope);
  };
  var arrayOf = (typeFn, _scope = "Array") => {
    function array(value) {
      if (isEmpty(value))
        return [typeFn(value)];
      if (Array.isArray(value)) {
        let index = 0;
        return value.map((v) => typeFn(v, `${_scope}[${index++}]`));
      }
      throw validatorError(array, value, _scope);
    }
    array.type = () => `Array<${getType(typeFn)}>`;
    return array;
  };
  var literalOf = (primitive) => {
    function literal(value, _scope = "") {
      if (isEmpty(value) || value === primitive)
        return primitive;
      throw validatorError(literal, value, _scope);
    }
    literal.type = () => {
      if (isBoolean(primitive))
        return `${primitive ? "true" : "false"}`;
      else
        return `"${primitive}"`;
    };
    return literal;
  };
  var mapOf = (keyTypeFn, typeFn) => {
    function mapOf2(value) {
      if (isEmpty(value))
        return {};
      const o = object(value);
      const reducer = (acc, key) => Object.assign(acc, {
        [keyTypeFn(key, "Map[_]")]: typeFn(o[key], `Map.${key}`)
      });
      return Object.keys(o).reduce(reducer, {});
    }
    mapOf2.type = () => `{ [_:${getType(keyTypeFn)}]: ${getType(typeFn)} }`;
    return mapOf2;
  };
  var object = function(value) {
    if (isEmpty(value))
      return {};
    if (isObject(value) && !Array.isArray(value)) {
      return Object.assign({}, value);
    }
    throw validatorError(object, value);
  };
  var objectOf = (typeObj, _scope = "Object") => {
    function object2(value) {
      const o = object(value);
      const typeAttrs = Object.keys(typeObj);
      const unknownAttr = Object.keys(o).find((attr) => !typeAttrs.includes(attr));
      if (unknownAttr) {
        throw validatorError(object2, value, _scope, `missing object property '${unknownAttr}' in ${_scope} type`);
      }
      const undefAttr = typeAttrs.find((property) => {
        const propertyTypeFn = typeObj[property];
        return propertyTypeFn.name.includes("maybe") && !o.hasOwnProperty(property);
      });
      if (undefAttr) {
        throw validatorError(object2, o[undefAttr], `${_scope}.${undefAttr}`, `empty object property '${undefAttr}' for ${_scope} type`, `void | null | ${getType(typeObj[undefAttr]).substr(1)}`, "-");
      }
      const reducer = isEmpty(value) ? (acc, key) => Object.assign(acc, { [key]: typeObj[key](value) }) : (acc, key) => {
        const typeFn = typeObj[key];
        if (typeFn.name.includes("optional") && !o.hasOwnProperty(key)) {
          return Object.assign(acc, {});
        } else {
          return Object.assign(acc, { [key]: typeFn(o[key], `${_scope}.${key}`) });
        }
      };
      return typeAttrs.reduce(reducer, {});
    }
    object2.type = () => {
      const props = Object.keys(typeObj).map((key) => {
        const ret = typeObj[key].name.includes("optional") ? `${key}?: ${getType(typeObj[key], { noVoid: true })}` : `${key}: ${getType(typeObj[key])}`;
        return ret;
      });
      return `{|
 ${props.join(",\n  ")} 
|}`;
    };
    return object2;
  };
  function objectMaybeOf(validations, _scope = "Object") {
    return function(data) {
      object(data);
      for (const key in data) {
        validations[key]?.(data[key], `${_scope}.${key}`);
      }
      return data;
    };
  }
  var optional = (typeFn) => {
    const unionFn = unionOf(typeFn, undef);
    function optional2(v) {
      return unionFn(v);
    }
    optional2.type = ({ noVoid }) => !noVoid ? getType(unionFn) : getType(typeFn);
    return optional2;
  };
  function undef(value, _scope = "") {
    if (isEmpty(value) || isUndef(value))
      return void 0;
    throw validatorError(undef, value, _scope);
  }
  undef.type = () => "void";
  var boolean = function boolean2(value, _scope = "") {
    if (isEmpty(value))
      return false;
    if (isBoolean(value))
      return value;
    throw validatorError(boolean2, value, _scope);
  };
  var number = function number2(value, _scope = "") {
    if (isEmpty(value))
      return 0;
    if (isNumber(value))
      return value;
    throw validatorError(number2, value, _scope);
  };
  var string = function string2(value, _scope = "") {
    if (isEmpty(value))
      return "";
    if (isString(value))
      return value;
    throw validatorError(string2, value, _scope);
  };
  function tupleOf_(...typeFuncs) {
    function tuple(value, _scope = "") {
      const cardinality = typeFuncs.length;
      if (isEmpty(value))
        return typeFuncs.map((fn) => fn(value));
      if (Array.isArray(value) && value.length === cardinality) {
        const tupleValue = [];
        for (let i = 0; i < cardinality; i += 1) {
          tupleValue.push(typeFuncs[i](value[i], _scope));
        }
        return tupleValue;
      }
      throw validatorError(tuple, value, _scope);
    }
    tuple.type = () => `[${typeFuncs.map((fn) => getType(fn)).join(", ")}]`;
    return tuple;
  }
  var tupleOf = tupleOf_;
  function unionOf_(...typeFuncs) {
    function union(value, _scope = "") {
      for (const typeFn of typeFuncs) {
        try {
          return typeFn(value, _scope);
        } catch (_) {
        }
      }
      throw validatorError(union, value, _scope);
    }
    union.type = () => `(${typeFuncs.map((fn) => getType(fn)).join(" | ")})`;
    return union;
  }
  var unionOf = unionOf_;

  // frontend/model/contracts/shared/constants.js
  var INVITE_INITIAL_CREATOR = "invite-initial-creator";
  var INVITE_STATUS = {
    REVOKED: "revoked",
    VALID: "valid",
    USED: "used"
  };
  var PROFILE_STATUS = {
    ACTIVE: "active",
    PENDING: "pending",
    REMOVED: "removed"
  };
  var PROPOSAL_RESULT = "proposal-result";
  var PROPOSAL_INVITE_MEMBER = "invite-member";
  var PROPOSAL_REMOVE_MEMBER = "remove-member";
  var PROPOSAL_GROUP_SETTING_CHANGE = "group-setting-change";
  var PROPOSAL_PROPOSAL_SETTING_CHANGE = "proposal-setting-change";
  var PROPOSAL_GENERIC = "generic";
  var PROPOSAL_ARCHIVED = "proposal-archived";
  var MAX_ARCHIVED_PROPOSALS = 100;
  var PAYMENTS_ARCHIVED = "payments-archived";
  var MAX_ARCHIVED_PERIODS = 100;
  var MAX_SAVED_PERIODS = 2;
  var STATUS_OPEN = "open";
  var STATUS_PASSED = "passed";
  var STATUS_FAILED = "failed";
  var STATUS_CANCELLED = "cancelled";
  var CHATROOM_TYPES = {
    INDIVIDUAL: "individual",
    GROUP: "group"
  };
  var CHATROOM_PRIVACY_LEVEL = {
    GROUP: "group",
    PRIVATE: "private",
    PUBLIC: "public"
  };
  var MESSAGE_TYPES = {
    POLL: "poll",
    TEXT: "text",
    INTERACTIVE: "interactive",
    NOTIFICATION: "notification"
  };
  var INVITE_EXPIRES_IN_DAYS = {
    ON_BOARDING: 30,
    PROPOSAL: 7
  };
  var MESSAGE_NOTIFICATIONS = {
    ADD_MEMBER: "add-member",
    JOIN_MEMBER: "join-member",
    LEAVE_MEMBER: "leave-member",
    KICK_MEMBER: "kick-member",
    UPDATE_DESCRIPTION: "update-description",
    UPDATE_NAME: "update-name",
    DELETE_CHANNEL: "delete-channel",
    VOTE: "vote"
  };
  var PROPOSAL_VARIANTS = {
    CREATED: "created",
    EXPIRING: "expiring",
    ACCEPTED: "accepted",
    REJECTED: "rejected",
    EXPIRED: "expired"
  };

  // frontend/model/contracts/shared/voting/rules.js
  var VOTE_AGAINST = ":against";
  var VOTE_INDIFFERENT = ":indifferent";
  var VOTE_UNDECIDED = ":undecided";
  var VOTE_FOR = ":for";
  var RULE_PERCENTAGE = "percentage";
  var RULE_DISAGREEMENT = "disagreement";
  var RULE_MULTI_CHOICE = "multi-choice";
  var getPopulation = (state) => Object.keys(state.profiles).filter((p) => state.profiles[p].status === PROFILE_STATUS.ACTIVE).length;
  var rules = {
    [RULE_PERCENTAGE]: function(state, proposalType2, votes) {
      votes = Object.values(votes);
      let population = getPopulation(state);
      if (proposalType2 === PROPOSAL_REMOVE_MEMBER)
        population -= 1;
      const defaultThreshold = state.settings.proposals[proposalType2].ruleSettings[RULE_PERCENTAGE].threshold;
      const threshold = getThresholdAdjusted(RULE_PERCENTAGE, defaultThreshold, population);
      const totalIndifferent = votes.filter((x) => x === VOTE_INDIFFERENT).length;
      const totalFor = votes.filter((x) => x === VOTE_FOR).length;
      const totalAgainst = votes.filter((x) => x === VOTE_AGAINST).length;
      const totalForOrAgainst = totalFor + totalAgainst;
      const turnout = totalForOrAgainst + totalIndifferent;
      const absent = population - turnout;
      const neededToPass = Math.ceil(threshold * (population - totalIndifferent));
      console.debug(`votingRule ${RULE_PERCENTAGE} for ${proposalType2}:`, { neededToPass, totalFor, totalAgainst, totalIndifferent, threshold, absent, turnout, population });
      if (totalFor >= neededToPass) {
        return VOTE_FOR;
      }
      return totalFor + absent < neededToPass ? VOTE_AGAINST : VOTE_UNDECIDED;
    },
    [RULE_DISAGREEMENT]: function(state, proposalType2, votes) {
      votes = Object.values(votes);
      const population = getPopulation(state);
      const minimumMax = proposalType2 === PROPOSAL_REMOVE_MEMBER ? 2 : 1;
      const thresholdOriginal = Math.max(state.settings.proposals[proposalType2].ruleSettings[RULE_DISAGREEMENT].threshold, minimumMax);
      const threshold = getThresholdAdjusted(RULE_DISAGREEMENT, thresholdOriginal, population);
      const totalFor = votes.filter((x) => x === VOTE_FOR).length;
      const totalAgainst = votes.filter((x) => x === VOTE_AGAINST).length;
      const turnout = votes.length;
      const absent = population - turnout;
      console.debug(`votingRule ${RULE_DISAGREEMENT} for ${proposalType2}:`, { totalFor, totalAgainst, threshold, turnout, population, absent });
      if (totalAgainst >= threshold) {
        return VOTE_AGAINST;
      }
      return totalAgainst + absent < threshold ? VOTE_FOR : VOTE_UNDECIDED;
    },
    [RULE_MULTI_CHOICE]: function(state, proposalType2, votes) {
      throw new Error("unimplemented!");
    }
  };
  var rules_default = rules;
  var ruleType = unionOf(...Object.keys(rules).map((k) => literalOf(k)));
  var getThresholdAdjusted = (rule, threshold, groupSize) => {
    const groupSizeVoting = Math.max(3, groupSize);
    return {
      [RULE_DISAGREEMENT]: () => {
        return Math.min(groupSizeVoting - 1, threshold);
      },
      [RULE_PERCENTAGE]: () => {
        const minThreshold = 2 / groupSizeVoting;
        return Math.max(minThreshold, threshold);
      }
    }[rule]();
  };

  // frontend/model/contracts/shared/voting/proposals.js
  var import_sbp = __toESM(__require("@sbp/sbp"));
  var import_common2 = __require("@common/common.js");

  // frontend/model/contracts/shared/time.js
  var import_common = __require("@common/common.js");
  var MINS_MILLIS = 6e4;
  var HOURS_MILLIS = 60 * MINS_MILLIS;
  var DAYS_MILLIS = 24 * HOURS_MILLIS;
  var MONTHS_MILLIS = 30 * DAYS_MILLIS;
  function dateToPeriodStamp(date) {
    return new Date(date).toISOString();
  }
  function dateFromPeriodStamp(daystamp) {
    return new Date(daystamp);
  }
  function periodStampGivenDate({ recentDate, periodStart, periodLength }) {
    const periodStartDate = dateFromPeriodStamp(periodStart);
    let nextPeriod = addTimeToDate(periodStartDate, periodLength);
    const curDate = new Date(recentDate);
    let curPeriod;
    if (curDate < nextPeriod) {
      if (curDate >= periodStartDate) {
        return periodStart;
      } else {
        curPeriod = periodStartDate;
        do {
          curPeriod = addTimeToDate(curPeriod, -periodLength);
        } while (curDate < curPeriod);
      }
    } else {
      do {
        curPeriod = nextPeriod;
        nextPeriod = addTimeToDate(nextPeriod, periodLength);
      } while (curDate >= nextPeriod);
    }
    return dateToPeriodStamp(curPeriod);
  }
  function dateIsWithinPeriod({ date, periodStart, periodLength }) {
    const dateObj = new Date(date);
    const start = dateFromPeriodStamp(periodStart);
    return dateObj > start && dateObj < addTimeToDate(start, periodLength);
  }
  function addTimeToDate(date, timeMillis) {
    const d = new Date(date);
    d.setTime(d.getTime() + timeMillis);
    return d;
  }
  function comparePeriodStamps(periodA, periodB) {
    return dateFromPeriodStamp(periodA).getTime() - dateFromPeriodStamp(periodB).getTime();
  }
  function compareISOTimestamps(a, b) {
    return new Date(a).getTime() - new Date(b).getTime();
  }
  function isPeriodStamp(arg) {
    return /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z/.test(arg);
  }

  // frontend/model/contracts/shared/voting/proposals.js
  function archiveProposal({ state, proposalHash, proposal, contractID }) {
    import_common2.Vue.delete(state.proposals, proposalHash);
    (0, import_sbp.default)("gi.contracts/group/pushSideEffect", contractID, ["gi.contracts/group/archiveProposal", contractID, proposalHash, proposal]);
  }
  var proposalSettingsType = objectOf({
    rule: ruleType,
    expires_ms: number,
    ruleSettings: objectOf({
      [RULE_PERCENTAGE]: objectOf({ threshold: number }),
      [RULE_DISAGREEMENT]: objectOf({ threshold: number })
    })
  });
  function voteAgainst(state, { meta, data, contractID }) {
    const { proposalHash } = data;
    const proposal = state.proposals[proposalHash];
    proposal.status = STATUS_FAILED;
    (0, import_sbp.default)("okTurtles.events/emit", PROPOSAL_RESULT, state, VOTE_AGAINST, data);
    archiveProposal({ state, proposalHash, proposal, contractID });
  }
  var proposalDefaults = {
    rule: RULE_PERCENTAGE,
    expires_ms: 14 * DAYS_MILLIS,
    ruleSettings: {
      [RULE_PERCENTAGE]: { threshold: 0.66 },
      [RULE_DISAGREEMENT]: { threshold: 1 }
    }
  };
  var proposals = {
    [PROPOSAL_INVITE_MEMBER]: {
      defaults: proposalDefaults,
      [VOTE_FOR]: function(state, { meta, data, contractID }) {
        const { proposalHash } = data;
        const proposal = state.proposals[proposalHash];
        proposal.payload = data.passPayload;
        proposal.status = STATUS_PASSED;
        const message = { meta, data: data.passPayload, contractID };
        (0, import_sbp.default)("gi.contracts/group/invite/process", message, state);
        (0, import_sbp.default)("okTurtles.events/emit", PROPOSAL_RESULT, state, VOTE_FOR, data);
        archiveProposal({ state, proposalHash, proposal, contractID });
      },
      [VOTE_AGAINST]: voteAgainst
    },
    [PROPOSAL_REMOVE_MEMBER]: {
      defaults: proposalDefaults,
      [VOTE_FOR]: function(state, { meta, data, contractID }) {
        const { proposalHash, passPayload } = data;
        const proposal = state.proposals[proposalHash];
        proposal.status = STATUS_PASSED;
        proposal.payload = passPayload;
        const messageData = {
          ...proposal.data.proposalData,
          proposalHash,
          proposalPayload: passPayload
        };
        const message = { data: messageData, meta, contractID };
        (0, import_sbp.default)("gi.contracts/group/removeMember/process", message, state);
        (0, import_sbp.default)("gi.contracts/group/pushSideEffect", contractID, ["gi.contracts/group/removeMember/sideEffect", message]);
        archiveProposal({ state, proposalHash, proposal, contractID });
      },
      [VOTE_AGAINST]: voteAgainst
    },
    [PROPOSAL_GROUP_SETTING_CHANGE]: {
      defaults: proposalDefaults,
      [VOTE_FOR]: function(state, { meta, data, contractID }) {
        const { proposalHash } = data;
        const proposal = state.proposals[proposalHash];
        proposal.status = STATUS_PASSED;
        const { setting, proposedValue } = proposal.data.proposalData;
        const message = {
          meta,
          data: { [setting]: proposedValue },
          contractID
        };
        (0, import_sbp.default)("gi.contracts/group/updateSettings/process", message, state);
        (0, import_sbp.default)("gi.contracts/group/pushSideEffect", contractID, ["gi.contracts/group/updateSettings/sideEffect", { ...message, meta: { ...message.meta, username: proposal.meta.username } }]);
        archiveProposal({ state, proposalHash, proposal, contractID });
      },
      [VOTE_AGAINST]: voteAgainst
    },
    [PROPOSAL_PROPOSAL_SETTING_CHANGE]: {
      defaults: proposalDefaults,
      [VOTE_FOR]: function(state, { meta, data, contractID }) {
        const { proposalHash } = data;
        const proposal = state.proposals[proposalHash];
        proposal.status = STATUS_PASSED;
        const message = {
          meta,
          data: proposal.data.proposalData,
          contractID
        };
        (0, import_sbp.default)("gi.contracts/group/updateAllVotingRules/process", message, state);
        archiveProposal({ state, proposalHash, proposal, contractID });
      },
      [VOTE_AGAINST]: voteAgainst
    },
    [PROPOSAL_GENERIC]: {
      defaults: proposalDefaults,
      [VOTE_FOR]: function(state, { meta, data, contractID }) {
        const { proposalHash } = data;
        const proposal = state.proposals[proposalHash];
        proposal.status = STATUS_PASSED;
        (0, import_sbp.default)("okTurtles.events/emit", PROPOSAL_RESULT, state, VOTE_FOR, data);
        archiveProposal({ state, proposalHash, proposal, contractID });
      },
      [VOTE_AGAINST]: voteAgainst
    }
  };
  var proposals_default = proposals;
  var proposalType = unionOf(...Object.keys(proposals).map((k) => literalOf(k)));

  // frontend/model/contracts/shared/payments/index.js
  var PAYMENT_PENDING = "pending";
  var PAYMENT_CANCELLED = "cancelled";
  var PAYMENT_ERROR = "error";
  var PAYMENT_NOT_RECEIVED = "not-received";
  var PAYMENT_COMPLETED = "completed";
  var paymentStatusType = unionOf(...[PAYMENT_PENDING, PAYMENT_CANCELLED, PAYMENT_ERROR, PAYMENT_NOT_RECEIVED, PAYMENT_COMPLETED].map((k) => literalOf(k)));
  var PAYMENT_TYPE_MANUAL = "manual";
  var PAYMENT_TYPE_BITCOIN = "bitcoin";
  var PAYMENT_TYPE_PAYPAL = "paypal";
  var paymentType = unionOf(...[PAYMENT_TYPE_MANUAL, PAYMENT_TYPE_BITCOIN, PAYMENT_TYPE_PAYPAL].map((k) => literalOf(k)));

  // frontend/model/contracts/shared/functions.js
  var import_sbp2 = __toESM(__require("@sbp/sbp"));
  function paymentHashesFromPaymentPeriod(periodPayments) {
    let hashes = [];
    if (periodPayments) {
      const { paymentsFrom } = periodPayments;
      for (const fromUser in paymentsFrom) {
        for (const toUser in paymentsFrom[fromUser]) {
          hashes = hashes.concat(paymentsFrom[fromUser][toUser]);
        }
      }
    }
    return hashes;
  }
  function createPaymentInfo(paymentHash, payment) {
    return {
      from: payment.meta.username,
      to: payment.data.toUser,
      hash: paymentHash,
      amount: payment.data.amount,
      isLate: !!payment.data.isLate,
      when: payment.data.completedDate
    };
  }

  // frontend/model/contracts/shared/giLodash.js
  function omit(o, props) {
    const x = {};
    for (const k in o) {
      if (!props.includes(k)) {
        x[k] = o[k];
      }
    }
    return x;
  }
  function cloneDeep(obj) {
    return JSON.parse(JSON.stringify(obj));
  }
  function isMergeableObject(val) {
    const nonNullObject = val && typeof val === "object";
    return nonNullObject && Object.prototype.toString.call(val) !== "[object RegExp]" && Object.prototype.toString.call(val) !== "[object Date]";
  }
  function merge(obj, src) {
    for (const key in src) {
      const clone = isMergeableObject(src[key]) ? cloneDeep(src[key]) : void 0;
      if (clone && isMergeableObject(obj[key])) {
        merge(obj[key], clone);
        continue;
      }
      obj[key] = clone || src[key];
    }
    return obj;
  }
  function deepEqualJSONType(a, b) {
    if (a === b)
      return true;
    if (a === null || b === null || typeof a !== typeof b)
      return false;
    if (typeof a !== "object")
      return a === b;
    if (Array.isArray(a)) {
      if (a.length !== b.length)
        return false;
    } else if (a.constructor.name !== "Object") {
      throw new Error(`not JSON type: ${a}`);
    }
    for (const key in a) {
      if (!deepEqualJSONType(a[key], b[key]))
        return false;
    }
    return true;
  }

  // frontend/model/contracts/shared/distribution/mincome-proportional.js
  function mincomeProportional(haveNeeds) {
    let totalHave = 0;
    let totalNeed = 0;
    const havers = [];
    const needers = [];
    for (const haveNeed of haveNeeds) {
      if (haveNeed.haveNeed > 0) {
        havers.push(haveNeed);
        totalHave += haveNeed.haveNeed;
      } else if (haveNeed.haveNeed < 0) {
        needers.push(haveNeed);
        totalNeed += Math.abs(haveNeed.haveNeed);
      }
    }
    const totalPercent = Math.min(1, totalNeed / totalHave);
    const payments = [];
    for (const haver of havers) {
      const distributionAmount = totalPercent * haver.haveNeed;
      for (const needer of needers) {
        const belowPercentage = Math.abs(needer.haveNeed) / totalNeed;
        payments.push({
          amount: distributionAmount * belowPercentage,
          from: haver.name,
          to: needer.name
        });
      }
    }
    return payments;
  }

  // frontend/model/contracts/shared/distribution/payments-minimizer.js
  function minimizeTotalPaymentsCount(distribution) {
    const neederTotalReceived = {};
    const haverTotalHave = {};
    const haversSorted = [];
    const needersSorted = [];
    const minimizedDistribution = [];
    for (const todo of distribution) {
      neederTotalReceived[todo.to] = (neederTotalReceived[todo.to] || 0) + todo.amount;
      haverTotalHave[todo.from] = (haverTotalHave[todo.from] || 0) + todo.amount;
    }
    for (const name in haverTotalHave) {
      haversSorted.push({ name, amount: haverTotalHave[name] });
    }
    for (const name in neederTotalReceived) {
      needersSorted.push({ name, amount: neederTotalReceived[name] });
    }
    haversSorted.sort((a, b) => b.amount - a.amount);
    needersSorted.sort((a, b) => b.amount - a.amount);
    while (haversSorted.length > 0 && needersSorted.length > 0) {
      const mostHaver = haversSorted.pop();
      const mostNeeder = needersSorted.pop();
      const diff = mostHaver.amount - mostNeeder.amount;
      if (diff < 0) {
        minimizedDistribution.push({ amount: mostHaver.amount, from: mostHaver.name, to: mostNeeder.name });
        mostNeeder.amount -= mostHaver.amount;
        needersSorted.push(mostNeeder);
      } else if (diff > 0) {
        minimizedDistribution.push({ amount: mostNeeder.amount, from: mostHaver.name, to: mostNeeder.name });
        mostHaver.amount -= mostNeeder.amount;
        haversSorted.push(mostHaver);
      } else {
        minimizedDistribution.push({ amount: mostNeeder.amount, from: mostHaver.name, to: mostNeeder.name });
      }
    }
    return minimizedDistribution;
  }

  // frontend/model/contracts/shared/currencies.js
  var DECIMALS_MAX = 8;
  function commaToDots(value) {
    return typeof value === "string" ? value.replace(/,/, ".") : value.toString();
  }
  function isNumeric(nr) {
    return !isNaN(nr - parseFloat(nr));
  }
  function isInDecimalsLimit(nr, decimalsMax) {
    const decimals = nr.split(".")[1];
    return !decimals || decimals.length <= decimalsMax;
  }
  function validateMincome(value, decimalsMax) {
    const nr = commaToDots(value);
    return isNumeric(nr) && isInDecimalsLimit(nr, decimalsMax);
  }
  function decimalsOrInt(num, decimalsMax) {
    return num.toFixed(decimalsMax).replace(/\.0+$/, "");
  }
  function saferFloat(value) {
    return parseFloat(value.toFixed(DECIMALS_MAX));
  }
  function makeCurrency(options) {
    const { symbol, symbolWithCode, decimalsMax, formatCurrency } = options;
    return {
      symbol,
      symbolWithCode,
      decimalsMax,
      displayWithCurrency: (n) => formatCurrency(decimalsOrInt(n, decimalsMax)),
      displayWithoutCurrency: (n) => decimalsOrInt(n, decimalsMax),
      validate: (n) => validateMincome(n, decimalsMax)
    };
  }
  var currencies = {
    USD: makeCurrency({
      symbol: "$",
      symbolWithCode: "$ USD",
      decimalsMax: 2,
      formatCurrency: (amount) => "$" + amount
    }),
    EUR: makeCurrency({
      symbol: "\u20AC",
      symbolWithCode: "\u20AC EUR",
      decimalsMax: 2,
      formatCurrency: (amount) => "\u20AC" + amount
    }),
    BTC: makeCurrency({
      symbol: "\u0243",
      symbolWithCode: "\u0243 BTC",
      decimalsMax: DECIMALS_MAX,
      formatCurrency: (amount) => amount + "\u0243"
    })
  };
  var currencies_default = currencies;

  // frontend/model/contracts/shared/distribution/distribution.js
  var tinyNum = 1 / Math.pow(10, DECIMALS_MAX);
  function unadjustedDistribution({ haveNeeds = [], minimize = true }) {
    const distribution = mincomeProportional(haveNeeds);
    return minimize ? minimizeTotalPaymentsCount(distribution) : distribution;
  }
  function adjustedDistribution({ distribution, payments, dueOn }) {
    distribution = cloneDeep(distribution);
    for (const todo of distribution) {
      todo.total = todo.amount;
    }
    distribution = subtractDistributions(distribution, payments).filter((todo) => todo.amount >= tinyNum);
    for (const todo of distribution) {
      todo.amount = saferFloat(todo.amount);
      todo.total = saferFloat(todo.total);
      todo.partial = todo.total !== todo.amount;
      todo.isLate = false;
      todo.dueOn = dueOn;
    }
    return distribution;
  }
  function reduceDistribution(payments) {
    payments = cloneDeep(payments);
    for (let i = 0; i < payments.length; i++) {
      const paymentA = payments[i];
      for (let j = i + 1; j < payments.length; j++) {
        const paymentB = payments[j];
        if (paymentA.from === paymentB.from && paymentA.to === paymentB.to || paymentA.to === paymentB.from && paymentA.from === paymentB.to) {
          paymentA.amount += (paymentA.from === paymentB.from ? 1 : -1) * paymentB.amount;
          paymentA.total += (paymentA.from === paymentB.from ? 1 : -1) * paymentB.total;
          payments.splice(j, 1);
          j--;
        }
      }
    }
    return payments;
  }
  function addDistributions(paymentsA, paymentsB) {
    return reduceDistribution([...paymentsA, ...paymentsB]);
  }
  function subtractDistributions(paymentsA, paymentsB) {
    paymentsB = cloneDeep(paymentsB);
    for (const p of paymentsB) {
      p.amount *= -1;
      p.total *= -1;
    }
    return addDistributions(paymentsA, paymentsB);
  }

  // frontend/model/contracts/shared/types.js
  var inviteType = objectOf({
    inviteSecret: string,
    quantity: number,
    creator: string,
    invitee: optional(string),
    status: string,
    responses: mapOf(string, string),
    expires: number
  });
  var chatRoomAttributesType = objectOf({
    name: string,
    description: string,
    type: unionOf(...Object.values(CHATROOM_TYPES).map((v) => literalOf(v))),
    privacyLevel: unionOf(...Object.values(CHATROOM_PRIVACY_LEVEL).map((v) => literalOf(v)))
  });
  var messageType = objectMaybeOf({
    type: unionOf(...Object.values(MESSAGE_TYPES).map((v) => literalOf(v))),
    text: string,
    proposal: objectMaybeOf({
      proposalId: string,
      proposalType: string,
      expires_date_ms: number,
      createdDate: string,
      creator: string,
      variant: unionOf(...Object.values(PROPOSAL_VARIANTS).map((v) => literalOf(v)))
    }),
    notification: objectMaybeOf({
      type: unionOf(...Object.values(MESSAGE_NOTIFICATIONS).map((v) => literalOf(v))),
      params: mapOf(string, string)
    }),
    replyingMessage: objectOf({
      hash: string,
      text: string
    }),
    emoticons: mapOf(string, arrayOf(string)),
    onlyVisibleTo: arrayOf(string)
  });

  // frontend/model/contracts/group.js
  function vueFetchInitKV(obj, key, initialValue) {
    let value = obj[key];
    if (!value) {
      import_common3.Vue.set(obj, key, initialValue);
      value = obj[key];
    }
    return value;
  }
  function initGroupProfile(contractID, joinedDate) {
    return {
      globalUsername: "",
      contractID,
      joinedDate,
      lastLoggedIn: joinedDate,
      nonMonetaryContributions: [],
      status: PROFILE_STATUS.ACTIVE,
      departedDate: null,
      incomeDetailsLastUpdatedDate: null
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
  function clearOldPayments({ contractID, state, getters }) {
    const sortedPeriodKeys = Object.keys(state.paymentsByPeriod).sort();
    const archivingPayments = { paymentsByPeriod: {}, payments: {} };
    while (sortedPeriodKeys.length > MAX_SAVED_PERIODS) {
      const period = sortedPeriodKeys.shift();
      archivingPayments.paymentsByPeriod[period] = cloneDeep(state.paymentsByPeriod[period]);
      for (const paymentHash of getters.paymentHashesForPeriod(period)) {
        archivingPayments.payments[paymentHash] = cloneDeep(state.payments[paymentHash]);
        import_common3.Vue.delete(state.payments, paymentHash);
      }
      import_common3.Vue.delete(state.paymentsByPeriod, period);
    }
    (0, import_sbp3.default)("gi.contracts/group/pushSideEffect", contractID, ["gi.contracts/group/archivePayments", contractID, archivingPayments]);
  }
  function initFetchPeriodPayments({ contractID, meta, state, getters }) {
    const period = getters.periodStampGivenDate(meta.createdDate);
    const periodPayments = vueFetchInitKV(state.paymentsByPeriod, period, initPaymentPeriod({ getters }));
    clearOldPayments({ contractID, state, getters });
    return periodPayments;
  }
  function initGroupStreaks() {
    return {
      lastStreakPeriod: null,
      fullMonthlyPledges: 0,
      fullMonthlySupport: 0,
      onTimePayments: {},
      missedPayments: {},
      noVotes: {}
    };
  }
  function updateCurrentDistribution({ contractID, meta, state, getters }) {
    const curPeriodPayments = initFetchPeriodPayments({ contractID, meta, state, getters });
    const period = getters.periodStampGivenDate(meta.createdDate);
    const noPayments = Object.keys(curPeriodPayments.paymentsFrom).length === 0;
    if (comparePeriodStamps(period, getters.groupSettings.distributionDate) > 0) {
      updateGroupStreaks({ state, getters });
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
      }).filter((todo) => {
        return getters.groupProfile(todo.to).status === PROFILE_STATUS.ACTIVE;
      });
    }
  }
  function memberLeaves({ username, dateLeft }, { contractID, meta, state, getters }) {
    state.profiles[username].status = PROFILE_STATUS.REMOVED;
    state.profiles[username].departedDate = dateLeft;
    updateCurrentDistribution({ contractID, meta, state, getters });
  }
  function isActionYoungerThanUser(actionMeta, userProfile) {
    if (!userProfile) {
      return false;
    }
    return compareISOTimestamps(actionMeta.createdDate, userProfile.joinedDate) > 0;
  }
  function updateGroupStreaks({ state, getters }) {
    const streaks = vueFetchInitKV(state, "streaks", initGroupStreaks());
    const cPeriod = getters.groupSettings.distributionDate;
    const thisPeriodPayments = getters.groupPeriodPayments[cPeriod];
    const noPaymentsAtAll = !thisPeriodPayments;
    if (streaks.lastStreakPeriod === cPeriod)
      return;
    else {
      import_common3.Vue.set(streaks, "lastStreakPeriod", cPeriod);
    }
    const thisPeriodDistribution = thisPeriodPayments?.lastAdjustedDistribution || adjustedDistribution({
      distribution: unadjustedDistribution({
        haveNeeds: getters.haveNeedsForThisPeriod(cPeriod),
        minimize: getters.groupSettings.minimizeDistribution
      }) || [],
      payments: getters.paymentsForPeriod(cPeriod),
      dueOn: getters.dueDateForPeriod(cPeriod)
    }).filter((todo) => {
      return getters.groupProfile(todo.to).status === PROFILE_STATUS.ACTIVE;
    });
    import_common3.Vue.set(streaks, "fullMonthlyPledges", noPaymentsAtAll ? 0 : thisPeriodDistribution.length === 0 ? streaks.fullMonthlyPledges + 1 : 0);
    const thisPeriodPaymentDetails = getters.paymentsForPeriod(cPeriod);
    const thisPeriodHaveNeeds = thisPeriodPayments?.haveNeedsSnapshot || getters.haveNeedsForThisPeriod(cPeriod);
    const filterMyItems = (array, username) => array.filter((item) => item.from === username);
    const isPledgingMember = (username) => thisPeriodHaveNeeds.some((entry) => entry.name === username && entry.haveNeed > 0);
    const totalContributionGoal = thisPeriodHaveNeeds.reduce((total, item) => item.haveNeed < 0 ? total + -1 * item.haveNeed : total, 0);
    const totalPledgesDone = thisPeriodPaymentDetails.reduce((total, paymentItem) => paymentItem.amount + total, 0);
    const fullMonthlySupportCurrent = vueFetchInitKV(streaks, "fullMonthlySupport", 0);
    import_common3.Vue.set(streaks, "fullMonthlySupport", totalPledgesDone > 0 && totalPledgesDone >= totalContributionGoal ? fullMonthlySupportCurrent + 1 : 0);
    for (const username in getters.groupProfiles) {
      if (!isPledgingMember(username))
        continue;
      const myMissedPaymentsInThisPeriod = filterMyItems(thisPeriodDistribution, username);
      const userCurrentStreak = vueFetchInitKV(streaks.onTimePayments, username, 0);
      import_common3.Vue.set(streaks.onTimePayments, username, noPaymentsAtAll ? 0 : myMissedPaymentsInThisPeriod.length === 0 && filterMyItems(thisPeriodPaymentDetails, username).every((p) => p.isLate === false) ? userCurrentStreak + 1 : 0);
      const myMissedPaymentsStreak = vueFetchInitKV(streaks.missedPayments, username, 0);
      import_common3.Vue.set(streaks.missedPayments, username, noPaymentsAtAll ? myMissedPaymentsStreak + 1 : myMissedPaymentsInThisPeriod.length >= 1 ? myMissedPaymentsStreak + 1 : 0);
    }
  }
  (0, import_sbp3.default)("chelonia/defineContract", {
    name: "gi.contracts/group",
    metadata: {
      validate: objectOf({
        createdDate: string,
        username: string,
        identityContractID: string
      }),
      async create() {
        const { username, identityContractID } = (0, import_sbp3.default)("state/vuex/state").loggedIn;
        return {
          createdDate: await fetchServerTime(),
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
      groupCreatedDate(state, getters) {
        const creator = getters.groupSettings.groupCreator;
        return getters.groupProfile(creator).joinedDate;
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
          if (!distributionDate)
            return null;
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
            return paymentHashesFromPaymentPeriod(periodPayments);
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
              invitedBy: invites[inviteId].creator,
              expires: invite.expires
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
        return mincomeCurrency && currencies_default[mincomeCurrency];
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
      groupThankYousFrom(state, getters) {
        return getters.currentGroupState.thankYousFrom || {};
      },
      groupStreaks(state, getters) {
        return getters.currentGroupState.streaks || {};
      },
      groupTotalPledgeAmount(state, getters) {
        return getters.currentGroupState.totalPledgeAmount || 0;
      },
      withGroupCurrency(state, getters) {
        return getters.groupCurrency?.displayWithCurrency;
      },
      getGroupChatRooms(state, getters) {
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
                events.push(createPaymentInfo(paymentHash, payment));
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
        process({ data, meta, contractID }, { state, getters }) {
          const initialState = merge({
            payments: {},
            paymentsByPeriod: {},
            thankYousFrom: {},
            invites: {},
            proposals: {},
            settings: {
              groupCreator: meta.username,
              distributionPeriodLength: 30 * DAYS_MILLIS,
              inviteExpiryOnboarding: INVITE_EXPIRES_IN_DAYS.ON_BOARDING,
              inviteExpiryProposal: INVITE_EXPIRES_IN_DAYS.PROPOSAL
            },
            streaks: initGroupStreaks(),
            profiles: {
              [meta.username]: initGroupProfile(meta.identityContractID, meta.createdDate)
            },
            chatRooms: {},
            totalPledgeAmount: 0
          }, data);
          for (const key in initialState) {
            import_common3.Vue.set(state, key, initialState[key]);
          }
          initFetchPeriodPayments({ contractID, meta, state, getters });
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
        process({ data, meta, hash, contractID }, { state, getters }) {
          if (data.status === PAYMENT_COMPLETED) {
            console.error(`payment: payment ${hash} cannot have status = 'completed'!`, { data, meta, hash });
            throw new import_common3.Errors.GIErrorIgnoreAndBan("payments cannot be instantly completed!");
          }
          import_common3.Vue.set(state.payments, hash, {
            data: {
              ...data,
              groupMincome: getters.groupMincomeAmount
            },
            meta,
            history: [[meta.createdDate, hash]]
          });
          const { paymentsFrom } = initFetchPeriodPayments({ contractID, meta, state, getters });
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
        process({ data, meta, hash, contractID }, { state, getters }) {
          const payment = state.payments[data.paymentHash];
          if (!payment) {
            console.error(`paymentUpdate: no payment ${data.paymentHash}`, { data, meta, hash });
            throw new import_common3.Errors.GIErrorIgnoreAndBan("paymentUpdate without existing payment");
          }
          if (meta.username !== payment.meta.username && meta.username !== payment.data.toUser) {
            console.error(`paymentUpdate: bad username ${meta.username} != ${payment.meta.username} != ${payment.data.username}`, { data, meta, hash });
            throw new import_common3.Errors.GIErrorIgnoreAndBan("paymentUpdate from bad user!");
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
              updateCurrentDistribution({ contractID, meta, state, getters });
            }
            const currentTotalPledgeAmount = vueFetchInitKV(state, "totalPledgeAmount", 0);
            state.totalPledgeAmount = currentTotalPledgeAmount + payment.data.amount;
          }
        },
        sideEffect({ meta, contractID, data }, { state, getters }) {
          if (data.updatedProperties.status === PAYMENT_COMPLETED) {
            const { loggedIn } = (0, import_sbp3.default)("state/vuex/state");
            const payment = state.payments[data.paymentHash];
            if (loggedIn.username === payment.data.toUser) {
              (0, import_sbp3.default)("gi.notifications/emit", "PAYMENT_RECEIVED", {
                createdDate: meta.createdDate,
                groupID: contractID,
                creator: meta.username,
                paymentHash: data.paymentHash,
                amount: getters.withGroupCurrency(payment.data.amount)
              });
            }
          }
        }
      },
      "gi.contracts/group/sendPaymentThankYou": {
        validate: objectOf({
          fromUser: string,
          toUser: string,
          memo: string
        }),
        process({ data }, { state }) {
          const fromUser = vueFetchInitKV(state.thankYousFrom, data.fromUser, {});
          import_common3.Vue.set(fromUser, data.toUser, data.memo);
        },
        sideEffect({ contractID, meta, data }) {
          const { loggedIn } = (0, import_sbp3.default)("state/vuex/state");
          if (data.toUser === loggedIn.username) {
            (0, import_sbp3.default)("gi.notifications/emit", "PAYMENT_THANKYOU_SENT", {
              createdDate: meta.createdDate,
              groupID: contractID,
              creator: meta.username,
              fromUser: data.fromUser,
              toUser: data.toUser
            });
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
              throw new TypeError((0, import_common3.L)("There is an identical open proposal."));
            }
          }
        },
        process({ data, meta, hash }, { state }) {
          import_common3.Vue.set(state.proposals, hash, {
            data,
            meta,
            votes: { [meta.username]: VOTE_FOR },
            status: STATUS_OPEN,
            notifiedBeforeExpire: false,
            payload: null
          });
        },
        sideEffect({ contractID, meta, data }, { getters }) {
          const { loggedIn } = (0, import_sbp3.default)("state/vuex/state");
          const typeToSubTypeMap = {
            [PROPOSAL_INVITE_MEMBER]: "ADD_MEMBER",
            [PROPOSAL_REMOVE_MEMBER]: "REMOVE_MEMBER",
            [PROPOSAL_GROUP_SETTING_CHANGE]: "CHANGE_MINCOME",
            [PROPOSAL_PROPOSAL_SETTING_CHANGE]: "CHANGE_VOTING_RULE",
            [PROPOSAL_GENERIC]: "GENERIC"
          };
          const myProfile = getters.groupProfile(loggedIn.username);
          if (isActionYoungerThanUser(meta, myProfile)) {
            (0, import_sbp3.default)("gi.notifications/emit", "NEW_PROPOSAL", {
              createdDate: meta.createdDate,
              groupID: contractID,
              creator: meta.username,
              subtype: typeToSubTypeMap[data.proposalType]
            });
          }
        }
      },
      "gi.contracts/group/proposalVote": {
        validate: objectOf({
          proposalHash: string,
          vote: string,
          passPayload: optional(unionOf(object, string))
        }),
        process(message, { state, getters }) {
          const { data, hash, meta } = message;
          const proposal = state.proposals[data.proposalHash];
          if (!proposal) {
            console.error(`proposalVote: no proposal for ${data.proposalHash}!`, { data, meta, hash });
            throw new import_common3.Errors.GIErrorIgnoreAndBan("proposalVote without existing proposal");
          }
          import_common3.Vue.set(proposal.votes, meta.username, data.vote);
          if (new Date(meta.createdDate).getTime() > proposal.data.expires_date_ms) {
            console.warn("proposalVote: vote on expired proposal!", { proposal, data, meta });
            return;
          }
          const result = rules_default[proposal.data.votingRule](state, proposal.data.proposalType, proposal.votes);
          if (result === VOTE_FOR || result === VOTE_AGAINST) {
            proposals_default[proposal.data.proposalType][result](state, message);
            import_common3.Vue.set(proposal, "dateClosed", meta.createdDate);
            const votedMembers = Object.keys(proposal.votes);
            for (const member of getters.groupMembersByUsername) {
              const memberCurrentStreak = vueFetchInitKV(getters.groupStreaks.noVotes, member, 0);
              const memberHasVoted = votedMembers.includes(member);
              import_common3.Vue.set(getters.groupStreaks.noVotes, member, memberHasVoted ? 0 : memberCurrentStreak + 1);
            }
          }
        },
        sideEffect({ contractID, data, meta }, { state, getters }) {
          const proposal = state.proposals[data.proposalHash];
          const { loggedIn } = (0, import_sbp3.default)("state/vuex/state");
          const myProfile = getters.groupProfile(loggedIn.username);
          if (proposal?.dateClosed && isActionYoungerThanUser(meta, myProfile)) {
            (0, import_sbp3.default)("gi.notifications/emit", "PROPOSAL_CLOSED", {
              createdDate: meta.createdDate,
              groupID: contractID,
              creator: meta.username,
              proposalStatus: proposal.status
            });
          }
        }
      },
      "gi.contracts/group/proposalCancel": {
        validate: objectOf({
          proposalHash: string
        }),
        process({ data, meta, contractID }, { state }) {
          const proposal = state.proposals[data.proposalHash];
          if (!proposal) {
            console.error(`proposalCancel: no proposal for ${data.proposalHash}!`, { data, meta });
            throw new import_common3.Errors.GIErrorIgnoreAndBan("proposalVote without existing proposal");
          } else if (proposal.meta.username !== meta.username) {
            console.error(`proposalCancel: proposal ${data.proposalHash} belongs to ${proposal.meta.username} not ${meta.username}!`, { data, meta });
            throw new import_common3.Errors.GIErrorIgnoreAndBan("proposalWithdraw for wrong user!");
          }
          import_common3.Vue.set(proposal, "status", STATUS_CANCELLED);
          archiveProposal({ state, proposalHash: data.proposalHash, proposal, contractID });
        }
      },
      "gi.contracts/group/notifyExpiringProposals": {
        validate: arrayOf(string),
        process({ data, meta, contractID }, { state }) {
          for (const proposalId of data) {
            import_common3.Vue.set(state.proposals[proposalId], "notifiedBeforeExpire", true);
          }
        }
      },
      "gi.contracts/group/removeMember": {
        validate: (data, { state, getters, meta }) => {
          objectOf({
            member: string,
            reason: optional(string),
            automated: optional(boolean),
            proposalHash: optional(string),
            proposalPayload: optional(objectOf({
              secret: string
            }))
          })(data);
          const memberToRemove = data.member;
          const membersCount = getters.groupMembersCount;
          if (!state.profiles[memberToRemove]) {
            throw new TypeError((0, import_common3.L)("Not part of the group."));
          }
          if (membersCount === 1 || memberToRemove === meta.username) {
            throw new TypeError((0, import_common3.L)("Cannot remove yourself."));
          }
          if (membersCount < 3) {
            if (meta.username !== state.settings.groupCreator) {
              throw new TypeError((0, import_common3.L)("Only the group creator can remove members."));
            }
          } else {
            const proposal = state.proposals[data.proposalHash];
            if (!proposal) {
              throw new TypeError((0, import_common3.L)("Admin credentials needed and not implemented yet."));
            }
            if (!proposal.payload || proposal.payload.secret !== data.proposalPayload.secret) {
              throw new TypeError((0, import_common3.L)("Invalid associated proposal."));
            }
          }
        },
        process({ data, meta, contractID }, { state, getters }) {
          memberLeaves({ username: data.member, dateLeft: meta.createdDate }, { contractID, meta, state, getters });
        },
        sideEffect({ data, meta, contractID }, { state, getters }) {
          const rootState = (0, import_sbp3.default)("state/vuex/state");
          const contracts = rootState.contracts || {};
          const { username } = rootState.loggedIn;
          if (data.member === username) {
            if ((0, import_sbp3.default)("okTurtles.data/get", "JOINING_GROUP")) {
              return;
            }
            const groupIdToSwitch = Object.keys(contracts).find((cID) => contracts[cID].type === "gi.contracts/group" && cID !== contractID && rootState[cID].settings) || null;
            (0, import_sbp3.default)("state/vuex/commit", "setCurrentChatRoomId", {});
            (0, import_sbp3.default)("state/vuex/commit", "setCurrentGroupId", groupIdToSwitch);
            (0, import_sbp3.default)("chelonia/contract/remove", contractID).catch((e) => {
              console.error(`sideEffect(removeMember): ${e.name} thrown by /remove ${contractID}:`, e);
            });
            (0, import_sbp3.default)("chelonia/queueInvocation", contractID, ["gi.actions/identity/saveOurLoginState"]).then(function() {
              const router = (0, import_sbp3.default)("controller/router");
              const switchFrom = router.currentRoute.path;
              const switchTo = groupIdToSwitch ? "/dashboard" : "/";
              if (switchFrom !== "/join" && switchFrom !== switchTo) {
                router.push({ path: switchTo }).catch(console.warn);
              }
            }).catch((e) => {
              console.error(`sideEffect(removeMember): ${e.name} thrown during queueEvent to ${contractID} by saveOurLoginState:`, e);
            });
          } else {
            const myProfile = getters.groupProfile(username);
            if (isActionYoungerThanUser(meta, myProfile)) {
              const memberRemovedThemselves = data.member === meta.username;
              (0, import_sbp3.default)("gi.notifications/emit", memberRemovedThemselves ? "MEMBER_LEFT" : "MEMBER_REMOVED", {
                createdDate: meta.createdDate,
                groupID: contractID,
                username: memberRemovedThemselves ? meta.username : data.member
              });
            }
          }
        }
      },
      "gi.contracts/group/removeOurselves": {
        validate: objectMaybeOf({
          reason: string
        }),
        process({ data, meta, contractID }, { state, getters }) {
          memberLeaves({ username: meta.username, dateLeft: meta.createdDate }, { contractID, meta, state, getters });
          (0, import_sbp3.default)("gi.contracts/group/pushSideEffect", contractID, ["gi.contracts/group/removeMember/sideEffect", {
            meta,
            data: { member: meta.username, reason: data.reason || "" },
            contractID
          }]);
        }
      },
      "gi.contracts/group/invite": {
        validate: inviteType,
        process({ data, meta }, { state }) {
          import_common3.Vue.set(state.invites, data.inviteSecret, data);
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
          import_common3.Vue.set(invite.responses, meta.username, true);
          if (Object.keys(invite.responses).length === invite.quantity) {
            invite.status = INVITE_STATUS.USED;
          }
          import_common3.Vue.set(state.profiles, meta.username, initGroupProfile(meta.identityContractID, meta.createdDate));
        },
        async sideEffect({ meta, contractID }, { state }) {
          const { loggedIn } = (0, import_sbp3.default)("state/vuex/state");
          const { profiles = {} } = state;
          if (meta.username === loggedIn.username) {
            for (const name in profiles) {
              if (name !== loggedIn.username) {
                await (0, import_sbp3.default)("chelonia/contract/sync", profiles[name].contractID);
              }
            }
          } else {
            const myProfile = profiles[loggedIn.username];
            await (0, import_sbp3.default)("chelonia/contract/sync", meta.identityContractID);
            if (isActionYoungerThanUser(meta, myProfile)) {
              (0, import_sbp3.default)("gi.notifications/emit", "MEMBER_ADDED", {
                createdDate: meta.createdDate,
                groupID: contractID,
                username: meta.username
              });
            }
          }
        }
      },
      "gi.contracts/group/inviteRevoke": {
        validate: (data, { state, meta }) => {
          objectOf({
            inviteSecret: string
          })(data);
          if (!state.invites[data.inviteSecret]) {
            throw new TypeError((0, import_common3.L)("The link does not exist."));
          }
        },
        process({ data, meta }, { state }) {
          const invite = state.invites[data.inviteSecret];
          import_common3.Vue.set(invite, "status", INVITE_STATUS.REVOKED);
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
        process({ contractID, meta, data }, { state, getters }) {
          const mincomeCache = "mincomeAmount" in data ? state.settings.mincomeAmount : null;
          for (const key in data) {
            import_common3.Vue.set(state.settings, key, data[key]);
          }
          if (mincomeCache !== null) {
            (0, import_sbp3.default)("gi.contracts/group/pushSideEffect", contractID, [
              "gi.contracts/group/sendMincomeChangedNotification",
              contractID,
              meta,
              {
                toAmount: data.mincomeAmount,
                fromAmount: mincomeCache
              }
            ]);
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
        process({ data, meta, contractID }, { state, getters }) {
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
                import_common3.Vue.set(groupProfile, key, value);
            }
          }
          if (data.incomeDetailsType) {
            import_common3.Vue.set(groupProfile, "incomeDetailsLastUpdatedDate", meta.createdDate);
            updateCurrentDistribution({ contractID, meta, state, getters });
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
              import_common3.Vue.set(state.settings.proposals[proposalSettings], "rule", data.ruleName);
              import_common3.Vue.set(state.settings.proposals[proposalSettings].ruleSettings[data.ruleName], "threshold", data.ruleThreshold);
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
          import_common3.Vue.set(state.chatRooms, data.chatRoomID, {
            creator: meta.username,
            name,
            type,
            privacyLevel,
            deletedDate: null,
            users: []
          });
          if (!state.generalChatRoomId) {
            import_common3.Vue.set(state, "generalChatRoomId", data.chatRoomID);
          }
        }
      },
      "gi.contracts/group/deleteChatRoom": {
        validate: (data, { getters, meta }) => {
          objectOf({ chatRoomID: string })(data);
          if (getters.getGroupChatRooms[data.chatRoomID].creator !== meta.username) {
            throw new TypeError((0, import_common3.L)("Only the channel creator can delete channel."));
          }
        },
        process({ data, meta }, { state }) {
          import_common3.Vue.delete(state.chatRooms, data.chatRoomID);
        }
      },
      "gi.contracts/group/leaveChatRoom": {
        validate: objectOf({
          chatRoomID: string,
          member: string,
          leavingGroup: boolean
        }),
        process({ data, meta }, { state }) {
          import_common3.Vue.set(state.chatRooms[data.chatRoomID], "users", state.chatRooms[data.chatRoomID].users.filter((u) => u !== data.member));
        },
        async sideEffect({ meta, data }, { state }) {
          const rootState = (0, import_sbp3.default)("state/vuex/state");
          if (meta.username === rootState.loggedIn.username && !(0, import_sbp3.default)("okTurtles.data/get", "JOINING_GROUP")) {
            const sendingData = data.leavingGroup ? { member: data.member } : { member: data.member, username: meta.username };
            await (0, import_sbp3.default)("gi.actions/chatroom/leave", { contractID: data.chatRoomID, data: sendingData });
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
          const rootState = (0, import_sbp3.default)("state/vuex/state");
          const username = data.username || meta.username;
          if (username === rootState.loggedIn.username) {
            if (!(0, import_sbp3.default)("okTurtles.data/get", "JOINING_GROUP") || (0, import_sbp3.default)("okTurtles.data/get", "JOINING_GROUP_CHAT")) {
              await (0, import_sbp3.default)("chelonia/contract/sync", data.chatRoomID);
              (0, import_sbp3.default)("okTurtles.data/set", "JOINING_GROUP_CHAT", false);
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
          import_common3.Vue.set(state.chatRooms, data.chatRoomID, {
            ...getters.getGroupChatRooms[data.chatRoomID],
            name: data.name
          });
        }
      },
      "gi.contracts/group/updateLastLoggedIn": {
        validate() {
        },
        process({ meta }, { getters }) {
          const profile = getters.groupProfiles[meta.username];
          if (profile) {
            import_common3.Vue.set(profile, "lastLoggedIn", meta.createdDate);
          }
        }
      },
      "gi.contracts/group/updateDistributionDate": {
        validate: optional,
        process({ meta }, { state, getters }) {
          const period = getters.periodStampGivenDate(meta.createdDate);
          const current = getters.groupSettings?.distributionDate;
          if (current !== period) {
            updateGroupStreaks({ state, getters });
            getters.groupSettings.distributionDate = period;
          }
        }
      },
      ...{
        "gi.contracts/group/forceDistributionDate": {
          validate: optional,
          process({ meta, contractID }, { state, getters }) {
            getters.groupSettings.distributionDate = dateToPeriodStamp(meta.createdDate);
          }
        },
        "gi.contracts/group/malformedMutation": {
          validate: objectOf({ errorType: string, sideEffect: optional(boolean) }),
          process({ data }) {
            const ErrorType = import_common3.Errors[data.errorType];
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
            (0, import_sbp3.default)("gi.contracts/group/malformedMutation/process", {
              ...message,
              data: omit(message.data, ["sideEffect"])
            }, state);
          }
        }
      }
    },
    methods: {
      "gi.contracts/group/archiveProposal": async function(contractID, proposalHash, proposal) {
        const { username } = (0, import_sbp3.default)("state/vuex/state").loggedIn;
        const key = `proposals/${username}/${contractID}`;
        const proposals2 = await (0, import_sbp3.default)("gi.db/archive/load", key) || [];
        proposals2.unshift([proposalHash, proposal]);
        while (proposals2.length > MAX_ARCHIVED_PROPOSALS) {
          proposals2.pop();
        }
        await (0, import_sbp3.default)("gi.db/archive/save", key, proposals2);
        (0, import_sbp3.default)("okTurtles.events/emit", PROPOSAL_ARCHIVED, [proposalHash, proposal]);
      },
      "gi.contracts/group/archivePayments": async function(contractID, archivingPayments) {
        const { paymentsByPeriod, payments } = archivingPayments;
        const { username } = (0, import_sbp3.default)("state/vuex/state").loggedIn;
        const archPaymentsByPeriodKey = `paymentsByPeriod/${username}/${contractID}`;
        const archPaymentsByPeriod = await (0, import_sbp3.default)("gi.db/archive/load", archPaymentsByPeriodKey) || {};
        const archSentOrReceivedPaymentsKey = `sentOrReceivedPayments/${username}/${contractID}`;
        const archSentOrReceivedPayments = await (0, import_sbp3.default)("gi.db/archive/load", archSentOrReceivedPaymentsKey) || { sent: [], received: [] };
        const sortPayments = (payments2) => payments2.sort((f, l) => compareISOTimestamps(l.meta.createdDate, f.meta.createdDate));
        for (const period of Object.keys(paymentsByPeriod).sort()) {
          archPaymentsByPeriod[period] = paymentsByPeriod[period];
          const newSentOrReceivedPayments = { sent: [], received: [] };
          const { paymentsFrom } = paymentsByPeriod[period];
          for (const fromUser of Object.keys(paymentsFrom)) {
            for (const toUser of Object.keys(paymentsFrom[fromUser])) {
              if (toUser === username || fromUser === username) {
                const receivedOrSent = toUser === username ? "received" : "sent";
                for (const hash of paymentsFrom[fromUser][toUser]) {
                  const { data, meta } = payments[hash];
                  newSentOrReceivedPayments[receivedOrSent].push({ hash, period, data, meta, amount: data.amount });
                }
              }
            }
          }
          archSentOrReceivedPayments.sent = [...sortPayments(newSentOrReceivedPayments.sent), ...archSentOrReceivedPayments.sent];
          archSentOrReceivedPayments.received = [...sortPayments(newSentOrReceivedPayments.received), ...archSentOrReceivedPayments.received];
          const archPaymentsKey = `payments/${period}/${username}/${contractID}`;
          const hashes = paymentHashesFromPaymentPeriod(paymentsByPeriod[period]);
          const archPayments = Object.fromEntries(hashes.map((hash) => [hash, payments[hash]]));
          while (Object.keys(archPaymentsByPeriod).length > MAX_ARCHIVED_PERIODS) {
            const shouldBeDeletedPeriod = Object.keys(archPaymentsByPeriod).sort().shift();
            const paymentHashes = paymentHashesFromPaymentPeriod(archPaymentsByPeriod[shouldBeDeletedPeriod]);
            await (0, import_sbp3.default)("gi.db/archive/delete", `payments/${shouldBeDeletedPeriod}/${username}/${contractID}`);
            delete archPaymentsByPeriod[shouldBeDeletedPeriod];
            archSentOrReceivedPayments.sent = archSentOrReceivedPayments.sent.filter((payment) => !paymentHashes.includes(payment.hash));
            archSentOrReceivedPayments.received = archSentOrReceivedPayments.received.filter((payment) => !paymentHashes.includes(payment.hash));
          }
          await (0, import_sbp3.default)("gi.db/archive/save", archPaymentsKey, archPayments);
        }
        await (0, import_sbp3.default)("gi.db/archive/save", archPaymentsByPeriodKey, archPaymentsByPeriod);
        await (0, import_sbp3.default)("gi.db/archive/save", archSentOrReceivedPaymentsKey, archSentOrReceivedPayments);
        (0, import_sbp3.default)("okTurtles.events/emit", PAYMENTS_ARCHIVED, { paymentsByPeriod, payments });
      },
      "gi.contracts/group/sendMincomeChangedNotification": async function(contractID, meta, data) {
        const myProfile = (0, import_sbp3.default)("state/vuex/getters").ourGroupProfile;
        if (isActionYoungerThanUser(meta, myProfile) && myProfile.incomeDetailsType) {
          const memberType = myProfile.incomeDetailsType === "pledgeAmount" ? "pledging" : "receiving";
          const mincomeIncreased = data.toAmount > data.fromAmount;
          const actionNeeded = mincomeIncreased || memberType === "receiving" && !mincomeIncreased && myProfile.incomeAmount < data.fromAmount && myProfile.incomeAmount > data.toAmount;
          if (!actionNeeded) {
            return;
          }
          if (memberType === "receiving" && !mincomeIncreased) {
            await (0, import_sbp3.default)("gi.actions/group/groupProfileUpdate", {
              contractID,
              data: {
                incomeDetailsType: "pledgeAmount",
                pledgeAmount: 0
              }
            });
            await (0, import_sbp3.default)("gi.actions/group/displayMincomeChangedPrompt", {
              contractID,
              data: {
                amount: data.toAmount,
                memberType,
                increased: mincomeIncreased
              }
            });
          }
          await (0, import_sbp3.default)("gi.notifications/emit", "MINCOME_CHANGED", {
            groupID: contractID,
            creator: meta.username,
            to: data.toAmount,
            memberType,
            increased: mincomeIncreased
          });
        }
      }
    }
  });
})();
