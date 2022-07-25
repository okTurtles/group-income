<template lang='pug'>
modal-base-template.has-background(ref='modal' :fullscreen='true' :a11yTitle='L("All proposals")')
  .c-container
    .c-header
      i18n.is-title-2.c-title(
        tag='h2'
      ) All proposals

    .c-header-info
      i18n.has-text-1(
        tag='div'
        :args='{ groupProposalsCount: proposals.length }'
      ) {groupProposalsCount} proposals

      .selectsolo
        select.select(
          ref='select'
          v-model='ephemeral.selectbox.selectedOption'
          @change='unfocusSelect'
        )
          option(value='Newest') {{ L('Newest first') }}
          option(value='Oldest') {{ L('Oldest first') }}

    .card.c-card
      ul(data-test='proposalsWidget')
        proposal-item(
          v-for='hash in sortedProposal'
          :key='hash'
          :proposalHash='hash'
        )
</template>

<script>
import ModalBaseTemplate from '@components/modal/ModalBaseTemplate.vue'
import ProposalItem from './ProposalItem.vue'

export default ({
  name: 'PropositionsAllModal',
  components: {
    ModalBaseTemplate,
    ProposalItem
  },
  data: () => ({
    proposals: Object,
    ephemeral: {
      selectbox: {
        focused: false,
        selectedOption: 'Newest'
      }
    }
  }),
  methods: {
    unfocusSelect () {
      this.$refs.select.blur()
    }
  },
  computed: {
    sortedProposal () {
      return this.ephemeral.selectbox.selectedOption === 'Newest' ? this.proposals : [...this.proposals].reverse()
    }
  },
  created () {
    this.proposals = this.$route.query.proposals
  }
}: Object)
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-container {
  height: 100%;
  width: 100%;
  background-color: $general_2;
}

.c-header,
.c-container {
  @include tablet {
    width: 50rem;
    max-width: 100%;
  }
}

.c-header {
  display: flex;
  height: 4.75rem;
  justify-content: center;
  align-items: center;
  padding-top: 0;
  background-color: $background_0;
  margin: 0 -1rem;

  @include phone {
    justify-content: left;
    padding-left: 1rem;
  }

  @include tablet {
    padding-top: 2rem;
    justify-content: flex-start;
    background-color: transparent;
    margin: 0;
  }
}

.c-description {
  color: $text_1;

  @include phone {
    position: absolute;
    top: 5.5rem;
  }
}

.c-header-info {
  display: flex;
  height: 3.75rem;
  align-items: center;
  justify-content: space-between;
}
</style>
