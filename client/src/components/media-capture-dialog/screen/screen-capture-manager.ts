import { PreviewCaptureManager } from '../generic-media-capture-tab/preview-capture-manager'

export class ScreenCaptureManager extends PreviewCaptureManager {
  private stream: MediaStream | null = null
  private recorder: MediaRecorder | null = null

  constructor() {
    super({})
  }

  async start() {
    if (this.value.state !== 'ready') return false

    this.destroy()

    try {
      // @ts-expect-error this is an expiremental option not yet implemented by all browsers.
      // It allows the users to capture the current tab when sharing their screens
      this.stream = await navigator.mediaDevices.getDisplayMedia({ selfBrowserSurface: 'include' })
      this.setPreview(this.stream)
      this.recorder = this.createMediaRecorder(this.stream, 'video/webm')
      this.recorder.start()
      return true
    } catch (error) {
      console.error('Failed to start screen recording', error)
      // We used to update the state to 'error' here, but it seems that unlike
      // the camera/microphone permissions we can request display media as much as we want
      return false
    }
  }

  pause() {
    this.recorder?.pause()
    this.options.previewRef.current?.pause()
  }

  resume() {
    this.recorder?.resume()
    void this.options.previewRef.current?.play()
  }

  stop() {
    this.recorder?.stop()
  }

  destroy() {
    this.stop()

    this.stream?.getTracks().forEach((track) => track.stop())
    this.stream = null
  }

  private setPreview(stream: MediaStream | null) {
    if (this.options.previewRef.current) {
      this.options.previewRef.current.srcObject = stream
    }
  }
}
