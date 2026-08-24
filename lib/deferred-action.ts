export function scheduleDeferredAction(
  run: () => void | Promise<void>,
  delayMs: number,
): { cancel: () => void; flush: () => Promise<void> } {
  let timer: ReturnType<typeof setTimeout> | undefined
  let execution: Promise<void> | undefined

  const execute = () => {
    if (!execution) {
      execution = Promise.resolve()
        .then(run)
        .then(() => undefined)
    }

    return execution
  }

  timer = setTimeout(() => {
    timer = undefined
    void execute()
  }, delayMs)

  return {
    cancel() {
      if (timer !== undefined) {
        clearTimeout(timer)
        timer = undefined
      }
    },
    flush() {
      if (timer !== undefined) {
        clearTimeout(timer)
        timer = undefined
      }

      return execute()
    },
  }
}
