import { useState } from 'react'
import { Button } from 'tapestry-core-client/src/components/lib/buttons'
import { LocalStorage } from '../../../services/local-storage'
import Thread from '../../../assets/images/weaving-circle-banner/thread.svg'
import Photo from '../../../assets/images/weaving-circle-banner/photo.webp'
import Dot from '../../../assets/images/weaving-circle-banner/dot.svg'
import styles from './styles.module.css'

const REMIND_AFTER_MS = 14 * 24 * 60 * 60 * 1000

const hiddenUntilStorage = new LocalStorage<number>('weaving-circle-banner-hidden-until')

export function useWeavingCircleBanner() {
  const [visible, setVisible] = useState(() => (hiddenUntilStorage.current ?? 0) <= Date.now())

  const hide = () => {
    hiddenUntilStorage.save(Date.now() + REMIND_AFTER_MS)
    setVisible(false)
  }

  return { visible, hide }
}

interface WeavingCircleBannerCardProps {
  onRemindLater: () => unknown
}

export function WeavingCircleBannerCard({ onRemindLater }: WeavingCircleBannerCardProps) {
  return (
    <div className={styles.root}>
      <div className={styles.decoration}>
        <img src={Thread} alt="" className={styles.thread} draggable={false} />
        <img src={Photo} alt="" className={styles.photo} draggable={false} />
        <img src={Dot} alt="" className={styles.dot} draggable={false} />
      </div>
      <div className={styles.text}>
        <h2 className={styles.title}>Join our weekly weaving circle</h2>
        <p className={styles.description}>
          Come to learn about the Tapestries project, meet the team behind it, share your projects,
          and see what others are working on!
        </p>
      </div>
      <div className={styles.buttons}>
        <Button
          component="a"
          variant="mono"
          href="https://luma.com/tapestries"
          target="_blank"
          className={styles.button}
          data-analytics-click="Banner Join a circle"
        >
          Join a circle
        </Button>
        <Button
          variant="clear"
          className={styles.button}
          onClick={onRemindLater}
          data-analytics-click="Banner Remind me in 14 days"
        >
          Remind me in 14 days
        </Button>
      </div>
    </div>
  )
}
