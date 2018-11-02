import Velocity from 'velocity-animate'

/**
There are 4 components that composes these transitions:
- the `MaskToModal` - a wrapper around all the other components that keeps the elementsSpecs
- the `Trigger` - a contribution or the warning message to add income details
- the `Target` - Income Details modal
- the `Masker` - A simple blue empty box

The secret of this animation is the `<masker>` - it's responsible for the major
part of the animation.
Here's what happens when the user clicks on a Trigger:
  1. `Trigger` fades out.
  2. the `Target`, is added to the DOM _invisible_.
  3. `Masker` fadesIn at the exactly same time that Trigger is fading out and
  takes its specs (updateSpecsOf).
  4. `Masker` animates to take the `Target` dimensions/position
  5. Once that animation is finished `Masker` fades out and `Target` fades in at the same time.

When closing the Target, the same animation happens in the inverted order but slightly faster.

Entrance animations are designed to be smoother than exits so the user better
understands the context of the new content easier (less cognitive process).
The exit time is faster than the entrance time because the user already knows
the original context.
If both entrance/exit animations take the same time the user will perceive the exit animation
as being slower that the entrance, this is a way to trick his/her mind.
This time is cutted at the Trigger fadeOut moment.
*/

const animationMixins = {
  data () {
    return {
      config: {
        // Trigger/Target time to fadeIn/Out - give a delay, so the Masker starts first.
        fade: 75,
        fadeDelay: 50,
        // Target/Masker time to fade back to original position - slightly faster
        fadeBack: 50,
        // Masker time to animate between the Target and a Trigger (and vice versa)
        maskerTime: 250,
        // A little big less than the time for Target/Trigger to fadeIn + maskerTime (adjust to the eye perception)
        delay: 300
      }
    }
  },
  inject: ['MaskToModal'],
  beforeMount () {
    // Triggers & Target need to be invisible at the first frame
    // Safari has a flickering bug on the first frame when entering.
    // That happens right before elementStartsInvisible() is called.
    // so we need to force it to be invisible before it enters the DOM.
    this.$vnode.data.style = { opacity: 0 }
  },
  methods: {
    // -- Trigger animations
    triggerEnter (el, complete) {
      console.log('triggerEnter')
      this.updateSpecsOf(el, 'trigger')

      this.elementStartsInvisible(el)
      // Fades In only after the masker animation is completed.
      Velocity(el, { opacity: 1 }, { duration: this.config.fade, delay: this.config.delay, complete })
    },
    triggerLeave (el, complete) {
      console.log('triggerLeave')
      this.updateSpecsOf(el, 'trigger')

      // Fade out the targetInner after the user interaction...
      Velocity(el, { opacity: 0 }, { duration: this.config.fade, delay: this.config.fadeDelay, complete })
    },

    // -- Target animations
    targetEnter (el, complete) {
      console.log('targetEnter')
      const targetInner = this.getTargetInnerWhen('enter')
      this.updateSpecsOf(targetInner, 'target')

      this.elementStartsInvisible(el)
      this.elementStartsInvisible(targetInner)

      // Fade in the Target after the Trigger has fade out...
      Velocity(el, { opacity: 1 }, { duration: this.config.fade, delay: this.config.fade })
      // And Fade in the targetInner only after the Masker has completed its transition animation
      Velocity(targetInner, { opacity: 1 }, { duration: this.config.fade, delay: this.config.delay, complete })
    },
    transitionAfterEnter (el) {
      console.log('transitionAfterEnter')
      // Trigger/Target has opacity: 0 by default, so let's force to stay 1 after the animation finishes.
      Velocity(el, { opacity: 1 }, { duration: 0 })
    },
    targetLeave (el, complete) {
      console.log('targetLeave')
      const targetInner = this.getTargetInnerWhen('leave')
      this.updateSpecsOf(targetInner, 'target')

      // Fade out the targetInner after the user interaction...
      Velocity(targetInner, { opacity: 0 }, { duration: this.config.fadeBack / 2, delay: this.config.fadeBack / 2 })

      // But only fades out complety the Target (that has the dark background)
      // after Masker goes back to the initial position
      Velocity(el, { opacity: 0 }, { duration: this.config.fade, delay: this.config.maskerTime, complete })
    },
    elementStartsInvisible (el) {
      // Use only opacity to fadeIn/Out because it's faster than
      // Velocity's 'fadeIn' feature (it doesn't use display)
      Velocity(el, { opacity: 0 }, { duration: 0 })
    },

    // -- Masker animations
    // when animates to Target
    maskEnter (el, complete) {
      console.log('maskLeave')

      this.maskerTakesImmediatelyTheShapeOf(el, 'trigger', this.config.fade)
      this.maskerAnimatesToTheShapeOf(el, 'target', complete)
    },

    // when animates back to a Trigger
    maskLeave (el, complete) {
      console.log('maskEnter')

      this.maskerTakesImmediatelyTheShapeOf(el, 'target', this.config.fadeBack)
      this.maskerAnimatesToTheShapeOf(el, 'trigger', complete)
    },

    // -- Animation utils
    maskerTakesImmediatelyTheShapeOf (maskerEl, originalElement, duration) {
      // Masker takes imediately the specs (dimensions and position)
      // of the originalElement (Trigger or Target) size...
      Velocity(maskerEl, { opacity: 0, ...this.getSpecsOf(originalElement) }, { duration: 0 })

      // And fadesIn at the same time as the originalElement (trigger or target) is fading Out
      Velocity(maskerEl, { opacity: 1 }, { duration })
    },
    maskerAnimatesToTheShapeOf (el, originalElement, complete) {
      // Then it animates to the the originalElement specs creating the "growing effect"
      Velocity(el, { ...this.getSpecsOf(originalElement) }, { duration: this.config.maskerTime, easing: 'ease-out' })
      // And finally it fades out at the same time Target is fading in.
      Velocity(el, { opacity: 0 }, { duration: this.config.fade, complete })
    },
    updateSpecsOf (el, elementId) {
      this.MaskToModal.updateSpecsOf(el, elementId)
    },
    getSpecsOf (elementId) {
      return this.MaskToModal.elementsSpecs[elementId]
    },
    getTargetInnerWhen (scenario) {
      // Why targetInner is .modal-card:
      // We want the whole Target (modal) to fade, (modal-card + modal-background)
      // but we want the Masker to take just the .modal-card shape instead

      // - REVIEW: If you know a easier way to get the modal's .card element,
      // please let me know how to do it!
      if (scenario === 'enter') {
        // this.targetCard is not available yet,
        // so we need to access by using $slots.default
        return this.$slots.default[0].componentInstance.$refs.modal.$refs.card
      } else if (scenario === 'leave') {
        // here the $slot doesn't exist, so we use the provided prop.targetCard
        return this.targetCard.$refs.modal.$refs.card
      }
    }
  }
}

export default animationMixins
