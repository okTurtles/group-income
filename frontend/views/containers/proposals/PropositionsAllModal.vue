<template lang='pug'>
modal-base-template.has-background(ref='modal' :fullscreen='true' :a11yTitle='L("All proposals")')
  .c-container
    .c-header
      i18n.is-title-2.c-title(
        tag='h2'
      ) Archived proposals

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
          v-for='[hash, obj] of proposals'
          :key='hash'
          :proposalHash='hash'
          :proposalObject='obj'
        )
</template>

<script>
import sbp from '@sbp/sbp'
import ModalBaseTemplate from '@components/modal/ModalBaseTemplate.vue'
import ProposalItem from './ProposalItem.vue'
import { mapGetters, mapState } from 'vuex'

export default ({
  name: 'PropositionsAllModal',
  components: {
    ModalBaseTemplate,
    ProposalItem
  },
  data: () => ({
    ephemeral: {
      selectbox: {
        focused: false,
        selectedOption: 'Newest'
      },
      proposals: []
    }
  }),
  async mounted () {
    const key = `proposals/${this.ourUsername}/${this.currentGroupId}`
    const archivedProposals = await sbp('gi.db/archive/load', key) || []
    this.ephemeral.proposals = archivedProposals
  },
  methods: {
    unfocusSelect () {
      this.$refs.select.blur()
    }
  },
  computed: {
    ...mapState(['currentGroupId']),
    ...mapGetters(['currentGroupState', 'ourUsername']),
    proposals () {
      const p = this.ephemeral.proposals
      return this.ephemeral.selectbox.selectedOption === 'Newest' ? p : [...p].reverse()
    }
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
