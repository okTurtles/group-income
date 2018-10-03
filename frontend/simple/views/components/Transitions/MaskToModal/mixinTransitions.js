import Velocity from 'velocity-animate'

/**
There are 3 elements that composes this transitions:
- the `Trigger` - a contribution or the warning message to add income details
- the `Target` - Income Details modal
- the `Masker` - A simple blue empty box

The secret of this animation is the `<masker>`:  It's responsible for the major
part of the animation.
Here's what happens when the user clicks on a Trigger:
  1. `Trigger` fades out.
  2. the `Target`, is added to the DOM _invisible_.
  3. `Masker` fadesIn at the exactly same time that Trigger is fading out and
  takes its size (updateSize).
  4. `Masker` animates to take the `Target` dimensions/position
  5. Once that animation is finished `Masker` fades out and `Target` fades in at the same time.

When closing the Target the same animation happens in the inverted order but slightly faster.

Entrance animations are designed to be smoother than exits so the user better
understands the context of the new content easier (less cognitive process).
The exit time is faster than the entrance time because the user already knows
the original context.
If both entrance/exit animations take the same time the user will percive the exit animation
as being slower that the entrance, this is a way to trick his/her mind.
This time is cutted at the Trigger fadeOut moment.
*/

const animationMixins = {
  data () {
    return {
      // Masker time to fadeIn
      fadeMask: 150,
      // Trigger/Target time to fadeIn/Out - give a delay, so the Masker starts first.
      fade: 75,
      fadeDelay: 50,
      // Target/Masker time to fade back to original position - slightly faster
      fadeBack: 50,
      // Masker time to animate between the Target and a Trigger (and vice versa)
      maskerTime: 250,
      // Time for Target/Trigger to fadeIn - fadeMask'1/3 + maskerTime
      delay: 300
    }
  },
  methods: {
    // -- Trigger animations
    triggerEnter (el, complete) {
      console.log('triggerEnter')
      this.updateSize(el, 'trigger')

      this.elementStartsInvisible(el)
      // Fades In only after the masker animation is completed.
      Velocity(el, { opacity: 1 }, { duration: this.fade, delay: this.delay, complete })
    },
    triggerLeave (el, complete) {
      console.log('triggerLeave')
      this.updateSize(el, 'trigger')

      // Fade out the targetInner after the user interaction...
      Velocity(el, { opacity: 0 }, { duration: this.fade, delay: this.fadeDelay, complete })
    },

    // -- Target animations
    targetEnter (el, complete) {
      console.log('targetEnter')
      const targetInner = this.getTargetInnerWhen('enter')
      this.updateSize(targetInner, 'target')

      this.elementStartsInvisible(el)
      this.elementStartsInvisible(targetInner)

      // Fade in the Target after the Trigger has fade out...
      Velocity(el, { opacity: 1 }, { duration: this.fade, delay: this.fade })
      // And Fade in the targetInner only after the Masker has completed its transition animation
      Velocity(targetInner, { opacity: 1 }, { duration: this.fade, delay: this.delay, complete })
    },
    targetAfterEnter (el) {
      console.log('targetAfterEnter')
      // Target has opacity: 0 by default, so let's force to stay 1 after the animation finishes.
      Velocity(el, { opacity: 1 }, { duration: 0 })
    },
    targetLeave (el, complete) {
      console.log('targetLeave')
      const targetInner = this.getTargetInnerWhen('leave')
      this.updateSize(targetInner, 'target')

      // Fade out the targetInner after the user interaction...
      Velocity(targetInner, { opacity: 0 }, { duration: this.fadeBack / 2, delay: this.fadeBack / 2 })

      // But only fades out complety the Target (that has the dark background)
      // after Masker goes back to the initial position
      Velocity(el, { opacity: 0 }, { duration: this.fade, delay: this.maskerTime, complete })
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

      this.maskerTakesImediatelyTheShapeOf(el, 'trigger', this.fade)
      this.maskerAnimatesToTheShapeOf(el, 'target', complete)
    },

    // when animates back to a Trigger
    maskLeave (el, complete) {
      console.log('maskEnter')

      this.maskerTakesImediatelyTheShapeOf(el, 'target', this.fadeBack)
      this.maskerAnimatesToTheShapeOf(el, 'trigger', complete)
    },

    maskerTakesImediatelyTheShapeOf (el, originalEmenet, duration) {
      // Masker takes imediately the size (dimensions and position)
      // of the originalEmenet (Trigger or Target) size...
      Velocity(el, { opacity: 0, ...this.elementsSize[originalEmenet] }, { duration: 0 })

      // And fadesIn at the same time as the originalEmenet (trigger or target) is fading Out
      Velocity(el, { opacity: 1 }, { duration })
    },

    maskerAnimatesToTheShapeOf (el, originalEmenet, complete) {
      // Then it animates to the the originalEmenet size creating the "growing effect"
      Velocity(el, { ...this.elementsSize[originalEmenet] }, { duration: this.maskerTime, easing: 'ease-out' })
      // And finally it fades out at the same time Target is fading in.
      Velocity(el, { opacity: 0 }, { duration: this.fade, complete })
    },

    // -- Animation utils:
    updateSize (el, name) {
      const { width, height, top, left } = el.getBoundingClientRect()

      // REVIEW - how can we pass the element sizes from trigger/target to masker
      // without using the parent that contains them?
      // maybe using provide / inject pattern?
      this.$emit('animate', { name, size: { width, height, top, left } })
    },
    getTargetInnerWhen (scenario) {
      // Why targetInner is .modal-card:
      // We want the whole Target (modal) to fade, (modal-card + modal-background)
      // but we want the Masker to take just the .modal-card shape instead

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
