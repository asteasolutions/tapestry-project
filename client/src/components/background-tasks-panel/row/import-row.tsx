import { useNavigate } from 'react-router'
import { Button } from 'tapestry-core-client/src/components/lib/buttons/index'
import { FileStatus, TapestryImport } from '../../../services/background-tasks'
import { Row, RowStatus } from '.'

export const IMPORT_ROW_STATUS: Record<FileStatus, RowStatus> = {
  uploading: 'inProgress',
  pending: 'inProgress',
  processing: 'inProgress',
  complete: 'complete',
  failed: 'failed',
  cancelled: 'cancelled',
}

const IMPORT_MESSAGES: Partial<Record<FileStatus, string>> = {
  failed: 'Import failed',
  cancelled: 'Cancelled',
}

export function ImportRow({
  name,
  status,
  error,
  progress,
  tapestryId,
  killSwitch,
}: TapestryImport) {
  const navigate = useNavigate()

  return (
    <Row
      icon="upload"
      name={name}
      status={IMPORT_ROW_STATUS[status]}
      percent={status === 'uploading' || status === 'processing' ? progress * 100 : undefined}
      message={error ?? IMPORT_MESSAGES[status]}
    >
      {status === 'uploading' && (
        <Button variant="clear" size="small" onClick={() => killSwitch.abort()}>
          Cancel
        </Button>
      )}
      {status === 'complete' && tapestryId && (
        <Button variant="clear" size="small" onClick={() => void navigate(`/t/${tapestryId}/edit`)}>
          Open
        </Button>
      )}
    </Row>
  )
}
