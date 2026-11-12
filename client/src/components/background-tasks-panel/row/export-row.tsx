import { Button } from 'tapestry-core-client/src/components/lib/buttons/index'
import { ExportStatus, TapestryExport } from '../../../services/background-tasks'
import { exportPercent } from '../../progress-bar/export-progress-bar'
import { Row, RowStatus } from '.'

interface ExportRowProps {
  tapestryExport: TapestryExport
  onCancel: () => unknown
}

const EXPORT_ROW_STATUS: Record<ExportStatus, RowStatus> = {
  exporting: 'inProgress',
  complete: 'complete',
  failed: 'failed',
  cancelled: 'cancelled',
}

const EXPORT_MESSAGES: Partial<Record<ExportStatus, string>> = {
  failed: 'Export failed',
  cancelled: 'Cancelled',
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
      status={EXPORT_ROW_STATUS[status]}
      percent={isExporting ? exportPercent(progress) : undefined}
      message={EXPORT_MESSAGES[status]}
    >
      {isExporting && (
        <Button variant="clear" size="small" onClick={() => onCancel()}>
          Cancel
        </Button>
      )}
    </Row>
  )
}
