import { useEffect, useState } from 'react'

export interface VisualViewportState {
  offsetLeft: number
  offsetTop: number
  width: number
  height: number
  scale: number
}

function readVisualViewport(): VisualViewportState | undefined {
  const vv = window.visualViewport
  return vv
    ? {
        offsetLeft: vv.offsetLeft,
        offsetTop: vv.offsetTop,
        width: vv.width,
        height: vv.height,
        scale: vv.scale,
      }
    : undefined
}

/**
 * Tracks the visual viewport, i.e. the part of the layout viewport that is actually visible on screen.
 * The two differ when the user pinch-zooms the page itself (as opposed to the canvas).
 */
export function useVisualViewport() {
  const [state, setState] = useState(readVisualViewport)

  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) {
      return
    }

    const update = () => setState(readVisualViewport())
    vv.addEventListener('resize', update)
    vv.addEventListener('scroll', update)

    return () => {
      vv.removeEventListener('resize', update)
      vv.removeEventListener('scroll', update)
    }
  }, [])

  return state
}
