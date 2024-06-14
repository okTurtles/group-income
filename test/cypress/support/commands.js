// ***********************************************
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************

import 'cypress-file-upload'

import { CHATROOM_GENERAL_NAME, CHATROOM_TYPES, CHATROOM_PRIVACY_LEVEL } from '../../../frontend/model/contracts/shared/constants.js'
import { LOGIN, JOINED_GROUP } from '../../../frontend/utils/events.js'
import { CONTRACTS_MODIFIED, EVENT_HANDLED, EVENT_PUBLISHED, EVENT_PUBLISHING_ERROR } from '../../../shared/domains/chelonia/events.js'

const API_URL = Cypress.config('baseUrl')

// util funcs
const randomFromArray = arr => arr[Math.floor(Math.random() * arr.length)] // importing giLodash.js fails for some reason.
const getParamsFromInvitationLink = invitationLink => {
  const params = new URLSearchParams(new URL(invitationLink).hash.slice(1))
  return {
    groupId: params.get('groupId'),
    inviteSecret: params.get('secret')
  }
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
          sbp('okTurtles.events/off', EVENT_HANDLED, check)
          sbp('okTurtles.events/off', CONTRACTS_MODIFIED, check)
          sbp('okTurtles.events/off', EVENT_PUBLISHED, check)
          sbp('okTurtles.events/off', EVENT_PUBLISHING_ERROR, check)
          clearInterval(x)
        }

        // Register event listeners. The following events could change the
        // state and affect the result of customCheckFn
        sbp('okTurtles.events/on', EVENT_HANDLED, check)
        sbp('okTurtles.events/on', CONTRACTS_MODIFIED, check)
        sbp('okTurtles.events/on', EVENT_PUBLISHED, check)
        sbp('okTurtles.events/on', EVENT_PUBLISHING_ERROR, check)

        // We also run the test manually in case there are no events
        check()
        const x = setInterval(check, 1000)
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
    .filter(contractID => state[contractID]._vm.type === 'gi.contracts/group')
    .filter(contractID => Object.keys(state[contractID]._vm?.pendingKeyShares || {}).length)

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
  const email = `${username}@email.com`

  if (bypassUI) {
    // Wait for the app to be ready
    cy.getByDT('app').should('have.attr', 'data-ready', 'true')

    cy.window().its('sbp').then(async sbp => {
      await sbp('gi.actions/identity/signupAndLogin', { username, email, passwordFn: () => password })
      await sbp('controller/router').push({ path: '/' }).catch(e => {})
    })
  } else {
    if (!isInvitation) {
      cy.getByDT('signupBtn').click()
    }
    cy.getByDT('signName').clear().type(username)
    cy.getByDT('signEmail').clear().type(email)
    cy.getByDT('password').type(password)
    cy.getByDT('passwordConfirm').type(password)
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
      return new Promise(resolve => {
        const ourUsername = sbp('state/vuex/getters').ourUsername
        if (ourUsername === username) {
          throw Error(`You're loggedin as '${username}'. Logout first and re-run the tests.`)
        }
        sbp('okTurtles.events/once', LOGIN, async ({ username: name }) => {
          if (name === username) {
            await sbp('controller/router').push({ path: '/dashboard' }).catch(e => {})
            resolve()
          }
        })
        sbp('gi.actions/identity/login', { username, passwordFn: () => password })
      })
    })

    if (toGroupDashboardUponSuccess) {
      cy.get('nav').within(() => {
        cy.getByDT('dashboard').click()
      })
    }
  } else {
    cy.getByDT('loginBtn').click()
    cy.getByDT('loginName').clear().type(username)
    cy.getByDT('password').clear().type(password)

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

Cypress.Commands.add('giLogout', ({ hasNoGroup = false } = {}) => {
  if (hasNoGroup) {
    cy.window().its('sbp').then(async sbp => await sbp('gi.actions/identity/logout'))
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
  cy.giLogout()
  cy.giLogin(user, { bypassUI, firstLoginAfterJoinGroup })
})

Cypress.Commands.add('closeModal', () => {
  cy.getByDT('closeModal').click()
  cy.getByDT('closeModal').should('not.exist')
})

Cypress.Commands.add('giSetDisplayName', (name) => {
  cy.getByDT('settingsBtn').click()
  cy.getByDT('displayName').clear().type(name)
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
      return new Promise(resolve => {
        (async () => {
          const message = await sbp('gi.actions/group/createAndSwitch', {
            data: {
              name,
              sharedValues,
              mincomeAmount: mincome,
              mincomeCurrency: 'USD',
              ruleName,
              ruleThreshold
            }
          })

          const eventHandler = async ({ contractID }) => {
            if (contractID === message.contractID()) {
              await sbp('controller/router').push({ path: '/dashboard' }).catch(e => {})
              sbp('okTurtles.events/off', JOINED_GROUP, eventHandler)
              resolve()
            }
          }
          sbp('okTurtles.events/on', JOINED_GROUP, eventHandler)
        })()
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
    cy.get('input').clear().type(invitee)
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
  cy.getByDT('reason', 'textarea').clear().type(reason)
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
      await sbp('gi.actions/group/joinWithInviteSecret', groupId, inviteSecret)
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
    cy.giEmptyInvocationQueue()

    cy.giLogout()

    cy.giLogin(existingMemberUsername, { bypassUI })

    // NOTE: should wait until all pendingKeyShares are removed
    cy.giNoPendingGroupKeyShares()
    cy.giLogout()

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
    cy.giLogout()
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
        await sbp('gi.actions/group/joinWithInviteSecret', groupId, inviteSecret)
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

    cy.giLogout()
  }

  cy.giLogin(existingMemberUsername, { bypassUI })
  cy.giNoPendingGroupKeyShares()
  cy.giEmptyInvocationQueue()
  cy.giLogout()

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

      cy.giLogout()
    }
  }
})

Cypress.Commands.add('giAddRandomIncome', () => {
  cy.getByDT('openIncomeDetailsModal').click()
  let salary = Math.floor(Math.random() * (600 - 20) + 20)
  let action = 'doesntNeedIncomeRadio'
  // Add randomly negative or positive income
  if (Math.random() < 0.5) {
    salary = Math.floor(Math.random() * (200 - 20) + 20)
    action = 'needsIncomeRadio'
  }
  cy.getByDT(action).click()
  cy.getByDT('inputIncomeOrPledge').type(salary)

  if (action === 'needsIncomeRadio') {
    // it's mandatory to fill out the payment details when 'needsIncome' is selected.
    cy.randomPaymentMethodInIncomeDetails()
  }

  cy.getByDT('submitIncome').click()
})

Cypress.Commands.add('randomPaymentMethodInIncomeDetails', () => {
  const digits = () => Math.floor(Math.random() * 100000)
  const paymentMethod = randomFromArray(['paypal', 'bitcoin', 'venmo', 'other'])
  const detailMap = {
    'paypal': `abc-${digits()}@abc.com`,
    'bitcoin': `h4sh-t0-b3-s4ved-${digits()}`,
    'venmo': [digits(), digits(), digits()].join('-'),
    'other': [digits(), digits(), digits()].join('-')
  }

  cy.getByDT('paymentMethods').within(() => {
    cy.getByDT('method').last().within(() => {
      cy.get('select').select(paymentMethod)
      cy.get('input').type(detailMap[paymentMethod])
    })
  })
})

Cypress.Commands.add('giAddNewChatroom', ({
  name, description = '', isPrivate = false, bypassUI = false
}) => {
  // Needs to be in 'Group Chat' page
  if (bypassUI) {
    cy.window().its('sbp').then(sbp => {
      sbp('gi.actions/group/addAndJoinChatRoom', {
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
      cy.getByDT('createChannelName').clear().type(name)
      if (description) {
        cy.getByDT('createChannelDescription').clear().type(description)
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
      sbp('gi.actions/group/forceDistributionDate', {
        contractID: sbp('state/vuex/state').currentGroupId,
        hooks: {
          // Setup a hook to resolve the promise when the action has been processed locally.
          onprocessed: () => resolve()
        }
      })
    })
  })
})

Cypress.Commands.add('giCheckIfJoinedGeneralChatroom', (username) => {
  // TODO: Temporary. If we're in the process of joining, some messages in the
  // chatroom are dropped. We should fix the issue in ChatMain by investigating
  // the cause for this, but in the meantime we can address the issue by waiting
  // for all ongoing operations to complete.
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
  const selfJoin = inviter === invitee
  const selfCheck = me === invitee
  if (selfCheck) {
    cy.getByDT('messageInputWrapper').within(() => {
      cy.get('textarea').should('exist')
    })
  }

  cy.getByDT('conversationWrapper').within(() => {
    if (inviter) {
      cy.get('.c-message:last-child .c-who > span:first-child').should('contain', inviter)
    }
    const message = selfJoin ? `Joined ${channelName}` : `Added a member to ${channelName}: ${invitee}`
    cy.get('.c-message:last-child .c-notification').should('contain', message)
  })
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
