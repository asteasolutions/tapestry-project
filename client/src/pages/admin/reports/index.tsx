import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import clsx from 'clsx'
import { Button } from 'tapestry-core-client/src/components/lib/buttons/index'
import { Text } from 'tapestry-core-client/src/components/lib/text/index'
import { useAsync } from 'tapestry-core-client/src/components/lib/hooks/use-async'
import {
  DrillTargetDto,
  REPORT_METRICS,
  ReportComparison,
  ReportDto,
  ReportFigureDto,
  ReportMetric,
  ReportTableDto,
  ReportUnit,
} from 'tapestry-shared/src/data-transfer/resources/dtos/admin'
import { resource } from '../../../services/rest-resources'
import { adminPath } from '../../../utils/paths'
import {
  Badge,
  DateInput,
  ErrorText,
  FilterField,
  NativeSelect,
  SectionHeader,
} from '../components'
import { CsvValue, downloadCsv } from '../csv'
import { formatDate } from '../format'
import styles from '../styles.module.css'

// ---- Time range ----

const PRESETS = ['7d', '30d', '90d', 'ytd', 'all', 'custom'] as const
type Preset = (typeof PRESETS)[number]

const PRESET_LABELS: Record<Preset, string> = {
  '7d': 'Last 7 days',
  '30d': 'Last 30 days',
  '90d': 'Last 90 days',
  ytd: 'Year to date',
  all: 'All time',
  custom: 'Custom range',
}

interface Range {
  from: Date | null
  to: Date
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function addDays(date: Date, days: number) {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

/** Ranges include today and end at the start of tomorrow (exclusive). */
function rangeFor(preset: Preset, customFrom: string, customTo: string): Range | null {
  const tomorrow = addDays(startOfDay(new Date()), 1)
  switch (preset) {
    case '7d':
      return { from: addDays(tomorrow, -7), to: tomorrow }
    case '30d':
      return { from: addDays(tomorrow, -30), to: tomorrow }
    case '90d':
      return { from: addDays(tomorrow, -90), to: tomorrow }
    case 'ytd':
      return { from: new Date(tomorrow.getFullYear(), 0, 1), to: tomorrow }
    case 'all':
      return { from: null, to: tomorrow }
    case 'custom': {
      if (!customFrom || !customTo) return null
      const from = new Date(`${customFrom}T00:00:00`)
      const to = addDays(new Date(`${customTo}T00:00:00`), 1)
      return from < to ? { from, to } : null
    }
  }
}

function describeRange(range: Range | null) {
  if (!range) return 'all time'
  return `${range.from ? formatDate(range.from) : 'the beginning'} – ${formatDate(addDays(range.to, -1))}`
}

// ---- Formatting ----

const numberFormat = new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 })

function formatValue(value: number | null, unit: ReportUnit) {
  if (value === null) return '—'
  if (unit === 'percent') return `${numberFormat.format(value)}%`
  if (unit === 'days') return `${numberFormat.format(value)} ${value === 1 ? 'day' : 'days'}`
  return numberFormat.format(value)
}

function percentChange(current: number | null, previous: number | null) {
  if (current === null || previous === null || previous === 0) return null
  return ((current - previous) / previous) * 100
}

function drillPath(drill: DrillTargetDto, label: string) {
  return adminPath(
    drill.kind,
    undefined,
    new URLSearchParams({ filter: JSON.stringify(drill.filter), label }),
  )
}

// ---- Report panel ----

function Figure({
  figure,
  comparison,
  onDrill,
}: {
  figure: ReportFigureDto
  comparison: ReportFigureDto | undefined
  onDrill: (drill: DrillTargetDto, label: string) => unknown
}) {
  const value = formatValue(figure.value, figure.unit)
  const change =
    comparison && figure.unit !== 'percent' ? percentChange(figure.value, comparison.value) : null
  const pointsChange =
    comparison && figure.unit === 'percent' && figure.value !== null && comparison.value !== null
      ? figure.value - comparison.value
      : null

  return (
    <div className={styles.figure}>
      <Text variant="bodyXs" className={styles.muted}>
        {figure.label}
      </Text>
      {figure.drill ? (
        <button
          type="button"
          className={styles.figureValue}
          title="Show the underlying records"
          onClick={() => onDrill(figure.drill!, `${figure.label}: ${value}`)}
        >
          {value}
        </button>
      ) : (
        <span className={styles.figureValue}>{value}</span>
      )}
      {comparison && (
        <Text variant="bodyXs" className={styles.muted}>
          vs {formatValue(comparison.value, comparison.unit)}
          {change !== null && (
            <span
              className={clsx(styles.change, change > 0 ? styles.up : change < 0 && styles.down)}
            >
              {' '}
              ({change > 0 ? '+' : ''}
              {numberFormat.format(change)}%)
            </span>
          )}
          {pointsChange !== null && (
            <span className={styles.change}>
              {' '}
              ({pointsChange > 0 ? '+' : ''}
              {numberFormat.format(pointsChange)} pts)
            </span>
          )}
        </Text>
      )}
    </div>
  )
}

