import { clamp, compact } from 'lodash-es'
import { BaseWebSourceParams, WebSourceParser } from './index.js'
import { Size } from '../data-format/schemas/common.js'
import { OEmbed } from '../oembed.js'

interface VideoWebSourceParams extends BaseWebSourceParams {
  startTime?: number | null
  stopTime?: number | null
}

function getPlaybackInterval(youtubeLink: string) {
  const url = new URL(youtubeLink)
  // if the link is an embed link, then seconds are the value of the amp;start field,
  // otherwise they are the value of the t field. In all cases the start field could be present
  return {
    startTime: Number.parseInt(
      url.searchParams.get('t') ??
        url.searchParams.get('amp;start') ??
        url.searchParams.get('start') ??
        '',
    ),
    stopTime: Number.parseInt(url.searchParams.get('end') ?? ''),
  }
}

function getSeconds(time: string) {
  const result = /((\d+)h)?((\d+)m)?((\d+)s)?/.exec(time)
  if (result) {
    const [, , h, , m, , s] = result
    if (h || m || s) {
      const hours = Number.parseInt(h),
        minutes = Number.parseInt(m),
        seconds = Number.parseInt(s)

      return (
        (Number.isFinite(hours) ? hours * 3600 : 0) +
        (Number.isFinite(minutes) ? minutes * 60 : 0) +
        (Number.isFinite(seconds) ? seconds : 0)
      )
    }
  }
}

export class YoutubeSourceParser implements WebSourceParser<'youtube', VideoWebSourceParams> {
  readonly webpageType = 'youtube'

  matches(url: string) {
    const { host } = new URL(url)
    return Promise.resolve(host.endsWith('youtube.com') || host.endsWith('youtu.be'))
  }

  parse(url: string) {
    const { startTime, stopTime } = getPlaybackInterval(url)
    return {
      source: `https://youtube.com/embed/${this.getVideoId(url)}`,
      startTime: Number.isFinite(startTime) ? startTime : undefined,
      stopTime: Number.isFinite(stopTime) ? stopTime : undefined,
    }
  }

  construct({ source, startTime, stopTime }: VideoWebSourceParams) {
    const url = new URL(source)

    if (Number.isFinite(startTime)) {
      url.searchParams.set('start', `${startTime}`)
    }
    if (Number.isFinite(stopTime)) {
      url.searchParams.set('end', `${stopTime}`)
    }

    return url.toString()
  }

  getVideoId(source: string) {
    const url = new URL(source)
    return url.searchParams.get('v') ?? url.pathname.split('/').at(-1)
  }

  getWatchUrl(source: string) {
    return `https://youtube.com/watch?v=${this.getVideoId(source)}`
  }

  async getVideoSize(url: string): Promise<Size> {
    const videoId = this.getVideoId(url)
    const response = await fetch(`https://www.youtube.com/oembed?url=https://youtu.be/${videoId}`)
    const data = (await response.json()) as OEmbed
    if (data.type !== 'video') {
      throw new Error(`Entity for url=${url} is not of type "video"`)
    }

    const width = clamp(data.thumbnail_width ?? data.width, 300, 500)
    const aspectRatio = data.width / data.height

    return { width, height: width / aspectRatio }
  }
}

/**
 * Vimeo videos have different privacy levels - unlisted and public are the ones we care about.
 * These two have different url formats:
 * - unlisted - https://vimeo.com/<video-id>/<unlisted-hash>
 * - public   - https://vimeo.com/<video-id>
 *
 * When transforming the link for embedding we need to check what is the privacy
 * and add the `h` query param in the case of an unlisted video
 *
 * Vimeo can specify a start and end times in the format of a URI fragment - #t=<X>h<Y>m<Z>s&end=<X>h<Y>m<Z>s
 */
export class VimeoSourceParser implements WebSourceParser<'vimeo', VideoWebSourceParams> {
  readonly webpageType = 'vimeo'

  matches(url: string) {
    const { host } = new URL(url)
    return Promise.resolve(host.endsWith('vimeo.com'))
  }

  parse(url: string) {
    const { pathname, hash, hostname, searchParams } = new URL(url)
    let videoId: string
    let unlistedHash: string | null | undefined
    const pathSegments = pathname.slice(1).split('/')
    if (hostname === 'vimeo.com') {
      // There are multiple formats with this hostname:
      //   Standard Video URL: vimeo.com/VIDEO_ID
      //   Custom Video URL:   vimeo.com/username/thecustompart
      //   Channel URL:        vimeo.com/channels/CHANNEL_ID/VIDEO_ID
      //   Group URL:          vimeo.com/groups/GROUP_ID/VIDEO_ID
      //   Unlisted Video URL: vimeo.com/VIDEO_ID/UNLISTED_HASH
      // We don't support custom video URLs yet, so we only handle the other ones
      if (['channels', 'groups'].includes(pathSegments[0])) {
        videoId = pathSegments[2]
      } else {
        videoId = pathSegments[0]
        unlistedHash = pathSegments[1]
      }
    } else {
      // The other option for the hostname is player.vimeo.com and the format there is:
      //   player.vimeo.com/video/VIDEO_ID/?h=UNLISTED_HASH
      videoId = pathSegments[1]
      unlistedHash = searchParams.get('h')
    }

    const t = /t=((?:\d+h)?(?:\d+m)?(?:\d+s)?)/.exec(hash)
    const end = /end=((?:\d+h)?(?:\d+m)?(?:\d+s)?)/.exec(hash)

    return {
      source: `https://player.vimeo.com/video/${videoId}/${unlistedHash ? `?h=${unlistedHash}` : ''}`,
      startTime: t && getSeconds(t[1]),
      stopTime: end && getSeconds(end[1]),
    }
  }

  construct({ source, startTime, stopTime }: VideoWebSourceParams) {
    const url = new URL(source)

    if (Number.isFinite(startTime) || Number.isFinite(stopTime)) {
      const t = Number.isFinite(startTime)
        ? `t=${Math.floor(startTime! / 60)}m${startTime! % 60}s`
        : ''
      const end = Number.isFinite(stopTime)
        ? `end=${Math.floor(stopTime! / 60)}m${stopTime! % 60}s`
        : ''
      url.hash = `#${compact([t, end]).join('&')}`
    }

    return url.toString()
  }
}
