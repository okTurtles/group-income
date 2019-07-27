import {
  confettiComponents,
  confettiNames
} from './confettiComponents/index.js'

const canvas = {
  width: null, height: null
}
const Y_UPPERLIMIT = -400
const CONFETTI_AMOUNT_MIN = 15
const CONFETTI_AMOUNT_MAX = 45
const PADDING_X_MIN = 0
const PADDING_X_MAX = 150
const BP_PHONE = 400
const BP_LARGESCREEN = 1200
const COLORS = ['#a0d10e', '#5dc8f0', '#f89201', '#FE6E61']

/*
The animation takes a simple strategy against viewport size change.
1. keeps track of the viewport width with a 'resize' event handler.
2. Linearly increase/decrease the amount of confetti objects based on the width
   (It also does the same thing with the left/right padding).
   BP_PHONE and BP_LARGESCREEN constants are arbitrary minimum and maximum value for linear-scale input.
*/
const xPaddingScaler = linearScale(
  [BP_PHONE, BP_LARGESCREEN],
  [PADDING_X_MIN, PADDING_X_MAX]
)
const confettiAmountScaler = linearScale(
  [BP_PHONE, BP_LARGESCREEN],
  [CONFETTI_AMOUNT_MIN, CONFETTI_AMOUNT_MAX]
)

let requestId = null
let xPadding = 0

// utils
function linearScale ([d1, d2], [r1, r2]) {
  // creates and return a linear-scale function that takes a value between d1 and d2
  // then calculates a linearly-scaled output value between r1 and r2.
  const [dSpan, rSpan] = [d2 - d1, r2 - r1]
  return function (value) {
    if (value <= d1) {
      return r1
    } else if (value >= d2) {
      return r2
    } else {
      const percent = (value - d1) / dSpan
      return r1 + rSpan * percent
    }
  }
}

function randomIntFromRange (min, max) {
  return Math.floor(Math.random() * (max - min + 1) + min)
}

function randomFromArray (arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

function createEase ({
  type, init, end, duration
}) {
  // easing functions created by this factory function take a time value(t) between 0 and duration
  // and calculates the output between the initial and end value using the easing graph.
  switch (type) {
    case 'QuadInOut':
      return t => {
        t /= duration / 2
        if (t < 1) return (end - init) / 2 * t * t + init
        t--
        return -(end - init) / 2 * (t * (t - 2) - 1) + init
      }
    default: // 'Linear'
      return t => {
        return (end - init) * t / duration + init
      }
  }
}

class Confetti {
  // Confetti Object constructor
  constructor (x, y, color, confettiType) {
    this.position = { x, y }
    this.color = color
    this.confettiType = confettiType

    // these constants are edge values for confetti object transformation functiions
    // transformation of each confetti object is randomized using these values
    // so their movements differ from one another
    const Y_VEL_MIN = 0.5
    const Y_VEL_DEVIATION = 2.5
    const SWAY_DURATION = randomIntFromRange(800, 1200)
    const TRANSLATE_MAX_VALUE = randomIntFromRange(5, 10)
    const ROTATION_REF_ANGLE = 120
    const SCALE_MAX = 1
    const SCALE_MIN = -1
    const SCALE_DEVIATION = 0.3

    this.yVelocity = Y_VEL_MIN + Math.random() * Y_VEL_DEVIATION
    this.sway = {
      direction: 'forward',
      tRef: null,
      duration: SWAY_DURATION,
      transformValues: {
        translate: 0,
        scale: 1,
        rotate: 0
      },
      easeFunctions: {
        translate: createEase({
          type: 'QuadInOut',
          init: -TRANSLATE_MAX_VALUE,
          end: TRANSLATE_MAX_VALUE,
          duration: SWAY_DURATION
        }),
        rotate: createEase({
          type: 'QuadInOut',
          init: (-1) * Math.floor(ROTATION_REF_ANGLE * Math.random()),
          end: Math.floor(ROTATION_REF_ANGLE * Math.random()),
          duration: SWAY_DURATION
        }),
        scale: createEase({
          type: 'Linear',
          init: SCALE_MIN + Math.floor(SCALE_DEVIATION * Math.random()),
          end: SCALE_MAX + Math.floor(SCALE_DEVIATION * Math.random()),
          duration: SWAY_DURATION
        })
      }
    }
  }

  update () {
    this.fall()
    this.wiggle()

    if (this.position.y >= canvas.height + 50) {
      // when a confetti object disappears from the screen reset its position
      this.resetPosition()
    }
  }

  fall () {
    // this method is responsible for constantly pulling the confetti object down.
    this.position.y += this.yVelocity
  }

  wiggle () {
    // this method is responsible for the wiggling movement.
    if (this.sway.tRef === null) {
      this.sway.tRef = Date.now()
    }

    const transformTypes = ['translate', 'scale', 'rotate']
    const tPassed = Date.now() - this.sway.tRef
    const tUse = (this.sway.direction === 'forward')
      ? tPassed
      : (this.sway.direction === 'backward') && (this.sway.duration - tPassed)

    transformTypes.forEach(type => {
      this.sway.transformValues[type] = this.sway.easeFunctions[type](tUse)
    })

    if (tPassed >= this.sway.duration) {
      this.sway.tRef = Date.now()
      this.sway.direction = (this.sway.direction === 'forward')
        ? 'backward'
        : 'forward'
    }
  }

  resetPosition () {
    this.position.x = xPadding + (canvas.width - xPadding * 2) * Math.random()
    this.position.y = randomIntFromRange(Y_UPPERLIMIT, 0)
  }
}

// mixin
const animationMixins = {
  components: {
    ...confettiComponents
  },
  data () {
    return {
      confettis: []
    }
  },
  methods: {
    initializeAnimation () {
      // whenever the viewport resizes, the animation re-initializes.
      const {
        width: canvasWidth,
        height: canvasHeight
      } = this.$refs.svg.getBoundingClientRect()

      // keeps track of the viewport size
      canvas.width = canvasWidth
      canvas.height = canvasHeight

      // calculates the left and right padding value
      xPadding = xPaddingScaler(canvasWidth)

      // adjust the amount of confetti based on the screen width
      const newConfettis = []
      const confettiAmount = confettiAmountScaler(canvasWidth)
      for (let i = 0; i < confettiAmount; i++) {
        newConfettis.push(
          new Confetti(
            xPadding + (canvasWidth - xPadding * 2) * Math.random(),
            randomIntFromRange(Y_UPPERLIMIT, 0),
            randomFromArray(COLORS),
            randomFromArray(confettiNames)
          )
        )
      }
      this.confettis = newConfettis
    },
    addResizeHandler () {
      window.addEventListener(
        'resize',
        this.initializeAnimation
      )
    },
    removeResizeHandler () {
      window.removeEventListener(
        'resize',
        this.initializeAnimation
      )
    },
    animate () {
      requestId = window.requestAnimationFrame(this.animate)

      this.confettis.forEach(confetti => {
        confetti.update && confetti.update()
      })
    },
    stopAnimation () {
      window.cancelAnimationFrame(requestId)
    }
  },
  mounted () {
    // add a resize event handler, initialize and get the animation running
    this.addResizeHandler()
    this.initializeAnimation()
    this.animate()
  },
  beforeDestroy () {
    // clean up the resize handler and animation
    this.removeResizeHandler()
    this.stopAnimation()
  }
}

export default animationMixins
