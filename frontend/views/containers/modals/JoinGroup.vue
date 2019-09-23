<template lang='pug'>
modal-base-template
  i18n(tag='h1') How to join a group

  .wrapper
    .slider
      .slide#get-an-invitation(v-observer:0='updateIndicator')
        .slide-img
          svg.group-invitiation(width='156' height='127' viewbox='0 0 156 127')
            circle(r='5' transform='matrix(0.931917 -0.362717 0.362563 0.931941 136.361 42.0573)' fill='#FFCEA8' stroke='#FFCEA8')
            circle(r='2.5' transform='matrix(0.931917 -0.362717 0.362563 0.931941 101.317 31.4762)' fill='#BFD4C3' stroke='#BFD4C3')
            circle(r='5' transform='matrix(0.931917 -0.362717 0.362563 0.931941 114.957 12.754)' fill='#B3DBF2' stroke='#B3DBF2')
            path(d='M50.5445 103.371C50.6248 104.818 51.5892 106.023 52.8751 106.506C53.2769 106.666 53.6788 106.747 54.0806 106.747C55.045 106.747 56.0094 106.345 56.7327 105.541L63.805 97.7456L77.3067 107.148C77.9496 107.55 78.6729 107.791 79.4766 107.791C81.2446 107.791 82.7716 106.506 83.1734 104.818L95.9518 44.4623C96.1125 43.739 95.8714 42.9353 95.2285 42.4531C94.6659 41.9709 93.8622 41.8906 93.1389 42.1317L22.2553 73.1533C20.8087 73.7962 19.9247 75.2428 20.0051 76.8502C20.0854 78.4575 21.1302 79.7434 22.6572 80.2256L49.7408 88.423L50.5445 103.371ZM54.5628 102.085L54.0003 90.9144L60.5903 95.4953L54.5628 102.085ZM79.3962 103.612L54.8039 86.6549L90.4868 51.0524L79.3962 103.612ZM86.2274 49.6058L51.107 84.6458L24.4252 76.6091L86.2274 49.6058Z' fill='#0288D1')

        i18n(tag='h4') 1. Get an invitation
        i18n(tag='p')
          | For now, the only way to join a group is to get an invitation. Don’t know anyone using Group Income?
        i18n(tag='button' class='link') Create your own group

      .slide#wait-for-you-group-vote(v-observer:1='updateIndicator')
        .slide-img
          svg.group-vote(width='126' height='108' viewbox='0 0 126 108')
            path(d='M125.115 30.154L123.615 27.5606L117.113 31.3079L106.368 12.7298L112.621 9.12613L111.121 6.53271L102.27 11.6337L104.065 14.7362C102.63 14.837 101.337 14.8949 100.149 14.8949C96.587 14.8949 93.752 14.3769 89.107 13.2918C88.58 13.168 88.041 13.1051 87.506 13.1051C82.881 13.1051 79.788 17.5572 78.673 19.4718C76.535 23.1414 75.852 24.3323 75.171 25.5202C74.574 26.5603 73.979 27.5985 72.402 30.3077L70.217 29.014L56.128 50.2554H46.524L32.897 60.8917L32.9 60.8956H32.885V73.0611H38.413V106.668H41.413V73.0611H98.601V106.668H101.601V73.0611H107.134V60.8956H107.12L107.135 60.8757L93.446 50.2554H91.167L95.179 43.7879L92.037 41.9292L92.202 41.8633C94.05 41.1156 95.752 40.869 97.703 41.0487C98.071 41.0817 98.446 41.0996 98.827 41.0996C101.577 41.0996 104.21 40.1773 106.05 38.5691C106.553 38.1309 107.008 37.7885 107.571 37.4271L114.585 32.9241L116.017 35.3997L125.115 30.154ZM104.134 70.0664H35.885V63.8894H104.134V70.0664ZM92.417 53.2502L102.27 60.8956H37.763L47.557 53.2502H54.142L52.81 55.2586H49.751V58.2533H90.267V55.2586H88.064L89.31 53.2502H92.417ZM91.019 44.8071L84.619 55.1228L56.51 55.1039L71.145 33.0439L72.921 34.096L75.608 35.9238C73.68 37.5579 72.92 40.305 73.92 42.7687C74.846 45.0486 77.042 46.522 79.515 46.522C80.288 46.522 81.045 46.3753 81.765 46.0838L88.543 43.3417L91.019 44.8071ZM105.947 34.9066C105.254 35.3518 104.694 35.772 104.074 36.3131C102.773 37.4511 100.86 38.1029 98.827 38.1029C98.538 38.1029 98.253 38.0889 97.974 38.064C95.509 37.8404 93.373 38.1568 91.075 39.0862L80.638 43.3077C79.132 43.9146 77.302 43.125 76.7 41.6437C76.074 40.1014 76.822 38.3385 78.366 37.7126L82.349 36.0995L92.453 31.4806C92.849 31.2999 93.146 30.9566 93.268 30.5383C93.389 30.121 93.324 29.6718 93.086 29.3065L92.802 28.8692C91.861 27.4128 90.389 26.5274 88.66 26.3786C88.487 26.3627 88.315 26.3567 88.146 26.3567C86.598 26.3567 85.215 26.9646 84.147 28.1156C83.209 29.1248 82.375 30.6002 81.705 31.7871C81.391 32.3431 81.066 32.9151 80.842 33.2365C80.391 33.506 79.184 34.0491 78.515 34.2797L74.966 31.8649C76.57 29.1068 77.171 28.0597 77.775 27.0105C78.454 25.8256 79.135 24.6387 81.267 20.9792C83.045 17.9246 85.378 16.1018 87.506 16.1018C87.811 16.1018 88.118 16.1377 88.422 16.2076C93.193 17.3236 96.316 17.8916 100.149 17.8916C101.803 17.8916 103.64 17.7828 105.727 17.6131L113.081 30.3267L105.947 34.9066ZM85.41 31.4088C85.72 30.9276 86.038 30.4844 86.348 30.15C86.841 29.6199 87.447 29.3504 88.148 29.3504C88.231 29.3504 88.315 29.3534 88.401 29.3614C88.743 29.3913 89.053 29.4762 89.331 29.6159L85.41 31.4088Z' fill='#0288D1')
            path(d='M43.9088 18.6673L37.9251 0.476912' stroke='#BFD4C3' stroke-width='3')
            path(d='M30.4089 40.6285L15.9662 26.8856' stroke='#B3DBF2' stroke-width='3')
            path(d='M27.9091 54.6037L0.643369 63.0705' stroke='#FFCEA8' stroke-width='3')

        i18n(tag='h4') 2. Wait for the group vote
        i18n(tag='p') On Group Income, every major decision goes through a voting process. This includes adding new members.

      .slide#use-your-unique-access-link(v-observer:2='updateIndicator')
        .slide-img
          svg(width='124' height='89' viewbox='0 0 124 89')
            path(fill-rule='evenodd' clip-rule='evenodd' d='M26.2553 8.36307C27.5891 8.36307 28.6863 9.47985 28.6863 10.8065C28.6863 12.133 27.5891 13.2499 26.2553 13.2499C24.923 13.2499 23.8358 12.133 23.8358 10.8065C23.8358 9.47985 24.923 8.36307 26.2553 8.36307Z' fill='#BFD4C3')
            path(fill-rule='evenodd' clip-rule='evenodd' d='M17.591 8.36307C18.9235 8.36307 20.0105 9.47985 20.0105 10.8065C20.0105 12.133 18.9235 13.2499 17.591 13.2499C16.2587 13.2499 15.16 12.1456 15.16 10.8065C15.16 9.46723 16.2587 8.36307 17.591 8.36307Z' fill='#FFCEA8')
            path(fill-rule='evenodd' clip-rule='evenodd' d='M8.91552 8.36307C10.248 8.36307 11.335 9.47985 11.335 10.8065C11.335 12.133 10.248 13.2499 8.91552 13.2499C7.58318 13.2499 6.4845 12.1456 6.4845 10.8065C6.4845 9.46723 7.58318 8.36307 8.91552 8.36307Z' fill='#EBB3B3')
            path(fill-rule='evenodd' clip-rule='evenodd' d='M101.727 0.48407C106.568 0.48407 110.539 4.48348 110.539 9.35168V63.6259C110.539 68.5047 106.568 72.5065 101.727 72.5065C101.727 72.5065 14.181 72.5065 9.33943 72.5065C4.49789 72.5065 0.539429 68.5021 0.539429 63.6259V9.35168C0.539429 4.48618 4.49789 0.48407 9.33943 0.48407H101.727ZM101.727 3.06188H9.33943C5.89272 3.06188 3.09757 5.89083 3.09757 9.35168V17.8327H107.981V9.35168C107.981 5.89341 105.173 3.06188 101.727 3.06188ZM107.981 20.4105H3.09757V63.6259C3.09757 67.1017 5.89272 69.9287 9.33943 69.9287H101.727C105.173 69.9287 107.981 67.0991 107.981 63.6259V20.4105Z' fill='#0288D1')
            path(d='M122.29 67.0306C122.29 76.7829 114.389 84.6877 104.645 84.6877C94.9005 84.6877 87 76.7829 87 67.0306C87 57.2782 94.9005 49.3734 104.645 49.3734C114.389 49.3734 122.29 57.2782 122.29 67.0306Z' fill='white' stroke='#0288D1' stroke-width='2')
            path(d='M113.701 76.0926L113.599 72.4883L106.832 65.6795C107.036 65.0853 107.152 64.4498 107.152 63.7869C107.152 60.5733 104.564 57.9685 101.371 57.9685C98.1775 57.9685 95.5887 60.5733 95.5887 63.7869C95.5887 66.9999 98.1775 69.6052 101.371 69.6052C101.915 69.6052 102.44 69.5238 102.94 69.3823L104.389 70.8405H107.254V73.3122H110.426V76.0926H113.701ZM99.9379 64.1466C98.9484 64.1466 98.1467 63.3397 98.1467 62.3444C98.1467 61.3486 98.9484 60.5423 99.9379 60.5423C100.927 60.5423 101.729 61.3486 101.729 62.3444C101.729 63.3397 100.927 64.1466 99.9379 64.1466Z' fill='#0288D1')

        i18n(tag='h4') 3. Use your unique access link
        i18n(tag='p') Once the group agrees that you should join them, a unique access link will be generated, giving you instant access to the group

    .dots
      a.dot(:class='{ active: indicator === "0" }' href='#get-an-invitation')
      a.dot(:class='{ active: indicator === "1" }' href='#wait-for-you-group-vote')
      a.dot(:class='{ active: indicator === "2" }' href='#use-your-unique-access-link')
