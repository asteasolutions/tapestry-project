import { useState } from 'react'
import { Button, IconButton } from 'tapestry-core-client/src/components/lib/buttons/index'
import { Icon } from 'tapestry-core-client/src/components/lib/icon/index'
import { Text } from 'tapestry-core-client/src/components/lib/text/index'
import { BlockNavigationDialog } from '../../../../components/block-navigation-dialog'
import { StatusSpinner } from '../../../../components/status-spinner'
import { FileStatus, TapestryImport } from '../../../../hooks/use-tapestry-import'
import { DASHBOARD_ROOT } from '../../../../utils/paths'
import styles from './styles.module.css'

const IN_PROGRESS: FileStatus[] = ['uploading', 'pending', 'processing']

function StatusIcon({ status }: { status: FileStatus }) {
  if (IN_PROGRESS.includes(status)) {
    return <StatusSpinner />
  }
  if (status === 'complete') {
    return <Icon icon="check_circle" className={styles.complete} aria-label="Imported" />
  }
  return (
    <Icon
      icon={status === 'cancelled' ? 'cancel' : 'error'}
      className={styles.failed}
      aria-label={status === 'cancelled' ? 'Cancelled' : 'Failed'}
    />
  )
}

export interface ImportTapestryPanelProps {
  imports: TapestryImport[]
  onClose: () => unknown
}

export function ImportTapestryPanel({ imports, onClose }: ImportTapestryPanelProps) {
  const [collapsed, setCollapsed] = useState(false)

  const inProgress = imports.filter(({ status }) => IN_PROGRESS.includes(status)).length
  const uploading = imports.some(({ status }) => status === 'uploading')

  return (
    <div className={styles.root} role="status">
      <div className={styles.header}>
        <Text variant="bodySm" className={styles.title}>
          {inProgress > 0
            ? `Uploading ${inProgress} ${inProgress === 1 ? 'item' : 'items'}`
            : 'Import finished'}
        </Text>
        <IconButton
          icon={collapsed ? 'keyboard_arrow_up' : 'keyboard_arrow_down'}
          aria-label={collapsed ? 'Expand' : 'Collapse'}
          size="small"
          onClick={() => setCollapsed(!collapsed)}
        />
        {inProgress === 0 && (
          <IconButton icon="close" aria-label="Close" size="small" onClick={() => onClose()} />
        )}
      </div>
      {!collapsed && (
        <div className={styles.list}>
          {imports.map(({ id, name, progress, status, killSwitch }) => (
            <div key={id} className={styles.row}>
              <Icon icon="upload_file" className={styles.fileIcon} />
              <Text variant="bodySm" className={styles.name} title={name}>
                {name}
              </Text>
              {(status === 'uploading' || status === 'processing') && (
                <Text variant="bodySm" className={styles.percent}>
                  {Math.round(progress * 100)}%
                </Text>
              )}
              {status === 'uploading' && (
                <Button variant="clear" size="small" onClick={() => killSwitch.abort()}>
                  Cancel
                </Button>
              )}
              <StatusIcon status={status} />
            </div>
          ))}
        </div>
      )}
      <BlockNavigationDialog
        blockerFn={(location) =>
          uploading && !location?.nextLocation.pathname.startsWith(DASHBOARD_ROOT)
        }
        onLeave={() => imports.forEach(({ killSwitch }) => killSwitch.abort())}
        title="Leave while uploading?"
      >
        <Text>Your files are still uploading. If you leave now, the upload will be cancelled.</Text>
      </BlockNavigationDialog>
    </div>
  )
}
