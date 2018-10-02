import Velocity from 'velocity-animate'

const animationMixins = {
  // TODO - some variables are welcomed!

  methods: {
    // Trigger animations
    transTriggerEnter (el, complete) {
      console.log('transTriggerEnter')

      this.updateDimensions(el, 'trigger')

      Velocity(el, { opacity: 0 }, { duration: 0 })
      Velocity(el, { opacity: 1 }, { duration: 150, delay: 350, complete })
    },
    transTriggerLeave (el, complete) {
      console.log('transTriggerLeave')

      this.updateDimensions(el, 'trigger')

      Velocity(el, { opacity: 0 }, { duration: 150, complete })
    },

    // Target animations
    transTargetEnter (el, complete) {
      console.log('transTargetEnter')
      const targetInner = this.getTargetInnerWhen('enter')
      this.updateDimensions(targetInner, 'target')

      Velocity(el, { opacity: 0 }, { duration: 0 })
      Velocity(targetInner, { opacity: 0 }, { duration: 0 })

      this.updateDimensions(targetInner, 'target')

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
      this.updateDimensions(targetInner, 'target')

      Velocity(targetInner, { opacity: 0 }, { duration: 50 })
      Velocity(el, { opacity: 0 }, { duration: 150, delay: 250, complete })
    },

    // Mask animations
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
    updateDimensions (el, name) {
      const { width, height, top, left } = el.getBoundingClientRect()

      // REVIEW - how can we pass the element sizes from trigger/target to masker
      // without using the parent that contains them?
      // maybe using provide / inject pattern?
      this.$emit('animate', { name, size: { width, height, top, left } })
    },
    getTargetInnerWhen (scenario) {
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
