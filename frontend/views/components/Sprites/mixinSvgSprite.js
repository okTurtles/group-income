import sbp from '~/shared/sbp.js'
import { LOAD_SPRITE } from '~/frontend/utils/events.js'

const svgSpriteMixin = (spriteName) => ({
  beforeCreate () {
    if (Array.isArray(spriteName)) {
      spriteName.forEach(name => sbp('okTurtles.events/emit', LOAD_SPRITE, name))
    } else {
      sbp('okTurtles.events/emit', LOAD_SPRITE, spriteName)
    }
  }
})

export default svgSpriteMixin
