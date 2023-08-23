/*!
 * FaviconBadge - A small library for manipulating the Favicon
 * Modified from Tinycon.js by Tom Moor
 * Original project: https://github.com/tommoor/tinycon
 * Copyright (c) 2023 Alex Jin
 * @license MIT Licensed
 */

let currentFavicon = null
let originalFavicon = null
let faviconImage
let canvas = null
let options = {}
// Chrome browsers with nonstandard zoom report fractional devicePixelRatio.
const r = Math.ceil(window.devicePixelRatio) || 1
const size = 16 * r
const defaults = {
  width: 8,
  height: 8,
  background: '#ff0000',
  crossOrigin: true
}

// private methods
const getFaviconTag = () => {
  const links = document.getElementsByTagName('link')

  for (let i = 0, len = links.length; i < len; i++) {
    if ((links[i].getAttribute('rel') || '').match(/\bicon\b/i)) {
      return links[i]
    }
  }

  return null
}

const removeFaviconTag = () => {
  const links = document.getElementsByTagName('link')

  for (let i = 0, len = links.length; i < len; i++) {
    const exists = (typeof (links[i]) !== 'undefined')
    if (exists && (links[i].getAttribute('rel') || '').match(/\bicon\b/i)) {
      links[i].parentNode?.removeChild(links[i])
    }
  }
}

const getCurrentFavicon = () => {
  if (!originalFavicon || !currentFavicon) {
    const tag = getFaviconTag()
    currentFavicon = tag?.getAttribute('href') || '/assets/images/group-income-icon-transparent.png'
    if (!originalFavicon) {
      originalFavicon = currentFavicon
    }
  }

  return currentFavicon
}

const getCanvas = (): HTMLCanvasElement => {
  if (!canvas) {
    canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
  }

  return canvas
}

const setFaviconTag = (url) => {
  if (url) {
    removeFaviconTag()

    const link = document.createElement('link')
    link.type = 'image/x-icon'
    link.rel = 'icon'
    link.href = url
    document.getElementsByTagName('head')[0].appendChild(link)
  }
}

const drawFavicon = (bubble) => {
  const context = getCanvas().getContext('2d')
  const src = getCurrentFavicon()

  faviconImage = document.createElement('img')
  faviconImage.onload = function () {
    // clear canvas
    context.clearRect(0, 0, size, size)

    // draw the favicon
    context.drawImage(faviconImage, 0, 0, faviconImage?.width, faviconImage?.height, 0, 0, size, size)

    // draw bubble over the top
    if (bubble) drawBubble(context)

    // refresh tag in page
    refreshFavicon()
  }

  // allow cross origin resource requests if the image is not a data:uri
  // as detailed here: https://github.com/mrdoob/three.js/issues/1305
  if (!src?.match(/^data/) && options.crossOrigin) {
    faviconImage.crossOrigin = 'anonymous'
  }

  faviconImage.src = src
}

const drawBubble = (context) => {
  const width = options.width * r + (6 * r)
  const height = options.height * r
  // const top = size - height
  // const left = size - width - r
  const bottom = 16 * r
  const right = 16 * r
  // const radius = 2 * r
  const arcRadius = Math.min(width, height) / 2

  context.fillStyle = options.background
  context.strokeStyle = options.background
  context.lineWidth = r

  // bubble
  context.arc(right - arcRadius, bottom - arcRadius, arcRadius, 0, 2 * Math.PI)
  context.fill()
}

const refreshFavicon = () => {
  // check support
  if (getCanvas() instanceof HTMLCanvasElement) {
    setFaviconTag(getCanvas().toDataURL())
  }
}

const FaviconBadge = {
  setOptions: function (custom: Object) {
    options = {}

    for (const key in defaults) {
      options[key] = custom[key] || defaults[key]
    }
  },
  setImage: function (url: string) {
    currentFavicon = url
    refreshFavicon()
  },
  setBubble: function (bubble: boolean) {
    drawFavicon(bubble)
  },
  reset: function () {
    currentFavicon = originalFavicon
    setFaviconTag(originalFavicon)
  }
}

// NOTE: set default options when it's not initiated
if (!Object.keys(options).length) {
  FaviconBadge.setOptions(defaults)
}

export default FaviconBadge
