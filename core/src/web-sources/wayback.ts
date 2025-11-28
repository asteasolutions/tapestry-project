import { compact } from 'lodash-es'
import { BaseWebSourceParams, WebSourceParser } from './index.js'

interface WaybackSourceParams extends BaseWebSourceParams {
  timestamp?: string | null
}

const WAYBACK_MACHINE_URL = 'https://web.archive.org/web'

export class WaybackSourceParser implements WebSourceParser<'iaWayback', WaybackSourceParams> {
  readonly webpageType = 'iaWayback'

  matches(url: string) {
    return Promise.resolve(typeof url === 'string' && url.startsWith(WAYBACK_MACHINE_URL))
  }

  parse(url: string) {
    // the full url is either https://web.archive.org/web/<timestamp>/<pageUrl> or https://web.archive.org/web/<pageUrl>
    const path = url.slice(WAYBACK_MACHINE_URL.length + 1)
    if (/^https?:/.test(path)) {
      return { source: path }
    }
    const [timestamp, ...rest] = path.split('/')
    return { source: rest.join('/'), timestamp: timestamp.replace(/if_$/, '') }
  }

  construct({ source, timestamp }: WaybackSourceParams) {
    return compact([WAYBACK_MACHINE_URL, timestamp && `${timestamp}if_`, source]).join('/')
  }
}
