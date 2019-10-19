<template lang='pug'>
.c-contribution-item
  i(:class='iconClass')
  template(v-if='action === "RECEIVING"')
    template(v-if='hasWhoElse')
      div(v-if='isVisible')
        i18n(
          class='c-contribution-list'
          :args='{what: what, listOfName: listOfName}'
          html='<span class="has-text-bold">{what}</span> from {listOfName}'
        )

        i18n.is-unstyled.is-link-inherit.link(
          tag='button'
          type='button'
          @click='isVisible = !isVisible'
        ) Hide

      i18n(
        v-else
        :args='{what: what, numOthers: notFirstWho.length}'
        @click='isVisible = !isVisible'
        html='<span class="has-text-bold">{what}</span> from <button class="is-unstyled is-link-inherit link">{numOthers} others</button>'
      )

    template(v-else)
      i18n(
        v-if='action === "MONETARY"'
        :args='{what: what}'
        html='<span class="has-text-bold">{what}</span> from {firstWho}'
      )
      i18n(
        v-else
        :args='{what: what, firstWho: firstWho}'
        html='<span class="has-text-bold">{what}</span> by {firstWho}'
      )

  template(v-else)
    i18n(
      v-if='type==="MONETARY"'
      :args='{what: what, firstWho: firstWho}'
      html='Pledging up to <span class="has-text-bold">{what}</span>'
    )
    i18n(
      v-else
      :args='{what: what}'
      html='<span class="has-text-bold">{what}</span>'
    )
</template>

<script>
import TextWho from '@components/TextWho.vue'

export default {
  name: 'ContributionItem',
  components: {
    TextWho
  },
  props: {
    who: [String, Array],
    what: String,
    action: {
      type: String,
      validator: function (value) {
        // The value must match one of these strings
        return ['RECEIVING', 'GIVING'].indexOf(value) !== -1 || null
      },
      default: 'RECEIVING'
    },
    type: {
      type: String,
      validator: function (value) {
        // The value must match one of these strings
        return ['NON_MONETARY', 'MONETARY'].indexOf(value) !== -1
      }
    }
  },
  data () {
    return {
      isVisible: false
    }
  },
  computed: {
    firstWho () {
      const who = this.who

      if (!Array.isArray(who)) {
        return who
      }

      return who.length === 2 ? this.L('{who0} and {who1}', { who0: who[0], who1: who[1] }) : who[0]
    },
    notFirstWho () {
      return this.who.slice(1)
    },
    hasWhoElse () {
      return Array.isArray(this.who) && this.who.length > 2
    },
    iconClass () {
      const style = {
        'NON_MONETARY': {
          icon: 'heart',
          color: 'warning'
        },
        'MONETARY': {
          icon: 'dollar-sign',
          color: 'success'
        }
      }
      return `icon-${style[this.type].icon} c-icon-round has-background-${style[this.type].color} has-text-${style[this.type].color}`
    },
    listOfName () {
      return this.who.map((name, index) => {
        // Ugly but necessary to keep css in scope
        const style = `padding-top: ${index ? '0' : '8px'}; padding-bottom: ${index < this.who.length - 1 ? '0' : '8px'};`
        return `<p class="has-text-1" style="${style}">${name}</p>`
      }).join('')
    }
  }
}
</script>

<style lang="scss" scoped>
.c-contribution-item {
  display: flex;
  align-items: baseline;
}
</style>
