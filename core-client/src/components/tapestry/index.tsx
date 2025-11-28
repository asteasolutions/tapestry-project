import { createContext, FC, useContext } from 'react'
import { Id } from 'tapestry-core/src/data-format/schemas/common.js'
import { ItemType, WebpageType } from 'tapestry-core/src/data-format/schemas/item.js'
import { ContextHookInvocationError } from '../../errors.js'
import { StoreHooks } from '../../lib/store/provider.js'
import { TapestryViewModel } from '../../view-model/index.js'
import { ItemInfoModal } from './item-info-modal/index.js'

export const SELECTION_Z_INDEX = 1

export interface TapestryElementComponentProps {
  id: Id
}

export type TapestryElementComponent = FC<TapestryElementComponentProps>

export type ItemComponentName<T extends ItemType> = `${Capitalize<T>}Item`

export function itemComponentName<T extends ItemType>(itemType: T): ItemComponentName<T> {
  return `${itemType[0].toUpperCase()}${itemType.slice(1)}Item` as ItemComponentName<T>
}

export type TapestryComponentsConfig = Record<
  ItemComponentName<Exclude<ItemType, 'webpage'>>,
  TapestryElementComponent
> & {
  WebpageItem: Partial<Record<WebpageType, TapestryElementComponent>> & {
    default: TapestryElementComponent
  }
  Rel: TapestryElementComponent
  Multiselection: FC
  ItemInfoModal: typeof ItemInfoModal
}

export interface TapestryConfig extends StoreHooks<TapestryViewModel> {
  components: TapestryComponentsConfig
}

export const TapestryConfigContext = createContext<TapestryConfig | null>(null)

export function useTapestryConfig(): TapestryConfig {
  const context = useContext(TapestryConfigContext)
  if (!context) {
    throw new ContextHookInvocationError('TapestryConfig')
  }
  return context
}
