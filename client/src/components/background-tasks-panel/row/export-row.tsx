import { Button } from 'tapestry-core-client/src/components/lib/buttons/index'
import { ExportStatus, TapestryExport } from '../../../hooks/use-tapestry-export'
import { exportPercent } from '../../progress-bar/export-progress-bar'
import { Row } from '.'

interface ExportRowProps {
  tapestryExport: TapestryExport
  onCancel: () => unknown
}

function exportMessage(status: ExportStatus) {
  if (status === 'cancelled') {
    return 'Cancelled'
  }
  if (status === 'failed') {
    return 'Export failed'
  }
}

export function ExportRow({
  tapestryExport: { name, status, progress },
  onCancel,
}: ExportRowProps) {
  const isExporting = status === 'exporting'

  return (
    <Row
      icon="download"
      name={name}
      status={isExporting ? 'inProgress' : status}
      percent={isExporting ? exportPercent(progress) : undefined}
      message={exportMessage(status)}
    >
      {isExporting && (
        <Button variant="clear" size="small" onClick={() => onCancel()}>
          Cancel
        </Button>
      )}
    </Row>
  )
}
