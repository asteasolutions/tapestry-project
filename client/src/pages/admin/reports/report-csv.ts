import { ReportDto } from 'tapestry-shared/src/data-transfer/resources/dtos/admin'
import { CsvValue, downloadCsv } from '../csv'

function period(data: ReportDto['current']) {
  return `${data.from ? data.from.toISOString() : 'all time'} – ${data.to.toISOString()}`
}

function percentChange(current: number | null, previous: number | null | undefined) {
  if (current === null || previous === null || previous === undefined || previous === 0) {
    return ''
  }
  return Math.round(((current - previous) / previous) * 1000) / 10
}

/** Every figure and table of a report, including the comparison period. */
export function reportCsvRows(report: ReportDto): CsvValue[][] {
  const rows: CsvValue[][] = [
    [`${report.title} (${report.metric})`],
    ['Period', period(report.current)],
  ]
  if (report.comparison) rows.push(['Compared with', period(report.comparison)])
  if (report.limitations) rows.push(['Notes', report.limitations])

  rows.push([], ['Figure', 'Value', 'Unit', 'Comparison value', 'Change %'])
  for (const figure of report.current.figures) {
    const comparison = report.comparison?.figures.find((f) => f.key === figure.key)
    rows.push([
      figure.label,
      figure.value,
      figure.unit,
      comparison?.value,
      percentChange(figure.value, comparison?.value),
    ])
  }

  const tables = [
    ...report.current.tables.map((table) => ({ table, kind: 'Selected period' })),
    ...(report.comparison?.tables.map((table) => ({ table, kind: 'Comparison period' })) ?? []),
  ]
  for (const { table, kind } of tables) {
    rows.push([], [`${table.title} (${report.isCurrentState ? 'Today' : kind})`])
    rows.push(['', ...table.columns.map((c) => c.label)])
    for (const row of table.rows) {
      rows.push([row.label, ...row.values])
    }
  }
  return rows
}

export function fileName(title: string) {
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-')
  return `${slug}-${new Date().toISOString().slice(0, 10)}`
}

export function downloadReportCsv(report: ReportDto) {
  const [header, ...rows] = reportCsvRows(report)
  downloadCsv(fileName(report.title), header.map(String), rows)
}

export function downloadReportsCsv(reports: ReportDto[]) {
  const rows = reports.flatMap((report, index) => [
    ...(index > 0 ? [[], []] : []),
    ...reportCsvRows(report),
  ])
  const [header, ...rest] = rows
  downloadCsv(fileName('reports'), header.map(String), rest)
}
