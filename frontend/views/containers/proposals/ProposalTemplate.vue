<template lang='pug'>
  modal-template(
    class='is-centered'
    :class='{"has-background": !isConfirmation}'
  )
    template(slot='subtitle')
      i18n New proposal
    template(slot='title')
      i18n(key='title1' v-if='isConfirmation') Your proposal was created
      span(v-else) {{ title }}

    form.c-form
      slot

      label.field(v-if='isReasonStep' key="reason")
        i18n.label Why are you proposing this change?
        textarea.textarea(
          name='changeReason'
          ref='reason'
          maxlength='500'
        )
        i18n.helper This is optional.

      .c-confirmation(v-if='isConfirmation' key="confirmation")
        svg.c-svg
          use(xlink:href='#svg-proposal-created')

        i18n(html='Members of your group will now be asked to vote.</br>You need <strong>{value} yes votes</strong> for  your proposal to be accepted.' :args='{value: rule.value}')

        // TODO: Build a cleaner way of handling SVGs theme-proof
        svg.c-sprite(
          xmlns="http://www.w3.org/2000/svg"
          xmlns:xlink="http://www.w3.org/1999/xlink"
        )
          symbol#svg-proposal-created(xmlns="http://www.w3.org/2000/svg" width="126" height="107")
            path(fill="#0288D1" d="M125.115 30.6678l-1.5-2.5926-6.502 3.7462-10.745-18.5724 6.253-3.6025-1.5-2.5926-8.851 5.0994 1.795 3.1015c-1.435.1008-2.728.1587-3.916.1587-3.5622 0-6.3972-.5179-11.0422-1.6027a7.0187 7.0187 0 0 0-1.601-.1866c-4.625 0-7.718 4.4508-8.833 6.3648-2.138 3.6684-2.821 4.8589-3.502 6.0464-.597 1.0399-1.192 2.0777-2.769 4.7861l-2.185-1.2933-14.089 21.2348h-9.604l-13.627 10.6329.003.004h-.015v12.1617h5.528v33.5964h3V73.5616h57.188v33.5964h3.0002V73.5616h5.533V61.3999h-.014l.015-.02L93.4458 50.763h-2.279l4.012-6.4656-3.142-1.8581.165-.0659c1.848-.7474 3.55-.9939 5.501-.8143.368.033.743.0509 1.124.0509 2.7502 0 5.3832-.922 7.2232-2.5297.503-.4381.958-.7804 1.521-1.1416l7.014-4.5017 1.432 2.4749 9.098-5.2441zm-20.981 39.9H35.8848v-6.1751h68.2492v6.1751zm-11.7172-16.811l9.8532 7.6431H37.7628l9.794-7.6431h6.585l-1.332 2.0078h-3.059v2.9938h40.516v-2.9938h-2.203l1.246-2.0078h3.107zm-1.398-8.4405l-6.4 10.3126-28.109-.019 14.635-22.0531 1.776 1.0518 2.687 1.8272c-1.928 1.6336-2.688 4.3799-1.688 6.8428.926 2.2792 3.122 3.7522 5.595 3.7522.773 0 1.53-.1467 2.25-.4381l6.778-2.7413 2.476 1.4649zm14.9282-9.8974c-.693.4451-1.253.8652-1.873 1.4061-1.301 1.1376-3.214 1.7893-5.2472 1.7893-.289 0-.574-.014-.853-.039-2.465-.2235-4.601.0929-6.899 1.0219l-10.437 4.2202c-1.506.6068-3.336-.1826-3.938-1.6635-.626-1.5418.122-3.3041 1.666-3.9298l3.983-1.6127 10.104-4.6174c.396-.1806.693-.5239.815-.942a1.492 1.492 0 0 0-.182-1.2314l-.284-.4371c-.941-1.456-2.413-2.3412-4.142-2.4899a5.6167 5.6167 0 0 0-.514-.0219c-1.548 0-2.931.6077-3.999 1.7583-.938 1.0089-1.772 2.4839-2.442 3.6704-.314.5558-.639 1.1276-.863 1.449-.451.2694-1.658.8123-2.327 1.0428l-3.549-2.414c1.604-2.7572 2.205-3.8041 2.809-4.8529.679-1.1845 1.36-2.371 3.492-6.0294 1.778-3.0537 4.111-4.8759 6.239-4.8759.305 0 .612.0359.916.1058 4.771 1.1157 7.894 1.6835 11.7272 1.6835 1.654 0 3.491-.1088 5.578-.2784l7.354 12.7095-7.134 4.5785zm-20.5372-3.4967c.31-.481.628-.9241.938-1.2584.493-.5299 1.099-.7993 1.8-.7993.083 0 .167.003.253.0109.342.03.652.1148.93.2545l-3.921 1.7923z")
            path(stroke="#BFD4C3" stroke-width="3" d="M43.9091 19.1846L37.9253 1")
            path(stroke="#B3DBF2" stroke-width="3" d="M30.4092 41.139L15.9664 27.4005")
            path(stroke="#FFCEA8" stroke-width="3" d="M27.9093 55.1099L.6436 63.574")

      .buttons(:class='{ "is-centered": isConfirmation }')
        button.is-outlined(
          key="back"
          v-if='!isConfirmation'
          type="button"
          @click.prevent='prev'
          data-test='prevBtn'
        ) {{ currentStep === 0 ? L('Cancel') : L('Back') }}

        button(
          key="next"
          v-if='isNextStep'
          ref='next'
          @click.prevent='next'
          :disabled='disabled'
          data-test='nextBtn'
        )
          i18n Next
          i.icon-arrow-right

        i18n.is-success(
          key="create"
          tag='button'
          v-if='isReasonStep'
          ref='finish'
          @click.prevent='submit'
          :disabled='disabled'
          data-test='finishBtn'
        ) Create Proposal

        i18n.is-outlined(
          key='awesome'
          tag='button'
          v-if='isConfirmation'
          ref='close'
          @click.prevent='close'
          data-test='closeBtn'
        ) Awesome

    template(slot='footer' v-if='!isConfirmation && rule')
      .c-footer
        i.icon-vote-yea
        i18n(html='According to your voting rules, <strong>{value} out of {total} members</strong> will have to agree with this.' :args='{value: rule.value, total: rule.total}')
