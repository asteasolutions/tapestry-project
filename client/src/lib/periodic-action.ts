export interface PeriodicActionConfig {
  period: number
  pauseTimerWhileExecuting?: boolean
}

export class PeriodicAction {
  private timeoutId = 0
  private mutex = Promise.resolve()
  private killSwitch?: AbortController
  private config: PeriodicActionConfig

  constructor(
    private action: (signal?: AbortSignal) => void | Promise<void>,
    config: Partial<PeriodicActionConfig> = {},
  ) {
    this.config = { period: 10_000, ...config }
  }

  start(immediately?: boolean) {
    this.killSwitch = new AbortController()
    if (immediately) {
      void this.tick()
    } else {
      this.scheduleNextExecution()
    }
  }

  force(resetTimer?: boolean) {
    if (resetTimer) {
      this.stop()
      this.start(true)
    } else {
      void this.execute()
    }
  }

  stop() {
    window.clearTimeout(this.timeoutId)
    this.killSwitch?.abort()
    this.killSwitch = undefined
  }

  private scheduleNextExecution() {
    window.clearTimeout(this.timeoutId)
    this.timeoutId = window.setTimeout(this.tick, this.config.period)
  }

  private execute() {
    this.mutex = this.mutex.then(async () => {
      try {
        await this.action(this.killSwitch?.signal)
      } catch (error) {
        console.error('Error while executing periodic action', error)
      }
    })
    return this.mutex
  }

  private tick = async () => {
    const promise = this.execute()
    if (!this.killSwitch) return

    if (this.config.pauseTimerWhileExecuting) {
      await promise
    }
    this.scheduleNextExecution()
  }
}
