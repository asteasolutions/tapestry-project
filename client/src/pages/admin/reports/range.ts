import { ReportComparison } from 'tapestry-shared/src/data-transfer/resources/dtos/admin'

export const PRESETS = ['7d', '30d', '90d', 'ytd', 'all', 'custom'] as const
export type Preset = (typeof PRESETS)[number]

export const PRESET_LABELS: Record<Preset, string> = {
  '7d': 'Last 7 days',
  '30d': 'Last 30 days',
  '90d': 'Last 90 days',
  ytd: 'Year to date',
  all: 'All time',
  custom: 'Custom range…',
}

/** How a period total is described next to its value */
export const TOTAL_LABELS: Record<Preset, string> = {
  '7d': 'Total for the last 7 days',
  '30d': 'Total for the last 30 days',
  '90d': 'Total for the last 90 days',
  ytd: 'Total for the year to date',
  all: 'Total for all time',
  custom: 'Total for the selected range',
}

export const COMPARISON_LABELS: Record<ReportComparison, string> = {
  previous: 'vs previous period',
  lastYear: 'vs same period last year',
  none: '',
}

export interface Range {
  from: Date | null
  /** Exclusive */
  to: Date
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

export function addDays(date: Date, days: number) {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

/** Ranges include today and end at the start of tomorrow. */
export function rangeFor(preset: Preset, customFrom: string, customTo: string): Range | null {
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

const dayFormat = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short' })
const fullFormat = new Intl.DateTimeFormat(undefined, {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

export function describeRange({ from, to }: Range) {
  const last = addDays(to, -1)
  if (!from) return `Until ${fullFormat.format(last)}`
  const sameYear = from.getFullYear() === last.getFullYear()
  return `${(sameYear ? dayFormat : fullFormat).format(from)} – ${fullFormat.format(last)}`
}

const weekFormat = new Intl.DateTimeFormat(undefined, {
  day: 'numeric',
  month: 'short',
  timeZone: 'UTC',
})

/** Formats the "YYYY-MM-DD" key of a weekly table row, e.g. "4 May". */
export function weekLabel(key: string) {
  return weekFormat.format(new Date(`${key}T00:00:00Z`))
}
