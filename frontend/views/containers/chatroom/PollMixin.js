import { mapGetters } from 'vuex'
import { POLL_STATUS, POLL_TYPES } from '@model/contracts/shared/constants.js'
import { humanDate } from '@model/contracts/shared/time.js'

const PollMixin: Object = {
  computed: {
    ...mapGetters([
      'ourIdentityContractId',
      'currentChatRoomId'
    ]),
    votesFlattened () {
      return this.pollData.options.reduce((accu, opt) => [...accu, ...opt.voted], [])
    },
    totalVoteCount () {
      return this.votesFlattened.length
    },
    hasVoted () { // checks if the current user has voted on this poll or not
      return this.votesFlattened.includes(this.ourIdentityContractId)
    },
    isPollEditable () { // If the current user is the creator of the poll and no one has voted yet, poll can be editted.
      return this.isMsgSender && this.votesFlattened.length === 0
    },
    isPollExpired () {
      return this.pollData.status === POLL_STATUS.CLOSED
    },
    isAnonymousPoll () {
      return !!this.pollData.hideVoters
    },
    allowMultipleChoices () {
      return this.pollData.pollType === POLL_TYPES.MULTIPLE_CHOICES
    },
    pollExpiryDate () {
      return humanDate(new Date(this.pollData.expires_date_ms))
    }
  }
}

export default PollMixin
