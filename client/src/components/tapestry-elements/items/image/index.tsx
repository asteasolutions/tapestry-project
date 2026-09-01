import { memo, useEffect, useRef } from 'react'
import {
  HeicConvertingPlaceholder,
  ImageItemViewer,
} from 'tapestry-core-client/src/components/tapestry/items/image/viewer'
import { useObservable } from 'tapestry-core-client/src/components/lib/hooks/use-observable'
import { isHeicSource } from 'tapestry-core/src/utils'
import { ImageItemDto } from 'tapestry-shared/src/data-transfer/resources/dtos/item'
import { TapestryItemProps } from '..'
import { useTapestryData } from '../../../../pages/tapestry/tapestry-providers'
import { buildToolbarMenu } from '../../item-toolbar'
import { useItemToolbar } from '../../item-toolbar/use-item-toolbar'
import { TapestryItem } from '../tapestry-item'
import { AssignActionButton } from '../../../assign-action-button'
import { itemUpload } from '../../../../services/item-upload'
import { convertHeicItem } from './convert-heic-item'

const convertingItemIds = new Set<string>()

export const ImageItem = memo(({ id }: TapestryItemProps) => {
  const isEdit = useTapestryData('interactionMode') === 'edit'
  const dto = useTapestryData(`items.${id}.dto`) as ImageItemDto

  const { toolbar } = useItemToolbar(id, {
    items: [
      ...(isEdit
        ? ([
            {
              element: <AssignActionButton dto={dto} icon="left_click" />,
              tooltip: { side: 'bottom', children: 'Assign action' },
            },
            'separator',
          ] as const)
        : []),
      ...buildToolbarMenu({ dto, isEdit }),
    ],
  })

  const uploadingFile = useObservable(itemUpload).find(
    (item) => item.objectUrl === dto.source,
  )?.file

  const originalFileRef = useRef<File>(undefined)
  useEffect(() => {
    if (uploadingFile) originalFileRef.current = uploadingFile
  }, [uploadingFile])

  useEffect(() => {
    if (uploadingFile || !isHeicSource(dto.source) || convertingItemIds.has(id)) return

    convertingItemIds.add(id)
    convertHeicItem(id, dto.tapestryId, dto.source, originalFileRef.current)
      .catch((error: unknown) => console.error(`Error converting HEIC item ${id}`, error))
      .finally(() => convertingItemIds.delete(id))
  }, [id, dto.tapestryId, dto.source, uploadingFile])

  return (
    <TapestryItem id={id} halo={toolbar}>
      {uploadingFile && isHeicSource(uploadingFile.name) ? (
        <HeicConvertingPlaceholder />
      ) : (
        <ImageItemViewer id={id} />
      )}
    </TapestryItem>
  )
})
