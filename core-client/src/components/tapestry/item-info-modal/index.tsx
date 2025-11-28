import { Item } from 'tapestry-core/src/data-format/schemas/item'
import { PropsWithChildren } from 'react'
import { getItemInfo } from './item-info'
import { InfoModal } from '../../lib/info-modal'

export interface InfoModalProps extends PropsWithChildren {
  item: Item
  onClose: () => unknown
}

export function ItemInfoModal({ item, onClose, children }: InfoModalProps) {
  return (
    <InfoModal onClose={onClose} info={getItemInfo(item, ['position', 'size'])}>
      {children}
    </InfoModal>
  )
}
