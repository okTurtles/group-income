/* eslint-disable */

// dummy placeholder data to be used in various pages
import { blake32Hash } from '@common/functions.js'
import { addTimeToDate, MONTHS_MILLIS } from '@common/cdTimeUtils.js'
import L from '@common/translations.js'

// helper
const fakeUsers = ['Flex Kubin', 'Attila Hun', 'Childish Gambino', 'Ken M', 'Margarida', 'Rosalia', 'Leihla P', 'Andrea']
const PAST_THREE_MONTHS = -3 * MONTHS_MILLIS
const randomPastDate = () => addTimeToDate(new Date(), Math.floor(Math.random() * PAST_THREE_MONTHS))
const randomFromArray = arr => arr[Math.floor(Math.random() * arr.length)]
const randomHash = () => blake32Hash(Math.random().toString(16).slice(2))

// Contracts.vue //
const contractDummyData = []
const manifestDummy = {
  'gi.contracts/identity': {"head":{"manifestVersion":"1.0.0"},"body":"{\"version\":\"0.0.1\",\"contract\":{\"hash\":\"21XWnNVpDxBCmdcQvko21FoGWpTXhNydrWfsCxB1VdfWg2wtxA\",\"file\":\"identity.js\"},\"authors\":[{\"cipher\":\"algo\",\"key\":\"<pubkey from deploy-key.json>\"},{\"cipher\":\"algo\",\"key\":\"<pubkey from alex.json>\"}],\"contractSlim\":{\"file\":\"identity-slim.js\",\"hash\":\"21XWnNSeKaQFg61hqcw9FvNV3TPZpqdBnNYQSVz3tKPVWygToL\"}}","signature":{"key":"<which of the \'authors\' keys was used to sign \'body\'>","signature":"<signature>"}},
  'gi.contracts/mailbox': {"head":{"manifestVersion":"1.0.0"},"body":"{\"version\":\"0.0.1\",\"contract\":{\"hash\":\"21XWnNQjQwf4fPBBqBJtPee3SMVbHrQSju4tu6SRjHNPfDBo8Q\",\"file\":\"mailbox.js\"},\"authors\":[{\"cipher\":\"algo\",\"key\":\"<pubkey from deploy-key.json>\"},{\"cipher\":\"algo\",\"key\":\"<pubkey from alex.json>\"}],\"contractSlim\":{\"file\":\"mailbox-slim.js\",\"hash\":\"21XWnNXUFWQDPrqeADPHPyYueAtVRoAdmwsMT9XBCWfPtP8DLb\"}}","signature":{"key":"<which of the \'authors\' keys was used to sign \'body\'>","signature":"<signature>"}},
  'gi.contracts/chatroom': {"head":{"manifestVersion":"1.0.0"},"body":"{\"version\":\"0.0.1\",\"contract\":{\"hash\":\"21XWnNPTjY6GrUyqb7GzsLstF5JZhs9b5jADnSVufZipPvtQeA\",\"file\":\"chatroom.js\"},\"authors\":[{\"cipher\":\"algo\",\"key\":\"<pubkey from deploy-key.json>\"},{\"cipher\":\"algo\",\"key\":\"<pubkey from alex.json>\"}],\"contractSlim\":{\"file\":\"chatroom-slim.js\",\"hash\":\"21XWnNRT58PL4Hj1BUv2SaJYZHVFkFAF8bS2FTwQy7XvuXB1QE\"}}","signature":{"key":"<which of the \'authors\' keys was used to sign \'body\'>","signature":"<signature>"}},
  'gi.contracts/group': {"head":{"manifestVersion":"1.0.0"},"body":"{\"version\":\"0.0.1\",\"contract\":{\"hash\":\"21XWnNXo4eU77dCQuWkPZtNTXST4hxd1DGnGMiBsaBB6vkdTZk\",\"file\":\"group.js\"},\"authors\":[{\"cipher\":\"algo\",\"key\":\"<pubkey from deploy-key.json>\"},{\"cipher\":\"algo\",\"key\":\"<pubkey from alex.json>\"}],\"contractSlim\":{\"file\":\"group-slim.js\",\"hash\":\"21XWnNSmnNSZZ6oZfsRmss2KKCSQS5QqVh62Ub7iojRAYwcxRr\"}}","signature":{"key":"<which of the \'authors\' keys was used to sign \'body\'>","signature":"<signature>"}}
}

for (let i=0; i<20; i++) {
  const item = {
    contractId: randomHash(),
    type: randomFromArray(['gi.contracts/identity', 'gi.contracts/mailbox', 'gi.contracts/chatroom', 'gi.contracts/group']),
    size: 3 + 10 * Math.random(),
    spaceUsed: 10 + 20 * Math.random(),
    createdDate: randomPastDate()
  }

  item.manifestJSON = manifestDummy[item.type]
  contractDummyData.push(item)
}

// Users.vue
const fakeUserStats = [
  { id: 'total-users', name: L('Total users'), value: 152, icon: 'users' },
  { id: 'active-users', name: L('Active users'), value: 70, icon: 'chart-up' },
  { id: 'inactive-users', name: L('Inactive users'), value: 152, icon: 'trend-down' }
]

const fakeUserTableData = fakeUsers.map((name) => ({
  name,
  id: randomHash(),
  groupCount: 1 + Math.floor(Math.random() * 5),
  ownedContractsCount: 50 + Math.floor(Math.random() * 200),
  contractSize: 0.2 + 5 * Math.random(),
  spaceUsed: 5 + 10 * Math.random(),
  credits: { used: 1 + Math.floor(Math.random() * 25), limit: 20 }
}))


export {
  contractDummyData,
  fakeUserStats,
  fakeUserTableData
}
