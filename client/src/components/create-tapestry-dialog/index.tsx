import { useNavigate } from 'react-router'
import { useAsyncAction } from 'tapestry-core-client/src/components/lib/hooks/use-async-action'
import { newTapestry } from '../../model/data/utils'
import { resource } from '../../services/rest-resources'
import { TapestryDialog, TapestryInfo } from '../tapestry-dialog'
import { tapestryPath } from '../../utils/paths'

interface CreateTapestryDialogProps {
  onCancel: () => unknown
}

export function CreateTapestryDialog({ onCancel }: CreateTapestryDialogProps) {
  const { perform: createNew, error } = useAsyncAction(
    ({ signal }, { title, slug, description }: TapestryInfo) =>
      resource('tapestries').create(
        newTapestry(title.trim(), slug, description?.trim()),
        { include: ['owner'] },
        { signal },
      ),
  )

  const navigate = useNavigate()

  return (
    <TapestryDialog
      title="Create new tapestry"
      onCancel={onCancel}
      submitText="Create"
      handleSubmit={async (tapestryInfo) => {
        const tapestry = await createNew(tapestryInfo)
        await navigate(tapestryPath(tapestry.owner!.username, tapestry.slug, 'edit'))
      }}
      error={error}
    />
  )
}
