<template lang='pug'>
.slide-bar-component.slide-bar-horizontal(ref='wrap' @click='wrapClick')
  .slide-bar(ref='elem')
    template
      .slide-bar-always.slide-bar-tooltip-container(
        ref='tooltip'
        @mousedown='moveStart'
        @touchstart='moveStart'
      )
        span.slide-bar-tooltip-top.slide-bar-tooltip-wrap
          span.slide-bar-tooltip
    .slide-bar-process(ref='process')
  .slide-bar-range(v-if='range')
    .slide-bar-separate(
      v-for='(r, index) in range'
      :key='index'
    )
      span.slide-bar-separate-text {{ r.label }}
</template>
<script>
export default {
  name: 'AppSlider',

  data () {
    return {
      flag: false,
      size: 0,
      currentValue: 0,
      currentSlider: 0,
      isComponentExists: true,
      interval: 1,
      lazy: false,
      realTime: false
    }
  },

  props: {
    data: {
      type: Array,
      default: null
    },
    range: {
      type: Array,
      default: null
    },
    speed: {
      type: Number,
      default: 0.5
    },
    value: {
      type: [String, Number],
      default: 0
    },
    min: {
      type: Number,
      default: 0
    },
    max: {
      type: Number,
      default: 100
    }
  },

  computed: {
    slider () {
      return this.$refs.tooltip
    },
    val: {
      get () {
        return this.data ? this.data[this.currentValue] : this.currentValue
      },
      set (val) {
        if (this.data) {
          const index = this.data.indexOf(val)
          if (index > -1) {
            this.currentValue = index
          }
        } else {
          this.currentValue = val
        }
      }
    },
    currentIndex () {
      return (this.currentValue - this.minimum) / this.spacing
    },
    indexRange () {
      return [0, this.currentIndex]
    },
    minimum () {
      return this.data ? 0 : this.min
    },
    maximum () {
      return this.data ? (this.data.length - 1) : this.max
    },
    multiple () {
      const decimals = `${this.interval}`.split('.')[1]
      return decimals ? Math.pow(10, decimals.length) : 1
    },
    spacing () {
      return this.data ? 1 : this.interval
    },
    total () {
      if (this.data) {
        return this.data.length - 1
      }
      return (this.maximum - this.minimum) / this.interval
    },
    gap () {
      return this.size / this.total
    },
    position () {
      return ((this.currentValue - this.minimum) / this.spacing * this.gap)
    },
    limit () {
      return [0, this.size]
    },
    valueLimit () {
      return [this.minimum, this.maximum]
    }
  },

  watch: {
    value (val) {
      if (this.flag) this.setValue(val)
      else this.setValue(val, this.speed)
    },
    max () {
      const resetVal = this.limitValue(this.val)
      this.setValue(resetVal)
      this.refresh()
    },
    min () {
      const resetVal = this.limitValue(this.val)
      this.setValue(resetVal)
      this.refresh()
    }
  },

  methods: {
    bindEvents () {
      document.addEventListener('touchmove', this.moving, { passive: false })
      document.addEventListener('touchend', this.moveEnd, { passive: false })
      document.addEventListener('mousemove', this.moving)
      document.addEventListener('mouseup', this.moveEnd)
      document.addEventListener('mouseleave', this.moveEnd)
      window.addEventListener('resize', this.refresh)
    },
    unbindEvents () {
      window.removeEventListener('resize', this.refresh)
      document.removeEventListener('touchmove', this.moving)
      document.removeEventListener('touchend', this.moveEnd)
      document.removeEventListener('mousemove', this.moving)
      document.removeEventListener('mouseup', this.moveEnd)
      document.removeEventListener('mouseleave', this.moveEnd)
    },
    getPos (e) {
      this.realTime && this.getStaticData()
      return e.clientX - this.offset
    },
    wrapClick (e) {
      const pos = this.getPos(e)
      this.setValueOnPos(pos)
    },
    moveStart () {
      this.flag = true
      this.$emit('dragStart', this)
    },
    moving (e) {
      if (!this.flag) return false
      e.preventDefault()
      if (e.targetTouches && e.targetTouches[0]) e = e.targetTouches[0]
      this.setValueOnPos(this.getPos(e), true)
    },
    moveEnd () {
      if (this.flag) {
        this.$emit('dragEnd', this)
        if (this.lazy && this.isDiff(this.val, this.value)) {
          this.syncValue()
        }
      } else {
        return false
      }
      this.flag = false
      this.setPosition()
    },
    setValueOnPos (pos, isDrag) {
      const range = this.limit
      const valueRange = this.valueLimit
      if (pos >= range[0] && pos <= range[1]) {
        this.setTransform(pos)
        const v = (Math.round(pos / this.gap) * (this.spacing * this.multiple) + (this.minimum * this.multiple)) / this.multiple
        this.setCurrentValue(v, isDrag)
      } else if (pos < range[0]) {
        this.setTransform(range[0])
        this.setCurrentValue(valueRange[0])
        if (this.currentSlider === 1) this.currentSlider = 0
      } else {
        this.setTransform(range[1])
        this.setCurrentValue(valueRange[1])
        if (this.currentSlider === 0) this.currentSlider = 1
      }
    },
    isDiff (a, b) {
      if (Object.prototype.toString.call(a) !== Object.prototype.toString.call(b)) {
        return true
      } else if (Array.isArray(a) && a.length === b.length) {
        return a.some((v, i) => v !== b[i])
      }
      return a !== b
    },
    setCurrentValue (val, bool) {
      if (val < this.minimum || val > this.maximum) return false
      if (this.isDiff(this.currentValue, val)) {
        this.currentValue = val
        if (!this.lazy || !this.flag) {
          this.syncValue()
        }
      }
      bool || this.setPosition()
    },
    setIndex (val) {
      val = this.spacing * val + this.minimum
      this.setCurrentValue(val)
    },
    setValue (val, speed) {
      if (this.isDiff(this.val, val)) {
        const resetVal = this.limitValue(val)
        this.val = resetVal
        this.syncValue()
      }
      this.$nextTick(() => this.setPosition(speed))
    },
    setPosition (speed) {
      if (!this.flag) this.setTransitionTime(speed === undefined ? this.speed : speed)
      else this.setTransitionTime(0)
      this.setTransform(this.position)
    },
    setTransform (val) {
      const value = val - ((this.$refs.tooltip.scrollWidth - 2) / 2)
      const translateValue = `translateX(${value}px)`
      this.slider.style.transform = translateValue
      this.slider.style.WebkitTransform = translateValue
      this.slider.style.msTransform = translateValue
      this.$refs.process.style.width = `${val}px`
      this.$refs.process.style['left'] = 0
    },
    setTransitionTime (time) {
      this.slider.style.transitionDuration = `${time}s`
      this.slider.style.WebkitTransitionDuration = `${time}s`
      this.$refs.process.style.transitionDuration = `${time}s`
      this.$refs.process.style.WebkitTransitionDuration = `${time}s`
    },
    limitValue (val) {
      if (this.data) {
        return val
      }
      const inRange = (v) => {
        if (v < this.min) {
          return this.min
        } else if (v > this.max) {
          return this.max
        }
        return v
      }
      return inRange(val)
    },
    syncValue () {
      const val = this.val
      if (this.range) {
        this.$emit('callbackRange', this.range[this.currentIndex])
      }
      this.$emit('input', val)
    },
    getValue () {
      return this.val
    },
    getIndex () {
      return this.currentIndex
    },
    getStaticData () {
      if (this.$refs.elem) {
        this.size = this.$refs.elem.offsetWidth
        this.offset = this.$refs.elem.getBoundingClientRect().left
      }
    },
    refresh () {
      if (this.$refs.elem) {
        this.getStaticData()
        this.setPosition()
      }
    }
  },

  mounted () {
    this.isComponentExists = true
    this.$nextTick(() => {
      if (this.isComponentExists) {
        this.getStaticData()
        this.setValue(this.limitValue(this.value), 0)
        this.bindEvents()
      }
    })
  },

  beforeDestroy () {
    this.isComponentExists = false
    this.unbindEvents()
  }
}
</script>

