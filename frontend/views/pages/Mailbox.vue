<template lang="pug">
main
  .section
    .columns
      .column.is-one-quarter
        .panel
          .panel-heading
            i18n Menu

          .panel-block
            span.panel-icon
              i.icon-pencil-alt
            a.no-border(
              data-test='composeLink'
              @click='compose'
            )
              i18n compose

          .panel-block
            span.panel-icon
              i.icon-envelope
            a.no-border(
              data-test='inboxLink'
              @click='inboxMode'
            )
              i18n inbox
              span.unread(
                v-if='$store.getters.unreadMessageCount'
                data-test='inboxUnread'
              )
                | {{$store.getters.unreadMessageCount}}

      .column
      .column.is-two-thirds
        #compose.panel(v-if="ephemeral.mode === 'Compose'")
          .panel-heading
            div
              strong
                i18n Type
                | :
              i18n Message

            div
              strong(style='margin-top: auto;')
                i18n To
                | :
              input#AddRecipient.input.is-small(
                type='text'
                style='width: 80%;'
                data-test='addRecipient'
                v-model='recipient'
                v-on:blur='addRecipient'
              )

              a.button.is-small(@click='addRecipient')
                span.icon.is-small
                  i.icon-plus-circle

            span#badUsername.help.is-danger(v-if='ephemeral.error')
              i18n Invalid Username

            table
              tr(
                v-for='(recipient, index) in ephemeral.recipients'
                :key='`recipient-${index}`'
              )
                td
                  | {{recipient.name}}
                  i.icon-minus-circle.icon.is-small(@click='removeRecipient(index)')

          .panel-block
            textarea.textarea(
              v-model='ephemeral.composedMessage'
              data-test='composedMessage'
            )

          .panel-block
            #errorMsg.help.is-danger(v-if='ephemeral.errorMsg') {{ephemeral.errorMsg}}
            button.is-success(type='submit'
              data-test='sendButton'
              @click='send'
              :disabled='!ephemeral.composedMessage'
              style='margin-left:auto; margin-right: 0;'
            )
              i18n Send

            button.is-danger(
              type='submit'
              @click='cancel'
              style='margin-left:10px; margin-right: 0;'
            )
              i18n Cancel

        #CurrentMessage.panel(v-if="ephemeral.mode === 'Read'")
          .panel-heading
            div
              strong Type:
              | &nbsp;{{ephemeral.currentMessage.data.messageType}}
            div
              strong Sent:
              | &nbsp;{{formatDate(ephemeral.currentMessage.data.sentDate)}}
            div
              strong From:
              | &nbsp;{{ephemeral.currentMessage.data.from}}

          p.panel-block(
            style='display: block; word-wrap: break-word;'
          ) {{ephemeral.currentMessage.data.message}}

          .panel-block
            button.is-danger(
              v-if="ephemeral.currentMessage.data.messageType === 'Message'"
              type='submit'
              style='margin-left:auto; margin-right: 0;'
              @click='remove(index)'
            )
              i18n Delete
            button(
              type='submit'
              @click='inboxMode'
              style='margin-left:10px; margin-right: 0;'
            )
              i18n Return

        table#Proposals.table.is-bordered.is-striped.is-narrow(v-if="ephemeral.mode === 'Inbox' && proposals.length")
          thead
            tr
              th
                i18n Proposals
          tbody
            tr(v-for='(proposal, index) in proposals' :key='`proposal-${index}`')
              td
                .media
                  .media-left(@click='respondToProposal(index)')
                    p.image.is-64x64
                      // TODO: make this draw image from group contract
                      img(src='/assets/images/128x128.png')
                  .media-content.proposal-message(
                    @click='respondToProposal(index)'
                    data-test='proposalMessage'
                  )
                    div
                      strong Sent:
                      | &nbsp;{{formatDate(proposal.initiationDate)}}
                    div
                      strong From:
                      | &nbsp;{{proposal.groupName}}

        table#Invites.table.is-bordered.is-striped.is-narrow.is-fullwidth(
          v-if="ephemeral.mode === 'Inbox' && invites.length"
        )
          thead
            tr
              th
                i18n Invites
          tbody
            tr(v-for='(message, index) in invites' :key='`message-${index}`')
              td
                .media(@click='respondToInvite(index)')
                  .media-left
                    p.image.is-64x64
                      // TODO: make this draw image from group contract
                      img(src='/assets/images/default-avatar.png')
                  .media-content.invite-message(data-test='inviteMessage')
                    div
                      strong Sent:
                      | &nbsp;{{formatDate(message.data.sentDate)}}
                    div
                      strong From:
                      | &nbsp;{{message.data.from}}
        table.table.is-bordered.is-striped.is-narrow.is-fullwidth(data-test='inbox' v-if="ephemeral.mode === 'Inbox'")
          thead
            tr
              th
                i18n Inbox

          tbody
            tr(v-for='(message, index) in inbox' :key='`inbox-message-${index}`')
              td
                .media
                  .media-left(@click='read({index, type: message.data.messageType})')
                    p.image.is-64x64
                      img(src='/assets/images/default-avatar.png')

                  .media-content.inbox-message(data-test='inboxMessage' @click='read({index, type: message.data.messageType})')
                    div
                      strong Sent:
                      | &nbsp;{{formatDate(message.data.sentDate)}}
                    div
                      strong From:
                      | &nbsp;{{message.data.from}}
                    span(style='color: grey;')
                      | {{message.data.message.substr(0,50)}}{{message.data.message.length &gt; 50 ? &apos;...&apos; : &apos;&apos;}}

                  .media-right(type='submit' @click="remove(index, 'inbox')")
                    button.delete

            tr(v-if='!inbox.length')
              td
                .center.is-disabled
                  i18n No Messages
</template>

<script>
import sbp from '~/shared/sbp.js'
import contracts from '@model/contracts.js'
import L from '@view-utils/translations.js'

const criteria = (msg) => new Date(msg.sentDate)

// TODO: this whole file needs to be improved/rewritten

export default {
  name: 'Mailbox',
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
        let formatString = new Date(date)
        return formatString.toString()
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

<style scoped>
.signup .level-item { margin-top: 10px; }

.signup .level.top-align { align-items: flex-start; }

.unread {
  display: inline-block;
  padding: 2px 5px;
  font-size: 12px;
  font-weight: 600;
  line-height: 1;
  color: white;
  background-color: #1fc8db;
  border-radius: 20px;
}
</style>
