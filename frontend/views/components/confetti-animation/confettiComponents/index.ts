import ConfettiCircle from './ConfettiCircle.vue'
import ConfettiRectangle from './ConfettiRectangle.vue'
import ConfettiTriangle from './ConfettiTriangle.vue'
import ConfettiLogo from './ConfettiLogo.vue'

const confettiComponents = {
  'confetti-circle': ConfettiCircle,
  'confetti-rectangle': ConfettiRectangle,
  'confetii-triangle': ConfettiTriangle,
  'confetti-logo': ConfettiLogo
}
const confettiNames = Object.keys(confettiComponents)

export {
  confettiComponents,
  confettiNames
}
