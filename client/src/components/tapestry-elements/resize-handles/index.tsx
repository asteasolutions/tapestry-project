import styles from './styles.module.css'
import clsx from 'clsx'
import { ItemUIComponent } from '../../../pages/tapestry/view-model'
import { Tooltip, TooltipProps } from 'tapestry-core-client/src/components/lib/tooltip/index'
import { useTapestryData } from '../../../pages/tapestry/tapestry-providers'
import { computeRestrictedScale } from 'tapestry-core-client/src/view-model/utils'
import { idMapToArray } from 'tapestry-core/src/utils'

interface ResizeHandlesProps {
  withRelAnchors?: boolean
}

export function ResizeHandles({ withRelAnchors }: ResizeHandlesProps) {
  const { viewport, items, selectionResizeState } = useTapestryData([
    'viewport',
    'items',
    'selectionResizeState',
  ])

  const { scale } = viewport.transform
  const resizeHandlesScale =
    computeRestrictedScale(viewport, idMapToArray(items), { min: 1 }) / scale

  const direction = selectionResizeState?.direction

  return (
    <div className={styles.root} style={{ '--scale': resizeHandlesScale } as React.CSSProperties}>
      <div
        className={clsx(
          styles.resizeHandle,
          styles.topLeft,
          {
            [styles.hover]: direction?.top && direction.left,
          },
          'anchor',
        )}
        data-ui-component="resizeHandleTopLeft"
      />
      <div className={clsx(styles.resizeHandle, styles.top)} data-ui-component="resizeHandleTop">
        {withRelAnchors && <RelAnchor uiComponent="createRelAnchorTop" />}
      </div>
      <div
        className={clsx(
          styles.resizeHandle,
          styles.topRight,
          {
            [styles.hover]: direction?.top && direction.right,
          },
          'anchor',
        )}
        data-ui-component="resizeHandleTopRight"
      />
      <div className={clsx(styles.resizeHandle, styles.left)} data-ui-component="resizeHandleLeft">
        {withRelAnchors && <RelAnchor uiComponent="createRelAnchorLeft" />}
      </div>
      <div
        className={clsx(styles.resizeHandle, styles.right)}
        data-ui-component="resizeHandleRight"
      >
        {withRelAnchors && <RelAnchor uiComponent="createRelAnchorRight" />}
      </div>
      <div
        className={clsx(
          styles.resizeHandle,
          styles.bottomLeft,
          {
            [styles.hover]: direction?.bottom && direction.left,
          },
          'anchor',
        )}
        data-ui-component="resizeHandleBottomLeft"
      />
      <div
        className={clsx(styles.resizeHandle, styles.bottom)}
        data-ui-component="resizeHandleBottom"
      >
        {withRelAnchors && <RelAnchor uiComponent="createRelAnchorBottom" />}
      </div>
      <div
        className={clsx(
          styles.resizeHandle,
          styles.bottomRight,
          {
            [styles.hover]: direction?.bottom && direction.right,
          },
          'anchor',
        )}
        data-ui-component="resizeHandleBottomRight"
      />
      <div className={styles.contentPlaceholder} inert />
    </div>
  )
}

interface RelAnchorProps {
  uiComponent: Extract<ItemUIComponent, `createRelAnchor${string}`>
}

function RelAnchor({ uiComponent }: RelAnchorProps) {
  const side = uiComponent.slice('createRelAnchor'.length).toLowerCase() as TooltipProps['side']
  return (
    <div className={clsx('rel', styles.createRelAnchor, 'anchor')} data-ui-component={uiComponent}>
      <Tooltip side={side} offset={8}>
        Drag to connect
      </Tooltip>
    </div>
  )
}
