import { ComponentType, useState } from 'react'
import { Modal } from 'tapestry-core-client/src/components/lib/modal/index'
import { TabPanel } from 'tapestry-core-client/src/components/lib/tab-panel/index'
import styles from './styles.module.css'
import { AudioCaptureTab } from './audio'
import { VideoCaptureTab } from './video'
import { ScreenCaptureTab } from './screen'
import clsx from 'clsx'

export interface MediaCaptureDialogProps {
  onAddToTapestry: (recording: File) => void
  onClose: () => void
  onMinimize: () => unknown
  minimized: boolean
  onRecordingStateChange: (isRecording: boolean) => void
}

export interface MediaCaptureTabProps {
  onAddToTapestry: (recording: File) => void
  onRecordingStateChange?: (isRecording: boolean) => void
}

type MediaCaptureType = 'audio' | 'video' | 'screen'

const TABS: Record<MediaCaptureType, ComponentType<MediaCaptureTabProps>> = {
  audio: AudioCaptureTab,
  video: VideoCaptureTab,
  screen: ScreenCaptureTab,
}

export function MediaCaptureDialog({
  onAddToTapestry,
  onClose,
  onMinimize,
  minimized,
  onRecordingStateChange,
}: MediaCaptureDialogProps) {
  const [selectedTab, setSelectedTab] = useState<MediaCaptureType>('audio')
  const [isRecording, setIsRecording] = useState(false)

  const SelectedTab = TABS[selectedTab]

  return (
    <Modal
      title="Create a recording"
      onClose={onClose}
      classes={{ overlay: clsx(styles.root, { [styles.minimized]: minimized }) }}
      ariaHideApp={!minimized}
      onMinimize={onMinimize}
      closable={!isRecording}
    >
      <TabPanel
        tabs={{ audio: 'Audio', video: 'Video', screen: 'Screen' }}
        selected={selectedTab}
        onSelect={setSelectedTab}
      />
      <div className={styles.content}>
        <SelectedTab
          onRecordingStateChange={(recording) => {
            setIsRecording(recording)
            onRecordingStateChange(recording)
          }}
          onAddToTapestry={onAddToTapestry}
        />
      </div>
    </Modal>
  )
}
