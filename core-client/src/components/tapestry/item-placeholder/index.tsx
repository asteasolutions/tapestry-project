import { ReactNode } from 'react'
import styles from './styles.module.css'
import { Icon, IconName } from '../../lib/icon/index'
import { Text } from '../../lib/text/index'
import clsx from 'clsx'
import { PropsWithStyle } from '../../lib'

interface ItemPlaceholderProps extends PropsWithStyle<object, 'root' | 'thumbnail' | 'icon'> {
  thumbnailSrc?: string | null
  thumbnailOverlay?: ReactNode
  icon: IconName
  children: ReactNode
}

export function ItemPlaceholder({
  thumbnailSrc,
  thumbnailOverlay,
  icon,
  children,
  classes,
  style,
}: ItemPlaceholderProps) {
  return (
    <div style={style} className={clsx(styles.root, classes?.root)}>
      {thumbnailSrc ? (
        <>
          <img src={thumbnailSrc} className={clsx(styles.thumbnail, classes?.thumbnail)} />
          {thumbnailOverlay}
        </>
      ) : (
        <>
          <Icon icon={icon} className={clsx(styles.icon, classes?.icon)} />
          {typeof children === 'string' ? <Text variant="bodySm">{children}</Text> : children}
        </>
      )}
    </div>
  )
}
