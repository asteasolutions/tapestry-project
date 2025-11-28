import WaveSurfer from 'wavesurfer.js'
import RecordPlugin from 'wavesurfer.js/dist/plugins/record'
import { getPaletteColor } from 'tapestry-core-client/src/theme/design-system'
import { BaseMediaCaptureManager } from '../generic-media-capture-tab/base-media-capture-manager'
import { RefObject } from 'react'

export class AudioCaptureManager extends BaseMediaCaptureManager<{
  containerRef: RefObject<HTMLElement | null>
}> {
  private wavesurfer: WaveSurfer | null = null
  private recorder: RecordPlugin | null = null

  constructor() {
    super({ audio: true })
  }

  async start() {
    if (this.value.state !== 'ready') return false

    this.destroy()

    this.wavesurfer = WaveSurfer.create({
      container: this.options.containerRef.current!,
      waveColor: getPaletteColor('neutral.500'),
      progressColor: getPaletteColor('primary.500'),
      cursorColor: getPaletteColor('primary.900'),
      height: 'auto',
    })

    this.recorder = this.wavesurfer.registerPlugin(
      RecordPlugin.create({
        renderRecordedAudio: false,
        scrollingWaveform: true,
      }),
    )

    this.recorder.on('record-start', () => {
      this.update((state) => {
        state.recordingState = 'recording'
      })
    })
    this.recorder.on('record-pause', () => {
      this.update((state) => {
        state.recordingState = 'paused'
      })
    })
    this.recorder.on('record-resume', () => {
      this.update((state) => {
        state.recordingState = 'recording'
      })
    })
    this.recorder.on('record-end', (blob) => {
      this.update((state) => {
        state.recordingState = 'inactive'
        state.recording = blob
      })
    })

    try {
      await this.recorder.startRecording({ deviceId: this.selectedDevices.audio })
      return true
    } catch (error) {
      console.error('Failed to start audio recording', error)
      return false
    }
  }

  pause() {
    this.recorder?.pauseRecording()
  }

  resume() {
    this.recorder?.resumeRecording()
  }

  stop() {
    this.recorder?.stopRecording()
    this.recorder?.stopMic()
    this.destroy()
  }

  destroy() {
    this.recorder?.destroy()
    this.recorder = null

    this.wavesurfer?.destroy()
    this.wavesurfer = null
  }
}
