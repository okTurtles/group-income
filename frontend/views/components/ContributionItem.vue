<template lang='pug'>
.c-contribution-item
  i(:class='iconClass')

  div(v-if='hasWhoElse')
    transition(name='replacelist')
      div(
        v-if='isVisible'
        key='visible'
      )
        .c-contribution-list(v-html='listOfName')

        i18n.is-unstyled.is-link-inherit.link(
          tag='button'
          type='button'
          @click='isVisible = !isVisible'
        ) Hide

      div(
        v-else
        key='hidden'
        @click='isVisible = !isVisible'
        v-html='contributionText'
      )

  .c-contribution-list(
    v-else=''
    v-html='contributionText'
  )
</template>

<script>
import L from '@view-utils/translations.js'

export default {
  name: 'ContributionItem',
  props: {
    who: [String, Array],
    what: String,
    action: {
      type: String,
      validator: function (value) {
        // The value must match one of these strings
        return ['RECEIVING', 'GIVING'].indexOf(value) !== -1
      },
      default: 'RECEIVING'
    },
    type: {
      type: String,
      validator: function (value) {
        // The value must match one of these strings
        return ['NON_MONETARY', 'MONETARY'].indexOf(value) !== -1
      },
      default: 'NON_MONETARY'
    }
  },
  data () {
    return {
      isVisible: false
    }
  },
  computed: {
    contributionText () {
      if (this.hasWhoElse) {
        const html = {
          service: `<span class="has-text-bold">${this.what}</span>`,
          button_: '<button class="is-unstyled is-link-inherit link">',
          numMembers: this.otherContributor,
          _button: '</button>'
        }

        if (this.action === 'GIVING' && this.type === 'MONETARY') {
          return L('A total of {service} to {button_}{numMembers} members{_button}', html)
        } else {
          return L('{service} from {button_}{numMembers} members{_button}', html)
        }
      } else {
        if (this.action === 'RECEIVING') {
          const html = {
            service: `<span class="has-text-bold">${this.what}</span>`,
            who: this.firstWho
          }
          return L('{service} by {who}', html)
        } else {
          if (this.type === 'MONETARY') {
            const html = {
              amount: `<span class="has-text-bold">${this.what}</span>`,
              who: this.firstWho
            }
            return L('{amount} to {who}', html)
          } else {
            return `<span class="has-text-bold">${this.what}</span>`
          }
        }
      }
    },

    listOfName () {
      const html = {
        amount: `<span class="has-text-bold">${this.what}</span>`,
        listName: this.who.map((name, index) => {
          return `<p class="has-text-1 c-contribution-list-item">${name}</p>`
        }).join('')
      }
      if (this.action === 'RECEIVING') {
        return L('{amount} from {listName}', html)
      } else {
        return L('A total of {amount} to {listName}', html)
      }
    },

    firstWho () {
      const who = this.who
      if (!Array.isArray(who)) return who
      return who.length === 2 ? this.L('{who0} and {who1}', { who0: who[0], who1: who[1] }) : who[0]
    },

    otherContributor () {
      return this.who.length // (-1 contributor + 1 array length)
    },

    hasWhoElse () {
      return Array.isArray(this.who) && this.who.length > 2
    },
    iconClass () {
      const style = {
        'NON_MONETARY': {
          icon: 'heart',
          color: 'warning'
        },
        'MONETARY': {
          icon: 'dollar-sign',
          color: 'success'
        }
      }
      return `icon-${style[this.type].icon} icon-round has-background-${style[this.type].color} has-text-${style[this.type].color}`
    }
  }
}
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-contribution-item {
  display: flex;
  align-items: baseline;
  margin: $spacer-sm 0;
}

::v-deep .c-contribution-list-item {
  &:nth-child(2) {
    padding-top: $spacer-sm;
  }

  &:last-child {
    padding-bottom: $spacer-sm;
  }
}
</style>
