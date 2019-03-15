<template>
  <modal-template :class="{ 'has-sticky-footer': stickyFooter, 'has-background': background }">
    <template #title>
      Title
    </template>
    <template #subTitle v-if="subtitle">
      subtitle
    </template>
    <form>
      <div class="field">
        <div class="legend">
          Full name
        </div>
        <p class="control has-icon">
          <input value="Felix Kubin">
          <input value="Brian Eno">
        </p>
        <a href="">
          <i class="fa fa-plus"></i><i18n>Add more people</i18n>
        </a>
      </div>
      <br><br>
      <div class="field">
        <div class="legend">
          Introduce the potential new member(s) to your group
        </div>
        <textarea rows="5">Felix and Brian are two very important figures in the electronic music scene. They have greatly contributed to the development of genres like ambient music and are now ready to contribute to this group. They are Dreamers like us!</textarea>
      </div>
    </form>
    <template #errors>
      Example of errors
    </template>

    <template #buttons>
      <button class="button is-primary" @click='toggleSubtitle'>
        Toggle subtitle
      </button>
      <button class="button is-primary" @click='toggleBackground'>
        Toggle background
      </button>
      <button class="button is-primary" @click='toggleStickyFooter'>
        Toggle sticky footer
      </button>
    </template>

    <template #footer>
      <p>
        According to your voting rules, 8 out of 10 members will have to agree with this.
      </p>
    </template>
  </modal-template>
</template>
<script>
import ModalTemplate from '../components/Modal/ModalTemplate.vue'

export default {
  name: 'modal-test',
  data () {
    return {
      type: '',
      subtitle: false,
      background: false,
      stickyFooter: false
    }
  },
  components: {
    ModalTemplate
  },
  methods: {
    toggleSubtitle () {
      this.subtitle = !this.subtitle
    },
    toggleBackground () {
      this.background = !this.background
    },
    toggleStickyFooter () {
      this.stickyFooter = !this.stickyFooter
    }
  }
}
</script>

<style lang="scss" scoped>
form {
  width: 100%;
}

.legend {
  font-size: 14px;
  font-weight: bold;
  line-height: 21px;
  color: #363636;
  margin-bottom: 4px;
}

input {
  width: 100%;
  height: 29px;
  padding: 6px;
  margin-bottom: 8px;
  line-height: 21px;
  font-size: 14px;
  border: 1px solid #ccc;
}

.fa {
  span {
    line-height: 21px;
    font-size: 10px;
    letter-spacing: 0.1px;
  }

  &.fa-plus {
    font-size: 10px;
    margin-right: 3px;
  }
}

textarea {
  width: 100%;
  border: 1px solid #ccc;
  line-height: 21px;
  font-size: 14px;
  color: #363636;
  padding: 6px;
}
</style>
