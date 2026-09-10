export default ((() => {
  let isPwa

  return () => {
    if (isPwa == null) {
      isPwa =
        window.matchMedia('(display-mode: standalone) or (display-mode: window-controls-overlay)').matches ||
        // @ts-expect-error TS2339: `standalone` is Safari-only and absent from lib.dom.
        navigator.standalone
    }

    return isPwa
  }
})() as () => boolean)
