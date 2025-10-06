// ***********************************************
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************

import 'cypress-file-upload'

import { CHATROOM_GENERAL_NAME, CHATROOM_PRIVACY_LEVEL, CHATROOM_TYPES } from '../../../frontend/model/contracts/shared/constants.js'
import { JOINED_GROUP } from '../../../frontend/utils/events.js'
import { CONTRACTS_MODIFIED_READY, EVENT_HANDLED_READY, EVENT_PUBLISHED, EVENT_PUBLISHING_ERROR } from '@chelonia/lib/events'

const API_URL = Cypress.config('baseUrl')

// util funcs
const setGroupSeenWelcomeScreen = (sbp) => {
  const state = sbp('state/vuex/state')
  return sbp('gi.actions/identity/setGroupAttributes', {
    contractID: state.loggedIn.identityContractID,
    data: {
      groupContractID: state.currentGroupId,
      attributes: { seenWelcomeScreen: true }
    }
  })
}

const randomFromArray = arr => arr[Math.floor(Math.random() * arr.length)] // importing giLodash.js fails for some reason.
const getParamsFromInvitationLink = invitationLink => {
  const params = new URLSearchParams(new URL(invitationLink).hash.slice(1))
  return {
    groupId: params.get('groupId'),
    inviteSecret: params.get('secret')
  }
}
const getRandomPaymentMethod = () => {
  const digits = () => Math.floor(Math.random() * 100000)
  const paymentMethod = randomFromArray(['paypal', 'bitcoin', 'venmo', 'other'])
  const detailMap = {
    'paypal': `abc-${digits()}@abc.com`,
    'bitcoin': `h4sh-t0-b3-s4ved-${digits()}`,
    'venmo': [digits(), digits(), digits()].join('-'),
    'other': [digits(), digits(), digits()].join('-')
  }

  return {
    paymentMethod,
    paymentDetail: detailMap[paymentMethod]
  }
}
const getRandomNonMonetary = () => {
  const randomClasses = [
    'English', 'Korean', 'German', 'French', 'Japanese', 'Mandarin', 'Cantonese', 'Portuguese', 'Spanish',
    'Javascript', 'Typescript', 'Python', 'React', 'Vue', 'Angular', 'Node.js', 'Express', 'PHP'
  ]

  return `${randomFromArray(randomClasses)} class`
}

// Util function to perform checks using SBP
// The function takes a name (to register it as a Cypress command) and custom
// check function that takes SBP as its first parameter. It registers event
// handlers for various events that may change the Chelonia state and returns
// a Promise that resolves once the check passes.
const cySbpCheckCommand = (name, customCheckFn) => {
  Cypress.Commands.add(name, (...params) => {
    cy.window().its('sbp').then(sbp => {
      return new Promise((resolve) => {
        let resolved = false

        const check = () => {
          if (resolved) return
          if (!customCheckFn(sbp, ...params)) {
            console.warn(`[cypress] SBP Check ${name} failed!`)
            return
          }
          resolved = true
          resolve()
          // Un-register event listeners once the check has succeeded
          sbp('okTurtles.events/off', EVENT_HANDLED_READY, check)
          sbp('okTurtles.events/off', CONTRACTS_MODIFIED_READY, check)
          sbp('okTurtles.events/off', EVENT_PUBLISHED, check)
          sbp('okTurtles.events/off', EVENT_PUBLISHING_ERROR, check)
          clearInterval(x)
        }

        // Register event listeners. The following events could change the
        // state and affect the result of customCheckFn
        sbp('okTurtles.events/on', EVENT_HANDLED_READY, check)
        sbp('okTurtles.events/on', CONTRACTS_MODIFIED_READY, check)
        sbp('okTurtles.events/on', EVENT_PUBLISHED, check)
        sbp('okTurtles.events/on', EVENT_PUBLISHING_ERROR, check)

        // We also run the test manually in case there are no events
        const x = setInterval(check, 1000)
        check()
      })
    })
  })
}

const defaultPassword = '123456789'

/* Get element by data-test attribute and other attributes
 ex:
 cy.getByDT('login')            //  cy.get([data-test="login"])
 cy.getByDT('login', 'button')  //  cy.get('button[data-test="login"]')
 cy.getByDT('login', '.error')  //  cy.get('.error[data-test="login"]')
*/
Cypress.Commands.add('getByDT', (element, otherSelector = '') => {
  return cy.get(`${otherSelector}[data-test="${element}"]`)
})

