import clsx from 'clsx'
import { useState } from 'react'
import { Icon, IconName } from 'tapestry-core-client/src/components/lib/icon/index'
import styles from './styles.module.css'

interface ThumbnailProps {
  image?: string | null
  fallbackIcon?: IconName
  title?: string
  fit?: 'cover' | 'contain'
  className?: string
}

// The real image starts transparent and fades in once it actually finishes loading, tracked via
// onLoad rather than onError -- an error (or the image never resolving) just leaves it invisible,
// with no separate error handling needed, and no flash of a broken-image icon on a slow load.
export function Thumbnail({
  image,
  fallbackIcon = 'image',
  title,
  fit = 'cover',
  className,
}: ThumbnailProps) {
  const [loaded, setLoaded] = useState(false)

  // `contain` (e.g. a details panel's hero image) needs to size itself to the image's own natural
  // aspect ratio, which only works as a plain flow element -- there's no fixed box to layer a
  // fallback icon under, and none of `contain`'s current callers need one (they only render this
  // at all once a real image URL is already known).
  if (fit === 'contain') {
    return image ? (
      <img
        className={className}
        style={{ opacity: loaded ? 1 : 0, transition: 'opacity 0.15s' }}
        loading="lazy"
        src={image}
        alt={title}
        onLoad={() => setLoaded(true)}
      />
    ) : null
  }

  return (
    <div className={clsx(styles.root, className)}>
      <Icon component="div" icon={fallbackIcon} className={styles.fallback} />
      {image && (
        <img
          className={styles.image}
          style={{ opacity: loaded ? 1 : 0 }}
          src={image}
          alt={title}
          onLoad={() => setLoaded(true)}
        />
      )}
    </div>
  )
}
