import { BaseWebSourceParams, WebSourceParser } from './index.js'
import { getIAItemMediaType, IAMediaType, parseInternetArchiveURL } from '../internet-archive.js'
import { WebpageType } from '../data-format/schemas/item.js'

interface IAMediaSourceParams extends BaseWebSourceParams {
  startTime?: number | null | undefined
}

export class IAMediaSourceParser<T extends WebpageType>
  implements WebSourceParser<T, IAMediaSourceParams>
{
  constructor(
    private iaMediaType: IAMediaType,
    readonly webpageType: T,
  ) {}

  async matches(url: string) {
    const descriptor = parseInternetArchiveURL(url)
    if (descriptor?.urlType !== 'details' && descriptor?.urlType !== 'embed') return false

    return (await getIAItemMediaType(descriptor.item.id)) === this.iaMediaType
  }

  parse(source: string): IAMediaSourceParams {
    const url = new URL(source)
    const startTime = Number.parseInt(url.searchParams.get('start') ?? '')
    url.searchParams.delete('start')
    return { source: url.toString(), startTime: Number.isFinite(startTime) ? startTime : undefined }
  }

  construct({ source, startTime }: IAMediaSourceParams) {
    if (!Number.isFinite(startTime)) return source

    const url = new URL(source)
    url.searchParams.set('start', `${startTime}`)
    return url.toString()
  }
}
