import { useAsyncAction } from 'tapestry-core-client/src/components/lib/hooks/use-async-action'
import { resource } from '../services/rest-resources'
import { LoadingSpinner } from 'tapestry-core-client/src/components/lib/loading-spinner'
import { MenuItemButton } from 'tapestry-core-client/src/components/lib/buttons'

export function useConvertToPDF(id: string) {
  const { trigger, loading, data } = useAsyncAction(({ signal }) =>
    resource('items').update({ id }, { type: 'pdf' }, undefined, { signal }),
  )

  const conversionStarted = loading || !!data

  return {
    convertToPDF: trigger,
    conversionStarted,
    convertToPDFMenuItem: (
      <MenuItemButton onClick={trigger} disabled={conversionStarted}>
        Convert to PDF
        {conversionStarted && <LoadingSpinner style={{ alignSelf: 'center' }} size="16px" />}
      </MenuItemButton>
    ),
  }
}
