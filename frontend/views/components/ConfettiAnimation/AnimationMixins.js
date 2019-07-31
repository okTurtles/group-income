import {
  confettiComponents,
  confettiNames
} from './confettiComponents/index.js'

const canvas = {
  width: null, height: null
}
const CONFETTI_AMOUNT_MIN = 25
const CONFETTI_AMOUNT_MAX = 40
const BP_PHONE = 400
const BP_LARGESCREEN = 1000
const COLORS = ['#a0d10e', '#5dc8f0', '#f89201', '#FE6E61']
const confettiAmountScaler = linearScale(
  [BP_PHONE, BP_LARGESCREEN],
  [CONFETTI_AMOUNT_MIN, CONFETTI_AMOUNT_MAX]
)

let requestId = null
let unitExplosionDistance = 0

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

function getPositionTo (pFrom, d, angle) {
  const absAngle = Math.abs(angle)
  const [xSign, ySign, theta] =
  [
    (absAngle > 90) ? -1 : 1,
    (angle >= 0) ? 1 : -1,
    (absAngle > 90) ? 180 - absAngle : absAngle
  ]

  return {
    x: pFrom.x + xSign * d * Math.cos(theta * Math.PI / 180),
    y: pFrom.y + ySign * d * Math.sin(theta * Math.PI / 180)
  }
}

function randomSign () {
  return (Math.random() > 0.5) ? 1 : -1
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
    case 'ExpoOut':
      return t => {
        return (t === duration)
          ? end : (end - init) * (-Math.pow(2, -10 * t / duration) + 1) + init
      }
    default: // 'Linear'
      return t => {
        return (end - init) * t / duration + init
      }
  }
}

