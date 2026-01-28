import { PropsWithStyle } from 'tapestry-core-client/src/components/lib'
import { usePresentationShortcuts } from 'tapestry-core-client/src/components/lib/hooks/use-presentation-shortcuts'
import { TapestryCanvas } from 'tapestry-core-client/src/components/tapestry/tapestry-canvas'
import { useTapestryData } from './tapestry-providers'

export function TapestryEditorCanvas({ className, style }: PropsWithStyle) {
  const interactionMode = useTapestryData('interactionMode')
  const isView = interactionMode === 'view'

  usePresentationShortcuts(isView)

  return <TapestryCanvas classes={{ root: className }} style={style} orderByPosition={isView} />
}
