import { maxBy } from 'lodash-es'
import { CSSProperties } from 'react'
import { Point, Rectangle } from 'tapestry-core/src/lib/geometry'

export function getBoundingRectangle(element?: HTMLElement | null) {
  const domRect = element?.getBoundingClientRect()
  if (!domRect) {
    return
  }
  return new Rectangle(domRect.x, domRect.y, domRect.width, domRect.height)
}

export function assignStyles(element: HTMLElement, styles: CSSProperties) {
  return Object.assign(element.style, styles)
}

export function getProminentScrollChild(scrollContainer: HTMLElement) {
  const parentRect = scrollContainer.getBoundingClientRect()

  const elems = Array.from(scrollContainer.children)
  const elem = maxBy(elems, (e) => {
    const { top, bottom } = e.getBoundingClientRect()
    return bottom >= parentRect.top && top <= parentRect.bottom
      ? Math.floor(Math.min(bottom, parentRect.bottom) - Math.max(top, parentRect.top))
      : -1
  })!
  return { elem, index: elems.indexOf(elem) }
}

export function capturesPointerEvents(element: HTMLElement | null) {
  return !!element?.closest('[data-captures-pointer-events]')
}

export function iterateParents(
  element: HTMLElement | null | undefined,
  cb: (el: HTMLElement) => boolean,
) {
  let node = element
  while (node && cb(node)) {
    node = node.parentElement
  }
  return node
}

export function hasRangeSelection() {
  return document.getSelection()?.type === 'Range'
}

export function captureVideoFrame(video: HTMLVideoElement) {
  return new Promise<Blob>((resolve, reject) => {
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d')?.drawImage(video, 0, 0)
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob)
      } else {
        reject(new Error('Could not obtain video frame'))
      }
    })
  })
}

export function isTouchEvent(event: object): event is TouchEvent {
  return !!(window.TouchEvent as typeof TouchEvent | undefined) && event instanceof TouchEvent
}

export function toPoint(event: MouseEvent | WheelEvent | Touch | TouchEvent): Point {
  return isTouchEvent(event)
    ? toPoint(event.touches.item(0) ?? event.changedTouches[0])
    : { x: event.clientX, y: event.clientY }
}

const MATCH_HIGHLIGHT_ID = 'match-highlight'

const SCROLL_PADDING = 5

export class MatchRanges {
  private ranges: Range[] = []

  constructor(
    private container: HTMLElement,
    searchTerm: string,
  ) {
    const allTextNodes: Node[] = []
    const treeWalker = document.createTreeWalker(this.container, NodeFilter.SHOW_TEXT)
    let currentNode = treeWalker.nextNode()
    while (currentNode) {
      allTextNodes.push(currentNode)
      currentNode = treeWalker.nextNode()
    }

    const containerText = allTextNodes
      .map((node) => node.textContent)
      .join('')
      .toLowerCase()
    searchTerm = searchTerm.toLowerCase()

    const findPositionInNodes = (textIndex: number) => {
      let iteratedTextLength = 0
      for (const node of allTextNodes) {
        const nodeContentLength = node.textContent?.length ?? 0
        if (iteratedTextLength + nodeContentLength > textIndex) {
          return {
            node,
            index: textIndex - iteratedTextLength,
          }
        }
        iteratedTextLength += nodeContentLength
      }
    }

    let currentMatchIndex = containerText.indexOf(searchTerm)
    while (currentMatchIndex > -1) {
      const range = new Range()
      const startPosition = findPositionInNodes(currentMatchIndex)
      const endPosition = findPositionInNodes(currentMatchIndex + searchTerm.length - 1)
      if (startPosition && endPosition) {
        range.setStart(startPosition.node, startPosition.index)
        range.setEnd(endPosition.node, endPosition.index + 1)
        this.ranges.push(range)
      }
      currentMatchIndex = containerText.indexOf(searchTerm, currentMatchIndex + 1)
    }
  }

  scrollFirstRangeIntoView() {
    if (!this.ranges[0]) {
      return
    }
    const containerRect = this.container.getBoundingClientRect()
    const scale = containerRect.width / this.container.offsetWidth

    const boundingRect = this.ranges[0].getBoundingClientRect()

    const shouldScrollUp = boundingRect.top < containerRect.top + SCROLL_PADDING * scale
    const shouldScrollDown = boundingRect.bottom > containerRect.bottom - SCROLL_PADDING * scale

    if (shouldScrollUp) {
      this.container.scroll({
        top:
          this.container.scrollTop -
          (containerRect.top - boundingRect.top) / scale -
          SCROLL_PADDING,
        behavior: 'smooth',
      })
    } else if (shouldScrollDown) {
      this.container.scroll({
        top:
          Math.min(
            (boundingRect.bottom - containerRect.bottom) / scale + SCROLL_PADDING,
            (boundingRect.top - containerRect.top) / scale - SCROLL_PADDING,
          ) + this.container.scrollTop,
        behavior: 'smooth',
      })
    }
  }

  addToHighlight(highlight: Highlight) {
    this.ranges.forEach((range) => highlight.add(range))
  }

  removeFromHighlight(highlight: Highlight) {
    this.ranges.forEach((range) => highlight.delete(range))
  }
}

export const matchHighlight = new Highlight()

CSS.highlights.set(MATCH_HIGHLIGHT_ID, matchHighlight)
