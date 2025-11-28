import { TapestryCanvas } from 'tapestry-core-client/src/components/tapestry/tapestry-canvas'
import { useTapestryData } from './tapestry-providers'
import { PropsWithStyle } from 'tapestry-core-client/src/components/lib'

export function TapestryEditorCanvas({ className }: PropsWithStyle) {
  const interactionMode = useTapestryData('interactionMode')

  return (
    <TapestryCanvas classes={{ root: className }} orderByPosition={interactionMode === 'view'} />
  )
}
