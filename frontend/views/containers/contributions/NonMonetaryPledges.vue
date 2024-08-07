<template lang='pug'>
fieldset(
  data-test='nonMonetaryPledges'
  v-error:pledges=''
)
  legend.has-text-bold.c-legend
    i18n.is-title-4 Non-monetary pledge
    i18n.c-optional(v-if='optional') (optional)

  i18n.has-text-1 All members can support each other with non-monetary contributions. There's value in time, skills, and willingness to help the group.

  ul.c-fields(data-test='nonMonetaryFields')
    li.c-fields-item(
      v-for='(pledge, index) in form.pledges'
      :key='`pledge-${pledge.id}`'
      data-test='pledgeEntry'
    )
      fieldset
        .inputgroup
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

        span.error(v-if='$v.form.pledges.$each[index].value.$error') {{ getFieldErrorMsg(index) }}

  button.link.has-icon(
    type='button'
    @click='addPledgeEntry'
    data-test='addPledgeEntry'
  )
    i.icon-plus
    i18n Add more
</template>

<script>
import { mapGetters } from 'vuex'
import { L } from '@common/common.js'
import { validationMixin } from 'vuelidate'
import { maxLength } from 'vuelidate/lib/validators'
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
  computed: {
    ...mapGetters([
      'ourGroupProfile'
    ])
  },
  created () {
    if (this.ourGroupProfile.nonMonetaryContributions.length) {
      this.form.pledges = this.ourGroupProfile.nonMonetaryContributions.map(
        v => ({ id: randomHexString(10), value: v })
      )
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
    },
    getFieldErrorMsg (index) {
      // reference: https://vuelidate.js.org/#sub-collections-validation
      const currValidation = this.$v.form.pledges.$each[index].value

      if (currValidation.$error) {
        for (const key in currValidation.$params) {
          if (!cur[key]) {
            return key
          }
        }
      }
      return ''
    },
    checkHasUpdates () {
      const inProfile = this.ourGroupProfile.nonMonetaryContributions

      if (this.form.pledges.length !== inProfile.length) return true
      else {
        return this.form.pledges.some(entry => !inProfile.includes(entry.value))
      }
    },
    getValues () {
      return this.form.pledges.map(entry => entry.value).filter(Boolean)
    },
    validate () {
      this.$v.form.$touch()
      return !this.$v.form.$invalid
    }
  },
  validations () {
    return {
      form: {
        pledges: {
          [L('At least one non-monetary pledge is required.')]: (value) => {
            return this.optional ||
              (value?.length && value.some(entry => entry.value))
          },
          $each: {
            value: {
              [L('Non-monetary pledge cannot exceed {maxChars} characters.', {
                maxChars: GROUP_NON_MONETARY_CONTRIBUTION_MAX_CHAR
              })]: maxLength(GROUP_NON_MONETARY_CONTRIBUTION_MAX_CHAR)
            }
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
