import { Icon } from '../../../../../../src/components/lib/icon/index'
import { Text } from '../../../../../../src/components/lib/text/index'
import styles from './styles.module.css'

interface NoResultsProsp {
  query: string
}

export function NoResults({ query }: NoResultsProsp) {
  return (
    <div className={styles.root}>
      <Icon icon="feature_search" />
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Text variant="bodySm" style={{ fontWeight: 600 }}>
          {query ? `No results found for "${query}"` : 'Tapestry has no items'}
        </Text>
        {query && <Text variant="bodyXs">Try adjusting your search</Text>}
      </div>
    </div>
  )
}
