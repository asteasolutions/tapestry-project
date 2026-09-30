import clsx from 'clsx'
import { useState } from 'react'
import { Icon, IconName } from 'tapestry-core-client/src/components/lib/icon/index'
import styles from './styles.module.css'

interface ImageWrapperProps {
  image?: string | null
  fallbackIcon?: IconName
  title?: string
  className?: string
}

// The fallback icon is always mounted underneath; the real image starts transparent and fades in
// once it actually finishes loading, tracked via onLoad rather than onError -- an error (or the
// image never resolving) just leaves the fallback visible, with no separate error handling
// needed, and no flash of a broken-image icon on a slow load.
export function ImageWrapper({
  image,
  fallbackIcon = 'image',
  title,
  className,
}: ImageWrapperProps) {
  const [loaded, setLoaded] = useState(false)

  return (
    <div className={clsx(styles.root, className)}>
      <Icon component="div" icon={fallbackIcon} className={styles.fallback} />
      {image && (
        <img
          className={styles.image}
          style={{ opacity: loaded ? 1 : 0, transition: 'opacity 0.15s' }}
          src={image}
          alt={title}
          onLoad={() => setLoaded(true)}
        />
      )}
    </div>
  )
}
