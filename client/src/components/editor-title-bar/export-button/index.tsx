import { ZodError } from 'zod/v4'
import { ProgressEvent, TapestryExporter } from '../../../services/tapestry-exporter'
import {
  MenuItemButton,
  MenuItemButtonProps,
} from 'tapestry-core-client/src/components/lib/buttons/index'
import { ExportProgressIndicator } from '../export-progress-indicator'
import { download } from 'tapestry-core-client/src/lib/file'
import { useState } from 'react'

interface ExportButtonProps extends Omit<MenuItemButtonProps, 'icon' | 'onClick'> {
  tapestryId: string
  onError: () => unknown
  onSuccess: () => unknown
}

export function ExportButton({ tapestryId, onError, onSuccess, ...props }: ExportButtonProps) {
  const [progress, setProgress] = useState<ProgressEvent>()

  return (
    <MenuItemButton
      {...props}
      icon="upload"
      onClick={() =>
        new TapestryExporter(tapestryId, setProgress, (error) => {
          console.warn(
            'Error during export',
            error,
            error instanceof ZodError ? error.issues : undefined,
          )
          onError()
          setProgress(undefined)
        }).export((url, title) => {
          setProgress(undefined)
          download(url, `${title}.zip`)
          onSuccess()
        })
      }
    >
      Export Zip file {progress && <ExportProgressIndicator progress={progress} />}
    </MenuItemButton>
  )
}
