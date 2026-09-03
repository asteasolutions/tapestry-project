import { getIAItemThumbnailURL } from 'tapestry-core/src/internet-archive'
import { IAImport } from '../../../pages/tapestry/view-model'
import styles from './styles.module.css'
import { Text } from 'tapestry-core-client/src/components/lib/text/index'
import { intlFormat } from 'date-fns'
import { Breakpoint, useResponsive } from '../../../providers/responsive-provider'

const parser = new DOMParser()

interface ImportDetailsProps {
  import: IAImport
}

export function ImportDetails({ import: iaImport }: ImportDetailsProps) {
  if (iaImport.type === 'ExternalCollection') {
    return <ExternalCollectionImportDetails collection={iaImport} />
  }

  return <IAImportDetails import={iaImport} />
}

interface IAImportDetailsProps {
  import: Exclude<IAImport, { type: 'ExternalCollection' }>
}

function IAImportDetails({ import: { id, metadata } }: IAImportDetailsProps) {
  const description = parser.parseFromString(
    metadata.summary ?? metadata.description ?? '',
    'text/html',
  ).documentElement.textContent

  const mdOrLess = useResponsive() <= Breakpoint.MD
  const textVariant = mdOrLess ? 'bodyXs' : undefined

  const isCollection = metadata.mediatype === 'collection'

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <img className={styles.thumbnail} loading="lazy" src={getIAItemThumbnailURL(id)} />
        <div className={styles.metadataContainer}>
          <div>
            <Text variant={mdOrLess ? 'bodySm' : 'h6'} lineClamp={2} style={{ fontWeight: 'bold' }}>
              {metadata.title}
            </Text>
            <Text variant={textVariant} lineClamp={2}>
              {isCollection ? metadata.uploader : metadata.creator}
            </Text>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <Text variant={textVariant ?? 'bodySm'}>Publication date</Text>
            <Text variant={textVariant ?? 'bodySm'}>
              {intlFormat(metadata.publicdate, { day: 'numeric', month: 'short', year: 'numeric' })}
            </Text>
          </div>
        </div>
      </div>
      <Text variant={textVariant} component="div">
        {description}
      </Text>
    </div>
  )
}

type ExternalCollectionImport = Extract<IAImport, { type: 'ExternalCollection' }>

interface ExternalCollectionImportDetailsProps {
  collection: ExternalCollectionImport
}

function ExternalCollectionImportDetails({ collection }: ExternalCollectionImportDetailsProps) {
  const mdOrLess = useResponsive() <= Breakpoint.MD
  const textVariant = mdOrLess ? 'bodyXs' : undefined

  const label =
    collection.platform === 'openverse'
      ? collection.collection.type === 'tag'
        ? collection.collection.tag
        : collection.collection.source
      : collection.collection.category

  const noun =
    collection.platform === 'openverse'
      ? collection.mediaType === 'image'
        ? 'images'
        : 'audio items'
      : 'files'

  return (
    <div className={styles.root}>
      <Text variant={mdOrLess ? 'bodySm' : 'h6'} style={{ fontWeight: 'bold' }}>
        {label}
      </Text>
      <Text variant={textVariant}>
        {collection.total} {noun}
      </Text>
    </div>
  )
}
