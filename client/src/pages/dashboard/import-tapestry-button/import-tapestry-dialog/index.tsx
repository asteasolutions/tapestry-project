import { JSX, Fragment } from 'react'
import { IconButton } from 'tapestry-core-client/src/components/lib/buttons/index'
import { forkStatusIcons } from '../../../../components/fork-tapestry-dialog'
import { Modal } from 'tapestry-core-client/src/components/lib/modal/index'
import { Text } from 'tapestry-core-client/src/components/lib/text/index'
import { FileStatus, TapestryImport } from '../../../../hooks/use-tapestry-import'
import styles from './styles.module.css'
import { Icon } from 'tapestry-core-client/src/components/lib/icon/index'

const importStatusIcons: Record<FileStatus, JSX.Element> = {
  uploading: <Icon icon="upload_file" />,
  ...forkStatusIcons,
  cancelled: <Icon icon="cancel" style={{ color: 'var(--theme-text-negative)' }} />,
}

export interface ImportTapestryDialogProps {
  imports: TapestryImport[]
  onClose: () => unknown
}

export function ImportTapestryDialog({ imports, onClose }: ImportTapestryDialogProps) {
  const uploading = imports.some(({ status }) => status === 'uploading')
  const hasProcessing = imports.some(
    ({ status }) => status === 'pending' || status === 'processing',
  )

  return (
    <Modal onClose={() => onClose()} title="Importing" classes={{ root: styles.root }}>
      <Text className={styles.description} component="div">
        {uploading ? (
          'Please wait while all imports complete. Closing the dialog will cancel the import.'
        ) : hasProcessing ? (
          <>
            Your import is being processed.
            <br /> You can close this dialog and check your dashboard later.
          </>
        ) : (
          'All imports finished'
        )}
      </Text>
      <div className={styles.importsContainer}>
        {imports.map(({ name, progress, status, killSwitch }, i) => (
          <Fragment key={i}>
            {importStatusIcons[status]}
            <Text variant="bodySm">
              {name}
              {['uploading', 'processing'].includes(status) && ` | ${Math.round(progress * 100)}%`}
            </Text>
            {status === 'uploading' ? (
              <IconButton
                icon="close"
                aria-label="Cancel import"
                onClick={() => killSwitch.abort()}
                tooltip={{ side: 'top', children: 'Cancel' }}
              />
            ) : (
              <span />
            )}
          </Fragment>
        ))}
      </div>
    </Modal>
  )
}
