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
    @click.stop='showProfileTooltip'
  )

  .c-profile-card-container(
    v-if='ephemeral.profileTooltip.show'
    v-on-clickaway='closeProfileTooltip'
  )
    .c-profile-card-overlay

    profile-card-content.c-card(
      :contractID='ourIdentityContractId'
      :on-post-cta-click='closeProfileTooltip'
      @modal-close='closeProfileTooltip'
    )
</template>

<script>
import { L } from '@common/common.js'
import { mapGetters } from 'vuex'
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
          show: false
        }
      }
    }
  },
  computed: {
    ...mapGetters(['ourIdentityContractId']),
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
      console.log('!@# toggling visibility')
      this.ephemeral.isVisible = !this.ephemeral.isVisible
    },
    showProfileTooltip (e) {
      const el = e.target
      if (el.matches('button.user-name')) {
        const displayName = el.textContent.trim()
        console.log('!@# displayName: ', displayName)
        this.ephemeral.profileTooltip.show = true
      }
    },
    closeProfileTooltip () {
      if (this.ephemeral.profileTooltip.show) {
        this.ephemeral.profileTooltip.show = false
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
  top: 100%;
  left: 0;
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

  .is-dark-theme & {
    background-color: $general_1;
  }

  ::v-deep .c-close {
    position: absolute;
  }
}
</style>