class Confetti {
  // Confetti Object constructor
  constructor (x, y, index, color, confettiType) {
    this.confettiType = confettiType
    this.index = index
    this.props = {
      position: { x, y },
      color,
      innerGroupY: y,
      opacity: 1,
      transforms: {
        translate: 0,
        scale: 1,
        rotate: 0
      }
    }

    const EXLPOSION_REF_ANGLE = -90
    const MAX_ANGLE_DEVIATION = 80
    const ELPLOSION_REF_DURATION = 800
    const ELPLOSION_DURATION_DEVIATION = 300

    const explosionAngle = EXLPOSION_REF_ANGLE +
      randomSign() * Math.floor(MAX_ANGLE_DEVIATION * Math.random())
    const explosionDuration = ELPLOSION_REF_DURATION +
      randomSign() * Math.floor(ELPLOSION_DURATION_DEVIATION * Math.random())
    const explosionDistance = unitExplosionDistance * (index + 1)
    const explosionTo = getPositionTo(
      this.props.position,
      explosionDistance,
      explosionAngle
    )

    // it's responsible for initial explosion of the confetti particles
    // the duration and distance are randomized using the constants above
    this.explosion = {
      duration: explosionDuration,
      distance: explosionDistance,
      easeFunctions: {
        x: createEase({
          type: 'ExpoOut',
          init: this.props.position.x,
          end: explosionTo.x,
          duration: explosionDuration
        }),
        y: createEase({
          type: 'ExpoOut',
          init: this.props.position.y,
          end: explosionTo.y,
          duration: explosionDuration
        })
      }
    }

    // these constants are edge values for confetti object transformation functions
    // transformation of each confetti object is randomized using these values
    // so their movements differ from one another
    const Y_VEL_MIN = 0.75
    const Y_VEL_DEVIATION = 2
    const SWAY_DURATION = randomIntFromRange(800, 1200)
    const TRANSLATE_MAX_VALUE = randomIntFromRange(5, 10)
    const ROTATION_REF_ANGLE = 120
    const SCALE_MAX = 1
    const SCALE_MIN = -1
    const SCALE_DEVIATION = 0.3

    // this variable is responsible for pulling the confetti particle down constantly
    this.yVelocity = Y_VEL_MIN + Math.random() * Y_VEL_DEVIATION

    // it's responsible for making the confetti wiggle
    this.sway = {
      direction: 'forward',
      tRef: null,
      duration: SWAY_DURATION,
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

    const REF_REMOVAL_TIME = 5000
    const REMOVAL_TIME_DEVIATION = 500
    const MIN_REMOVAL_DURATION = 500
    const REMOVAL_DURATION_DEVIATION = 300
    const removalDuration = MIN_REMOVAL_DURATION +
      Math.floor(REMOVAL_DURATION_DEVIATION * Math.random())

    // it's responsible for fading the confetti out at the end
    this.fadeOut = {
      tStart: REF_REMOVAL_TIME +
        randomSign() * Math.floor(REMOVAL_TIME_DEVIATION * Math.random()),
      duration: removalDuration,
      easeFunction: createEase({
        type: 'Linear',
        init: 1,
        end: 0,
        duration: removalDuration
      })
    }
    this.disappeared = false
    // these are used for measuring the time passed
    this.tRefMaster = null
    this.tPassedMaster = 0
  }

  update () {
    if (this.disappeared) return
    if (this.tRefMaster === null) {
      this.tRefMaster = Date.now()
    }
    this.tPassedMaster = Date.now() - this.tRefMaster

    this.explode()
    this.fall()
    this.wiggle()
    if (this.tPassedMaster >= this.fadeOut.tStart) {
      this.remove()
    }
  }

  explode () {
    if (this.tPassedMaster <= this.explosion.duration) {
      this.props.position.x = this.explosion.easeFunctions.x(this.tPassedMaster)
      this.props.position.y = this.explosion.easeFunctions.y(this.tPassedMaster)
    }
  }

  fall () {
    this.props.innerGroupY += this.yVelocity
  }

  wiggle () {
    if (this.sway.tRef === null) {
      this.sway.tRef = Date.now()
    }
    const transformTypes = ['translate', 'scale', 'rotate']
    const tPassed = Date.now() - this.sway.tRef
    const tUse = (this.sway.direction === 'forward')
      ? tPassed
      : (this.sway.direction === 'backward') && (this.sway.duration - tPassed)

    transformTypes.forEach(type => {
      this.props.transforms[type] = this.sway.easeFunctions[type](tUse)
    })

    if (tPassed >= this.sway.duration) {
      this.sway.tRef = Date.now()
      this.sway.direction = (this.sway.direction === 'forward')
        ? 'backward'
        : 'forward'
    }
  }

  remove () {
    const {
      tStart, duration
    } = this.fadeOut

    this.props.opacity = this.fadeOut.easeFunction(this.tPassedMaster - tStart)
    if (this.tPassedMaster >= tStart + duration) {
      this.disappeared = true
    }
  }
}

// mixin
const animationMixins = {
  components: {
    ...confettiComponents
  },
  data () {
    return {
      confettis: [],
      animationActive: true
    }
  },
  methods: {
    initializeAnimation () {
      const {
        width: canvasWidth,
        height: canvasHeight
      } = this.$refs.svg.getBoundingClientRect()

      canvas.width = canvasWidth
      canvas.height = canvasHeight

      // the point on the page from which the confetti particles explode
      // it's in the upper center of the page
      const explosionTip = {
        x: canvasWidth / 2,
        y: canvasHeight * 0.125
      }

      // The amount of confetti is determined based on the page width
      const confettiAmount = confettiAmountScaler(canvasWidth)
      // the maximum distance the exploding particle reaches gets smaller as the page size gets smaller
      const MAX_EXPLOSION_DISTANCE =
        Math.sqrt(canvasWidth * canvasWidth + canvasHeight * canvasHeight) * 0.35
      unitExplosionDistance = MAX_EXPLOSION_DISTANCE / confettiAmount

      // create confetti objects
      const confettis = []
      for (let i = 0; i < confettiAmount; i++) {
        confettis.push(
          new Confetti(
            explosionTip.x,
            explosionTip.y,
            i,
            randomFromArray(COLORS),
            randomFromArray(confettiNames)
          )
        )
      }
      this.confettis = confettis
    },
    animate () {
      requestId = window.requestAnimationFrame(this.animate)

      let hasAllDisappeared = true
      this.confettis.forEach(confetti => {
        confetti.update && confetti.update()

        if (!confetti.disappeared) {
          hasAllDisappeared = false
        }
      })

      // if all the confetti particles have disappeared, stop the animation and also remove it from the DOM
      if (hasAllDisappeared) {
        this.animationActive = false
        this.stopAnimation()
      }
    },
    stopAnimation () {
      window.cancelAnimationFrame(requestId)
    }
  },
  mounted () {
    // animation begins after a bit of delay
    window.setTimeout(() => {
      this.initializeAnimation()
      this.animate()
    }, 500)
  },
  beforeDestroy () {
    this.stopAnimation()
  }
}

export default animationMixins
