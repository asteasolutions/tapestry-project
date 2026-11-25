import { Link } from 'react-router'
import { ReportCard, CardNote } from '../report-card'
import { ReportState } from '../use-report'
import { presetFilterPath } from '../../use-preset-filter'
import styles from './styles.module.css'

const numberFormat = new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 })

/** Users grouped by the number of tapestries they own, and how many tapestries are co-edited. */
export function UsersByActivityCard({
  state,
  editorsState,
}: {
  state: ReportState
  editorsState: ReportState
}) {
  const users = state.report?.current.figures.find((f) => f.key === 'users')?.value
  return (
    <ReportCard
      state={state}
      title="Users by activity"
      subtitle={
        users === undefined || users === null
          ? 'Accounts by number of tapestries they own'
          : `${users.toLocaleString()} accounts, by number of tapestries they own`
      }
      exportName="users by activity"
    >
      {(report) => {
        const table = report.current.tables.find((t) => t.key === 'byTapestries')
        const editors = editorsState.report?.current.figures
        const multiEditor = editors?.find((f) => f.key === 'multiEditor')
        const share = editors?.find((f) => f.key === 'share')?.value
        return (
          <>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">Tapestries owned</th>
                  <th scope="col" className={styles.number}>
                    Users
                  </th>
                  <th scope="col" className={styles.shareColumn}>
                    Share
                  </th>
                </tr>
              </thead>
              <tbody>
                {table?.rows.map((row) => (
                  <tr key={row.key}>
                    <th scope="row">{row.label}</th>
                    <td className={styles.number}>{row.values[0]?.toLocaleString()}</td>
                    <td>
                      <span className={styles.bar}>
                        <span aria-hidden>
                          <span style={{ width: `${row.values[1] ?? 0}%` }} />
                        </span>
                        {row.values[1] === null ? '—' : `${numberFormat.format(row.values[1])}%`}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {multiEditor && (
              <CardNote>
                {multiEditor.drill ? (
                  <Link
                    to={presetFilterPath(
                      'tapestries',
                      multiEditor.drill.filter,
                      'Showing tapestries with more than one editor',
                    )}
                  >
                    {multiEditor.value?.toLocaleString()} tapestries
                  </Link>
                ) : (
                  `${multiEditor.value?.toLocaleString()} tapestries`
                )}
                {share !== null && share !== undefined && ` (${numberFormat.format(share)}%)`} have
                more than one editor.
              </CardNote>
            )}
          </>
        )
      }}
    </ReportCard>
  )
}
