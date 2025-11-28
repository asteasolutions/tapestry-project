import { useRef, useState } from 'react'
import { AudioCaptureManager } from './audio-capture-manager'
import { useObservable } from 'tapestry-core-client/src/components/lib/hooks/use-observable'
import { Text } from 'tapestry-core-client/src/components/lib/text/index'
import { Select } from '../../select'
import styles from './styles.module.css'
import { AudioPlayer } from '../../audio-player'
import { useMediaDeviceId } from '../use-media-device-id'
import { GenericMediaCaptureTab } from '../generic-media-capture-tab'
import { MediaCaptureTabProps } from '..'

function RecordingPreview({ src }: { src: string }) {
  return <AudioPlayer source={src} className={styles.player} />
}

export function AudioCaptureTab(props: MediaCaptureTabProps) {
  const [captureManager] = useState(() => new AudioCaptureManager())
  const { devices } = useObservable(captureManager)
  const [selectedDeviceId, setSelectedDeviceId] = useMediaDeviceId(devices)
  const containerRef = useRef<HTMLDivElement>(null)

  const deviceOptions = devices.map((device) => ({
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
      initOptions={{ containerRef }}
      deviceOptions={
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Text variant="bodySm">Choose microphone:</Text>
          <Select
            options={deviceOptions}
            value={selectedDeviceId}
            onChange={(o) => {
              setSelectedDeviceId(o!.value)
              captureManager.selectDevice(o!.value)
            }}
          />
        </div>
      }
      streamPreview={<div ref={containerRef} style={{ height: '100%' }} />}
      recordingPreview={RecordingPreview}
      {...props}
    />
  )
}
