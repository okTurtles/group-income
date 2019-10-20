<template lang='pug'>
.c-contribution-item
  i(:class='iconClass')

  template(v-if='hasWhoElse')
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
        return ['RECEIVING', 'GIVING'].indexOf(value) !== -1 || null
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
          0: `<span class="has-text-bold">${this.what}</span>`,
          1: `<button class="is-unstyled is-link-inherit link">${this.otherContributor}`,
          2: '</button>'
        }

        if (this.action === 'RECEIVING' && this.type === 'MONETARY') {
          return L('{0} from {1} members{2}', html)
        } else {
          return L('{0} to {1} members{2}', html)
        }
      } else {
        if (this.action === 'RECEIVING') {
          const html = {
            0: `<span class="has-text-bold">${this.what}</span>`,
            1: this.firstWho
          }
          return L('{0} by {1}', html)
        } else {
          return `<span class="has-text-bold">${this.what}</span>`
        }
      }
    },

    listOfName () {
      const html = {
        0: `<span class="has-text-bold">${this.what}</span>`,
        1: this.who.map((name, index) => {
          return `<p class="has-text-1 c-contribution-list-item">${name}</p>`
        }).join('')
      }
      if (this.action === 'RECEIVING') {
        return L('{0} from {1}', html)
      } else {
        return L('{0} to {1}', html)
      }
    },

    firstWho () {
      const who = this.who

      if (!Array.isArray(who)) {
        return who
      }

      return who.length === 2 ? this.L('{who0} and {who1}', { who0: who[0], who1: who[1] }) : who[0]
    },

    otherContributor () {
      return this.who.slice(1).length
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
      return `icon-${style[this.type].icon} c-icon-round has-background-${style[this.type].color} has-text-${style[this.type].color}`
    }
  }
}
</script>

<style lang="scss">
@import "../../assets/style/_variables.scss";

.c-contribution-list-item {
  &:nth-child(2) {
    padding-top: $spacer-sm;
  }

  &:last-child {
    padding-bottom: $spacer-sm;
  }
}
</style>

<style lang="scss" scoped>
.c-contribution-item {
  display: flex;
  align-items: baseline;
}
</style>
