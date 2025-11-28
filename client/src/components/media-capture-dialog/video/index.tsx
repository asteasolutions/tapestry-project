import { useEffect, useRef, useState } from 'react'
import { useObservable } from 'tapestry-core-client/src/components/lib/hooks/use-observable'
import { Text } from 'tapestry-core-client/src/components/lib/text/index'
import { Select } from '../../select'
import styles from './styles.module.css'
import { VideoCaptureManager } from './video-capture-manager'
import { useMediaDeviceId } from '../use-media-device-id'
import { LoadingSpinner } from 'tapestry-core-client/src/components/lib/loading-spinner/index'
import { GenericMediaCaptureTab } from '../generic-media-capture-tab'
import { MediaCaptureTabProps } from '..'

function RecordingPreview({ src }: { src: string }) {
  return <video controls src={src} />
}

export function VideoCaptureTab(props: MediaCaptureTabProps) {
  const [captureManager] = useState(() => new VideoCaptureManager())
  const { state, devices, previewState } = useObservable(captureManager)
  const audioDevices = devices.filter((d) => d.kind === 'audioinput')
  const videoDevices = devices.filter((d) => d.kind === 'videoinput')
  const [audioDevice, setAudioDevice] = useMediaDeviceId(audioDevices)
  const [videoDevice, setVideoDevice] = useMediaDeviceId(videoDevices)
  const [isStreamInitialized, setIsStreamInitialized] = useState(false)
  const previewRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    if (!isStreamInitialized && state === 'ready' && audioDevice && videoDevice) {
      captureManager.selectDevice(audioDevice)
      captureManager.selectDevice(videoDevice)
      setIsStreamInitialized(true)
    }
  }, [audioDevice, isStreamInitialized, state, videoDevice, captureManager])

  const audioDeviceOptions = audioDevices.map((device) => ({
    label: (
      <Text variant="bodySm" ellipsize>
        {device.label}
      </Text>
    ),
    value: device.deviceId,
  }))
  const videoDeviceOptions = videoDevices.map((device) => ({
    label: (
      <Text variant="bodySm" ellipsize>
        {device.label}
      </Text>
    ),
    value: device.deviceId,
  }))

  return (
    <GenericMediaCaptureTab
      className={styles.root}
      captureManager={captureManager}
      initOptions={{ previewRef }}
      deviceOptions={
        <div className={styles.deviceSelectorContainer}>
          <Select
            options={videoDeviceOptions}
            value={videoDevice}
            onChange={(o) => {
              setVideoDevice(o!.value)
              captureManager.selectDevice(o!.value)
            }}
          />
          <Select
            options={audioDeviceOptions}
            value={audioDevice}
            onChange={(o) => {
              setAudioDevice(o!.value)
              captureManager.selectDevice(o!.value)
            }}
          />
        </div>
      }
      streamPreview={
        <>
          <video
            ref={previewRef}
            autoPlay
            muted
            style={{
              display: previewState !== 'ready' ? 'none' : 'block',
            }}
          />
          {previewState === 'loading' && (
            <div className={styles.previewPlaceholder}>
              <LoadingSpinner />
            </div>
          )}
        </>
      }
      recordingPreview={RecordingPreview}
      {...props}
    />
  )
}
