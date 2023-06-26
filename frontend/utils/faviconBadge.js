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
  font: 10 * r + 'px arial',
  color: '#ffffff',
  background: '#ff0000',
  fallback: true,
  crossOrigin: true,
  abbreviate: true
}

const ua = (function () {
  const agent = navigator.userAgent.toLowerCase()
  // New function has access to 'agent' via closure
  return function (browser) {
    return agent.indexOf(browser) !== -1
  }
}())

const browser = {
  ie: ua('trident'),
  chrome: ua('chrome'),
  webkit: ua('chrome') || ua('safari'),
  safari: ua('safari') && !ua('chrome'),
  mozilla: ua('mozilla') && !ua('chrome') && !ua('safari')
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

const drawFavicon = (label, color) => {
  // fallback to updating the browser title if unsupported
  if (!(getCanvas() instanceof HTMLCanvasElement) || browser.ie || browser.safari || options.fallback === 'force') {
    return updateTitle(label)
  }

  const context = getCanvas().getContext('2d')
  color = color || '#000000'
  const src = getCurrentFavicon()

  faviconImage = document.createElement('img')
  faviconImage.onload = function () {
    // clear canvas
    context.clearRect(0, 0, size, size)

    // draw the favicon
    context.drawImage(faviconImage, 0, 0, faviconImage?.width, faviconImage?.height, 0, 0, size, size)

    // draw bubble over the top
    if ((label + '').length > 0) drawBubble(context, label, color)

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

const updateTitle = (label) => {
  if (options.fallback) {
    // Grab the current title that we can prefix with the label
    let originalTitle = document.title

    // Strip out the old label if there is one
    if (originalTitle[0] === '(') {
      originalTitle = originalTitle.slice(originalTitle.indexOf(' '))
    }

    if ((label + '').length > 0) {
      document.title = '(' + label + ') ' + originalTitle
    } else {
      document.title = originalTitle
    }
  }
}

const drawBubble = (context, label, color) => {
  // automatic abbreviation for long (>2 digits) numbers
  if (typeof label === 'number' && label > 99 && options.abbreviate) {
    label = abbreviateNumber(label)
  }

  // bubble needs to be larger for double digits
  const len = (String(label)).length - 1
  const width = options.width * r + (6 * r * len)
  const height = options.height * r
  // const top = size - height
  // const left = size - width - r
  const bottom = 16 * r
  const right = 16 * r
  // const radius = 2 * r
  const arcRadius = Math.min(width, height) / 2

  // webkit seems to render fonts lighter than firefox
  context.font = (browser.webkit ? 'bold ' : '') + options.font
  context.fillStyle = options.background
  context.strokeStyle = options.background
  context.lineWidth = r

  // bubble
  // draw circle bubble
  context.arc(right - arcRadius, bottom - arcRadius, arcRadius, 0, 2 * Math.PI)

  // draw rectangle bubble
  // context.beginPath()
  // context.moveTo(left + radius, top)
  // context.quadraticCurveTo(left, top, left, top + radius)
  // context.lineTo(left, bottom - radius)
  // context.quadraticCurveTo(left, bottom, left + radius, bottom)
  // context.lineTo(right - radius, bottom)
  // context.quadraticCurveTo(right, bottom, right, bottom - radius)
  // context.lineTo(right, top + radius)
  // context.quadraticCurveTo(right, top, right - radius, top)
  // context.closePath()
  context.fill()

  // bottom shadow
  // context.beginPath()
  // context.strokeStyle = 'rgba(0,0,0,0.3)'
  // context.moveTo(left + radius / 2.0, bottom)
  // context.lineTo(right - radius / 2.0, bottom)
  // context.stroke()

  // label
  context.fillStyle = options.color
  context.textAlign = 'right'
  context.textBaseline = 'top'

  // unfortunately webkit/mozilla are a pixel different in text positioning
  // context.fillText(label, r === 2 ? 29 : 15, browser.mozilla ? 7 * r : 6 * r)
}

const refreshFavicon = () => {
  // check support
  if (getCanvas() instanceof HTMLCanvasElement) {
    setFaviconTag(getCanvas().toDataURL())
  }
}

const abbreviateNumber = (label): string => {
  const metricPrefixes = [
    ['G', 1000000000],
    ['M', 1000000],
    ['k', 1000]
  ]

  for (let i = 0; i < metricPrefixes.length; ++i) {
    if (label >= metricPrefixes[i][1]) {
      return round(label / metricPrefixes[i][1]) + metricPrefixes[i][0]
    }
  }

  return String(label)
}

const round = (value, precision): string => {
  return Number(value).toFixed(precision)
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
  setBubble: function (label: string | number, color?: string) {
    drawFavicon(String(label || ''), color)
  },
  reset: function () {
    currentFavicon = originalFavicon
    setFaviconTag(originalFavicon)
  }
}

FaviconBadge.setOptions(defaults)

export default FaviconBadge
