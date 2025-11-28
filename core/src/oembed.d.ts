type CommonOEmbedProps = {
  type: 'video' | 'link' | 'rich' | 'photo'
  version: string
  title?: string
  author_name?: string
  author_url?: string
  provider_name?: string
  provider_url?: string
  cache_age?: number
}

type BaseOEmbed = CommonOEmbedProps &
  (
    | {
        thumbnail_url?: undefined
        thumbnail_width?: undefined
        thumbnail_height?: undefined
      }
    | {
        thumbnail_url: string
        thumbnail_width: number
        thumbnail_height: number
      }
  )

type OEmbedPhoto = BaseOEmbed & {
  type: 'photo'
  url: string
  width: number
  height: number
}

type OEmbedVideo = BaseOEmbed & {
  type: 'video'
  html: string
  width: number
  height: number
}

type OEmbedLink = BaseOEmbed & {
  type: 'link'
}

type OEmbedRich = BaseOEmbed & {
  type: 'rich'
  html: string
  width: number
  height: number
}

export type OEmbed = OEmbedPhoto | OEmbedVideo | OEmbedLink | OEmbedRich
