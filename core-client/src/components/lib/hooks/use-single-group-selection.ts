import { GroupViewModel } from '../../../view-model'
import { isSingleGroupSelected } from '../../../view-model/utils'
import { useTapestryConfig } from '../../tapestry'

export function useSingleGroupSelection<T extends GroupViewModel = GroupViewModel>():
  | T
  | undefined {
  const { useStoreData } = useTapestryConfig()
  const { selection, groups } = useStoreData(['selection', 'groups'])

  if (isSingleGroupSelected(selection)) {
    return groups[[...selection.groupIds][0]] as T
  }
}
