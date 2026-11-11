import { useNavigate } from 'react-router'
import { Button } from 'tapestry-core-client/src/components/lib/buttons/index'
import { FileStatus, TapestryImport } from '../../../hooks/use-tapestry-import'
import { Row, RowStatus } from '.'

export const IMPORT_IN_PROGRESS: FileStatus[] = ['uploading', 'pending', 'processing']

function importMessage({ status, error }: TapestryImport) {
  if (status === 'cancelled') {
    return 'Cancelled'
  }
  if (status === 'failed') {
    return error ?? 'Import failed'
  }
}

export function ImportRow(tapestryImport: TapestryImport) {
  const { name, status, progress, tapestryId, killSwitch } = tapestryImport
  const navigate = useNavigate()

  return (
    <Row
      icon="upload"
      name={name}
      status={IMPORT_IN_PROGRESS.includes(status) ? 'inProgress' : (status as RowStatus)}
      percent={status === 'uploading' || status === 'processing' ? progress * 100 : undefined}
      message={importMessage(tapestryImport)}
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