cySbpCheckCommand('giNoPendingGroupKeyShares', (sbp) => {
  const state = sbp('state/vuex/state')
  const pending = Object.keys(state.contracts)
    .filter(contractID => state[contractID]?._vm?.type === 'gi.contracts/group')
    .filter(contractID => Object.keys(state[contractID]._vm.pendingKeyShares || {}).length)

  console.info('giNoPendingGroupKeyShares', pending, pending.length === 0)
  return pending.length === 0
})

cySbpCheckCommand('giEmptyInvocationQueue', (sbp) => {
  const pending = Object.entries(sbp('okTurtles.eventQueue/queuedInvocations'))
    .filter(([q]) => typeof q === 'string')
    .flatMap(([, list]) => list)

  console.info('giEmptyInvocationQueue', pending, pending.length === 0)
  return pending.length === 0
})

cySbpCheckCommand('giKeyRequestedGroupIDs', (sbp, groupId) => {
  const state = sbp('state/vuex/state')
  const identityContractID = state.loggedIn?.identityContractID
  const authorizedKeys = (
    identityContractID &&
    state[identityContractID]?._vm?.authorizedKeys
  )
  const contracts = state.contracts

  if (!authorizedKeys || !contracts) return false

  const pending = Object.keys(contracts).filter((contractID) =>
    contractID !== identityContractID &&
    state[contractID]?._volatile?.pendingKeyRequests?.some((kr) =>
      (
        kr &&
        kr.contractID === identityContractID &&
        kr.name &&
        Object.values(authorizedKeys).some((key) => {
          // $FlowFixMe[incompatible-use]
          return key?.name === kr.name
        })
      )
    )
  )

  console.info('giKeyRequestedGroupIDs', pending, groupId, pending.includes(groupId))
  return pending.includes(groupId)
})

cySbpCheckCommand('giAssertKeyRotation', (sbp, contractID, height, keyName) => {
  const state = sbp('state/vuex/state')
  const identityContractID = state.loggedIn?.identityContractID
  const authorizedKeys = (
    identityContractID &&
    state[contractID]?._vm?.authorizedKeys
  )

  if (!authorizedKeys) {
    console.info('giAssertKeyRotation: contract not found', identityContractID, contractID, height, keyName)
    return false
  }

  const keysWithName = Object.values(authorizedKeys).filter((key) => {
    return key.name === keyName
  }).map((key) => ({
    id: key.id,
    nbf: key._notBeforeHeight,
    exp: key._notAfterHeight
  }))

  console.info('giAssertKeyRotation', contractID, height, keyName, keysWithName)
  return (
    keysWithName.some((key) => {
      return key.nbf > height
    })
  )
})

Cypress.Commands.add('giSignup', (username, {
  password = defaultPassword,
  isInvitation = false,
  groupName,
  bypassUI = false
} = {}) => {
  if (bypassUI) {
    // Wait for the app to be ready
    cy.getByDT('app').should('have.attr', 'data-ready', 'true')

    cy.window().its('sbp').then(async sbp => {
      await sbp('gi.app/identity/signupAndLogin', { username, password })
      await sbp('controller/router').push({ path: '/' }).catch(e => {})
    })
  } else {
    if (!isInvitation) {
      cy.getByDT('signupBtn').click()
    }
    cy.getByDT('signName').type('{selectall}{del}' + username)
    // If bypassUI option is not used, check if the auto-generated password is 32 characters long.
    cy.getByDT('password').invoke('val').then(pw => {
      expect(pw).to.have.length(32)
      cy.window().then(win => {
        win.sessionStorage.setItem(`cy__pw__${username}`, pw)
      })
    })

    cy.getByDT('copyPassword').click()
    cy.getByDT('savedPassword').check({ force: true }).should('be.checked')
    cy.getByDT('signTerms').check({ force: true }).should('be.checked')

    cy.getByDT('signSubmit').click()
    cy.getByDT('closeModal').should('not.exist')
  }

  if (isInvitation) {
    // cy.getByDT('welcomeGroup').should('contain', `Welcome to ${groupName}!`)
    cy.url().should('eq', `${API_URL}/app/pending-approval`)
    cy.getByDT('pendingApprovalTitle').should('contain', 'Waiting for approval to join')
  } else {
    cy.getByDT('welcomeHomeLoggedIn').should('contain', 'Let’s get this party started')
  }

  // wait for contracts to finish syncing
  cy.getByDT('app').then(([el]) => {
    cy.get(el).should('have.attr', 'data-logged-in', 'yes')
    cy.get(el).should('have.attr', 'data-sync', '')
  })
})

