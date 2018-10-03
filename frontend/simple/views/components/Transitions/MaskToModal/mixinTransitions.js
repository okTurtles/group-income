import Velocity from 'velocity-animate'

const animationMixins = {
  // TODO - some variables are welcomed!

  methods: {
    // Trigger transitions
    transTriggerEnter (el, complete) {
      console.log('transTriggerEnter')

      this.updateSize(el, 'trigger')

      Velocity(el, { opacity: 0 }, { duration: 0 })
      Velocity(el, { opacity: 1 }, { duration: 150, delay: 350, complete })
    },
    transTriggerLeave (el, complete) {
      console.log('transTriggerLeave')

      this.updateSize(el, 'trigger')

      Velocity(el, { opacity: 0 }, { duration: 150, complete })
    },

    // Target transitions
    transTargetEnter (el, complete) {
      console.log('transTargetEnter')
      const targetInner = this.getTargetInnerWhen('enter')
      this.updateSize(targetInner, 'target')

      Velocity(el, { opacity: 0 }, { duration: 0 })
      Velocity(targetInner, { opacity: 0 }, { duration: 0 })

      this.updateSize(targetInner, 'target')

      Velocity(el, { opacity: 1 }, { duration: 150, delay: 150 })
      Velocity(targetInner, 'fadeIn', { duration: 150, delay: 350, complete })
    },
    transTargetAfterEnter (el) {
      console.log('transTargetAfterEnter')
      Velocity(el, { opacity: 1 }, { duration: 0 })
    },
    transTargetLeave (el, complete) {
      console.log('transTargetLeave')
      const targetInner = this.getTargetInnerWhen('leave')
      this.updateSize(targetInner, 'target')

      Velocity(targetInner, { opacity: 0 }, { duration: 50 })
      Velocity(el, { opacity: 0 }, { duration: 150, delay: 250, complete })
    },

    // Mask transitions
    // when animates to target (form)
    transMaskEnter (el, complete) {
      console.log('transMaskLeave')

      Velocity(el, { opacity: 0, ...this.elementsSize.trigger }, { duration: 0 })

      Velocity(el, { opacity: 1 }, { duration: 150 })
      Velocity(el, { ...this.elementsSize.target }, { duration: 250, easing: 'ease-out' })
      Velocity(el, { opacity: 0 }, { duration: 150, complete })
    },

    // when animates back to trigger (contribution / missing message)
    transMaskLeave (el, complete) {
      console.log('transMaskEnter')
      Velocity(el, { opacity: 0, ...this.elementsSize.target }, { duration: 0 })

      Velocity(el, { opacity: 1 }, { duration: 50 })
      Velocity(el, { ...this.elementsSize.trigger }, { duration: 250, delay: 50, easing: 'ease-out' })
      Velocity(el, { opacity: 0 }, { duration: 150, complete })
    },

    // animation utils:
    updateSize (el, name) {
      const { width, height, top, left } = el.getBoundingClientRect()

      // REVIEW - how can we pass the element sizes from trigger/target to masker
      // without using the parent that contains them?
      // maybe using provide / inject pattern?
      this.$emit('animate', { name, size: { width, height, top, left } })
    },
    getTargetInnerWhen (scenario) {
      // we want the entire modal to fade in/out, (modal-card + modal-background)
      // but we want the Masker to take the .modal-card shape only instead

      // - REVIEW: If you know a easier way to get the modal's .card element,
      // please let me know how to do it!
      if (scenario === 'enter') {
        // this.targetCard is not available yet,
        // so we need to access it accessing $slots
        return this.$slots.default[0].componentInstance.$refs.modal.$refs.card
      } else if (scenario === 'leave') {
        // here the $slot doesn't exist, so we use this.targetCard prop provided
        return this.targetCard.$refs.modal.$refs.card
      }
    }
  }
}

export default animationMixins
