export default ({
  loginState (state, getters) {
    return getters.currentIdentityState.loginState
  },
  ourDirectMessages (state, getters) {
    return getters.currentIdentityState.chatRooms || {}
  }
}: Object)
