<template lang='pug'>
  modal-template(:class="{ 'has-background': background }")
    template(slot='title') Title

    template(slot='subTitle' v-if='subtitle') subtitle

    form
      .field
        .legend Full name

        p.control.has-icon
          input(value="Felix Kubin")
          input(value="Brian Eno")

        a(href='')
          i.fa.fa-plus
            i18n Add more people
      br
      br
      .field
        .legend Introduce the potential new member(s) to your group
        textarea(rows="5") Felix and Brian are two very important figures in the electronic music scene. They have greatly contributed to the development of genres like ambient music and are now ready to contribute to this group. They are Dreamers like us!

    template(slot='errors') Example of errors

    template(slot='buttons')
      button.button.is-primary(@click='toggleSubtitle') Toggle subtitle
      button.button.is-primary(@click='toggleBackground') Toggle background

    template(slot='footer')
      p According to your voting rules, 8 out of 10 members will have to agree with this.

</template>
<script>
import ModalTemplate from '../../components/Modal/ModalTemplate.vue'

export default {
  name: 'DesignSystemModal',
  data () {
    return {
      type: '',
      subtitle: false,
      background: false
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
