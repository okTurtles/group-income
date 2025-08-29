<template lang='pug'>
  modal-template.has-background(
    ref='modal'
    :a11yTitle='config.title'
  )
    template(slot='title')
      span {{ config.title }}

    form.c-form(@submit.prevent='')
      i18n.has-text-1(tag='p') Update permissions for:

      template(v-if='data')
        member-name.c-member-name(:memberID='data.memberID')

      .buttons.c-button-container
        i18n.is-outlined(
          tag='button'
          @click.prevent='close'
        ) Cancel

        button-submit.is-success(@click='submit') Update
</template>

<script>
import sbp from '@sbp/sbp'
import ModalTemplate from '@components/modal/ModalTemplate.vue'
import ButtonSubmit from '@components/ButtonSubmit.vue'
import MemberName from './MemberName.vue'
import { CLOSE_MODAL } from '@utils/events.js'
import { L } from '@common/common.js'

export default {
  name: 'EditPermissionsModal',
  components: {
    ModalTemplate,
    ButtonSubmit,
    MemberName
  },
  props: {
    data: {
      // { roleName: string, permissions: string[], memberID: string }
      type: Object
    }
  },
  data () {
    return {
      config: {
        title: L('Edit member permissions')
      }
    }
  },
  methods: {
    close () {
      sbp('okTurtles.events/emit', CLOSE_MODAL, 'EditPermissionsModal')
    },
    submit () {
      try {
        console.log('TODO!', this.data)
      } catch (e) {
        console.error('EditPermissionsModal.vue submit() caught error: ', e)
      }
    }
  },
  created () {
    if (!this.data?.memberID) {
      this.close()
    }
  }
}
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-update-table {
  position: relative;
  width: 100%;
  margin-top: 1.25rem;

  @include tablet {
    margin-top: 1.5rem;
  }
}

.c-member-name {
  margin-top: 1rem;
}

.c-update-table-item {
  position: relative;
  display: flex;
  align-items: flex-start;
  justify-content: flex-start;
  width: 100%;
  padding: 1rem 0;

  &:not(:last-child) {
    border-bottom: 1px solid $general_0;
  }

  .c-item-content {
    position: relative;
    width: 100%;
  }
}

.c-label {
  display: inline-block;
  font-size: $size_5;
  color: $text_1;
  text-transform: uppercase;
  width: 7rem;
  flex-shrink: 0;
}
</style>
