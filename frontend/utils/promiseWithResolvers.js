const promiseWithResolvers: () => {
    promise: Promise<*>,
    resolve: Function,
    reject: Function
} = (() => {
  // $FlowFixMe[prop-missing]
  if (Promise.withResolvers) {
    // $FlowFixMe[prop-missing]
    return () => Promise.withResolvers()
  } else {
    return () => {
      let outerResolve, outerReject
      const promise = new Promise((resolve, reject) => {
        outerResolve = resolve
        outerReject = reject
      })

      return {
        promise,
        resolve: outerResolve,
        reject: outerReject
      }
    }
  }
})()

export default promiseWithResolvers
