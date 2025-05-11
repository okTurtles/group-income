<template lang='pug'>
PageTemplate.c-page-contracts
  template(#title='') {{ L('Contracts') }}

  Dropdown.c-filter-menu(
    defaultItemId='all-contracts'
    :isOverlayStyle='true'
    :options='ephemeral.filterOptions'
    @select='onFilterSelect'
  )

  section.c-contracts-list-container
    .summary-list.c-contracts-list
      .c-table-wrapper
        table.table.c-contract-ids-table
          thead
            tr
              i18n.c-th-contract-id(tag='th') contractID
              i18n.c-th-type(tag='th') Type
              i18n.c-th-size(tag='th') Size (MB)
              i18n.c-th-space(tag='th') Space Used(%)
              i18n.c-th-created-date(tag='th') Created on
              i18n.c-th-action(tag='th') Action

          tbody
            tr(v-for='item in filteredContracts' :key='item.contractId')
              td.c-cell-contract-id {{ item.contractId }}
              td.c-cell-type
                span.pill(:class='typeToPillMap(item.type)') {{ item.type }}
              td.c-cell-size {{ (item.size).toFixed(2) }}
              td.c-cell-space {{ (item.spaceUsed).toFixed(2) }}%
              td.c-cell-created-date {{ transformDate(item.createdDate) }}
              td.c-cell-action
                i18n.is-extra-small.has-blue-background(tag='button' @click='viewManifest(item)') view
</template>

<script>
import sbp from '@sbp/sbp'
import PageTemplate from './PageTemplate.vue'
import Dropdown from '@forms/Dropdown.vue'
import L from '@common/translations.js'
import { humanDate } from '@common/cdTimeUtils.js'
import { contractDummyData } from '@view-utils/dummy-data.js'
import { OPEN_MODAL } from '@view-utils/events.js'

export default {
  name: 'Contracts',
  components: {
    PageTemplate,
    Dropdown
  },
  data () {
    return {
      ephemeral: {
        contractFilter: { id: 'all-contracts', name: L('All contracts') },
        filterOptions: [
          { id: 'all-contracts', name: L('All contracts') },
          { id: 'chatroom', name: L('Chatroom') },
          { id: 'identity', name: L('Identity') },
          { id: 'group', name: L('Group') }
        ],
        contractDummyData
      }
    }
  },
  computed: {
    filteredContracts () {
      const filterId = this.ephemeral.contractFilter.id
      return this.ephemeral.contractDummyData
        .filter(item => filterId === 'all-contracts' || (item.type === `gi.contracts/${filterId}`))
    }
  },
  methods: {
    transformDate (date) {
      return humanDate(date, { month: 'short', day: 'numeric', year: 'numeric' })
    },
    onFilterSelect (item) {
      this.ephemeral.contractFilter = item
    },
    viewManifest (item) {
      sbp('okTurtles.events/emit', OPEN_MODAL, 'ViewContractManifestModal', { contract: item })
    },
    typeToPillMap (type) {
      const classMap = {
        'gi.contracts/group': 'is-neautral',
        'gi.contracts/chatroom': 'is-purple-1',
        'gi.contracts/identity': 'is-warning'
      }

      return classMap[type]
    }
  }
}
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-page-contracts {
  position: relative;
}

.c-filter-menu {
  position: absolute !important;
  top: 2rem;
  right: 1rem;

  ::v-deep .c-dropdown-trigger {
    min-width: 8.75rem;
  }
}

.c-contracts-list {
  position: relative;
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  max-width: max-content;
}

.c-table-wrapper {
  position: relative;
  overflow-x: auto;
  max-width: 100%;
}

.c-contract-ids-table {
  position: relative;
  height: max-content;
}

.c-th-contract-id,
.c-cell-contract-id {
  position: sticky;
  left: 0;
  padding: 0 0.8rem 0 0.2rem;
  background-color: var(--summary-list-bg-color);
  overflow: hidden;
}

.c-cell-contract-id {
  display: block;
  max-width: 10.75rem;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  direction: rtl;

  @include phone_narrow {
    max-width: 7.25rem;
  }
}

.c-th-type,
.c-cell-type {
  padding-left: 2.75rem;

  @include phone_narrow {
    padding-left: 1.85rem;
  }
}

.c-th-size,
.c-cell-size {
  min-width: 7.25rem;
  text-align: right;

  @include phone_narrow {
    min-width: 6.25rem;
  }
}

.c-th-space,
.c-cell-space {
  min-width: 11.25rem;
  text-align: center;

  @include phone_narrow {
    min-width: 9.75rem;
  }
}

.c-th-created-date,
.c-cell-created-date {
  min-width: 7.75rem;
  text-align: right;
}

.c-th-action,
.c-cell-action {
  min-width: 6.75rem;
  text-align: right;
  padding-right: 0.75rem;
}
</style>
