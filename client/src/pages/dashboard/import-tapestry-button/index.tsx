import { TYPE } from 'tapestry-core/src/data-format/export'
import { IconButton } from 'tapestry-core-client/src/components/lib/buttons/index'
import { FilePicker } from 'tapestry-core-client/src/components/lib/file-picker/index'

export interface ImportTapestryButtonProps {
  onSelected: (files: File[]) => unknown
}

export function ImportTapestryButton({ onSelected }: ImportTapestryButtonProps) {
  return (
    <>
      <FilePicker accept={TYPE} multiple onChange={onSelected}>
        <IconButton
          aria-label="Import tapestry"
          icon="publish"
          tooltip={{
            side: 'bottom',
            children: 'Import tapestry',
          }}
        />
      </FilePicker>
    </>
  )
}
