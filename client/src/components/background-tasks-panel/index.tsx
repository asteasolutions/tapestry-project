import clsx from 'clsx'
import { useState } from 'react'
import { IconButton } from 'tapestry-core-client/src/components/lib/buttons/index'
import { Text } from 'tapestry-core-client/src/components/lib/text/index'
import { TapestryExport, TapestryImport } from '../../services/background-tasks'
import { ExportRow } from './row/export-row'
import { IMPORT_ROW_STATUS, ImportRow } from './row/import-row'
import styles from './styles.module.css'

export interface BackgroundTasksPanelProps {
  imports: TapestryImport[]
  exports: TapestryExport[]
  onCancelExport: (id: string) => unknown
  onClose: () => unknown
  className?: string
}

export function BackgroundTasksPanel({
  imports,
  exports,
  onCancelExport,
  onClose,
  className,
}: BackgroundTasksPanelProps) {
  const [collapsed, setCollapsed] = useState(false)

  if (imports.length === 0 && exports.length === 0) {
    return null
  }

  const inProgress =
    imports.filter((i) => IMPORT_ROW_STATUS[i.status] === 'inProgress').length +
    exports.filter((e) => e.status === 'exporting').length

  const rows = [
    ...imports.map((i) => ({ startedAt: i.startedAt, row: <ImportRow key={i.id} {...i} /> })),
    ...exports.map((e) => ({
      startedAt: e.startedAt,
      row: <ExportRow key={e.id} tapestryExport={e} onCancel={() => onCancelExport(e.id)} />,
    })),
  ].sort((a, b) => b.startedAt - a.startedAt)

  return (
    <div className={clsx(styles.root, className)} role="status">
      <div className={styles.header}>
        <Text variant="bodySm" className={styles.title}>
          {inProgress > 0
            ? `${inProgress} ${inProgress === 1 ? 'tapestry' : 'tapestries'} in progress`
            : 'All done'}
        </Text>
        <IconButton
          icon={collapsed ? 'keyboard_arrow_down' : 'keyboard_arrow_up'}
          aria-label={collapsed ? 'Expand' : 'Collapse'}
          size="small"
          onClick={() => setCollapsed(!collapsed)}
        />
        {inProgress === 0 && (
          <IconButton icon="close" aria-label="Close" size="small" onClick={() => onClose()} />
        )}
      </div>
      {!collapsed && <div className={styles.list}>{rows.map(({ row }) => row)}</div>}
    </div>
  )
}