Cypress.Commands.add('giLogin', (username, {
  password = defaultPassword,
  bypassUI,
  // NOTE: the 'firstLoginAfterJoinGroup' attribute is true only when it's the FIRST login after joining group
  firstLoginAfterJoinGroup = false,
  toGroupDashboardUponSuccess = true
} = {}) => {
  if (bypassUI) {
    // Wait for the app to be ready
    cy.getByDT('app').should('have.attr', 'data-ready', 'true')

    cy.window().its('sbp').then(sbp => {
      const joinedGroupPromise = new Promise((resolve, reject) => {
        if (firstLoginAfterJoinGroup) {
          const eventHandler = ({ groupContractID }) => {
            sbp('okTurtles.events/off', JOINED_GROUP, eventHandler)
            // We call 'retain' to force a sync in a safe manner
            sbp('chelonia/contract/retain', groupContractID, { ephemeral: true }).then(
              // This second 'sync' looks weird, but it's here to ensure we have
              // all processed all events, even those that happened after
              // calling retain
              () => sbp('chelonia/contract/sync', groupContractID)
            ).then(
              // And then, we want to wait for the state to be copied over
              // from the SW to Vuex
              () => sbp('okTurtles.eventQueue/queueEvent', 'event-handled', Boolean)
            ).then(() => {
              if (sbp('state/vuex/getters').ourProfileActive) {
                resolve()
              } else {
                reject(new Error('Expected our profile to be active (giLogin)'))
              }
            }).finally(() => {
              // We call 'release' to be paired with the 'retain' call
              sbp('chelonia/contract/release', groupContractID, { ephemeral: true })
            })
          }

          sbp('okTurtles.events/on', JOINED_GROUP, eventHandler)
        } else {
          resolve()
        }
      })
      return sbp('gi.app/identity/login', { username, password }).then(() => {
        return joinedGroupPromise
      }).then(() => {
        if (firstLoginAfterJoinGroup) {
          const router = sbp('controller/router')
          if (router.history.current.path === '/dashboard') return
          return setGroupSeenWelcomeScreen(sbp).then(() => router.push({ path: '/dashboard' })) // .catch(() => {})
        }
      })
    })

    if (toGroupDashboardUponSuccess) {
      cy.getByDT('navMenu').within(() => {
        cy.getByDT('dashboard').click()
      })
    }
  } else {
    cy.getByDT('loginBtn').click()
    cy.getByDT('loginName').type('{selectall}{del}' + username)
    cy.getByDT('password').type('{selectall}{del}' + password)

    cy.getByDT('loginSubmit').click()
    cy.getByDT('closeModal').should('not.exist')
  }

  // We changed pages (to dashboard or create group)
  // so there's no login button anymore
  cy.getByDT('loginBtn').should('not.exist')

  // wait for contracts to finish syncing
  cy.getByDT('app').then(([el]) => {
    cy.get(el).should('have.attr', 'data-logged-in', 'yes')
    cy.get(el).should('have.attr', 'data-sync', '')
  })

  if (firstLoginAfterJoinGroup) {
    if (!bypassUI) {
      cy.getByDT('toDashboardBtn').click()
    }
    cy.giCheckIfJoinedGeneralChatroom(username)
  }
})

Cypress.Commands.add('giLogout', ({ bypassUI = false, hasNoGroup = false } = {}) => {
  cy.giEmptyInvocationQueue()

  if (bypassUI || hasNoGroup) {
    cy.window().its('sbp').then(async sbp => await sbp('gi.app/identity/logout'))
  } else {
    cy.getByDT('settingsBtn').click()
    cy.getByDT('link-logout').click()
    cy.getByDT('closeModal').should('not.exist')
  }
  cy.url().should('eq', `${API_URL}/app/`)
  cy.getByDT('welcomeHome').should('contain', 'Welcome to Group Income')
})

Cypress.Commands.add('giSwitchUser', (user, {
  bypassUI = true,
  firstLoginAfterJoinGroup = false
} = {}) => {
  cy.giLogout({ bypassUI })
  cy.giLogin(user, { bypassUI, firstLoginAfterJoinGroup })
})

