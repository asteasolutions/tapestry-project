import { Observable } from 'tapestry-core-client/src/lib/events/observable'

export type PreviewState = 'none' | 'loading' | 'ready'
export type PermissionsState = 'new' | 'prompt' | 'ready' | 'error' | 'recoverable'
export interface DeviceTypes {
  audio?: true
  video?: true
}

interface MediaCaptureManagerState {
  state: PermissionsState
  devices: MediaDeviceInfo[]
  recordingState: RecordingState
  recording: Blob | null
  previewState: PreviewState
}

export abstract class BaseMediaCaptureManager<Opts> extends Observable<MediaCaptureManagerState> {
  protected options!: Opts
  protected selectedDevices: Partial<Record<'audio' | 'video', string>> = {}

  constructor(public readonly inputDeviceTypes: Readonly<DeviceTypes> = {}) {
    super({
      state: 'new',
      devices: [],
      recordingState: 'inactive',
      recording: null,
      previewState: 'none',
    })
  }

  private async ensurePermissions(action: () => Promise<void>) {
    const { audio, video } = this.inputDeviceTypes
    if (!audio && !video) {
      return action()
    }

    const permissions = await this.listPermissions()

    if (permissions.includes('denied')) {
      throw new Error('Insufficient permissions!')
    }

    if (permissions.includes('prompt')) {
      this.update((state) => {
        state.state = 'prompt'
      })
    }

    // In Chrome and Safari, once permissions are 'granted', we have full access to the media devices, but on Firefox,
    // we also need to hold a reference to an active MediaStream in order to get full access to media device data.
    const stream = await navigator.mediaDevices.getUserMedia({ audio, video })
    try {
      await action()
    } finally {
      stream.getTracks().forEach((track) => track.stop())
    }
  }

  private async listPermissions() {
    const { audio, video } = this.inputDeviceTypes
    return [
      audio && (await navigator.permissions.query({ name: 'microphone' })).state,
      video && (await navigator.permissions.query({ name: 'camera' })).state,
    ]
  }

  async init(options: Opts) {
    this.options = options
    try {
      await this.ensurePermissions(async () => {
        const { audio, video } = this.inputDeviceTypes
        let devices: MediaDeviceInfo[] = []
        if (audio || video) {
          const allDevices = await navigator.mediaDevices.enumerateDevices()
          devices = allDevices.filter(
            ({ kind }) => (!!audio && kind === 'audioinput') || (!!video && kind === 'videoinput'),
          )
        }
        this.update((state) => {
          state.state = 'ready'
          state.devices = devices
        })
      })
    } catch (error) {
      console.error(error)
      const recoverable = (await this.listPermissions()).every((p) => p !== 'denied')

      this.update((state) => {
        state.state = recoverable ? 'recoverable' : 'error'
      })
    }
  }

  selectDevice(deviceId: string) {
    if (this.value.recordingState !== 'inactive') {
      throw new Error('Cannot change device while recording!')
    }

    const device = this.value.devices.find((d) => d.deviceId === deviceId)
    if (!device) throw new Error(`Unknown device ID: ${deviceId}`)

    const type = device.kind === 'audioinput' ? 'audio' : 'video'
    this.selectedDevices[type] = deviceId
  }

  abstract destroy(): void

  abstract start(): Promise<boolean>

  abstract pause(): void

  abstract resume(): void

  abstract stop(): void

  reset(): void {
    this.stop()

    this.update((state) => {
      state.recording = null
    })
  }

  protected createMediaRecorder(stream: MediaStream, mimeType: string) {
    const recorder = new MediaRecorder(stream, { mimeType })

    const chunks: Blob[] = []

    recorder.addEventListener('start', () => {
      this.update((state) => {
        state.recordingState = 'recording'
      })
    })

    recorder.addEventListener('pause', () => {
      this.update((state) => {
        state.recordingState = 'paused'
      })
    })

    recorder.addEventListener('resume', () => {
      this.update((state) => {
        state.recordingState = 'recording'
      })
    })

    recorder.addEventListener('dataavailable', (event) => {
      chunks.push(event.data)
    })

    recorder.addEventListener('stop', () => {
      recorder.stream.getTracks().forEach((track) => track.stop())
      this.update((state) => {
        state.recordingState = 'inactive'
        state.recording = new Blob(chunks, { type: mimeType })
      })
      this.onRecorderStop()
    })

    return recorder
  }

  protected onRecorderStop() {
    //
  }
}
