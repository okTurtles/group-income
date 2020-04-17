const trapFocus = {
  data () {
    return {
      focusableElements: 'a[href], area[href], ' +
        'input:not([disabled]), select:not([disabled]), textarea:not([disabled]), ' +
        'button:not([disabled]), iframe, object, embed, [tabindex="0"], [contenteditable]'
    }
  },
  mounted () {
    document.addEventListener('keydown', this.trapFocus)
  },
  beforeDestroy () {
    document.removeEventListener('keydown', this.trapFocus)
  },
  methods: {
    trapFocus (e) {
      // Trap focus on modal while navigating through clickable elements only
      if (e.key === 'Tab') {
        // look for focusableChilds each time tab is pressed
        // to catch any element that may have changed disabled attr.
        // ex: submit button gets enabled or a form step changed.
        const focusableChilds = Array.from(this.$el.querySelectorAll(this.focusableElements))
        const firstFocusChild = focusableChilds[0]
        const lastFocusChild = focusableChilds[focusableChilds.length - 1]

        if (e.shiftKey) { // Shift + Tab
          if (document.activeElement === firstFocusChild) {
            // tab backwards, so go back to last element
            e.preventDefault()
            lastFocusChild.focus()
          }
        } else if (document.activeElement === lastFocusChild) {
          // tab forwards, so go back to first element
          e.preventDefault()
          firstFocusChild.focus()
        }
      }
    }
  }
}

export default trapFocus