Cypress.Commands.add('closeModal', () => {
  cy.getByDT('closeModal').click()
  cy.getByDT('closeModal').should('not.exist')
})

Cypress.Commands.add('giSetDisplayName', (name) => {
  cy.getByDT('settingsBtn').click()
  cy.getByDT('displayName').type('{selectall}{del}' + name)
  cy.getByDT('saveAccount').click()
  cy.getByDT('profileMsg').should('contain', 'Your changes were saved!')
  cy.closeModal()
})

Cypress.Commands.add('giCreateGroup', (name, {
  image = 'imageTest.png',
  sharedValues = 'Testing group values',
  mincome = 200,
  ruleName = 'percentage',
  ruleThreshold = 0.8,
  bypassUI = false
} = {}) => {
  if (bypassUI) {
    cy.window().its('sbp').then(sbp => {
      return new Promise((resolve, reject) => {
        (async () => {
          const eventHandler = ({ groupContractID }) => {
            if (groupContractID === cID) {
              sbp('okTurtles.events/off', JOINED_GROUP, eventHandler)
              // We call 'retain' to force a sync in a safe manner
              sbp('chelonia/contract/retain', groupContractID, { ephemeral: true }).then(
                // This second 'sync' looks weird, but it's here to ensure we have
                // all processed all events, even those that happened after
                // calling retain
                () => sbp('chelonia/contract/sync', groupContractID)
              ).then(
                // And then, we want to wait for the state to be copied over
                // from the SW to Vuex
                () => sbp('okTurtles.eventQueue/queueEvent', 'event-handled', Boolean)
              ).then(() => {
                if (sbp('state/vuex/state').currentGroupId === groupContractID && sbp('state/vuex/getters').ourProfileActive) {
                  clearTimeout(timeoutId)
                  resolve()
                } else {
                  reject(new Error('Expected our profile to be active (giCreateGroup)'))
                }
              }).finally(() => {
                // We call 'release' to be paired with the 'retain' call
                sbp('chelonia/contract/release', groupContractID, { ephemeral: true })
              })
            }
          }
          sbp('okTurtles.events/on', JOINED_GROUP, eventHandler)

          const timeoutId = setTimeout(() => {
            reject(new Error('[cypress] Timed out waiting for JOINED_GROUP event and active profile status'))
          }, 15000)

          const cID = await sbp('gi.app/group/createAndSwitch', {
            data: {
              name,
              sharedValues,
              mincomeAmount: mincome,
              mincomeCurrency: 'USD',
              ruleName,
              ruleThreshold
            }
          })
        })()
      }).then(() => {
        const router = sbp('controller/router')
        if (router.history.current.path === '/dashboard') return
        return setGroupSeenWelcomeScreen(sbp).then(() => router.push({ path: '/dashboard' }))
      })
    })
    cy.url().should('eq', `${API_URL}/app/dashboard`)
    cy.getByDT('groupName').should('contain', name)
    cy.getByDT('app').then(([el]) => {
      cy.get(el).should('have.attr', 'data-sync', '')
    })

    cy.giCheckIfJoinedGeneralChatroom()

    return
  }

  let groupPictureDataURI

  cy.getByDT('createGroup').click()

  cy.getByDT('groupCreationModal').within(() => {
    cy.getByDT('groupName').type(name)
    cy.fixture(image, 'base64').then(fileContent => {
      groupPictureDataURI = `data:image/jpeg;base64, ${fileContent}`
      cy.getByDT('groupPicture').attachFile({ fileContent, fileName: image, mimeType: 'image/png' }, { subjectType: 'input' })
    })
  })

  cy.log('Avatar editor modal shoul pop up. image is saved with no edit.')
  cy.get('[data-test="AvatarEditorModal"]').within(() => {
    cy.getByDT('modal-header-title').should('contain', 'Edit avatar')
    cy.getByDT('imageHelperTag').invoke('attr', 'src', groupPictureDataURI)
    cy.getByDT('imageCanvas').should('exist')
    cy.getByDT('saveBtn').click()
  })

  cy.getByDT('groupCreationModal').within(() => {
    cy.getByDT('nextBtn').click()

    if (sharedValues) {
      cy.get('textarea[name="sharedValues"]').type(sharedValues)
    } else {
      // Make sure this step is in the DOM...
      cy.get('textarea[name="sharedValues"]')
    }
    // ...so that it catches correctly the next "Next" button.
    cy.getByDT('nextBtn').click()

    // Make sure that attempting to submit the form without providing a mincome amount doesn't throw (see #1026).
    cy.get('input[name="mincomeAmount"]').type('{enter}')
    cy.get('input[name="mincomeAmount"]').type(mincome)
    cy.getByDT('nextBtn').click()

    cy.getByDT('rulesStep').within(() => {
      const threshold = ruleThreshold * 100

      cy.get(`input[type='range']#range${ruleName}`)
        .invoke('val', threshold)
        .trigger('input')
      // Verify the input value has really changed
      cy.get(`input[type='range']#range${ruleName}`).should('have.value', threshold.toString())
    })
    cy.getByDT('finishBtn').click()
  })

  cy.getByDT('welcomeGroup').should('contain', `Welcome to ${name}!`)
  cy.getByDT('toDashboardBtn').click()

  cy.getByDT('app').then(([el]) => {
    cy.get(el).should('have.attr', 'data-sync', '')
  })
  cy.getByDT('groupName').should('contain', name)

  cy.giCheckIfJoinedGeneralChatroom()
})

