<template lang='pug'>
  ul.c-wrapper
    li.cardBox(
      v-for='option in votingSytemSorted'
      :class='{ isActive: isVotingActive(option) }'
      :aria-current='isVotingActive(option) ? "true" : "false"'
    )
      span.pill.is-primary.c-active(v-if='isVotingActive(option)') Active
      p.is-title-4 {{ config[option].title }}
      p.has-text-1.c-expl(v-html='config[option].explanation')

      dl.c-status(v-if='isVotingActive(option)')
        dt.c-status-term {{ config[option].status }}
        dd.c-status-desc
          span(v-html='votingValue(option)')
          i18n.link(
            tag='button'
            @click='openProposal(option)'
          ) Propose change

      banner-simple.c-banner(
        severity='info'
        v-if='isVotingRuleAdjusted(option)'
      )
        | * &nbsp;
        i18n This value was automatically adjusted because your group is currently smaller than the disagreement number.

      i18n.link(
        v-if='!isVotingActive(option)'
        tag='button'
        @click='openProposal(option)'
      ) Propose changing to this voting system
</template>

<script>
import sbp from '~/shared/sbp.js'
import { OPEN_MODAL } from '@utils/events.js'
import L, { LTags } from '@view-utils/translations.js'
import BannerSimple from '@components/banners/BannerSimple.vue'

export default {
  name: 'GroupVotingSystem',
  components: {
    BannerSimple
  },
  data: () => ({
    config: {
      threshold: {
        title: L('Percentage based'),
        explanation: L('Define the percentage of members that will need to agree to a proposal.'),
        status: L('Percentage of members that need to agree:')
      },
      disagreement: {
        title: L('Disagreement number'),
        explanation: L('Define the maximum number of people who can {b_}disagree{_b} on a proposal', LTags('b')),
        status: L('Maximum number of “no” votes:')
      }
    }
  }),
  computed: {
    votingSytemSorted () {
      return ['disagreement', 'threshold'] // TODO sort order based on settings.
    }
  },
  methods: {
    openProposal (setting) {
      sbp('okTurtles.events/emit', OPEN_MODAL, 'ChangeVotingProposal', { setting })
    },
    isVotingActive (option) {
      return option === this.votingSytemSorted[0]
    },
    isVotingRuleAdjusted (option) {
      if (!this.isVotingActive(option)) return false

      return true // TODO this
    },
    votingValue (option) {
      const HTMLBold = (txt) => `<span class="has-text-bold">${txt}</span>`
      const HTMLSmall = (txt) => ` <span class="has-text-1 has-text-small">(${txt})</span>`

      if (option === 'threshold') {
        const percent = '75%'
        return `${HTMLBold(percent)} ${HTMLSmall(L('{count} out of {total} members', {
          count: 8,
          total: 10
        }))}`
      } else {
        const original = 5
        const adjusted = 1
        let result = HTMLBold(original)

        if (original !== adjusted) {
          result += HTMLSmall(L('adjusted to {nr}', { nr: adjusted }) + '*')
        }
        return result
      }
    }
  }
}
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-wrapper {
  margin-top: 1.5rem;
}

.c-active {
  position: absolute;
  top: 1rem;
  right: 1rem;
}

.c-expl {
  margin-bottom: 1.5rem;
}

.c-status {
  margin-bottom: 1rem;

  &-term,
  &-desc {
    display: inline;
  }

  &-term,
  &-desc > :first-child {
    margin-right: 0.5rem;
  }
}

</style>
