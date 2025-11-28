import { RefObject, useLayoutEffect, useRef, useState } from 'react'
import { Rectangle, scaleSize, Size, translate } from 'tapestry-core/src/lib/geometry'
import { Toolbar, ToolbarProps } from '../../lib/toolbar/index'
import { clamp, mapValues } from 'lodash-es'
import { useResizeObserver } from '../../lib/hooks/use-resize-observer'
import { Viewport } from '../../../view-model'
import { getMaxInset, positionAtViewport } from '../../../view-model/utils'
import { useTapestryConfig } from '..'

const TOOLBAR_OFFSET = 30
const TOOLBAR_MARGIN = 10

function useElementToolbarTransform(
  wrapperRef: RefObject<HTMLDivElement | null>,
  viewport: Viewport,
  elementBounds: Rectangle,
  shouldLockOffsets?: boolean,
) {
  const {
    transform: { scale },
    size,
    focusRectInsets,
  } = viewport
  const maxInset = getMaxInset(Object.values(focusRectInsets))

  const viewerRect = new Rectangle(
    positionAtViewport(viewport),
    scaleSize(size, 1 / scale),
  ).contract(mapValues(maxInset, (inset) => (inset + TOOLBAR_MARGIN) / scale))

  const [toolbarDOMSize, setToolbarDOMSize] = useState<Size>()
  const toolbarSize = scaleSize(toolbarDOMSize ?? { width: 0, height: 0 }, 1 / scale)

  useLayoutEffect(() => {
    setToolbarDOMSize(wrapperRef.current?.getBoundingClientRect())
  }, [wrapperRef])

  useResizeObserver({
    ref: wrapperRef,
    callback: () => {
      setToolbarDOMSize(wrapperRef.current?.getBoundingClientRect())
    },
  })

  const toolbarRect = new Rectangle(
    translate(elementBounds.position, {
      dx: (elementBounds.size.width - toolbarSize.width) / 2,
      dy: -toolbarSize.height,
    }),
    {
      width: toolbarSize.width,
      height: toolbarSize.height,
    },
  )

  const [lockedOffsets, setLockedOffsets] = useState<{ vertical: number; horizontal: number }>()

  const baseVerticalOffset = -TOOLBAR_OFFSET / Math.max(scale, 1)

  const verticalOffset = clamp(
    viewerRect.top - toolbarRect.top,
    baseVerticalOffset,
    elementBounds.height + baseVerticalOffset,
  )

  let horizontalOffset = 0

  const approximateToolbarItemWidth = toolbarSize.height

  if (toolbarRect.right > viewerRect.right) {
    horizontalOffset = clamp(
      viewerRect.right - toolbarRect.right,
      elementBounds.left + approximateToolbarItemWidth - toolbarRect.right,
      0,
    )
  } else if (toolbarRect.left < viewerRect.left) {
    horizontalOffset = clamp(
      viewerRect.left - toolbarRect.left,
      0,
      elementBounds.right - approximateToolbarItemWidth - toolbarRect.left,
    )
  }

  if (shouldLockOffsets && !lockedOffsets) {
    setLockedOffsets({
      vertical: verticalOffset,
      horizontal: horizontalOffset,
    })
  }
  if (!shouldLockOffsets && lockedOffsets) {
    setLockedOffsets(undefined)
  }

  return {
    scale: 1 / scale,
    translateX: lockedOffsets ? lockedOffsets.horizontal : horizontalOffset,
    translateY: lockedOffsets ? lockedOffsets.vertical : verticalOffset,
  }
}
export interface ElementToolbarProps extends ToolbarProps {
  elementBounds: Rectangle
  lockOffsets?: boolean
}

export function ElementToolbar({
  elementBounds,
  lockOffsets,
  style,
  ...props
}: ElementToolbarProps) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const { useStoreData } = useTapestryConfig()
  const viewport = useStoreData('viewport')
  const { scale, translateX, translateY } = useElementToolbarTransform(
    wrapperRef,
    viewport,
    elementBounds,
    lockOffsets,
  )

  return (
    <Toolbar
      {...props}
      style={{
        position: 'absolute',
        pointerEvents: 'none',
        width: '100%',
        transform: `translate(${translateX}px, ${translateY}px) scale(${scale})`,
        transformOrigin: 'bottom',
        bottom: '100%',
        // toolbar should be displayed above the resize handles
        zIndex: 3,
        ...style,
      }}
      wrapperRef={wrapperRef}
    />
  )
}