function inviteUser (invitee, index) {
  cy.getByDT('invitee').eq(index).within(() => {
    cy.get('input').type('{selectall}{del}' + invitee)
  })
}

Cypress.Commands.add('giGetInvitationAnyone', () => {
  cy.getByDT('inviteButton').click()
  cy.getByDT('invitationLink').invoke('text').then(text => {
    const urlIndex = text.includes('https://') ? text.indexOf('https://') : text.indexOf('http://')
    assert.isOk(urlIndex >= 0, 'invitation link is found')
    const url = text.slice(urlIndex)
    cy.closeModal()
    return cy.wrap(url)
  })
})

Cypress.Commands.add('giInviteMember', (
  invitees,
  {
    reason = 'Because they are great people!'
  } = {}
) => {
  cy.getByDT('inviteButton').click()

  invitees.forEach((invitee, index) => {
    if (index > 0) {
      cy.getByDT('addInviteeSlot').click()
    }
    inviteUser(invitee, index)
  })

  cy.getByDT('nextBtn').click()
  cy.getByDT('reason', 'textarea').type('{selectall}{del}' + reason)
  cy.getByDT('submitBtn').click()
  cy.getByDT('finishBtn').click()
  cy.getByDT('closeModal').should('not.exist')
})

// NOTE: this helper function should be used when a SINGLE user is joining the group
//       if the `existingMemberUsername` is passed undefined, it means it's not the first time joining group
Cypress.Commands.add('giAcceptGroupInvite', (invitationLink, {
  username,
  existingMemberUsername,
  groupName,
  isLoggedIn,
  inviteCreator,
  displayName,
  shouldLogoutAfter = true,
  actionBeforeLogout,
  bypassUI
}) => {
  const { groupId, inviteSecret } = getParamsFromInvitationLink(invitationLink)
  if (bypassUI) {
    if (!isLoggedIn) {
      cy.giSignup(username, { bypassUI: true })
    }

    cy.window().its('sbp').then(async sbp => {
      await sbp('gi.app/group/joinWithInviteSecret', groupId, inviteSecret)
      await sbp('controller/router').push({ path: '/pending-approval' }).catch(e => {})
    })
  } else {
    cy.visit(invitationLink)

    if (!isLoggedIn) {
      cy.getByDT('groupName').should('contain', groupName)
      const inviteMessage = inviteCreator
        ? `${inviteCreator} invited you to join their group!`
        : 'You were invited to join'
      cy.getByDT('invitationMessage').should('contain', inviteMessage)
      cy.giSignup(username, { isInvitation: true, groupName })
    }
  }

  cy.url().should('eq', `${API_URL}/app/pending-approval`)

  if (existingMemberUsername) {
    // NOTE: checking 'data-groupId' is for waiting until joining process would be finished
    cy.getByDT('pendingApprovalTitle').invoke('attr', 'data-groupId').should('eq', groupId)
    // NOTE: should wait until KEY_REQUEST event is published
    cy.giKeyRequestedGroupIDs(groupId)
    cy.giLogout({ bypassUI })

    cy.giLogin(existingMemberUsername, { bypassUI })

    // NOTE: should wait until all pendingKeyShares are removed
    cy.giNoPendingGroupKeyShares()
    cy.giLogout({ bypassUI })

    cy.giLogin(username, { bypassUI, firstLoginAfterJoinGroup: true })
  } else {
    // NOTE: if existingMemberUsername doens't exist
    //       it means the invitation link is unique for someone
    //       or it means he uses the invitation link by the second time or more
    cy.getByDT('toDashboardBtn').click()
  }

  if (displayName) {
    cy.giSetDisplayName(displayName)
  }

  if (actionBeforeLogout) {
    actionBeforeLogout()
  }

  if (shouldLogoutAfter) {
    cy.giLogout({ bypassUI })
  }
})

