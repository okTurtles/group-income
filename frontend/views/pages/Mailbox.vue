<template lang="pug">
page(pageTestName='dashboard' pageTestHeaderName='groupName')
  template(#title='') Mailbox
  template(#sidebar='')
    h3
      i18n Menu
    ul
      li
        a.c-item-link(
          data-test='composeLink'
          @click='compose'
        )
          i.icon-pencil-alt
          i18n compose
      li
        a.c-item-link(
          data-test='inboxLink'
          @click='inboxMode'
        )
          i.icon-envelope
          i18n inbox
          span.c-unread(
            v-if='$store.getters.unreadMessageCount'
            data-test='inboxUnread'
          )
            | {{$store.getters.unreadMessageCount}}

  article(v-if="ephemeral.mode === 'Compose'")
    .p-section-header
      h3
        i18n New Message

    .p-section
      .field
        label.label To:
        .input-combo
          input.input(
            type='text'
            data-test='addRecipient'
            v-model='recipient'
            v-on:blur='addRecipient'
          )
          button.is-icon(@click='addRecipient')
            i.icon-plus

        p.error(v-if='ephemeral.error')
          i18n Invalid Username

      table
        tr(
          v-for='(recipient, index) in ephemeral.recipients'
          :key='`recipient-${index}`'
        )
          td
            | {{recipient.name}}
            i.icon-times-circle(@click='removeRecipient(index)')

      .field
        label.label Compose:
        textarea.textarea(
          v-model='ephemeral.composedMessage'
          data-test='composedMessage'
        )

        p.error(v-if='ephemeral.errorMsg') {{ephemeral.errorMsg}}

      .buttons
        button.button.is-danger(
          type='submit'
          @click='cancel'
        )
          i18n Cancel

        button.button.is-success(type='submit'
          data-test='sendButton'
          @click='send'
          :disabled='!ephemeral.composedMessage'
        )
          i18n Send

  article(v-if="ephemeral.mode === 'Read'")
    .p-section-header
      div
        strong Type:
        | &nbsp;{{ephemeral.currentMessage.data.messageType}}
      div
        strong Sent:
        | &nbsp;{{formatDate(ephemeral.currentMessage.data.sentDate)}}
      div
        strong From:
        | &nbsp;{{ephemeral.currentMessage.data.from}}

    .p-section
      p(
        style='display: block; word-wrap: break-word;'
      ) {{ephemeral.currentMessage.data.message}}

      .buttons
        button.button(
          type='submit'
          @click='inboxMode'
        )
          i18n Return

        button.button.is-danger(
          v-if="ephemeral.currentMessage.data.messageType === 'Message'"
          type='submit'
          @click='remove(index)'
        )
          i18n Delete

  article(v-if="ephemeral.mode === 'Inbox' && proposals.length")
    .p-section-heading

    .p-section
      h3
        i18n Proposals

      .c-message(v-for='(proposal, index) in proposals' :key='`proposal-${index}`')
        avatar(src='/assets/images/default-avatar.png' alt='' @click='respondToProposal(index)')

        .c-message-desc(
          @click='respondToProposal(index)'
          data-test='proposalMessage'
        )
          div
            strong Sent:
            | &nbsp;{{formatDate(proposal.initiationDate)}}
          div
            strong From:
            | &nbsp;{{proposal.groupName}}

  article(v-if="ephemeral.mode === 'Inbox' && invites.length")
    .p-section
      h3
        i18n Invites
      .c-message(
        v-for='(message, index) in invites'
        :key='`message-${index}`'
        @click='respondToInvite(index)'
        data-test='inviteMessage'
      )
        avatar(src='/assets/images/default-avatar.png' alt='')

        .c-message-desc
          div
            strong Sent:
            | &nbsp;{{formatDate(message.data.sentDate)}}
          div
            strong From:
            | &nbsp;{{message.data.from}}

        button.button.is-icon(@click='respondToInvite(index)')
          i.icon-user-plus
  article(v-if="ephemeral.mode === 'Inbox'" data-test='inbox')
    .p-section
      h3
        i18n Inbox

      .c-message(v-for='(message, index) in inbox' :key='`inbox-message-${index}`')
        avatar(
          src='/assets/images/default-avatar.png' alt=''
          @click='read({index, type: message.data.messageType})'
        )

        .c-message-desc(
          data-test='inboxMessage'
          @click='read({index, type: message.data.messageType})'
        )
          div
            strong Sent:
            | &nbsp;{{formatDate(message.data.sentDate)}}
          div
            strong From:
            | &nbsp;{{message.data.from}}
          span(style='color: grey;')
            | {{message.data.message.substr(0,50)}}{{message.data.message.length &gt; 50 ? &apos;...&apos; : &apos;&apos;}}

        button.button.is-danger.is-icon(type='submit' @click="remove(index, 'inbox')")
          i.icon-times-circle

      div(v-if='!inbox.length')
        p.info
          i18n No Messages
</template>

<script>
import sbp from '~/shared/sbp.js'
import contracts from '@model/contracts.js'
import L from '@view-utils/translations.js'
import Page from './Page.vue'
import Avatar from '@components/Avatar.vue'

const criteria = (msg) => new Date(msg.sentDate)

// TODO: this whole file needs to be improved/rewritten

export default {
  name: 'Mailbox',

  components: {
    Page,
    Avatar
  },

  data () {
    return {
      recipient: null,
      ephemeral: {
        mode: 'Inbox',
        recipients: [],
        error: null,
        errorMsg: null,
        composedMessage: '',
        // TODO: this is ugly, make it nicer
        // place an empty message here so that the rendered doesn't complain about missing fields or data
        currentMessage: { data: {} },
        currentIndex: null
      }
    }
  },
  computed: {
    inbox () {
      return this.$store.getters.mailbox.filter(msg => msg.data.messageType === contracts.MailboxPostMessage.TypeMessage).sort(criteria)
    },
    invites () {
      return this.$store.getters.mailbox.filter(msg => msg.data.messageType === contracts.MailboxPostMessage.TypeInvite).sort(criteria)
    },
    proposals () {
      return this.$store.getters.proposals
    }
  },
  methods: {
    formatDate: function (date) {
      if (date) {
        date = new Date(date)
        // return formatString.toString()
        // Temp
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

        const day = date.getDate()
        const monthIndex = date.getMonth()
        const year = date.getFullYear()

        return `${day} ${monthNames[monthIndex]} ${year}`
      }
    },
    cancel: function () {
      this.inboxMode()
    },
    clearCompose: function () {
      this.ephemeral.composedMessage = ''
      this.ephemeral.recipients = []
    },
    inboxMode: function () {
      this.clearCompose()
      this.ephemeral.mode = 'Inbox'
      this.messages = this.inbox
    },
    deletedMode: function () {
      this.clearCompose()
      this.ephemeral.mode = 'Deleted'
      this.messages = this.deleted
    },
    invitesMode: function () {
      this.clearCompose()
      this.ephemeral.mode = 'Invites'
      this.messages = this.invites
    },
    send: async function () {
      try {
        for (let i = 0; i < this.ephemeral.recipients.length; i++) {
          let recipient = this.ephemeral.recipients[i]
          // TODO:: latestContractState is inefficient
          let state = await sbp('state/latestContractState', recipient.contractID)
          let message = await sbp('gi/contract/create-action', 'MailboxPostMessage', {
            sentDate: new Date().toISOString(),
            messageType: contracts.MailboxPostMessage.TypeMessage,
            from: this.$store.state.loggedIn.name,
            message: this.ephemeral.composedMessage
          }, state.attributes.mailbox)
          await sbp('backend/publishLogEntry', message)
        }
        this.inboxMode()
      } catch (ex) {
        console.log(ex)
        this.ephemeral.errorMsg = L('Failed to Send Message')
      }
    },
    remove: function (index) {
      if (Number.isInteger(index)) {
        this.$store.commit('deleteMessage', this.inbox[index].hash)
      } else {
        this.$store.commit('deleteMessage', this.inbox[this.ephemeral.currentIndex].hash)
        this.ephemeral.currentIndex = null
        this.inboxMode()
      }
    },
    compose: function () {
      this.ephemeral.mode = 'Compose'
    },
    respondToProposal: function (index) {
      this.$router.push({ path: '/vote', query: { groupId: this.proposals[index].groupContractId, proposalHash: this.proposals[index].proposal } })
    },
    respondToInvite: function (index) {
      this.$store.commit('markMessageAsRead', this.invites[index].hash)
      this.$router.push({ path: '/join', query: { groupId: this.invites[index].data.headers[0], inviteHash: this.invites[index].hash } })
    },
    read: function ({ index, type }) {
      this.ephemeral.mode = 'Read'
      if (Number.isInteger(index)) {
        this.ephemeral.currentMessage = this.inbox[index]
        this.ephemeral.currentIndex = index
        this.$store.commit('markMessageAsRead', this.ephemeral.currentMessage.hash)
      }
    },
    removeRecipient: function (index) {
      this.ephemeral.recipients.splice(index, 1)
    },
    addRecipient: async function () {
      if (this.recipient) {
        try {
          let contractID = await sbp('namespace/lookup', this.recipient)
          if (!this.ephemeral.recipients.find(recipient => recipient.name === this.recipient)) {
            this.ephemeral.recipients.push({ name: this.recipient, contractID: contractID })
          }
          this.recipient = null
          this.ephemeral.error = false
        } catch (ex) {
          this.ephemeral.error = true
        }
      }
    }
  }
}
</script>

<style lang="scss" scoped>
@import "../../assets/style/_variables.scss";

.c-message {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 0.5rem;
  border-radius: 3px;

  &:hover {
    cursor: pointer;
    background-color: $primary-bg-s;
  }
}

.c-message-desc {
  margin-right: auto;
  margin-left: 1rem;
  cursor: pointer;
}

.c-item-link {
  display: flex;
  align-items: center;
  padding: 0 1rem;
  height: 2rem;
  cursor: pointer;
  transition: background-color ease-out 0.3s;
  position: relative;

  i {
    margin-right: 1rem;
    font-size: 0.77rem;
    color: #7a7a7a;
    transition: transform cubic-bezier(0.18, 0.89, 0.32, 1.28) 0.3s, color ease-in 0.3s;
  }

  &:hover {
    transition: none;
    background-color: var(--primary-bg-a);
  }
}

.c-unread {
  position: absolute;
  right: $spacer;
  width: $spacer;
  height: $spacer;
  display: flex;
  justify-content: center;
  align-items: center;
  color: $body-background-color;
  background-color: $danger;
  border-radius: 50%;
  font-size: 0.7rem;
  font-weight: 600;
}
</style>
