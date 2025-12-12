import { ComponentType, ReactNode, useEffect, useState } from 'react'
import { BaseMediaCaptureManager, PermissionsState } from './base-media-capture-manager'
import { useObservable } from 'tapestry-core-client/src/components/lib/hooks/use-observable'
import { useMediaSource } from 'tapestry-core-client/src/components/lib/hooks/use-media-source'
import { usePropRef } from 'tapestry-core-client/src/components/lib/hooks/use-prop-ref'
import { Button } from 'tapestry-core-client/src/components/lib/buttons/index'
import { Text } from 'tapestry-core-client/src/components/lib/text/index'
import mime from 'mime'
import { compact } from 'lodash-es'
import clsx from 'clsx'
import styles from './styles.module.css'
import { MediaCaptureTabProps } from '..'
import { Icon } from 'tapestry-core-client/src/components/lib/icon/index'
import Lock from '../../../assets/gifs/lock.gif'
import Unlock from '../../../assets/gifs/unlock.gif'
import { usePrevious } from 'tapestry-core-client/src/components/lib/hooks/use-previous'

function captureManagerIcon(man: BaseMediaCaptureManager<unknown>) {
  if (man.inputDeviceTypes.video) {
    return 'videocam'
  }
  if (man.inputDeviceTypes.audio) {
    return 'mic'
  }
  return ''
}
export interface GenericMediaCaptureTabProps<O> extends MediaCaptureTabProps {
  className?: string
  captureManager: BaseMediaCaptureManager<O>
  initOptions: O
  deviceOptions?: ReactNode
  streamPreview: ReactNode
  recordingPreview: ComponentType<{ src: string }>
  downloadable?: string
}

function usePermissionsJustGranted(state: PermissionsState) {
  const [justGranted, setJustGranted] = useState(false)
  const prev = usePrevious(state)

  useEffect(() => {
    if (state === 'ready' && prev === 'prompt') {
      setJustGranted(true)
      window.setTimeout(() => setJustGranted(false), 1500)
    }
  }, [state, prev])

  return justGranted
}

export function GenericMediaCaptureTab<O>({
  className,
  captureManager,
  initOptions,
  deviceOptions,
  streamPreview,
  recordingPreview: RecordingPreview,
  onAddToTapestry,
  onRecordingStateChange,
  downloadable,
}: GenericMediaCaptureTabProps<O>) {
  const { state, recordingState, recording } = useObservable(captureManager)
  const recordingUrl = useMediaSource(recording)
  const initOptionsRef = usePropRef(initOptions)

  const isRecording = recordingState === 'recording'
  const onRecordingStateChangeRef = usePropRef(onRecordingStateChange)
  useEffect(() => {
    onRecordingStateChangeRef.current?.(isRecording)
  }, [isRecording, onRecordingStateChangeRef])

  useEffect(() => {
    void captureManager.init(initOptionsRef.current)
    return () => {
      captureManager.destroy()
    }
  }, [captureManager, initOptionsRef])

  async function startRecording(resume = false) {
    if (resume) {
      captureManager.resume()
    } else {
      await captureManager.start()
    }
  }

  function stopRecording(pause = false) {
    if (pause) {
      captureManager.pause()
    } else {
      captureManager.stop()
    }
  }

  const stopBtn = (
    <Button key="stop" icon="stop" onClick={() => stopRecording()}>
      Stop
    </Button>
  )

  let content: ReactNode = null
  let buttons: ReactNode = null

  const justGranted = usePermissionsJustGranted(state)
  const permissionsPending = state === 'prompt' || justGranted

  if (state === 'new') {
    // Don't show anything initailly. The state wil change to pending, granted or error
  } else if (permissionsPending) {
    content = (
      <div className={clsx(styles.pendingPermissionsContainer, { [styles.granted]: justGranted })}>
        <div className={styles.iconContainer} data-icon={captureManagerIcon(captureManager)}>
          <img src={justGranted ? Unlock : Lock} />
        </div>
        <Text variant="body">{justGranted ? 'Access Granted' : 'Waiting for permission'}</Text>
      </div>
    )
  } else if (state === 'error') {
    content = (
      <Text variant="bodySm" className={styles.status}>
        Insufficient permissions. Please check your browser settings.
      </Text>
    )
  } else if (state === 'recoverable') {
    content = (
      <Button onClick={() => captureManager.init(initOptionsRef.current)}>Allow access</Button>
    )
  } else if (recordingUrl) {
    content = (
      <>
        <Text variant="bodySm" className={styles.status}>
          Preview recording:
        </Text>
        <RecordingPreview src={recordingUrl} />
      </>
    )
    buttons = [
      downloadable && (
        <Button
          key="download"
          variant="secondary"
          component="a"
          href={recordingUrl}
          style={{ marginRight: 'auto' }}
          target="_blank"
          download={downloadable}
        >
          Downlaod
        </Button>
      ),
      <Button key="reset" variant="secondary" onClick={() => captureManager.reset()}>
        Reset
      </Button>,
      <Button
        key="add-to-tapestry"
        variant="primary"
        onClick={() => {
          const fileName = `recording-${Date.now()}`
          const extension = mime.getExtension(recording!.type)
          const file = new File([recording!], compact([fileName, extension]).join('.'), {
            type: recording!.type,
          })
          onAddToTapestry(file)
        }}
      >
        Add to tapestry
      </Button>,
    ]
  } else if (recordingState === 'inactive') {
    content = deviceOptions
    buttons = (
      <Button icon="radio_button_checked" onClick={() => startRecording()}>
        Record
      </Button>
    )
  } else if (recordingState === 'paused') {
    content = (
      <Text variant="bodySm" className={styles.status}>
        <Icon icon="pause" /> Paused
      </Text>
    )
    buttons = [
      <Button
        key="resume"
        variant="secondary"
        icon="radio_button_checked"
        onClick={() => startRecording(true)}
      >
        Resume
      </Button>,
      stopBtn,
    ]
  } else {
    content = (
      <Text variant="bodySm" className={styles.status}>
        <Icon icon="radio_button_checked" className={styles.recordingIcon} />
        Recording...
      </Text>
    )
    buttons = [
      <Button key="pause" variant="secondary" icon="pause" onClick={() => stopRecording(true)}>
        Pause
      </Button>,
      stopBtn,
    ]
  }

  return (
    <div className={className}>
      <div className={styles.content}>
        {content}
        <div
          className={clsx('media-capture-stream-preview-wrapper', {
            hidden: state !== 'ready' || !!recordingUrl || permissionsPending,
          })}
        >
          {streamPreview}
        </div>
      </div>
      <div className={styles.buttons}>{buttons}</div>
    </div>
  )
}
