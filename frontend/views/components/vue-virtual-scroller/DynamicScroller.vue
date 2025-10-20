<template>
  <div
    ref="scroller"
    v-bind="$attrs"
    v-on="$listeners"
  >
    <span class="sentinel" ref="startSentinel"></span>
    <div
      v-if="$slots.before"
      ref="before"
      class="vue-recycle-scroller__slot"
    >
      <slot
        name="before"
      />
    </div>

    <component
      :is="listTag"
      ref="wrapper"
      class="vue-recycle-scroller__item-wrapper"
    >
        <component
            :is="itemTag"
            class="vue-recycle-scroller__item-view"
            :key="item.hash"
            v-for="(item, index) of items"
        >
            <slot v-bind="{
                item,
                index,
                active: true
            }" />
        </component>
      <slot
        name="empty"
      />
    </component>

    <div
      v-if="$slots.after"
      ref="after"
      class="vue-recycle-scroller__slot"
    >
      <slot
        name="after"
      />
    </div>
    <span class="sentinel" ref="endSentinel"></span>
  </div>
</template>

<style scoped>
.sentinel {
  display: block;
  height: 1px;
  width: 1px;
  margin: -1px 0 0 0;
}

.vue-recycle-scroller__slot {
  flex: auto 0 0;
}

.vue-recycle-scroller__item-wrapper {
  flex: 1;
  box-sizing: border-box;
  overflow: hidden;
  position: relative;
}

.vue-recycle-scroller__item-view {
  width: 100%;
}
</style>

<script>
export default {
  name: 'DynamicScroller',
  inheritAttrs: false,
  props: {
    items: {
      type: Array,
      required: true
    },
    keyField: {
      type: String,
      default: 'id'
    },
    listTag: {
      type: String,
      default: 'div'
    },
    itemTag: {
      type: String,
      default: 'div'
    },
    minItemSize: {
      type: [Number, String],
      required: true
    }
  },
  mounted () {
    this.observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return
        if (entry.target === this.$refs.startSentinel) this.$emit('scroll-start')
        if (entry.target === this.$refs.endSentinel) this.$emit('scroll-end')
      })
    }, {
      root: this.$el
    })
    this.observer.observe(this.$refs.startSentinel)
    this.observer.observe(this.$refs.endSentinel)
  },
  destroyed () {
    this.observer?.disconnect()
  },
  methods: {
    scrollToItem (index: number) {
      this.$el.querySelector('.vue-recycle-scroller__item-view:nth-child(' + (index + 1) + ')')?.scrollIntoView()
    }
  }
}
</script>
