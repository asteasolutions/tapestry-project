import {
  ReportDto,
  ReportTableRowDto,
} from 'tapestry-shared/src/data-transfer/resources/dtos/admin'
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
  segments?: { tableKey: string; colors: string[] }
  note?: (report: ReportDto) => string | null
}

interface Segment {
  key: string
  label: string
  count: number
  color: string
}

const count = (row: ReportTableRowDto) => row.values[0] ?? 0

function RowLegend({ segments }: { segments: Segment[] }) {
  if (segments.length === 0) {
    return null
  }

  return (
    <ul className={styles.legend}>
      {segments.map((s) => (
        <li key={s.key}>
          <span aria-hidden className={styles.swatch} style={{ backgroundColor: s.color }} />
          {s.label} · {s.count.toLocaleString()}
        </li>
      ))}
    </ul>
  )
}

interface ReportRowProps {
  row: ReportTableRowDto
  segments: Segment[]
  max: number
  color: string
}

function ReportRow({ row, segments, max, color }: ReportRowProps) {
  return (
    <li key={row.key}>
      <span>{row.label}</span>
      <span aria-hidden className={styles.track}>
        <span
          className={styles.bar}
          style={{
            width: `${(count(row) / max) * 100}%`,
            backgroundColor: segments.length ? undefined : color,
          }}
        >
          {segments
            .filter((s) => s.count > 0)
            .map((s) => (
              <span
                key={s.key}
                title={`${s.label}: ${s.count.toLocaleString()}`}
                style={{ flexGrow: s.count, backgroundColor: s.color }}
              />
            ))}
        </span>
      </span>
      <span className={styles.count}>{count(row).toLocaleString()}</span>
      <RowLegend segments={segments} />
    </li>
  )
}

/** A ranked list of counts drawn as horizontal bars, optionally split into colored segments. */
export function BarListCard({
  state,
  title,
  subtitle,
  tableKey,
  color,
  segments,
  note,
}: BarListCardProps) {
  return (
    <ReportCard
      state={state}
      title={title}
      subtitle={state.report && subtitle(state.report)}
      exportName={title.toLowerCase()}
    >
      {(report) => {
        const table = report.current.tables.find((t) => t.key === tableKey)
        const segmentRows =
          report.current.tables.find((t) => t.key === segments?.tableKey)?.rows ?? []
        const colors = segments?.colors ?? []
        const rows = [...(table?.rows ?? [])].sort((a, b) => count(b) - count(a))
        const max = Math.max(1, ...rows.map(count))
        const noteText = note?.(report)

        const segmentsOf = (row: ReportTableRowDto): Segment[] =>
          segmentRows
            .filter((s) => s.key.startsWith(`${row.key}.`))
            .map((s, index) => ({
              key: s.key,
              label: s.label,
              count: count(s),
              color: colors.length ? colors[index % colors.length] : color,
            }))

        return (
          <>
            <ul className={styles.list}>
              {rows.map((row) => (
                <ReportRow row={row} segments={segmentsOf(row)} color={color} max={max} />
              ))}
            </ul>
            {noteText && <CardNote>{noteText}</CardNote>}
          </>
        )
      }}
    </ReportCard>
  )
}