<style lang='scss' scoped>
$barColor: #c4c4c4;

.slide-bar-component {
  position: relative;
  padding-top: 6px;
  width: 450px;
  min-height: 70px;
  user-select: none;
  max-width: calc(100% - 45px);
}

.slide-bar {
  position: relative;
  display: block;
  height: 4px;
  border-radius: 15px;
  background-color: $barColor;
  cursor: pointer;

  &::before {
    content: "";
    position: absolute;
    right: -4px;
    height: 100%;
    width: 5px;
    background-color: $barColor;
    border-radius: 100%;
  }

  &::after {
    content: "";
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    z-index: 2;
  }
}

.slide-bar-process {
  position: absolute;
  z-index: 1;
  top: 0;
  left: 0;
  width: 0;
  height: 100%;
  background-color: var(--main-color);
  border-radius: 15px;
  transition: all 0s;
  will-change: width;

  &::before {
    content: "";
    position: absolute;
    height: 100%;
    width: 5px;
    left: -4px;
    background-color: var(--main-color);
    border-radius: 100%;
  }
}

.slide-bar-tooltip-container {
  position: absolute;
  z-index: 3;
  left: 0;
  top: -16px;
  transition: all 0s;
  will-change: transform;
  cursor: pointer;
}

.slide-bar-tooltip-wrap {
  position: absolute;
  z-index: 9;
  width: 100%;
  height: 100%;
}

.slide-bar-tooltip-top {
  top: -12px;
  left: 40%;
  transform: translate(-50%, -100%);
}

.slide-bar-tooltip {
  display: block;
  position: relative;
  top: 22px;
  height: 16px;
  width: 16px;
  white-space: nowrap;
  text-align: center;
  color: transparent;
  background: var(--main-color);
  border-radius: 50%;
  overflow: hidden;

  &::before {
    content: "";
    position: absolute;
    bottom: -10px;
    left: 50%;
    width: 0;
    height: 0;
    border: 5px solid transparent;
    border-top-color: inherit;
    transform: translate(-50%, 0);
  }
}

.slide-bar-range {
  display: flex;
  padding: 5px 0;
  justify-content: space-between;
}

.slide-bar-separate-text {
  position: absolute;
  top: 33px;
  text-align: center;
  white-space: nowrap;
  transform: translate(-50%, 0);
}

.slide-bar-separate {
  position: relative;
  top: -15px;
  height: 16px;
  width: 2px;
  background-color: $barColor;
  cursor: pointer;

  &:nth-child(1) {
    .slide-bar-separate-text {
      left: 5px;
      font-size: 11px;
    }
  }

  &:nth-child(2) {
    display: none;
  }

  &:nth-child(3) {
    .slide-bar-separate-text {
      left: 2px;
      font-size: 13px;
    }
  }

  &:nth-child(4) {
    display: none;
  }

  &:nth-child(5) {
    .slide-bar-separate-text {
      left: 5px;
      font-size: 15px;
    }
  }

  &:nth-child(6) {
    display: none;
  }

  &:nth-child(7) {
    .slide-bar-separate-text {
      font-size: 16px;
    }
  }
}
</style>