function ReportTable({
  table,
  onDrill,
}: {
  table: ReportTableDto
  onDrill: (drill: DrillTargetDto, label: string) => unknown
}) {
  // The first column is drawn as a bar so that magnitudes can be compared at a glance
  const max = Math.max(1, ...table.rows.map((row) => row.values[0] ?? 0))

  return (
    <div className={styles.tableContainer}>
      <table className={styles.table}>
        <caption className={styles.visuallyHidden}>{table.title}</caption>
        <thead>
          <tr>
            <th scope="col">{table.title}</th>
            {table.columns.map((column) => (
              <th key={column.key} scope="col" className={styles.numeric}>
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row) => (
            <tr key={row.key}>
              <th scope="row" style={{ fontWeight: 400 }}>
                {row.label}
              </th>
              {row.values.map((value, index) => {
                const column = table.columns[index]
                const drill = row.drill?.[index]
                const text = formatValue(value, column.unit)
                const content = drill ? (
                  <button
                    type="button"
                    className={styles.linkButton}
                    onClick={() =>
                      onDrill(drill, `${table.title} · ${row.label} · ${column.label}`)
                    }
                  >
                    {text}
                  </button>
                ) : (
                  text
                )
                return (
                  <td key={column.key} className={styles.numeric}>
                    {index === 0 && column.unit === 'count' ? (
                      <div className={styles.barCell}>
                        <span
                          className={styles.bar}
                          title={`${row.label}: ${text} ${column.label.toLowerCase()}`}
                          aria-hidden
                        >
                          <span style={{ width: `${((value ?? 0) / max) * 100}%` }} />
                        </span>
                        {content}
                      </div>
                    ) : (
                      content
                    )}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function reportCsvRows(report: ReportDto): CsvValue[][] {
  const rows: CsvValue[][] = []
  const period = (data: ReportDto['current']) =>
    `${data.from ? data.from.toISOString() : 'all time'} – ${data.to.toISOString()}`

  rows.push(['Figure', 'Label', 'Value', 'Unit', 'Comparison value', 'Change %'])
  for (const figure of report.current.figures) {
    const comparison = report.comparison?.figures.find((f) => f.key === figure.key)
    const change = comparison ? percentChange(figure.value, comparison.value) : null
    rows.push([
      figure.key,
      figure.label,
      figure.value,
      figure.unit,
      comparison?.value,
      change === null ? '' : Math.round(change * 10) / 10,
    ])
  }

  const tables = [
    ...report.current.tables.map((table) => ({
      table,
      data: report.current,
      kind: 'Selected period',
    })),
    ...(report.comparison?.tables.map((table) => ({
      table,
      data: report.comparison!,
      kind: 'Comparison period',
    })) ?? []),
  ]
  for (const { table, data, kind } of tables) {
    rows.push([])
    rows.push([`${table.title} (${kind}: ${period(data)})`])
    rows.push(['', ...table.columns.map((c) => c.label)])
    for (const row of table.rows) {
      rows.push([row.label, ...row.values])
    }
  }
  return rows
}

function ReportPanel({
  metric,
  range,
  compare,
}: {
  metric: ReportMetric
  range: Range
  compare: ReportComparison
}) {
  const navigate = useNavigate()
  const fromTime = range.from?.getTime() ?? null
  const toTime = range.to.getTime()
  const {
    data: report,
    error,
    loading,
  } = useAsync(
    ({ signal }) =>
      resource('adminReportQueries').create(
        {
          metric,
          from: fromTime === null ? null : new Date(fromTime),
          to: new Date(toTime),
          compare,
        },
        {},
        { signal },
      ),
    [metric, fromTime, toTime, compare],
    { clearDataOnReload: false },
  )

  const onDrill = (drill: DrillTargetDto, label: string) => void navigate(drillPath(drill, label))

  return (
    <section
      className={clsx(styles.panel, { [styles.loading]: loading })}
      aria-labelledby={`report-${metric}`}
      aria-busy={loading}
    >
      <div className={styles.sectionHeader}>
        <div>
          <Text variant="body" component="h2" id={`report-${metric}`} style={{ fontWeight: 600 }}>
            {report?.title ?? metric}{' '}
            <Text variant="bodyXs" className={styles.muted}>
              {metric}
            </Text>
          </Text>
          <div className={styles.actions} style={{ marginTop: 4 }}>
            {report?.isCurrentState && <Badge>Current state · today’s values</Badge>}
            {report?.dataStatus === 'partial' && <Badge tone="negative">Partial data</Badge>}
            {report && !report.isCurrentState && (
              <Text variant="bodyXs" className={styles.muted}>
                {describeRange(report.current)}
                {report.comparison && ` vs ${describeRange(report.comparison)}`}
              </Text>
            )}
          </div>
        </div>
        <Button
          variant="secondary"
          size="small"
          icon="download"
          disabled={!report}
          onClick={() =>
            report &&
            downloadCsv(
              `${metric}-${report.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
              [`${report.title} (${metric})`],
              reportCsvRows(report),
            )
          }
        >
          CSV
        </Button>
      </div>
      {report?.limitations && (
        <Text variant="bodyXs" component="p" className={styles.muted} style={{ margin: 0 }}>
          {report.limitations}
        </Text>
      )}
      <ErrorText error={error} />
      {report && (
        <>
          <div className={styles.figures}>
            {report.current.figures.map((figure) => (
              <Figure
                key={figure.key}
                figure={figure}
                comparison={report.comparison?.figures.find((f) => f.key === figure.key)}
                onDrill={onDrill}
              />
            ))}
          </div>
          {report.current.tables.map((table) => (
            <ReportTable key={table.key} table={table} onDrill={onDrill} />
          ))}
        </>
      )}
    </section>
  )
}

export function AdminReports() {
  const [preset, setPreset] = useState<Preset>('7d')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [compare, setCompare] = useState<ReportComparison>('previous')

  const range = useMemo(
    () => rangeFor(preset, customFrom, customTo),
    [preset, customFrom, customTo],
  )

  return (
    <>
      <SectionHeader
        title="Reports"
        description="Usage of this instance. Admin accounts and the content they own are excluded from usage figures. Select a highlighted number to see the underlying records."
      />
      <div className={clsx(styles.panel, styles.reportControls)}>
        <div className={styles.filters}>
          <FilterField label="Time range">
            <NativeSelect<Preset>
              value={preset}
              onChange={setPreset}
              options={PRESETS.map((value) => ({ value, label: PRESET_LABELS[value] }))}
            />
          </FilterField>
          {preset === 'custom' && (
            <>
              <FilterField label="From">
                <DateInput value={customFrom} onChange={setCustomFrom} ariaLabel="From" />
              </FilterField>
              <FilterField label="To">
                <DateInput value={customTo} onChange={setCustomTo} ariaLabel="To" />
              </FilterField>
            </>
          )}
          <FilterField label="Compare with">
            <NativeSelect<ReportComparison>
              value={compare}
              onChange={setCompare}
              options={[
                { value: 'none', label: 'No comparison' },
                { value: 'previous', label: 'Previous period' },
                { value: 'lastYear', label: 'Same period last year' },
              ]}
            />
          </FilterField>
        </div>
        {preset === 'all' && compare === 'previous' && (
          <Text variant="bodyXs" className={styles.muted}>
            “All time” has no previous period to compare with.
          </Text>
        )}
        {!range && (
          <Text variant="bodySm" textType="error">
            Choose a start date that is before the end date.
          </Text>
        )}
      </div>
      {range &&
        REPORT_METRICS.map((metric) => (
          <ReportPanel key={metric} metric={metric} range={range} compare={compare} />
        ))}
    </>
  )
}
