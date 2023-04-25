<template lang='pug'>
form.c-search-form(@submit.prevent='')
  label.field
    .sr-only {{label}}
    .inputgroup.c-search(
      @click='clear'
    )
      .is-icon.prefix(aria-hidden='true')
        i.icon-search
      .input(
        type='text'
        name='search'
      )
        .profile-wrapper(
          v-for='(username, index) in usernames'
          :key='index'
        )
          .profile
            avatar-user(:username='username' size='xs')
            .c-name.has-text-bold {{ displayName(username) }}
            .button.is-icon-small(
              @click.prevent.stop='remove(username)'
              :aria-label='L("Clear search")'
            )
              i.icon-times
        .c-keyword(
          contenteditable
          ref='input'
          data-test='users-selector'
          @keydown='onHandleKeyDown'
          @keyup='onHandleKeyUp'
        )
</template>

<script>
import { mapGetters } from 'vuex'
import AvatarUser from '@components/AvatarUser.vue'

export default ({
  name: 'UsersSelector',
  components: {
    AvatarUser
  },
  props: {
    label: {
      type: String,
      required: true
    },
    usernames: {
      type: Array,
      default: []
    },
    defaultValue: {
      type: String,
      default: ''
    },
    autofocus: {
      type: Boolean,
      default: false
    }
  },
  data () {
    return {
      // NOTE: v-model can't be used here since it's only for limited elements; input, select, textarea
      //       https://vuejs.org/api/built-in-directives.html#v-model
      value: ''
    }
  },
  computed: {
    ...mapGetters(['ourContactProfiles'])
  },
  mounted () {
    this.$refs.input.innerHTML = this.defaultValue
    this.value = this.defaultValue
    if (this.autofocus) {
      this.$refs.input.focus()
    }
  },
  methods: {
    remove (username) {
      this.$emit('remove', username)
    },
    displayName (username) {
      return this.ourContactProfiles[username].displayName || username
    },
    clear () {
      this.$refs.input.focus()
      this.$refs.input.innerHTML = ''
      this.value = ''
    },
    onHandleKeyDown (e: KeyboardEvent) {
      const { keyCode } = e
      if (keyCode === 13 || keyCode === 39) { // Enter
        e.preventDefault()
      }
    },
    onHandleKeyUp (e: KeyboardEvent) {
      const { keyCode } = e

      if (keyCode === 13 || keyCode === 39) { // Enter
        this.$emit('submit')
        return
      } else if (keyCode === 8 && !this.value && this.usernames.length) { // Backspace
        this.remove(this.usernames[this.usernames.length - 1])
      }

      this.value = this.$refs.input.textContent
    }
  },
  watch: {
    value () {
      this.$emit('change', this.value)
    },
    usernames () {
      this.clear()
    }
  }
}: Object)
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-search {
  .addons {
    display: flex;
    align-items: center;
    margin-right: 0.5rem;
  }

  .input {
    padding: 0 0 5px 2.5rem;
    flex-wrap: wrap;
    justify-content: flex-start;
    min-height: 2.75rem;
    height: fit-content;
    cursor: text;

    p {
      display: inline;
    }

    &:focus-within {
      box-shadow: 0 0 0 2px var(--primary_1);
      border-color: var(--primary_0);
    }
  }

  .profile-wrapper {
    display: inline-flex;
    margin: 5px 5px 0 0;

    .profile {
      cursor: default;
      display: flex;
      align-items: center;
      border-radius: 3px;
      background-color: $general_1;
      line-height: 1;
      padding: 0.25rem;
      width: fit-content;
      cursor: default;

      &:hover {
        background-color: $general_0;
      }

      .c-name {
        margin-left: 0.5rem;
        color: $text_0;
      }

      .button {
        margin-left: 0.5rem;
      }
    }
  }

  .c-keyword {
    margin-top: 5px;
    display: block;
    line-height: 2.2rem;
    overflow-wrap: anywhere;
    min-width: 1rem;

    &:focus {
      outline: none;
    }
  }
}
</style>
