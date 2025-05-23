<template lang='pug'>
.c-contribution-item
  i(:class='iconClass')

  div(v-if='hasWhoElse')
    transition(name='replace-list')
      div(
        v-if='ephemeral.isVisible'
        key='visible'
      )
        .c-contribution-list(v-safe-html='listOfName')

        i18n.is-unstyled.is-link-inherit.link(
          tag='button'
          type='button'
          @click='toggleVisibility'
        ) Hide

      div(
        v-else
        key='hidden'
        @click='toggleVisibility'
        v-safe-html='contributionText'
      )

  .c-contribution-list(
    v-else
    v-safe-html:button='contributionText'
    @click='showProfileTooltip'
  )

  .c-profile-card-container.is-active(
    v-if='ephemeral.profileTooltip.show'
    v-on-clickaway='closeProfileTooltip'
  )
    .c-profile-card-overlay(
      @click.stop='closeProfileTooltip'
    )

    // NOTE: Why not ProfileCard.vue here?
    // In here, we need to display the profile card UI when one or more text 'segments' of the sentence are hovered/focused [1].
    // ProfileCard.vue is currently implemented with Tooltip.vue component which requires the 'entire sentence' to be the trigger [2].
    // So instead of further complicating the ProfileCard.vue with the logic for [1] above, we are implementing the logic here and only reusing the
    // user card UI of ProfileCard.vue (which is ProfileCardContent.vue).
    profile-card-content.c-card(
      :contractID='ephemeral.profileTooltip.userId'
      :on-post-cta-click='closeProfileTooltip'
      @modal-close='closeProfileTooltip'
    )
</template>

<script>
import { L } from '@common/common.js'
import ProfileCardContent from '@components/ProfileCardContent.vue'
import { mixin as clickaway } from 'vue-clickaway'

export default ({
  name: 'ContributionItem',
  components: {
    ProfileCardContent
  },
  mixins: [clickaway],
  props: {
    who: [String, Array],
    whoIds: Array,
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
      ephemeral: {
        isVisible: false,
        profileTooltip: {
          show: false,
          userId: null
        }
      }
    }
  },
  computed: {
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
      const btnHtml = {
        button_: '<button class="is-unstyled is-link-inherit link user-name">',
        _button: '</button>'
      }
      if (!Array.isArray(who)) return L('{button_}{who}{_button}', { who, ...btnHtml })
      return who.length === 2
        ? L('{button_}{who0}{_button} and {button_}{who1}{_button}', { who0: who[0], who1: who[1], ...btnHtml })
        : L('{button_}{who}{_button}', { who: who[0], ...btnHtml })
    },
    otherContributor () {
      return this.who.length // (-1 contributor + 1 array length)
    },
    hasWhoElse () {
      return Array.isArray(this.who) && this.who.length > 2
    },
    contributionText () {
      if (this.hasWhoElse) {
        const html = {
          service: `<span class="has-text-bold">${this.what}</span>`,
          numMembers: this.otherContributor,
          button_: '<button class="is-unstyled is-link-inherit link">',
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
          return L('{service} from {who}', html)
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
    iconClass () {
      const style = {
        'NON_MONETARY': {
          icon: 'heart',
          color: 'warning'
        },
        'MONETARY': {
          icon: 'coins',
          color: 'success'
        }
      }
      return `icon-${style[this.type].icon} icon-round has-background-${style[this.type].color} has-text-${style[this.type].color}`
    }
  },
  methods: {
    toggleVisibility () {
      this.ephemeral.isVisible = !this.ephemeral.isVisible
    },
    showProfileTooltip (e) {
      const el = e.target
      const isAlreadyShowing = this.ephemeral.profileTooltip.show

      if (el.matches('button.user-name')) {
        const displayName = el.textContent.trim()
        const index = !Array.isArray(this.who)
          ? 0
          : this.who.findIndex(name => displayName === name)

        if (index >= 0) {
          setTimeout(() => {
            this.ephemeral.profileTooltip.userId = this.whoIds[index]
            this.ephemeral.profileTooltip.show = true
          },
          // If the tooltip is already open, clicking on another username executes closeProfileTooltip() too (which is triggered via v-on-clickaway directive),
          // So showProfileTooltip() needs a bit of delay to seemlessly update the content of the profile tooltip.
          isAlreadyShowing ? 150 : 0)
        }
      }
    },
    closeProfileTooltip () {
      if (this.ephemeral.profileTooltip.show) {
        this.ephemeral.profileTooltip.show = false
        this.ephemeral.profileTooltip.userId = null
      }
    }
  }
}: Object)
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-contribution-item {
  position: relative;
  display: flex;
  align-items: baseline;
  margin: 0.5rem 0;
}

::v-deep .c-contribution-list-item {
  &:nth-child(2) {
    padding-top: 0.5rem;
  }

  &:last-child {
    padding-bottom: 0.5rem;
  }
}

.c-profile-card-container {
  position: absolute;
  top: calc(100% + 0.5rem);
  left: -1rem;
  z-index: $zindex-tooltip;

  @include phone {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    height: 100%;
    width: 100%;
    display: flex;
    flex-direction: column-reverse;
    align-items: stretch;
  }
}

.c-profile-card-overlay {
  position: absolute;
  display: none;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(10, 10, 10, 0.86);
  z-index: 0;

  @include phone {
    display: block;
  }
}

.c-card {
  position: relative;
  z-index: 1;
  background-color: $background_0;

  @include phone {
    border-radius: 0.625rem 0.625rem 0 0;
  }

  .is-dark-theme & {
    background-color: $general_1;
  }

  ::v-deep .c-close {
    position: absolute;
  }
}
</style>