</template>

<script>
import ModalTemplate from '@components/Modal/ModalTemplate.vue'
import { CLOSE_MODAL } from '@utils/events.js'
import sbp from '~/shared/sbp.js'

export default {
  name: 'ModalForm',
  components: {
    ModalTemplate
  },
  props: {
    title: {
      type: String,
      required: true
    },
    rule: {
      type: Object,
      required: true
    },
    disabled: Boolean,
    maxSteps: {
      type: Number,
      required: true
    }
  },
  data () {
    return {
      currentStep: 0
    }
  },
  methods: {
    close () {
      sbp('okTurtles.events/emit', CLOSE_MODAL)
    },
    next () {
      this.currentStep++
      this.updateParent()
    },
    prev () {
      if (this.currentStep > 0) {
        this.currentStep--
        this.updateParent()
      } else {
        this.close()
      }
    },
    updateParent () {
      this.$emit('update:currentStep', this.currentStep)
    },
    submit () {
      this.next()
      this.$emit('submit', {
        reason: this.$refs.reason.value
      })
    }
  },
  computed: {
    isNextStep () {
      return this.currentStep <= this.maxSteps - 1
    },
    isReasonStep () {
      return this.currentStep === this.maxSteps
    },
    isConfirmation () {
      return this.currentStep === this.maxSteps + 1
    }
  }
}
</script>

<style lang="scss" scoped>
@import "../../../assets/style/_variables.scss";

.c-sprite {
  display: none;
}

.c-confirmation {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  margin-bottom: $spacer;
}

.c-svg {
  width: 8rem;
  height: 7rem;
  margin-bottom: $spacer-lg;
}

.c-form {
  position: relative;
}

.c-footer {
  display: flex;

  .icon-vote-yea {
    color: $primary_0;
    margin-right: $spacer;
  }
}
</style>
