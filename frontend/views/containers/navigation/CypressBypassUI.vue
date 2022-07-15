<template lang='pug'>
  a.button.is-small.is-outlined.is-danger.c-bypass(
    to='#'
    data-test='cy_bypassUI'
    @click='handleBypass'
  ) BypassUI
</template>

<script>
import { humanDate } from '@model/contracts/shared/time.js'

export default ({
  name: 'CypressBypassUI',
  methods: {
    humanDate,
    handleBypass (e) {
      e.preventDefault()
      // NOTE: Read Cypress commands.js cyBypassUI() for more details.
      const path = e.target.getAttribute('data-url') || '/bypass-ui'
      this.$router.push({ path })
    }
  }
}: Object)
</script>

<style lang="scss" scoped>
.c-bypass {
  position: absolute;
  bottom: 1rem;
  right: 1rem;
  z-index: 999999;
}
</style>
