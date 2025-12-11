import { AudioItemDto, VideoItemDto } from 'tapestry-shared/src/data-transfer/resources/dtos/item'
import { buildToolbarMenu } from '.'
import { useItemToolbar } from './use-item-toolbar'
import { PlayableShareMenu, shareMenu } from './share-menu'
import { TimeInput } from '../../time-input'
import { updateItem } from '../../../pages/tapestry/view-model/store-commands/items'
import { useDispatch, useTapestryData } from '../../../pages/tapestry/tapestry-providers'
import { capitalize } from 'lodash'

export function usePlayableItemToolbar(dto: AudioItemDto | VideoItemDto, duration?: number) {
  const { startTime, stopTime, id } = dto
  const dispatch = useDispatch()

  const isEdit = useTapestryData('interactionMode') === 'edit'

  return useItemToolbar(id, {
    items: (ctrls) =>
      buildToolbarMenu({
        dto,
        isEdit,
        share: shareMenu({
          selectSubmenu: (id) => ctrls.selectSubmenu(id, true),
          selectedSubmenu: ctrls.selectedSubmenu,
          menu: <PlayableShareMenu item={dto} />,
        }),
      }),
    moreMenuItems: duration
      ? [
          <TimeInput
            onChange={(value) => dispatch(updateItem(id, { dto: { startTime: value } }))}
            text={`${capitalize(dto.type)} start at`}
            value={startTime ?? null}
            max={stopTime ?? duration}
          />,
          <TimeInput
            onChange={(value) => dispatch(updateItem(id, { dto: { stopTime: value } }))}
            text={`${capitalize(dto.type)} stop at`}
            value={stopTime ?? null}
            min={startTime ?? 0}
            max={duration}
          />,
        ]
      : undefined,
  })
}
