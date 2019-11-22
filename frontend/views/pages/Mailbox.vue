<template lang='pug'>
page(pageTestName='dashboard' pageTestHeaderName='groupName')
  template(#title='') {{ L('Mailbox') }}
  template(#sidebar='')
    i18n.is-title-3(tag='h3') Menu
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
            | {{ $store.getters.unreadMessageCount }}

  article(v-if='ephemeral.mode === "Compose"')
    .card
      i18n.is-title-3.card-header(tag='h3') New Message
      .field
        i18n.label(tag='label') To:
        .input-combo
          input.input(
            type='text'
            data-test='addRecipient'
            v-model='recipient'
            v-on:blur='addRecipient'
          )
          button.is-icon(@click='addRecipient')
            i.icon-plus

        i18n.error(
          v-if='ephemeral.error'
          tag='p'
        ) Invalid Username

      table
        tr(
          v-for='(recipient, index) in ephemeral.recipients'
          :key='`recipient-${index}`'
        )
          td
            | {{ recipient.name }}
            i.icon-times-circle(@click='removeRecipient(index)')

      .field
        i18n.label(tag='label') Compose:
        textarea.textarea(
          v-model='ephemeral.composedMessage'
          data-test='composedMessage'
        )

        p.error(v-if='ephemeral.errorMsg') {{ ephemeral.errorMsg }}

      .buttons
        i18n.is-danger(
          tag='button'
          type='submit'
          @click='cancel'
        ) Cancel

        i18n.is-success(type='submit'
          tag='button'
          data-test='sendButton'
          @click='send'
          :disabled='!ephemeral.composedMessage'
        ) Send

  article(v-if='ephemeral.mode === "Read"')

    .card
      .card-header
        div
          strong Type:
          | &nbsp;{{ ephemeral.currentMessage.data.messageType }}
        div
          strong Sent:
          | &nbsp;{{ formatDate(ephemeral.currentMessage.meta.createdDate) }}
        div
          strong From:
          | &nbsp;{{ ephemeral.currentMessage.data.from }}
      p(
        data-test='message'
        style='display: block; word-wrap: break-word;'
      ) {{ephemeral.currentMessage.data.message}}

      .buttons
        i18n.button(
          tag='button'
          type='submit'
          @click='inboxMode'
        ) Return

        i18n.button.is-danger(
          tag='button'
          v-if='ephemeral.currentMessage.data.messageType === "Message"'
          type='submit'
          @click='remove(index)'
        ) Delete

  article(v-if='ephemeral.mode === "Inbox" && Object.keys(proposals).length')
    .card
      i18n.is-title-3.card-header(tag='h3') Proposals

      .c-message(v-for='(proposal, hash) in proposals' :key='hash')
        avatar(src='/assets/images/default-avatar.png' alt='' @click='respondToProposal(hash)')

        .c-message-desc(
          @click='respondToProposal(hash)'
          data-test='proposalMessage'
        )
          div
            strong Sent:
            | &nbsp;{{ formatDate(proposal.meta.createdDate) }}
          div
            strong From:
            | &nbsp;{{ proposal.meta.username }}

  article(v-if='ephemeral.mode === "Inbox"' data-test='inbox')
    .card
      i18n.is-title-3.card-header(tag='h3') Inbox

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
            | &nbsp;{{ formatDate(message.meta.createdDate) }}
          div
            strong From:
            | &nbsp;{{ message.data.from }}
          span(style='color: grey;')
            | {{ message.data.message.substr(0,50) }}{{ message.data.message.length &gt; 50 ? &apos;...&apos; : &apos;&apos; }}

        button.button.is-danger.is-icon(type='submit' @click='remove(index, "inbox")')
          i.icon-times-circle

      div(v-if='!inbox.length')
        i18n.info(tag='p') No Messages
</template>

<script>
import sbp from '~/shared/sbp.js'
import { TYPE_MESSAGE } from '@model/contracts/mailbox.js'
import L from '@view-utils/translations.js'
import Page from './Page.vue'
import Avatar from '@components/Avatar.vue'
import { mapGetters } from 'vuex'

const criteria = (msg) => msg.meta.createdDate

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
        currentMessage: { data: {}, meta: {} },
        currentIndex: null
      }
    }
  },
  computed: {
    ...mapGetters([
      'currentGroupState',
      'ourUsername'
    ]),
    inbox () {
      return this.$store.getters.mailboxMessages.filter(msg => msg.data.messageType === TYPE_MESSAGE).sort(criteria)
    },
    proposals () {
      return this.currentGroupState.proposals || {}
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
    send: async function () {
      try {
        for (let i = 0; i < this.ephemeral.recipients.length; i++) {
          const recipient = this.ephemeral.recipients[i]
          // TODO:: latestContractState is inefficient
          const state = await sbp('state/latestContractState', recipient.contractID)
          const message = await sbp('gi.contracts/mailbox/postMessage/create', {
            messageType: TYPE_MESSAGE,
            from: this.ourUsername,
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
    respondToProposal: function (proposalHash) {
      this.$router.push({
        path: '/vote',
        query: {
          groupId: this.$store.state.currentGroupId,
          proposalHash
        }
      })
    },
    // respondToInvite: function (index) {
    //   this.$store.commit('markMessageAsRead', this.invites[index].hash)
    //   // TODO: this is a bad way to use headers, see related comment in mailbox.js
    //   this.$router.push({ path: '/join', query: { groupId: this.invites[index].data.headers[0], inviteHash: this.invites[index].hash } })
    // },
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
          const contractID = await sbp('namespace/lookup', this.recipient)
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
@import "@assets/style/_variables.scss";

.c-message {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 0.5rem;
  border-radius: 3px;

  &:focus,
  &:hover {
    cursor: pointer;
    background-color: $primary_2;
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
    color: $text_1;
    transition: transform cubic-bezier(0.18, 0.89, 0.32, 1.28) 0.3s, color ease-in 0.3s;
  }

  &:focus,
  &:hover {
    transition: none;
    background-color: var(--primary_a);
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
  color: $background;
  background-color: $danger_0;
  border-radius: 50%;
  font-size: 0.7rem;
  font-weight: 600;
}
</style>
