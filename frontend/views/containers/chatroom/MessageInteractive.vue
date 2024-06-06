<template lang='pug'>
message-base(v-bind='$props' @wrapperAction='action')
  template(#image='')
    .c-icon(:class='{"is-warning": isYellowHorn}')
      svg-yellow-horn(v-if='isYellowHorn')
      svg-horn(v-else)
  template(#header='')
    .c-header
      span TODO
  template(#body='')
    .c-text TODO
</template>

<script>
import MessageBase from './MessageBase.vue'
import SvgHorn from '@svgs/horn.svg'
import SvgYellowHorn from '@svgs/yellow-horn.svg'

export default ({
  name: 'MessageInteractive',
  props: {},
  components: {
    SvgHorn,
    SvgYellowHorn,
    MessageBase
  },
  methods: {
    action () {
      console.log('TODO')
    }
  },
  computed: {
    isYellowHorn () {
      return true // random value ATM
    }
  }
}: Object)
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-icon {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 2.5rem;
  height: 2.5rem;
  margin-right: 0.5rem;
  border-radius: 50%;
  background: $primary_2;

  &.is-warning {
    background-color: $warning_2;
  }
}

.c-header {
  display: inline-block;

  .c-title {
    font-size: $size_5;
    margin-right: 0.25rem;
    padding: 0 0.25rem;
    font-family: "Poppins";
    text-transform: uppercase;
  }

  .is-neutral {
    background-color: $general_0;
  }

  .is-info {
    background-color: $primary_2;
    color: $primary_0;
  }

  .is-warning {
    background-color: $warning_2;
    color: $warning_0;
  }

  .is-danger {
    background-color: $danger_2;
    color: $danger_0;
  }

  .is-success {
    background-color: $success_2;
    color: $success_0;
  }
}
</style>
