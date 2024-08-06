<template lang='pug'>
fieldset(data-test='nonMonetaryPledges')
  legend.has-text-bold.c-legend
    i18n.is-title-4 Non-monetary pledge
    i18n.c-optional(v-if='optional') (optional)

  i18n.has-text-1 All members can support each other with non-monetary contributions. There's value in time, skills, and willingness to help the group.

  ul.c-fields(ref='fields' data-test='nonMonetaryFields')
    li.c-fields-item(
      v-for='(pledge, index) in form.pledges'
      :key='`pledge-${pledge.id}`'
      data-test='pledgeEntry'
    )
      fieldset.inputgroup
        input.input(
          type='text'
          v-model='pledge.value'
          :aria-label='L("Pledge value")'
          :class='{ error: $v.form.pledges.$each[index].value.$error }'
        )
        button.is-icon-small.is-btn-shifted(
          type='button'
          :aria-label='L("Remove pledge entry")'
          @click='removeEntry(index)'
          data-test='removePledgeEntry'
        )
          i.icon-times

  button.link.has-icon(
    type='button'
    @click='addPledgeEntry'
    data-test='addPledgeEntry'
  )
    i.icon-plus
    i18n Add more
</template>

<script>
import { L } from '@common/common.js'
import { validationMixin } from 'vuelidate'
import { maxLength, required } from 'vuelidate/lib/validators'
import { GROUP_NON_MONETARY_CONTRIBUTION_MAX_CHAR } from '@model/contracts/shared/constants.js'
import { randomHexString } from '@model/contracts/shared/giLodash.js'

export default {
  name: 'NonMonetaryPledges',
  mixins: [validationMixin],
  props: {
    optional: {
      type: Boolean,
      default: false
    }
  },
  data () {
    return {
      form: {
        pledges: [
          { id: randomHexString(10), value: '' }
        ]
      }
    }
  },
  methods: {
    removeEntry (index) {
      if (this.form.pledges.length > 1) {
        // Remove the method from the list
        this.form.pledges.splice(index, 1)
      } else {
        this.form.pledges = [{ id: randomHexString(10), value: '' }]
      }
    },
    addPledgeEntry () {
      this.form.pledges.push({ id: randomHexString(10), value: '' })
    }
  },
  validations () {
    return {
      form: {
        pledges: {
          [L('At least one non-monetary pledge is required.')]: (value) => {
            return this.optional ||
              (value?.length && value.some(entry => entry.value))
          }
        }
      }
    }
  }
}
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-optional {
  display: inline-block;
  color: $text_1;
  user-select: none;
  font-size: $size_5;
  margin-left: 0.5rem;
}

.c-legend {
  margin-bottom: 0.25rem;
}

.c-fields {
  margin-top: 1rem;

  &-item {
    display: block;
    margin-bottom: 1rem;
  }
}
</style>
