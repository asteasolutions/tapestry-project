import { RefObject } from 'react'
import { BaseMediaCaptureManager, PreviewState } from './base-media-capture-manager'
import { createEventRegistry } from 'tapestry-core-client/src/lib/events/event-registry'

type EventTypesMap = { video: keyof HTMLVideoElementEventMap }

const { eventListener, attachListeners } = createEventRegistry<EventTypesMap>()

export abstract class PreviewCaptureManager extends BaseMediaCaptureManager<{
  previewRef: RefObject<HTMLVideoElement | null>
}> {
  async init(options: { previewRef: RefObject<HTMLVideoElement | null> }) {
    await super.init(options)

    const video = options.previewRef.current
    if (video) {
      attachListeners(this, 'video', video)
    }
  }

  // In the initial implementation the 'suspend' event was also treated as "loading", but I have removed it here,
  // as it seem erronous - i.e. setting loading when the browser has buffered enough?
  @eventListener('video', 'loadstart')
  protected onLoading() {
    this.updatePreviewState('loading')
  }

  // Not sure if both of these are needed
  @eventListener('video', 'canplay')
  @eventListener('video', 'play')
  protected onCanPreview() {
    this.updatePreviewState('ready')
  }

  protected onRecorderStop() {
    this.updatePreviewState('none')
  }

  private updatePreviewState(state: PreviewState) {
    this.update((model) => {
      model.previewState = state
    })
  }
}
