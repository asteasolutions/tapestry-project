import clsx from 'clsx'
import { AdminTapestryDto } from 'tapestry-shared/src/data-transfer/resources/dtos/admin'
import styles from './styles.module.css'

/** A small thumbnail, or a blank placeholder when the tapestry has none. */
export function TapestryThumbnail({
  tapestry,
  size = 'small',
}: {
  tapestry: Pick<AdminTapestryDto, 'thumbnail'>
  size?: 'small' | 'large'
}) {
  if (tapestry.thumbnail) {
    return <img src={tapestry.thumbnail} alt="" className={clsx(styles.root, styles[size])} />
  }
  return <span aria-hidden className={clsx(styles.root, styles[size], styles.placeholder)} />
}
