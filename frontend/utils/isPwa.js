export default ((() => {
  let isPwa

  return () => {
    if (isPwa == null) {
      isPwa =
        window.matchMedia('(display-mode: standalone) or (display-mode: window-controls-overlay)').matches ||
        // $FlowFixMe[prop-missing]
        navigator.standalone
    }

    return isPwa
  }
})(): () => boolean)
