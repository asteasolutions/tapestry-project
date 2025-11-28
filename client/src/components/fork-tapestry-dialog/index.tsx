import { startCase } from 'lodash'
import { useAsyncPolled } from '../../hooks/use-poll'
import { resource } from '../../services/rest-resources'
import { Modal } from 'tapestry-core-client/src/components/lib/modal/index'
import { Text } from 'tapestry-core-client/src/components/lib/text/index'
import { TapestryCreateJobDto } from 'tapestry-shared/src/data-transfer/resources/dtos/tapestry-create-job'
import styles from './styles.module.css'
import { Link } from 'react-router'
import { TapestryDialog, TapestryInfo } from '../tapestry-dialog'
import { JSX, useState } from 'react'
import { getCopyName } from 'tapestry-core/src/utils'
import { Icon } from 'tapestry-core-client/src/components/lib/icon/index'

export const forkStatusIcons: Record<TapestryCreateJobDto['status'], JSX.Element> = {
  pending: <Icon icon="pending" />,
  processing: <Icon icon="table_convert" />,
  complete: <Icon icon="check_circle" style={{ color: 'var(--theme-text-positive)' }} />,
  failed: <Icon icon="error" style={{ color: 'var(--theme-text-negative)' }} />,
}

interface ForkProcessDialogProps {
  onClose: () => unknown
  jobId: string
}

function ForkProcessDialog({ jobId, onClose }: ForkProcessDialogProps) {
  const { data, loading } = useAsyncPolled({
    action: () => resource('tapestryCreateJob').read({ id: jobId }),
    interval: 1000,
    asyncActionOptions: { clearDataOnReload: false },
  })
  return (
    <Modal onClose={onClose} title="Copying Tapestry">
      <div>
        {!data && !loading && (
          <Text variant="body">
            There is an error copying your tapestry. Job could not be found
          </Text>
        )}
        {data && (
          <>
            <Text variant="body" component="div">
              Your copy is being processed.
              <br /> You can close this dialog and check your dashboard later.
            </Text>
            <div style={{ display: 'flex', gap: '8px', marginTop: '16px', alignItems: 'center' }}>
              <Text variant="bodySm" component="div" className={styles.statusWrapper}>
                {forkStatusIcons[data.status]} Status: {startCase(data.status)} (
                {Math.round(data.progress * 100)}%)
              </Text>
              {data.status === 'complete' && (
                <Text variant="bodyXs" component="div">
                  <Link to={`/t/${data.tapestryId!}/edit`} className={styles.link}>
                    Open
                  </Link>
                </Text>
              )}
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}

interface ForkTapestryDialogProps {
  onClose: () => unknown
  tapestryId: string
  tapestryInfo: TapestryInfo
}

export function ForkTapestryDialog({ onClose, tapestryId, tapestryInfo }: ForkTapestryDialogProps) {
  const [jobId, setJobId] = useState<string>()

  return (
    <>
      {!jobId && (
        <TapestryDialog
          title={`Duplicate ${tapestryInfo.title}`}
          handleSubmit={async (newTapestryInfo) => {
            const { id } = await resource('tapestryCreateJob').create({
              type: 'fork',
              parentId: tapestryId,
              ...newTapestryInfo,
            })
            setJobId(id)
          }}
          tapestryInfo={{
            title: getCopyName(tapestryInfo.title),
            description: tapestryInfo.description,
          }}
          submitText="Duplicate"
          onCancel={onClose}
          hideSlug
        />
      )}
      {jobId && <ForkProcessDialog jobId={jobId} onClose={onClose} />}
    </>
  )
}
