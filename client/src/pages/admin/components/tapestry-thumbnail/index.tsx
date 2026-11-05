import clsx from 'clsx'
import { Icon } from 'tapestry-core-client/src/components/lib/icon/index'
import { AdminTapestryDto } from 'tapestry-shared/src/data-transfer/resources/dtos/admin'
import styles from './styles.module.css'

/**
 * A small thumbnail. Tapestries that admins can't open show a lock instead, since their content
 * is private.
 */
export function TapestryThumbnail({
  tapestry,
  size = 'small',
}: {
  tapestry: Pick<AdminTapestryDto, 'thumbnail' | 'sharingLevel'>
  size?: 'small' | 'large'
}) {
  const restricted = tapestry.sharingLevel !== 'link'
  if (tapestry.thumbnail && !restricted) {
    return <img src={tapestry.thumbnail} alt="" className={clsx(styles.root, styles[size])} />
  }
  return (
    <span
      aria-hidden
      className={clsx(styles.root, styles[size], styles.placeholder, {
        [styles.restricted]: restricted,
      })}
    >
      {restricted && <Icon icon="lock" />}
    </span>
  )
}
