import { startCase } from 'lodash-es'
import { useMemo } from 'react'
import { Item, ItemType } from 'tapestry-core/src/data-format/schemas/item'
import { nthIndexOf } from 'tapestry-core/src/lib/string'
import { idMapToArray, isMediaItem } from 'tapestry-core/src/utils'
import { Tab } from '.'
import { useTapestryConfig } from '../..'
import { usePropRef } from '../../../../../src/components/lib/hooks/use-prop-ref'
import { IconName } from '../../../../../src/components/lib/icon/index'
import { supportsCustomThumbnail, supportsThumbnail } from '../../../../view-model/utils'
import { SearchResultProps } from './search-result'

const itemIcons: Record<ItemType, IconName> = {
  text: 'abc',
  actionButton: 'dashboard_customize',
  audio: 'audio_file',
  book: 'auto_stories',
  image: 'image',
  pdf: 'picture_as_pdf',
  video: 'video_file',
  webpage: 'iframe',
}

const itemTypeSynonyms: Partial<Record<ItemType, string[]>> = {
  pdf: ['document', 'paper'],
  audio: ['sound', 'wav', 'mp3'],
  book: ['epub'],
  video: ['clip', 'movie', 'film'],
  image: ['photo', 'picture', 'jpeg', 'png'],
  webpage: ['html', 'page', 'site'],
}

const PARSER = new DOMParser()

function toPlainText(text: string) {
  return PARSER.parseFromString(text, 'text/html').body.textContent.replaceAll(/\s+/g, ' ')
}

function textPreview(query: string, text: string, matchStart: number) {
  const len = query.length
  const matchEnd = matchStart + len

  const startIndex = nthIndexOf(text, ' ', 4, matchStart - 1, true)
  const endIndex = nthIndexOf(text, ' ', 4, matchEnd)

  return `${text.slice(startIndex, matchStart)}<strong>"${text.slice(matchStart, matchEnd)}"</strong>${text.slice(matchEnd, endIndex)}`
}

function getMatchDescription(dto: Item, search: string) {
  const query = search.toLowerCase()

  if (query === '') {
    return startCase(dto.type)
  }

  const mediaItem = isMediaItem(dto)

  if (!mediaItem) {
    const textContent = toPlainText(dto.text)
    const index = textContent.toLowerCase().indexOf(query)
    if (index !== -1) {
      return textPreview(query, textContent, index)
    }
  }
  if (dto.title?.toLowerCase().includes(query)) {
    return `Shown because "${search}" matches the item title.`
  }
  if (
    dto.type.startsWith(query) ||
    itemTypeSynonyms[dto.type]?.some((synonym) => synonym.startsWith(query))
  ) {
    return `Shown because "${search}" matches the item type.`
  }
  if (dto.notes?.toLowerCase().includes(query)) {
    return `Shown because "${search}" matches the item notes.`
  }
  if (mediaItem && dto.source.toLowerCase().includes(query)) {
    return `Shown because "search" matches the item url.`
  }
}

export function useSearchResults(
  search: string,
  onClick: (id: string) => unknown,
): Record<Tab, SearchResultProps[]> {
  const { useStoreData } = useTapestryConfig()
  const storeItems = useStoreData('items')
  const onClickRef = usePropRef(onClick)

  return useMemo(() => {
    return idMapToArray(storeItems).reduce<Record<Tab, SearchResultProps[]>>(
      (acc, { dto }) => {
        const type: Exclude<Tab, 'all'> = isMediaItem(dto) ? 'items' : 'text'
        const id = dto.id
        const thumbnail =
          supportsCustomThumbnail(dto) && dto.customThumbnail
            ? dto.customThumbnail
            : supportsThumbnail(dto) && dto.thumbnail?.source
              ? dto.thumbnail.source
              : dto.type === 'image'
                ? dto.source
                : itemIcons[dto.type]

        const description = getMatchDescription(dto, search)

        if (description) {
          const result: SearchResultProps = {
            id,
            type: type === 'text' ? 'text' : 'media',
            thumbnail,
            description,
            query: search,
            onClick: onClickRef.current,
          }
          acc.all.push(result)
          acc[type].push(result)
        }
        return acc
      },
      { all: [], items: [], text: [] },
    )
  }, [search, storeItems, onClickRef])
}
