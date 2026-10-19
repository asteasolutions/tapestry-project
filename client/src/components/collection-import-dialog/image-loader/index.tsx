import { CSSProperties, useState } from 'react'
import { Icon, IconName } from 'tapestry-core-client/src/components/lib/icon/index'

interface ImageLoaderProps {
  image?: string | null
  fallbackIcon?: IconName
  title?: string
  className?: string
  fallbackStyles?: CSSProperties
}

// Shows the fallback icon until the image actually finishes loading, tracked via onLoad rather
// than onError -- an error (or the image never resolving) just leaves the fallback showing, with
// no separate error handling needed. The image stays mounted (hidden) the whole time so its
// onLoad can fire at all.
export function ImageLoader({
  image,
  fallbackIcon = 'image',
  title,
  className,
  fallbackStyles,
}: ImageLoaderProps) {
  const [loaded, setLoaded] = useState(false)

  return (
    <>
      {(!image || !loaded) && (
        <Icon component="div" icon={fallbackIcon} className={className} style={fallbackStyles} />
      )}
      {image && (
        <img
          className={className}
          style={{ display: loaded ? undefined : 'none' }}
          src={image}
          alt={title}
          onLoad={() => setLoaded(true)}
        />
      )}
    </>
  )
}
