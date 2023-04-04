<template lang='pug'>
form.c-search-form(@submit.prevent='')
  label.field
    .sr-only {{label}}
    .inputgroup.c-search(
      @click='focusOnInput'
    )
      .is-icon.prefix(aria-hidden='true')
        i.icon-search
      .input(
        type='text'
        name='search'
        data-test='multi-users'
      )
        .profile-wrapper(
          contenteditable='false'
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
          @keydown='onHandleKeyDown'
          @keyup='onHandleKeyUp'
        ) type
</template>

<script>
import { mapGetters } from 'vuex'
import AvatarUser from '@components/AvatarUser.vue'
import { L } from '@common/common.js'

export default ({
  name: 'MultiSearch',
  components: {
    AvatarUser
  },
  props: {
    value: {
      type: String,
      required: false
    },
    placeholder: {
      type: String,
      default: L('Search...')
    },
    label: {
      type: String,
      required: true
    },
    usernames: {
      type: Array,
      default: []
    }
  },
  data () {
    return {
      selected: null
    }
  },
  computed: {
    ...mapGetters(['ourContactProfiles'])
  },
  methods: {
    remove (username) {
      this.$emit('remove', username)
    },
    displayName (username) {
      return this.ourContactProfiles[username].displayName || username
    },
    focusOnInput () {
      this.$refs.input.focus()
      this.$refs.input.innerHTML = ''

      // NOTE: uncomment not to delete innerHTML and to focus at end
      // if (typeof window.getSelection !== 'undefined' && typeof document.createRange !== 'undefined') {
      //   const range = document.createRange()
      //   range.selectNodeContents(this.$refs.input)
      //   range.collapse(false)
      //   const sel = window.getSelection()
      //   sel.removeAllRanges()
      //   sel.addRange(range)
      // } else if (typeof document.body.createTextRange !== 'undefined') {
      //   const textRange = document.body.createTextRange()
      //   textRange.moveToElementText(this.$refs.input)
      //   textRange.collapse(false)
      //   textRange.select()
      // }
    },
    onHandleKeyDown (e: KeyboardEvent) {
      const { keyCode } = e
      if (keyCode === 13 || keyCode === 39) { // Enter
        e.preventDefault()
      } else if (keyCode === 8) { // Backspace
        console.log('Remove')
      }
    },
    onHandleKeyUp (e: KeyboardEvent) {
      const { keyCode } = e
      if (keyCode === 13 || keyCode === 39) { // Enter
        e.preventDefault()
      } else if (keyCode === 8) { // Backspace
        console.log('Remove')
      }
    }
  },
  watch: {
    value () {
      this.$emit('input', this.value)
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

    p {
      display: inline;
    }
  }

  .profile-wrapper {
    display: inline-flex;
    margin: 5px 5px 0 0;

    .profile {
      display: flex;
      align-items: center;
      border-radius: 3px;
      background-color: $general_1;
      line-height: 1;
      padding: 0.3rem;
      width: fit-content;

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
