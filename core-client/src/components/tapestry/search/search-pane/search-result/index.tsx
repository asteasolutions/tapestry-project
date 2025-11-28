import clsx from 'clsx'
import { useMemo } from 'react'
import { Link } from 'react-router'
import { isHTTPURL } from 'tapestry-core/src/utils'
import { useTapestryConfig } from '../../..'
import { Icon, IconName } from '../../../../../../src/components/lib/icon/index'
import { Text } from '../../../../../../src/components/lib/text/index'
import { toggleOutline } from '../../../../../view-model/store-commands/tapestry'
import { isBlobURL } from '../../../../../view-model/utils'
import styles from './styles.module.css'

export interface SearchResultProps {
  type: 'text' | 'media'
  query: string
  description: string
  thumbnail: string
  id: string
  onClick: (id: string) => unknown
  highlighted?: boolean
}

export function SearchResult({
  type,
  query,
  description,
  thumbnail,
  id,
  onClick,
  highlighted,
}: SearchResultProps) {
  const { useDispatch } = useTapestryConfig()

  const dispatch = useDispatch()
  const html = useMemo(() => ({ __html: description }), [description])

  return (
    <Link
      to={{ search: `focus=${id}` }}
      state={{ timestamp: new Date() }}
      className={clsx(styles.root, { [styles.highlighted]: highlighted })}
      onFocus={() => dispatch(toggleOutline(id))}
      onMouseOver={() => dispatch(toggleOutline(id))}
      onBlur={() => dispatch(toggleOutline(id))}
      onMouseOut={() => dispatch(toggleOutline(id))}
      onClick={() => onClick(id)}
    >
      <Icon icon={type === 'text' ? 'text_fields' : 'imagesmode'} className={styles.itemTypeIcon} />
      <div className={styles.resultContentContainer}>
        <Text variant="bodySm" style={{ fontWeight: 600, lineHeight: '24px' }}>
          {query && `"${query}"`}
        </Text>
        <Text
          variant="bodyXs"
          dangerouslySetInnerHTML={html}
          style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}
        />
      </div>
      {type !== 'text' ? (
        isHTTPURL(thumbnail) || isBlobURL(thumbnail) ? (
          <img src={thumbnail} className={styles.thumbnail} />
        ) : (
          <Icon icon={thumbnail as IconName} className={styles.thumbnail} />
        )
      ) : null}
    </Link>
  )
}
