import { useState } from 'react'
import { noop } from 'lodash-es'
import { Button } from 'tapestry-core-client/src/components/lib/buttons/index'
import { Checkbox } from 'tapestry-core-client/src/components/lib/checkbox/index'
import { useAsync } from 'tapestry-core-client/src/components/lib/hooks/use-async'
import { AdminTapestryDto } from 'tapestry-shared/src/data-transfer/resources/dtos/admin'
import { ItemDto } from 'tapestry-shared/src/data-transfer/resources/dtos/item'
import { listAll, resource } from '../../../../../services/rest-resources'
import { Panel } from '../../../components/panel'
import { ErrorText } from '../../../components/error-text'
import { Column, DataTable } from '../../../components/data-table'
import { ConfirmDeletionModal } from '../../../components/confirm-deletion-modal'
import { formatDateTime } from '../../../format'
import common from '../../../common.module.css'
import styles from './styles.module.css'

const ITEM_TYPE_LABELS: Record<ItemDto['type'], string> = {
  text: 'Text',
  actionButton: 'Action button',
  audio: 'Audio',
  video: 'Video',
  book: 'Book',
  image: 'Image',
  iiif: 'IIIF',
  pdf: 'PDF',
  webpage: 'Web page',
}

function itemLabel(item: ItemDto) {
  if (item.title) return item.title
  if ('text' in item && item.text) {
    const text = new DOMParser().parseFromString(item.text, 'text/html').body.textContent.trim()
    if (text) return text.length > 80 ? `${text.slice(0, 80)}…` : text
  }
  return `Untitled ${ITEM_TYPE_LABELS[item.type].toLowerCase()}`
}

/** Lists the items of a link-shared tapestry, so that admins can delete inappropriate content. */
export function ItemsPanel({
  tapestry,
  onDeleted,
}: {
  tapestry: AdminTapestryDto
  onDeleted: () => unknown
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [confirming, setConfirming] = useState(false)

  const { data, loading, error, reload } = useAsync(
    async ({ signal }) => {
      const [items, steps] = await Promise.all([
        listAll(
          resource('items'),
          { filter: { 'tapestryId:eq': tapestry.id }, orderBy: 'createdAt' },
          signal,
        ),
        listAll(
          resource('presentationSteps'),
          { filter: { 'tapestryId:eq': tapestry.id } },
          signal,
        ),
      ])
      return {
        items,
        inPresentation: new Set(
          steps.flatMap((s) => ('itemId' in s && s.itemId ? [s.itemId] : [])),
        ),
      }
    },
    [tapestry.id],
    { clearDataOnReload: false },
  )

  const selectedItems = data?.items.filter((item) => selected.has(item.id)) ?? []
  const toggle = (id: string) =>
    setSelected((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const columns: Column<ItemDto>[] = [
    {
      key: 'select',
      label: 'Select',
      hideLabel: true,
      render: (item) => (
        <Checkbox
          checked={selected.has(item.id)}
          onChange={() => toggle(item.id)}
          label={{
            content: <span className={common.visuallyHidden}>Select {itemLabel(item)}</span>,
          }}
        />
      ),
    },
    { key: 'title', label: 'Item', render: itemLabel },
    { key: 'type', label: 'Type', render: (item) => ITEM_TYPE_LABELS[item.type] },
    {
      key: 'presentation',
      label: 'Presentation',
      render: (item) =>
        data?.inPresentation.has(item.id) ? (
          <span className={styles.tag}>In presentation</span>
        ) : null,
    },
    {
      key: 'createdAt',
      label: 'Added',
      nowrap: true,
      render: (item) => formatDateTime(item.createdAt),
    },
  ]

  return (
    <Panel
      flush
      title={`Items (${data?.items.length ?? tapestry.itemCount})`}
      subtitle="Deleting items removes them with their connections and comments. Each deletion is recorded in the activity log."
      actions={
        <Button
          variant="primary-negative"
          size="small"
          icon="delete"
          disabled={selectedItems.length === 0}
          onClick={() => setConfirming(true)}
        >
          Delete selected{selectedItems.length > 0 && ` (${selectedItems.length})`}
        </Button>
      }
    >
      <ErrorText error={error} />
      <DataTable
        caption="Items"
        columns={columns}
        rows={data?.items}
        rowKey={(item) => item.id}
        loading={loading}
        empty="This tapestry has no items"
      />
      {confirming && (
        <ConfirmDeletionModal
          title={
            selectedItems.length === 1 ? 'Delete item permanently?' : 'Delete items permanently?'
          }
          onCancel={() => setConfirming(false)}
          onConfirm={async () => {
            await resource('adminActivity').create({
              action: 'deleteItems',
              tapestryId: tapestry.id,
              itemIds: selectedItems.map((item) => item.id),
            })
            setConfirming(false)
            setSelected(new Set())
            reload(noop)
            onDeleted()
          }}
        >
          <p>
            The following {selectedItems.length === 1 ? 'item' : `${selectedItems.length} items`}{' '}
            will be deleted from “{tapestry.title}”, together with their connections and comments:
          </p>
          <ul>
            {selectedItems.map((item) => (
              <li key={item.id}>
                {itemLabel(item)} ({ITEM_TYPE_LABELS[item.type]})
                {data?.inPresentation.has(item.id) && ' — also removed from the presentation'}
              </li>
            ))}
          </ul>
        </ConfirmDeletionModal>
      )}
    </Panel>
  )
}
