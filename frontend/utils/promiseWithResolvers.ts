const promiseWithResolvers: () => {
    promise: Promise<unknown>,
    resolve: Fn,
    reject: Fn
} = (() => {
  if (Promise.withResolvers) {
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