// NOTE: this helper function should be used when SEVERAL members are joining the group
//       it works similar to the giAcceptGroupInvite`.
//       but it is slightly different, and has optimized workflow to speed up the test
//       also it doesn't have parameters like `inviteCreator`, `shouldLogoutAfter`, `isLoggedIn`
//       because they can be only useful in `giAcceptGroupInvite` which we use to let a single user join group
//       if a test scenario needs SEVERAL group members, we can use this function and speed up the test
//       https://github.com/okTurtles/group-income/pull/1787#discussion_r1403156999
Cypress.Commands.add('giAcceptMultipleGroupInvites', (invitationLink, {
  usernames,
  existingMemberUsername,
  displayNames,
  actionBeforeLogout,
  groupName,
  bypassUI
}) => {
  const { groupId, inviteSecret } = getParamsFromInvitationLink(invitationLink)
  for (const username of usernames) {
    if (bypassUI) {
      cy.giSignup(username, { bypassUI })
      cy.window().its('sbp').then(async sbp => {
        await sbp('gi.app/group/joinWithInviteSecret', groupId, inviteSecret)
        await sbp('controller/router').push({ path: '/pending-approval' }).catch(e => {})
      })
    } else {
      cy.visit(invitationLink)
      cy.giSignup(username, { isInvitation: true, groupName })
    }
    // NOTE: checking 'data-groupId' is for waiting until joining process would be finished
    cy.getByDT('pendingApprovalTitle').invoke('attr', 'data-groupId').should('eq', groupId)

    // NOTE: should wait until KEY_REQUEST event is published
    cy.giKeyRequestedGroupIDs(groupId)
    cy.giEmptyInvocationQueue()

    cy.giLogout({ bypassUI })
  }

  cy.giLogin(existingMemberUsername, { bypassUI })
  cy.giNoPendingGroupKeyShares()
  cy.giEmptyInvocationQueue()
  cy.giLogout({ bypassUI })

  const shouldSetDisplayName = Array.isArray(displayNames) && displayNames.length === usernames.length
  if (shouldSetDisplayName || actionBeforeLogout) {
    for (let i = 0; i < usernames.length; i++) {
      cy.giLogin(usernames[i], { bypassUI, firstLoginAfterJoinGroup: true })

      if (shouldSetDisplayName) {
        cy.giSetDisplayName(displayNames[i])
      }

      if (Array.isArray(actionBeforeLogout)) {
        actionBeforeLogout[i]()
      } else if (actionBeforeLogout) {
        actionBeforeLogout()
      }

      cy.giLogout({ bypassUI })
    }
  }
})

Cypress.Commands.add('giAddRandomIncome', ({ bypassUI = false } = {}) => {
  let salary = Math.floor(Math.random() * (600 - 20) + 20)
  let action = 'doesntNeedIncomeRadio'

  // Add randomly negative or positive income
  if (Math.random() < 0.5) {
    salary = Math.floor(Math.random() * (200 - 20) + 20)
    action = 'needsIncomeRadio'
  }

  if (bypassUI) {
    const incomeDetailsType = action === 'needsIncomeRadio' ? 'incomeAmount' : 'pledgeAmount'
    const { paymentMethod, paymentDetail } = getRandomPaymentMethod()

    cy.window().its('sbp').then(sbp => {
      sbp('gi.actions/group/groupProfileUpdate', {
        contractID: sbp('state/vuex/state').currentGroupId,
        data: action === 'needsIncomeRadio'
          ? {
              incomeDetailsType,
              [incomeDetailsType]: salary,
              paymentMethods: [{ name: paymentMethod, value: paymentDetail }],
              nonMonetaryReplace: [getRandomNonMonetary()]
            }
          : {
              incomeDetailsType,
              [incomeDetailsType]: salary
            }
      })
    })
  } else {
    cy.getByDT('openIncomeDetailsModal').click()
    cy.getByDT(action).click()
    cy.getByDT('inputIncomeOrPledge').type(salary)

    if (action === 'needsIncomeRadio') {
      // it's mandatory to fill out the payment details when 'needsIncome' is selected.
      cy.randomPaymentMethodInIncomeDetails()
      cy.randomNonMonetaryInIncomeDetails()
    }

    cy.getByDT('submitIncome').click()
  }
})

