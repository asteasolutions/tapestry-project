import { PreviewCaptureManager } from '../generic-media-capture-tab/preview-capture-manager'

export class VideoCaptureManager extends PreviewCaptureManager {
  private stream: MediaStream | null = null
  private recorder: MediaRecorder | null = null
  private initStreamQueue = Promise.resolve()

  constructor() {
    super({ audio: true, video: true })
  }

  private get audioDeviceId() {
    return this.stream?.getAudioTracks()[0].getSettings().deviceId
  }

  private get videoDeviceId() {
    return this.stream?.getVideoTracks()[0].getSettings().deviceId
  }

  private initPreview(force = false) {
    this.initStreamQueue = this.initStreamQueue.then(async () => {
      try {
        if (
          force ||
          this.audioDeviceId !== this.selectedDevices.audio ||
          this.videoDeviceId !== this.selectedDevices.video
        ) {
          this.destroy()
          this.stream = await navigator.mediaDevices.getUserMedia({
            audio: { deviceId: this.selectedDevices.audio },
            video: { deviceId: this.selectedDevices.video, aspectRatio: 1.777777778 },
          })
        }
        this.options.previewRef.current!.srcObject = this.stream
      } catch (error) {
        console.error(error)
      }
    })
  }

  selectDevice(deviceId: string) {
    super.selectDevice(deviceId)

    if (!this.selectedDevices.audio || !this.selectedDevices.video) return

    this.initPreview()
  }

  async start() {
    await this.initStreamQueue

    if (this.value.state !== 'ready' || !this.stream) return false

    this.recorder?.stop()

    try {
      this.recorder = this.createMediaRecorder(this.stream, 'video/webm')
      this.recorder.start()
      return true
    } catch (error) {
      console.error('Failed to start video recording', error)
      return false
    }
  }

  pause() {
    this.recorder?.pause()
  }

  resume() {
    this.recorder?.resume()
  }

  stop() {
    this.recorder?.stop()
  }

  reset() {
    super.reset()
    this.initPreview(true)
  }

  destroy() {
    this.recorder?.stop()
    this.recorder = null

    this.stream?.getTracks().forEach((track) => track.stop())
    this.stream = null
  }
}
