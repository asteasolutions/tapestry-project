import { ReactNode, useState } from 'react'
import ReactModal from 'react-modal'
import { Link } from 'react-router'
import { Button, IconButton } from 'tapestry-core-client/src/components/lib/buttons/index'
import { useAsync } from 'tapestry-core-client/src/components/lib/hooks/use-async'
import { DrillTargetDto } from 'tapestry-shared/src/data-transfer/resources/dtos/admin'
import { listAll, resource } from '../../../../services/rest-resources'
import { adminPath } from '../../../../utils/paths'
import { ErrorText } from '../../components/error-text'
import { csvDate, downloadCsv } from '../../csv'
import { formatDate, loginProfiles, SHARING_LEVEL_LABELS, tapestryUrl } from '../../format'
import { presetFilterPath } from '../../use-preset-filter'
import styles from './styles.module.css'
import { fileName } from '../report-csv'

const PAGE = 10

interface DrillRows {
  columns: [string, string, string]
  rows: { key: string; cells: [ReactNode, ReactNode, ReactNode] }[]
  total: number
}

async function fetchRows(
  { kind, filter }: DrillTargetDto,
  limit: number,
  signal: AbortSignal,
): Promise<DrillRows> {
  const query = { filter, orderBy: '-createdAt', limit }
  if (kind === 'users') {
    const { data, total } = await resource('adminUsers').list(query, { signal })
    return {
      columns: ['User', 'Login provider', 'Joined'],
      total,
      rows: data.map((u) => ({
        key: u.id,
        cells: [
          <Link
            key="user"
            to={presetFilterPath('users', { 'id:eq': u.id }, `Showing @${u.username}`)}
          >
            @{u.username}
          </Link>,
          loginProfiles(u)
            .map((p) => p.provider)
            .join(', ') || '—',
          formatDate(u.createdAt),
        ],
      })),
    }
  }
  const { data, total } = await resource('adminTapestries').list(query, { signal })
  return {
    columns: ['Tapestry', 'Owner', 'Created'],
    total,
    rows: data.map((t) => ({
      key: t.id,
      cells: [
        <Link key="tapestry" to={adminPath('tapestries', t.id)}>
          {t.title}
        </Link>,
        `@${t.owner.username}`,
        formatDate(t.createdAt),
      ],
    })),
  }
}

async function exportRows({ kind, filter }: DrillTargetDto, title: string) {
  const name = fileName(title)
  const query = { filter, orderBy: '-createdAt' }
  if (kind === 'users') {
    const users = await listAll(resource('adminUsers'), query)
    downloadCsv(
      name,
      ['Username', 'Email', 'Login providers', 'Joined'],
      users.map((u) => [
        u.username,
        u.email,
        loginProfiles(u)
          .map((p) => p.provider)
          .join(', '),
        csvDate(u.createdAt),
      ]),
    )
  } else {
    const tapestries = await listAll(resource('adminTapestries'), query)
    downloadCsv(
      name,
      ['Title', 'Owner', 'Sharing level', 'Created', 'URL'],
      tapestries.map((t) => [
        t.title,
        t.owner.username,
        SHARING_LEVEL_LABELS[t.sharingLevel],
        csvDate(t.createdAt),
        tapestryUrl(t.owner.username, t.slug),
      ]),
    )
  }
}

interface DrillDrawerProps {
  drill: DrillTargetDto
  title: string
  subtitle: string
  onClose: () => unknown
}

/** A side panel listing the users or tapestries behind a reported number. */
export function DrillDrawer({ drill, title, subtitle, onClose }: DrillDrawerProps) {
  const [limit, setLimit] = useState(PAGE)
  const [exportError, setExportError] = useState<unknown>()
  const [exporting, setExporting] = useState(false)
  const { data, error, loading } = useAsync(
    ({ signal }) => fetchRows(drill, limit, signal),
    [drill, limit],
    { clearDataOnReload: false },
  )

  return (
    <ReactModal
      isOpen
      onRequestClose={onClose}
      shouldCloseOnEsc
      shouldCloseOnOverlayClick
      className={styles.drawer}
      overlayClassName={styles.overlay}
      aria={{ labelledby: 'drill-title' }}
    >
      <div className={styles.header}>
        <div>
          <h2 id="drill-title">{title}</h2>
          <span>{subtitle}</span>
        </div>
        <IconButton icon="close" aria-label="Close" onClick={onClose} />
      </div>
      <ErrorText error={error ?? exportError} />
      {data && (
        <table className={styles.table}>
          <thead>
            <tr>
              {data.columns.map((column, index) => (
                <th key={column} scope="col" className={index === 2 ? styles.right : undefined}>
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row) => (
              <tr key={row.key}>
                {row.cells.map((cell, index) => (
                  <td key={index} className={index === 2 ? styles.right : undefined}>
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {data?.total === 0 && <p className={styles.empty}>Nothing to show for this period.</p>}
      <div className={styles.footer}>
        <span>
          {data ? `Showing ${data.rows.length} of ${data.total.toLocaleString()}` : 'Loading…'}
        </span>
        <span className={styles.buttons}>
          {data && data.rows.length < data.total && (
            <Button
              variant="secondary"
              size="small"
              disabled={loading}
              onClick={() => setLimit((l) => l + PAGE)}
            >
              Show more
            </Button>
          )}
          <Button
            variant="secondary"
            size="small"
            icon="download"
            disabled={exporting || !data?.total}
            onClick={async () => {
              setExporting(true)
              setExportError(undefined)
              try {
                await exportRows(drill, title)
              } catch (e) {
                setExportError(e)
              } finally {
                setExporting(false)
              }
            }}
          >
            Export CSV
          </Button>
        </span>
      </div>
      <Link
        className={styles.fullList}
        to={presetFilterPath(drill.kind, drill.filter, `${title} · ${subtitle}`)}
      >
        Open in {drill.kind === 'users' ? 'Users' : 'All tapestries'} →
      </Link>
    </ReactModal>
  )
}
