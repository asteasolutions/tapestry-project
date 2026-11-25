import { DrillTargetDto, ReportDto } from 'tapestry-shared/src/data-transfer/resources/dtos/admin'
import { ReportCard, CardNote } from '../report-card'
import { Delta } from '../delta'
import { ReportState } from '../use-report'
import { weekLabel } from '../range'
import styles from './styles.module.css'

export interface Series {
  key: string
  label: string
  /** Used in the breakdown under the total, if different from `label` */
  breakdownLabel?: string
  color: string
}

/** The smallest "round" number (1, 2 or 5 times a power of ten) that is at least `max`. */
function niceMax(max: number) {
  if (max <= 5) return 5
  const power = 10 ** Math.floor(Math.log10(max))
  return [1, 2, 5, 10].map((m) => m * power).find((value) => value >= max)!
}

function Chart({ report, series }: { report: ReportDto; series: Series[] }) {
  const table = report.current.tables.find((t) => t.key === 'byWeek')
  if (!table || table.rows.length === 0) {
    return <CardNote>No data for this period.</CardNote>
  }
  const index = (key: string) => table.columns.findIndex((c) => c.key === key)
  const totals = table.rows.map((row) => row.values[index('total')] ?? 0)
  const max = niceMax(Math.max(...totals))
  const tickEvery = Math.ceil(table.rows.length / 8)

  return (
    <div className={styles.chart}>
      <div className={styles.legend}>
        {series.map((s) => (
          <span key={s.key}>
            <span aria-hidden className={styles.swatch} style={{ backgroundColor: s.color }} />
            {s.label}
          </span>
        ))}
      </div>
      <div className={styles.plot}>
        <div aria-hidden className={styles.axis}>
          <span>{max}</span>
          <span>{max / 2}</span>
          <span>0</span>
        </div>
        <div className={styles.area}>
          <div className={styles.bars}>
            {table.rows.map((row) => {
              const description = `Week of ${weekLabel(row.key)}: ${series
                .map((s) => `${row.values[index(s.key)] ?? 0} ${s.label}`)
                .join(', ')}`
              return (
                <div key={row.key} role="img" aria-label={description} title={description}>
                  {series.map((s) => {
                    const value = row.values[index(s.key)] ?? 0
                    return value > 0 ? (
                      <span
                        key={s.key}
                        style={{ height: `${(value / max) * 100}%`, backgroundColor: s.color }}
                      />
                    ) : null
                  })}
                </div>
              )
            })}
          </div>
          <div aria-hidden className={styles.ticks}>
            {table.rows.map((row, i) => (
              <span key={row.key}>{i % tickEvery === 0 ? weekLabel(row.key) : ''}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

interface WeeklyChartCardProps {
  state: ReportState
  kpiLabel: string
  chartTitle: string
  chartSubtitle: string
  /** What the drill-through lists, e.g. "accounts" */
  drillNoun: string
  series: Series[]
  totalLabel: string
  compareLabel: string
  onDrill: (drill: DrillTargetDto, title: string) => unknown
}

/** A headline total for the period and its weekly breakdown as a stacked bar chart. */
export function WeeklyChartCard({
  state,
  kpiLabel,
  chartTitle,
  chartSubtitle,
  drillNoun,
  series,
  totalLabel,
  compareLabel,
  onDrill,
}: WeeklyChartCardProps) {
  return (
    <ReportCard state={state} title={kpiLabel} exportName={chartTitle.toLowerCase()}>
      {(report) => {
        const figure = (key: string) => report.current.figures.find((f) => f.key === key)
        const total = figure('total')
        const previous = report.comparison?.figures.find((f) => f.key === 'total')
        const breakdown =
          series
            .filter((s) => (figure(s.key)?.value ?? 0) > 0)
            .map((s) => `${figure(s.key)?.value?.toLocaleString()} ${s.breakdownLabel ?? s.label}`)
            .join(' · ') || 'None in this period'
        const value = total?.value?.toLocaleString() ?? '—'

        const headline = (
          <>
            <span className={styles.value}>{value}</span>
            <span className={styles.label}>{totalLabel}</span>
            <Delta current={total?.value} previous={previous?.value} label={compareLabel} />
            <span className={styles.breakdown}>
              {breakdown}
              {total?.drill && <span className={styles.drillLink}>View {drillNoun} →</span>}
            </span>
          </>
        )

        return (
          <>
            {total?.drill ? (
              <button
                type="button"
                className={styles.kpi}
                onClick={() => onDrill(total.drill!, kpiLabel)}
              >
                {headline}
              </button>
            ) : (
              <div className={styles.kpi}>{headline}</div>
            )}
            <div className={styles.titles}>
              <h4>{chartTitle}</h4>
              <span>{chartSubtitle}</span>
            </div>
            <Chart report={report} series={series} />
            {report.limitations && <CardNote>{report.limitations}</CardNote>}
          </>
        )
      }}
    </ReportCard>
  )
}
