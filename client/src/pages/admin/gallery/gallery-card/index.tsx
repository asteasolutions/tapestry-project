import { DragEvent } from 'react'
import { Link } from 'react-router'
import clsx from 'clsx'
import { Icon } from 'tapestry-core-client/src/components/lib/icon/index'
import { AdminTapestryDto } from 'tapestry-shared/src/data-transfer/resources/dtos/admin'
import { tapestryPath } from '../../../../utils/paths'
import { formatDate } from '../../format'
import { presetFilterPath } from '../../use-preset-filter'
import common from '../../common.module.css'
import styles from './styles.module.css'

interface GalleryCardProps {
  tapestry: AdminTapestryDto
  /** Zero-based position among the tapestries that stay in the Gallery */
  position: number
  count: number
  dragging: boolean
  dropTarget: boolean
  onMove: (delta: -1 | 1) => unknown
  onRemove: () => unknown

  // DOM element props
  onDragStart: (e: DragEvent) => unknown
  onDragOver: (e: DragEvent) => unknown
  onDrop: (e: DragEvent) => unknown
  onDragEnd: () => unknown
}

export function GalleryCard({
  tapestry,
  position,
  count,
  dragging,
  dropTarget,
  onMove,
  onRemove,

  ...rest
}: GalleryCardProps) {
  const { title, owner } = tapestry
  return (
    <li
      className={clsx(styles.root, {
        [styles.dragging]: dragging,
        [styles.dropTarget]: dropTarget,
      })}
      draggable
      {...rest}
    >
      <div className={styles.thumbnail}>
        {tapestry.thumbnail ? <img src={tapestry.thumbnail} alt="" /> : <span />}
        <span className={styles.position}>
          <span className={common.visuallyHidden}>Position </span>
          {position + 1}
        </span>
      </div>
      <div className={styles.titles}>
        <a
          href={tapestryPath(owner.username, tapestry.slug)}
          target="_blank"
          rel="noreferrer"
          className={styles.title}
        >
          {title}
        </a>
        <Link
          to={presetFilterPath('users', { 'id:eq': owner.id }, `Showing @${owner.username}`)}
          className={clsx(styles.owner, common.underlinedLink)}
        >
          <Icon icon="person" aria-hidden />@{owner.username}
        </Link>
      </div>
      <p className={styles.description}>{tapestry.description}</p>
      <span className={styles.featured}>Featured {formatDate(tapestry.featuredAt)}</span>
      <div className={styles.toolbar}>
        <span className={styles.handle} title="Drag to reorder" aria-hidden>
          <Icon icon="drag_indicator" />
        </span>
        <button
          type="button"
          className={styles.iconButton}
          aria-label={`Move “${title}” earlier`}
          disabled={position === 0}
          onClick={() => onMove(-1)}
        >
          <Icon icon="chevron_left" aria-hidden />
        </button>
        <button
          type="button"
          className={styles.iconButton}
          aria-label={`Move “${title}” later`}
          disabled={position === count - 1}
          onClick={() => onMove(1)}
        >
          <Icon icon="chevron_right" aria-hidden />
        </button>
        <button
          type="button"
          className={styles.remove}
          aria-label={`Remove “${title}” from the Gallery`}
          onClick={onRemove}
        >
          Remove
        </button>
      </div>
    </li>
  )
}

/** A tapestry that will leave the Gallery when the changes are published. */
export function RemovedGalleryCard({
  tapestry,
  onUndo,
}: {
  tapestry: AdminTapestryDto
  onUndo: () => unknown
}) {
  return (
    <li className={clsx(styles.root, styles.removed)}>
      <div className={styles.thumbnail}>
        {tapestry.thumbnail ? <img src={tapestry.thumbnail} alt="" /> : <span />}
      </div>
      <span className={styles.title}>{tapestry.title}</span>
      <p className={styles.description}>
        Will be removed from the Gallery when you publish. The tapestry itself is kept and stays
        shared as “Anyone with the link”.
      </p>
      <div>
        <button
          type="button"
          className={styles.undo}
          aria-label={`Undo removing “${tapestry.title}” from the Gallery`}
          onClick={onUndo}
        >
          <Icon icon="undo" aria-hidden />
          Undo
        </button>
      </div>
    </li>
  )
}
