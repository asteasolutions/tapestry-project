import { Link } from 'react-router'
import { Icon } from 'tapestry-core-client/src/components/lib/icon/index'
import { ReportCard } from '../report-card'
import { ReportState } from '../use-report'
import { presetFilterPath } from '../../use-preset-filter'
import styles from './styles.module.css'

const LEVELS = [
  { key: 'owner', color: 'var(--color-primary-900)' },
  { key: 'invited', color: 'var(--color-primary-200)' },
  { key: 'link', color: 'var(--color-secondary-400)' },
]

function percent(part: number, total: number) {
  return total ? `${Math.round((part / total) * 100)}%` : '—'
}

/** Tapestries by sharing level today, and how many of them are featured. */
export function SharingLevelsCard({ state }: { state: ReportState }) {
  const figures = state.report?.current.figures
  const total = LEVELS.reduce(
    (sum, level) => sum + (figures?.find((f) => f.key === level.key)?.value ?? 0),
    0,
  )

  return (
    <ReportCard
      state={state}
      title="Tapestries by sharing level"
      subtitle={figures ? `${total.toLocaleString()} tapestries` : undefined}
      exportName="tapestries by sharing level"
    >
      {(report) => {
        const rows = [
          ...LEVELS.map((level) => ({
            ...level,
            figure: report.current.figures.find((f) => f.key === level.key),
          })),
          {
            key: 'featured',
            color: null,
            figure: report.current.figures.find((f) => f.key === 'featured'),
          },
        ]
        return (
          <>
            <div aria-hidden className={styles.stack}>
              {LEVELS.map((level) => {
                const value = report.current.figures.find((f) => f.key === level.key)?.value ?? 0
                return value > 0 ? (
                  <span key={level.key} style={{ flex: value, backgroundColor: level.color }} />
                ) : null
              })}
            </div>
            <table className={styles.table}>
              <tbody>
                {rows.map(({ key, color, figure }) => {
                  if (!figure) return null
                  const value = figure.value ?? 0
                  return (
                    <tr key={key} className={color ? undefined : styles.featured}>
                      <th scope="row">
                        <span className={styles.label}>
                          {color ? (
                            <span
                              aria-hidden
                              className={styles.swatch}
                              style={{ backgroundColor: color }}
                            />
                          ) : (
                            <Icon icon="star" filled aria-hidden />
                          )}
                          {color ? figure.label : 'of which featured'}
                        </span>
                      </th>
                      <td className={styles.number}>
                        {figure.drill ? (
                          <Link
                            to={presetFilterPath(
                              'tapestries',
                              figure.drill.filter,
                              `Showing tapestries: ${figure.label}`,
                            )}
                          >
                            {value.toLocaleString()}
                          </Link>
                        ) : (
                          value.toLocaleString()
                        )}
                      </td>
                      <td className={styles.share}>{percent(value, total)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </>
        )
      }}
    </ReportCard>
  )
}
