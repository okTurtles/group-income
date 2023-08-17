// This mixin was written based on below references:
// https://developer.mozilla.org/en-US/docs/Web/API/HTML_Drag_and_Drop_API
// https://css-tricks.com/drag-and-drop-file-uploading/

const DragAndDropMixin: Object = {
  data () {
    return {
      dndState: {
        isActive: false
      }
    }
  },
  methods: {
    dragStartHandler (e) {
      // handler function for 'dragstart', 'dragover' events
      if (!this.dndState.isActive) {
        this.dndState.isActive = true
      }
    },
    dragEndHandler (e) {
      e.preventDefault()
      // handler function for 'dragleave', 'dragend', 'drop' events
      console.log('@@ dragEndHandler !! : ', e.type, e.target)

      if (this.dndState.isActive) {
        this.dndState.isActive = false
      }
    }
  }
}

export default DragAndDropMixin
