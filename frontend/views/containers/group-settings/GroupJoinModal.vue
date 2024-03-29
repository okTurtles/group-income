<template lang='pug'>
modal-base-template(:fullscreen='true' :a11yTitle='L("How to join a group")')
  i18n.is-title-1.c-title(tag='h1') How to join a group

  .wrapper
    .slider
      .slide(v-observer:0='updateIndicator' :id='config[0]')
        .slide-img
          svg-invitation

        i18n.is-title-4(tag='h4') 1. Get an invitation
        i18n(tag='p') Click on the individual link you received from an existing group. Don't have an invite?
        i18n(tag='button' class='link' @click='showCreateModal') Create your own group

      .slide(v-observer:1='updateIndicator' :id='config[1]')
        .slide-img
          svg-access

        i18n.is-title-4(tag='h4') 2. Wait for an existing member to use the app
        i18n(tag='p') Because Group Income is end-to-end encrypted, an existing member must send you the secret keys to access the group. They will automatically do this when they load the app.

    .dots
      a.dot(
        v-for='(link, i) in config'
        :class='{ "is-active": ephemeral.indicator == i }'
        :href='"#"+link'
        :aria-label='L("Go to step {num}", { num: i + 1 })'
      )
</template>

<script>
import sbp from '@sbp/sbp'
import ModalBaseTemplate from '@components/modal/ModalBaseTemplate.vue'
import { REPLACE_MODAL } from '@utils/events.js'
import SvgAccess from '@svgs/access.svg'
import SvgInvitation from '@svgs/invitation.svg'
import SvgProposal from '@svgs/proposal.svg'

export default ({
  name: 'GroupJoinModal',
  components: {
    ModalBaseTemplate,
    SvgAccess,
    SvgInvitation,
    SvgProposal
  },
  data () {
    return {
      ephemeral: {
        indicator: 0
      },
      config: [
        'get-an-invitation',
        'use-your-unique-access-link'
      ]
    }
  },
  // TODO move this into slider component if we have more than one
  directives: {
    observer: {
      inserted: (el, { value, arg }) => {
        try {
          const io = new window.IntersectionObserver( // Intersection Observer API: https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API
            (elements) => {
              if (elements[0].intersectionRatio >= 0.5) { // Wait for the middle of the screen
                value(parseInt(arg))
              }
            },
            { threshold: [0.5] }
          )

          io.observe(el)

          el.giUnbind = () => {
            io.disconnect()
          }
        } catch (error) {
          console.error(error.message, '\n polyfill: https://github.com/w3c/IntersectionObserver')
        }
      },
      unbind (el) {
        el.giUnbind()
      }
    }
  },
  methods: {
    showCreateModal () {
      sbp('okTurtles.events/emit', REPLACE_MODAL, 'GroupCreationModal')
    },
    updateIndicator (i) {
      this.ephemeral.indicator = i
      history.pushState(null, null, `#${this.config[i]}`)
    }
  }
}: Object)
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-title {
  margin-top: 5rem;

  @include desktop {
    margin-top: 15vh;
  }
}

.wrapper {
  width: 100%;
  margin: 0 auto;

  @include desktop {
    width: auto;
  }
}

.slider {
  display: flex;
  overflow-x: auto;
  -ms-overflow-style: none;
  overflow: -moz-scrollbars-none;

  /* make it smooth on iOS */
  -webkit-overflow-scrolling: touch;
  scroll-snap-points-x: repeat(100vw);
  scroll-snap-type: x mandatory; // a helpful article for what this property does: https://developer.mozilla.org/en-US/docs/Web/CSS/scroll-snap-type
  scrollbar-width: none;

  &::-webkit-scrollbar {
    width: 0 !important;
  }
}

.slide {
  scroll-snap-align: center;
  flex-shrink: 0;
  width: 100%;
  padding: 0.75rem;
  text-align: center;

  @include desktop {
    text-align: left;
    width: 16rem;
  }

  p {
    max-width: 16rem;
    margin: 1rem auto 0 auto;
  }

  .link {
    margin-bottom: 1rem;
  }
}

.slide-img {
  display: flex;
  align-items: center;
  height: 6rem;
  margin: 2.5rem auto;

  svg {
    width: 100%;
    height: 100%;
  }

  @include desktop {
    margin: 3.5rem auto;
  }
}

.dots {
  display: flex;
  justify-content: center;

  @include desktop {
    display: none;
  }
}

.dot {
  background-color: $general_0;
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 50%;
  overflow: hidden;
  margin: 0.25rem;

  &.is-active {
    background-color: $primary_0;
  }
}

#get-an-invitation svg {
  height: 6.5rem;
  margin-left: 0.5rem;
  margin-top: -0.5rem;
}

#use-your-unique-access-link svg {
  height: 5.5rem;
  margin-top: 1.5rem;
}

#wait-for-you-group-vote svg {
  height: 6.75rem;
  margin-left: -0.5rem;
}
</style>
