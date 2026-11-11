import { ReportDto } from 'tapestry-shared/src/data-transfer/resources/dtos/admin'
import { ReportCard, CardNote } from '../report-card'
import { ReportState } from '../use-report'
import styles from './styles.module.css'

interface BarListCardProps {
  state: ReportState
  title: string
  subtitle: (report: ReportDto) => string
  /** The table to show; its first column holds the counts */
  tableKey: string
  color: string
  note?: (report: ReportDto) => string | null
}

/** A ranked list of counts drawn as horizontal bars. */
export function BarListCard({ state, title, subtitle, tableKey, color, note }: BarListCardProps) {
  return (
    <ReportCard
      state={state}
      title={title}
      subtitle={state.report && subtitle(state.report)}
      exportName={title.toLowerCase()}
    >
      {(report) => {
        const table = report.current.tables.find((t) => t.key === tableKey)
        const rows = [...(table?.rows ?? [])].sort(
          (a, b) => (b.values[0] ?? 0) - (a.values[0] ?? 0),
        )
        const max = Math.max(1, ...rows.map((row) => row.values[0] ?? 0))
        const noteText = note?.(report)
        return (
          <>
            <ul className={styles.list}>
              {rows.map((row) => (
                <li key={row.key}>
                  <span>{row.label}</span>
                  <span aria-hidden className={styles.track}>
                    <span
                      style={{
                        width: `${((row.values[0] ?? 0) / max) * 100}%`,
                        backgroundColor: color,
                      }}
                    />
                  </span>
                  <span className={styles.count}>{(row.values[0] ?? 0).toLocaleString()}</span>
                </li>
              ))}
            </ul>
            {noteText && <CardNote>{noteText}</CardNote>}
          </>
        )
      }}
    </ReportCard>
  )
}
