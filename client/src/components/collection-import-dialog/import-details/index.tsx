import { ReactNode } from 'react'
import { getIAItemThumbnailURL } from 'tapestry-core/src/internet-archive'
import { CollectionImport } from '../../../pages/tapestry/view-model'
import styles from './styles.module.css'
import { Text } from 'tapestry-core-client/src/components/lib/text/index'
import { intlFormat } from 'date-fns'
import { Breakpoint, useResponsive } from '../../../providers/responsive-provider'
import { ImageLoader } from '../image-loader'

const parser = new DOMParser()

interface DetailsLayoutProps {
  thumbnail?: string | null
  title: ReactNode
  subtitle?: ReactNode
  meta?: ReactNode
  body?: ReactNode
}

// The layout shared by every collection import's details panel.
function DetailsLayout({ thumbnail, title, subtitle, meta, body }: DetailsLayoutProps) {
  const mdOrLess = useResponsive() <= Breakpoint.MD
  const textVariant = mdOrLess ? 'bodyXs' : undefined

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        {thumbnail && <ImageLoader className={styles.thumbnail} image={thumbnail} />}
        <div className={styles.metadataContainer}>
          <div>
            <Text
              variant={mdOrLess ? 'bodySm' : 'h6'}
              lineClamp={2}
              style={{ fontWeight: 'bold', overflowWrap: 'anywhere' }}
            >
              {title}
            </Text>
            {subtitle !== undefined && (
              <Text variant={textVariant} lineClamp={2} style={{ overflowWrap: 'anywhere' }}>
                {subtitle}
              </Text>
            )}
          </div>
          {meta}
        </div>
      </div>
      {body !== undefined && (
        <Text variant={textVariant} component="div">
          {body}
        </Text>
      )}
    </div>
  )
}

interface ImportDetailsProps {
  import: CollectionImport
}

export function ImportDetails({ import: collectionImport }: ImportDetailsProps) {
  const mdOrLess = useResponsive() <= Breakpoint.MD
  const textVariant = mdOrLess ? 'bodyXs' : undefined

  switch (collectionImport.type) {
    case 'OpenverseCollection':
      return (
        <DetailsLayout
          title={
            collectionImport.collection.type === 'tag'
              ? collectionImport.collection.tag
              : collectionImport.collection.source
          }
          subtitle={`${collectionImport.total} ${collectionImport.mediaType === 'image' ? 'images' : 'audio items'}`}
        />
      )

    case 'WikimediaCommonsCategory':
      return (
        <DetailsLayout
          thumbnail={collectionImport.thumbnail}
          title={collectionImport.category}
          subtitle={`${collectionImport.total} files`}
          body={collectionImport.description}
        />
      )

    case 'IASearchCollection':
      return (
        <DetailsLayout
          title="Search results"
          subtitle={`${collectionImport.total} results`}
          body={collectionImport.query}
        />
      )

    case 'IACollection':
    case 'IAPlaylist': {
      const { id, metadata } = collectionImport
      const description = parser.parseFromString(
        metadata.summary ?? metadata.description ?? '',
        'text/html',
      ).documentElement.textContent
      const isCollection = metadata.mediatype === 'collection'

      return (
        <DetailsLayout
          thumbnail={getIAItemThumbnailURL(id)}
          title={metadata.title}
          subtitle={isCollection ? metadata.uploader : metadata.creator}
          meta={
            <div style={{ display: 'flex', gap: '12px' }}>
              <Text variant={textVariant ?? 'bodySm'}>Publication date</Text>
              <Text variant={textVariant ?? 'bodySm'}>
                {intlFormat(metadata.publicdate, {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </Text>
            </div>
          }
          body={description}
        />
      )
    }
  }
}
