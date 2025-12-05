export class PromiseCancelledError extends Error {}

export function makeCancelable<T>(promise: Promise<T>) {
  let hasCanceled = false

  const wrappedPromise = new Promise<T>((resolve, reject) => {
    promise.then(
      (val) => (hasCanceled ? reject(new PromiseCancelledError()) : resolve(val)),
      // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
      (error) => (hasCanceled ? reject(new PromiseCancelledError()) : reject(error)),
    )
  })

  return {
    promise: wrappedPromise,
    cancel: () => {
      hasCanceled = true
    },
  }
}

export function defer<T = void>() {
  let resolve: (value: T) => void
  let reject: (error: Error) => void
  let state = 'pending' as 'pending' | 'resolved' | 'rejected'
  const promise = new Promise<T>((res, rej) => {
    resolve = (value: T) => {
      res(value)
      state = 'resolved'
    }
    reject = (error: Error) => {
      rej(error)
      state = 'rejected'
    }
  })

  // @ts-expect-error TS doesn't know that Promise executors are called synchronously
  // and thinks that resolve and reject are not defined here yet.
  return { promise, resolve, reject, state }
}

export async function asyncFlatMap<T, R>(arr: T[], fn: (elem: T) => Promise<R[]>) {
  return (await Promise.all(arr.map(fn))).flat()
}
