import { useRef, useState } from 'react'
import styles from './styles.module.css'
import { ScreenCaptureManager } from './screen-capture-manager'
import { LoadingSpinner } from 'tapestry-core-client/src/components/lib/loading-spinner/index'
import { GenericMediaCaptureTab } from '../generic-media-capture-tab'
import { MediaCaptureTabProps } from '..'
import { Text } from 'tapestry-core-client/src/components/lib/text/index'
import { useObservable } from 'tapestry-core-client/src/components/lib/hooks/use-observable'
import { Icon } from 'tapestry-core-client/src/components/lib/icon/index'
import { Button } from 'tapestry-core-client/src/components/lib/buttons/index'
import clsx from 'clsx'

function RecordingPreview({ src }: { src: string }) {
  return <video controls src={src} />
}

export function ScreenCaptureTab(props: MediaCaptureTabProps) {
  const [captureManager] = useState(() => new ScreenCaptureManager())
  const previewRef = useRef<HTMLVideoElement>(null)

  const { previewState } = useObservable(captureManager)

  return (
    <GenericMediaCaptureTab
      className={styles.root}
      captureManager={captureManager}
      initOptions={{ previewRef }}
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
          {previewState === 'none' && (
            <div className={clsx(styles.previewPlaceholder, styles.share)}>
              <Icon icon="screen_share" />
              <Text variant="body">Share your screen</Text>
              <Button variant="secondary" onClick={() => captureManager.share()}>
                Preview before you start
              </Button>
            </div>
          )}
        </>
      }
      recordingPreview={RecordingPreview}
      downloadable="screen-recording"
      {...props}
    />
  )
}
