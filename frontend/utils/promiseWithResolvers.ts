const promiseWithResolvers: () => {
    promise: Promise<any>,
    resolve: any,
    reject: any
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
