import { BaseWebSourceParams, WebSourceParser } from './index.js'
import { GoogleDriveWebpageType } from '../data-format/schemas/item.js'

interface GoogleDriveSourceParams extends BaseWebSourceParams {
  startTime?: number | null
}

const GOOGLE_DRIVE_HOSTS = ['drive.google.com', 'docs.google.com']

// Handles files shared from Google Drive.
// Every supported link is turned into the Drive preview link, which is the only one that Google allows to be framed.
// The link alone doesn't tell the type of the file, so all links match the generic `googleDrive` parser (it comes
// first in KNOWN_WEBPAGE_TYPES). The exact type is determined from the file's MIME type through the Google Drive API.
// Drive videos can start at a given time through the `t` query param (in seconds).

export class GoogleDriveSourceParser<T extends GoogleDriveWebpageType> implements WebSourceParser<
  T,
  GoogleDriveSourceParams
> {
  constructor(readonly webpageType: T) {}

  matches(url: string) {
    return Promise.resolve(GOOGLE_DRIVE_HOSTS.includes(new URL(url).host) && !!this.getFileId(url))
  }

  parse(source: string): GoogleDriveSourceParams {
    const url = new URL(source)
    const fileId = encodeURIComponent(this.getFileId(source) ?? '')
    const embedUrl = new URL(`https://drive.google.com/file/d/${fileId}/preview`)
    const resourceKey = url.searchParams.get('resourcekey')
    if (resourceKey) embedUrl.searchParams.set('resourcekey', resourceKey)

    const startTime = Number.parseInt(url.searchParams.get('t') ?? '')
    return {
      source: embedUrl.toString(),
      startTime: Number.isFinite(startTime) ? startTime : undefined,
    }
  }

  construct({ source, startTime }: GoogleDriveSourceParams) {
    if (!Number.isFinite(startTime)) return source

    const url = new URL(source)
    url.searchParams.set('t', `${startTime}`)
    return url.toString()
  }

  getFileId(source: string) {
    const url = new URL(source)
    return (
      /^\/(?:file|document|spreadsheets|presentation|videos)\/d\/([^/]+)/.exec(url.pathname)?.[1] ??
      url.searchParams.get('id')
    )
  }

  getThumbnailUrl(source: string) {
    const url = new URL('https://drive.google.com/thumbnail?sz=w1000')
    url.searchParams.set('id', this.getFileId(source) ?? '')
    return url.toString()
  }
}

export function googleDriveWebpageType(
  mimeType: string | null | undefined,
): GoogleDriveWebpageType {
  if (mimeType?.startsWith('video/') || mimeType === 'application/vnd.google-apps.vid') {
    return 'googleDriveVideo'
  }
  if (mimeType?.startsWith('audio/')) return 'googleDriveAudio'
  if (mimeType?.startsWith('image/')) return 'googleDriveImage'
  if (mimeType === 'application/pdf') return 'googleDrivePdf'
  if (mimeType === 'application/epub+zip') return 'googleDriveBook'
  return 'googleDrive'
}
