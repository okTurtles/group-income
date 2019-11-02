'use strict'

export default {
  methods: {
    // Takes colors in hex format (i.e. #F06D06)
    // and lightens or darkens them with a value
    lightenDarkenColor (col, amt) {
      return this.HSLToHex(...this.hexToHSLDarken(col, amt))
    },
    // Modified version of https://stackoverflow.com/questions/21646738/convert-hex-to-rgba
    hexToRgbA (hex, alpha) {
      let c
      if (/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex)) {
        c = hex.substring(1).split('')
        if (c.length === 3) {
          c = [c[0], c[0], c[1], c[1], c[2], c[2]]
        }
        c = '0x' + c.join('')
        return `rgba(${[(c >> 16) & 255, (c >> 8) & 255, c & 255].join(',')},${alpha})`
      }
      throw new Error('Bad Hexa')
    },
    // Modified version of https://gist.github.com/mjackson/5311256
    HSLToHex (h, s, l) {
      let r, g, b
      if (s === 0) {
        r = g = b = l // achromatic
      } else {
        const hue2rgb = (p, q, t) => {
          if (t < 0) t += 1
          if (t > 1) t -= 1
          if (t < 1 / 6) return p + (q - p) * 6 * t
          if (t < 1 / 2) return q
          if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
          return p
        }
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s
        const p = 2 * l - q
        r = hue2rgb(p, q, h + 1 / 3)
        g = hue2rgb(p, q, h)
        b = hue2rgb(p, q, h - 1 / 3)
      }
      const toHex = x => {
        const hex = Math.round(x * 255).toString(16)
        return hex.length === 1 ? '0' + hex : hex
      }
      return `#${toHex(r)}${toHex(g)}${toHex(b)}`
    },
    // Modified version of https://gist.github.com/mjackson/5311256
    hexToHSLDarken (hex, increase) {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
      let r = parseInt(result[1], 16)
      let g = parseInt(result[2], 16)
      let b = parseInt(result[3], 16)
      r /= 255
      g /= 255
      b /= 255
      const max = Math.max(r, g, b)
      const min = Math.min(r, g, b)
      let h
      let s
      let l = (max + min) / 2
      if (max === min) {
        h = s = 0 // achromatic
      } else {
        const d = max - min
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
        switch (max) {
          case r: {
            h = (g - b) / d + (g < b ? 6 : 0)
            break
          }
          case g: {
            h = (b - r) / d + 2
            break
          }
          case b: {
            h = (r - g) / d + 4
            break
          }
        }
        h /= 6
      }
      l = l + increase
      return [h, s, l]
    }
  }
}