Cypress.Commands.add('randomPaymentMethodInIncomeDetails', () => {
  const { paymentMethod, paymentDetail } = getRandomPaymentMethod()

  cy.getByDT('paymentMethods').within(() => {
    cy.getByDT('method').last().within(() => {
      cy.get('select').select(paymentMethod)
      cy.get('input').type(paymentDetail)
    })
  })
})

Cypress.Commands.add('randomNonMonetaryInIncomeDetails', () => {
  const randomClass = getRandomNonMonetary()
  cy.getByDT('inputNonMonetaryPledge').type(randomClass)
})

Cypress.Commands.add('giAddNewChatroom', ({
  name, description = '', isPrivate = false, bypassUI = false
}) => {
  // Needs to be in 'Group Chat' page
  if (bypassUI) {
    cy.window().its('sbp').then(sbp => {
      sbp('gi.app/group/addAndJoinChatRoom', {
        contractID: sbp('state/vuex/state').currentGroupId,
        data: {
          attributes: {
            name,
            description,
            privacyLevel: isPrivate ? CHATROOM_PRIVACY_LEVEL.PRIVATE : CHATROOM_PRIVACY_LEVEL.GROUP,
            type: CHATROOM_TYPES.GROUP
          }
        }
      })
    })
  } else {
    cy.getByDT('newChannelButton').click()
    cy.getByDT('modal-header-title').should('contain', 'Create a channel') // Hack for "detached DOM" heisenbug https://on.cypress.io/element-has-detached-from-dom
    cy.getByDT('modal').within(() => {
      cy.getByDT('createChannelName').type('{selectall}{del}' + name)
      if (description) {
        cy.getByDT('createChannelDescription').type('{selectall}{del}' + description)
      } else {
        cy.getByDT('createChannelDescription').clear()
      }
      if (isPrivate) {
        cy.getByDT('createChannelPrivate').check()
      } else {
        cy.getByDT('createChannelPrivate').uncheck()
      }
      cy.getByDT('createChannelSubmit').click()
      cy.getByDT('closeModal').should('not.exist')
    })
  }

  cy.getByDT('channelName').should('contain', name)

  cy.giWaitUntilMessagesLoaded()
  cy.getByDT('conversationWrapper').within(() => {
    // This checks for the 'no-more' slot of the infinite loader
    cy.get('.infinite-status-prompt:nth-child(3)')
      .invoke('attr', 'style')
      .should('not.include', 'display: none')
    cy.get('.infinite-status-prompt:nth-child(3)').within(() => {
      cy.get('.c-greetings .is-title-4').should('contain', 'Welcome!')
      cy.get('.c-greetings p').should('contain', `This is the beginning of ${name}.`)
      cy.get('.buttons').within(() => {
        cy.getByDT('addMembers').should('exist')
        if (!description) {
          cy.getByDT('addDescription').should('exist')
        }
      })
    })
  })
})

Cypress.Commands.add('giForceDistributionDateToNow', () => {
  cy.window().its('sbp').then(sbp => {
    return new Promise((resolve) => {
      const contractID = sbp('state/vuex/state').currentGroupId
      const handler = (cID, entry) => {
        if (cID === contractID && entry.hash() === hash) {
          sbp('okTurtles.events/off', EVENT_HANDLED_READY, handler)
          resolve()
        }
      }
      let hash
      sbp('okTurtles.events/on', EVENT_HANDLED_READY, handler)
      sbp('gi.actions/group/forceDistributionDate', {
        contractID,
        hooks: {
          // Setup a hook to resolve the promise when the action has been processed locally.
          beforeRequest: (entry) => {
            hash = entry.hash()
          }
        }
      })
    })
  })
})

