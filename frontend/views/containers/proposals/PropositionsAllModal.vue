<template lang='pug'>
modal-base-template.has-background(ref='modal' :fullscreen='true' :a11yTitle='L("All proposals")')
  .c-container
    .c-header
      i18n.is-title-2.c-title(
        tag='h2'
      ) All proposals

    .card.c-card
      ul(data-test='proposalsWidget')
        proposal-item(
          v-for='hashe in proposals'
          :key='hashe'
          :proposalHash='hashe'
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
  data: {
    proposals: Object
  },
  created () {
    console.log('ee', this.$route.query)
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

.c-card {
  margin-top: 1.5rem;

  @include phone {
    margin-top: 3rem;
  }
}

.c-member-count {
  margin-top: 0.5rem;
  margin-bottom: 1.5rem;
}

.c-identity {
  display: flex;
  align-items: center;
  flex-grow: 1;
}

.c-name {
  margin: 0 0.5rem 0 1.5rem;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.c-display-name {
  color: var(--text_1);
}

.c-search-member .c-twrapper {
  display: flex;
  height: 4.5rem;
  padding: 0 0.5rem;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid $general_0;
  transition: opacity ease-in 0.25s, height ease-in 0.25s;

  &:last-child {
    border-bottom: 0;
  }

  &:hover {
    background-color: $general_1;
    cursor: pointer;
  }
}

.slide-list-enter,
.slide-list-leave-to {
  height: 0;
  opacity: 0;
}

.slide-list-leave-active {
  overflow: hidden;
  border-bottom: 0;
}

.c-actions-buttons {
  display: none;
  margin-top: 0;

  i {
    margin-right: 0.5rem;
  }

  @include tablet {
    display: block;
  }
}

::v-deep .c-actions span {
  margin-left: 0.3rem;

  @include phone {
    display: none;
  }
}

.c-action-menu {
  @include tablet {
    display: none;
  }
}

.is-subtitle {
  display: flex;
  margin-top: 1.875rem;
  margin-bottom: 0.5rem;
}

.c-second-section::before {
  content: "";
  position: absolute;
  background-color: $general_2;
  height: 1px;
  width: calc(100% + 6rem);
  top: 0;
  left: -3rem;
}
</style>
