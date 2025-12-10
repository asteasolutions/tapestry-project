import { Item } from 'tapestry-core/src/data-format/schemas/item'
import { isHTTPURL, isMediaItem } from 'tapestry-core/src/utils'
import { TextProps } from '../../lib/text'
import { compact, startCase } from 'lodash-es'
import { Icon } from '../../lib/icon'

function formatLink(maybeUrl: string) {
  if (isHTTPURL(maybeUrl)) {
    return (
      <a href={maybeUrl} target="_blank">
        {maybeUrl} <Icon icon="open_in_new" />
      </a>
    )
  }
  return maybeUrl
}

const ITEM_INFO_FIELDS = ['type', 'source', 'position', 'size', 'notes'] as const
export type ItemInfoField = (typeof ITEM_INFO_FIELDS)[number]

const ITEM_INFO_FIELD_EXTRACTORS: Record<
  ItemInfoField,
  (item: Item) => [string, TextProps<'span'>] | null
> = {
  type: (item) => ['Item Type', { children: startCase(item.type) }],
  source: (item) =>
    isMediaItem(item) ? ['Source', { lineClamp: 3, children: formatLink(item.source) }] : null,
  position: (item) => [
    'Position',
    { children: `${Math.round(item.position.x)}, ${Math.round(item.position.y)}` },
  ],
  size: (item) => [
    'Size',
    { children: `${Math.round(item.size.width)} x ${Math.round(item.size.height)} px` },
  ],
  notes: (item) => ['Notes', { children: item.notes }],
}

export function getItemInfo(
  item: Item,
  exclude: ItemInfoField[] = [],
): Map<string, TextProps<'span'>> {
  return new Map(
    compact(
      ITEM_INFO_FIELDS.filter((field) => !exclude.includes(field)).map((field) =>
        ITEM_INFO_FIELD_EXTRACTORS[field](item),
      ),
    ),
  )
}