Cypress.Commands.add('giCheckIfJoinedGeneralChatroom', (username) => {
  // TODO: Temporary. If we're in the process of joining, some messages in the
  //       chatroom are dropped. We should fix the issue in ChatMain by investigating
  //       the cause for this, but in the meantime we can address the issue by waiting
  //       for all ongoing operations to complete.
  cy.getByDT('app').then(([el]) => {
    cy.get(el).should('have.attr', 'data-sync', '')
  })
  cy.giEmptyInvocationQueue()

  cy.giRedirectToGroupChat()
  cy.giCheckIfJoinedChatroom(CHATROOM_GENERAL_NAME, username)
  cy.getByDT('dashboard').click()
})

Cypress.Commands.add('giCheckIfJoinedChatroom', (
  channelName, me, inviter, invitee
) => {
  cy.getByDT('channelName').should('contain', channelName)
  cy.getByDT(`channel-${channelName}-in`).within(() => {
    cy.get('i').invoke('attr', 'class').should('be.oneOf', ['icon-lock', 'icon-hashtag', 'icon-unlock-alt'])
  })
  // NOTE: need to check just after joined, not after making other activities
  inviter = inviter || me
  invitee = invitee || me
  // const selfJoin = inviter === invitee // commented out because of unused var error because of heisenbug below
  const selfCheck = me === invitee
  if (selfCheck) {
    cy.getByDT('messageInputWrapper').within(() => {
      cy.get('textarea').should('exist')
    })
  }

  // failed attempt to fix heisenbug: https://github.com/okTurtles/group-income/issues/2256
  // if (inviter) {
  //   cy.get('[data-test="conversationWrapper"] .c-message:last-child .c-who > span:first-child').should('contain', inviter)
  // }
  // const message = selfJoin ? `Joined ${channelName}` : `Added a member to ${channelName}: ${invitee}`
  // cy.get('[data-test="conversationWrapper"] .c-message:last-child .c-notification').should('contain', message)

  // original code follows:
  // cy.getByDT('conversationWrapper').within(($el) => {
  //   if (inviter) {
  //     // TODO: fix heisenbug: https://github.com/okTurtles/group-income/issues/2256
  //     // cy.get('.c-message:last-child .c-who > span:first-child').scrollIntoView()
  //     // cy.get('.c-message:last-child .c-who > span:first-child').should('contain', inviter)
  //   }
  //   const message = selfJoin ? `Joined ${channelName}` : `Added a member to ${channelName}: ${invitee}`
  //   cy.get('.c-message:last-child .c-notification').should('contain', message)
  // })
})

Cypress.Commands.add('giRedirectToGroupChat', () => {
  cy.getByDT('groupChatLink').click()
  cy.giWaitUntilMessagesLoaded()
})

Cypress.Commands.add('giWaitUntilMessagesLoaded', (isGroupChannel = true) => {
  cy.get('.c-initializing').should('not.exist')
  cy.getByDT('conversationWrapper').within(() => {
    cy.get('.infinite-status-prompt:first-child')
      .invoke('attr', 'style')
      .should('include', 'display: none')
  })
  if (isGroupChannel) {
    cy.getByDT('conversationWrapper').find('.c-message-wrapper').its('length').should('be.gte', 1)
  }
})

Cypress.Commands.add('giSendMessage', (sender, message) => {
  // The following is to ensure the chatroom has finished loading (no spinner)
  cy.giWaitUntilMessagesLoaded(false)
  cy.getByDT('messageInputWrapper').within(() => {
    // NOTE: Cypress bug: for some reason this {enter} thing is causing the tests to fail
    //       Instead we manually click the send button.
    // cy.get('textarea').type(`{selectall}{del}${message}{enter}`, { force: true })
    cy.get('textarea').type(`{selectall}{del}${message}`, { force: true })
    cy.getByDT('sendMessageButton').click()
    cy.get('textarea').should('be.empty')
  })
  cy.getByDT('conversationWrapper').within(() => {
    cy.get('.c-message:last-child .c-who > span:first-child').should('contain', sender)
    cy.get('.c-message.sent:last-child .c-text').should('contain', message)
  })
})

Cypress.Commands.add('giSwitchChannel', (channelName) => {
  cy.getByDT('channelsList').within(() => {
    cy.get('ul > li').each(($el, index, $list) => {
      // NOTE: get only channel name excluding badge
      const channelNameText = $el.find('.c-channel-name').text()
      if (channelNameText === channelName) {
        cy.wrap($el).click()
        return false
      }
    })
  })
  cy.giWaitUntilMessagesLoaded()
  cy.getByDT('channelName').should('contain', channelName)
})