</template>

<script>
import ModalBaseTemplate from '@components/Modal/ModalBaseTemplate.vue'
import { REPLACE_MODAL } from '@utils/events.js'
import sbp from '~/shared/sbp.js'

export default {
  name: 'JoinGroupModal',
  components: {
    ModalBaseTemplate
  },
  data () {
    return {
      indicator: 0
    }
  },
  // TODO move this into slider component if we have more than one
  directives: {
    observer: {
      inserted: (el, { value, arg }) => {
        try {
          const io = new window.IntersectionObserver(
            (elements) => {
              if (elements[0].intersectionRatio >= 0.5) {
                value(arg)
              }
            },
            { threshold: [0.5] }
          )

          io.observe(el)

          el.stop = () => {
            io.disconnect()
          }
        } catch (error) {
          console.error(error.message, `\n polyfill: https://github.com/w3c/IntersectionObserver`)
        }
      }
    },
    unbind (el) {
      el.stop()
    }
  },
  methods: {
    showLoginModal () {
      sbp('okTurtles.events/emit', REPLACE_MODAL, 'CreateGroup')
    },
    updateIndicator (i) {
      this.indicator = i
    }
  }
}
</script>

<style lang="scss" scoped>
@import "../../../assets/style/_variables.scss";

.modal {
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background-color: $general_2;
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
  scroll-snap-type: x mandatory;

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
  align-items: flex-end;
  justify-content: center;
  height: 6rem;
  margin: 2.5rem auto;

  @include desktop {
    margin-left: 0;
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

  &.active {
    background-color: $primary_0;
  }
}
.group-invitiation {
  margin-left: 1rem;
  @include desktop {
    margin-left: -1rem;
  }
}

.group-vote {
  margin-left: -2rem;
  @include desktop {
    margin-left: -1rem;
  }
}
</style>
