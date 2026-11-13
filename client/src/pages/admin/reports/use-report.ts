import { useState } from 'react'
import { useAsync } from 'tapestry-core-client/src/components/lib/hooks/use-async'
import {
  ReportComparison,
  ReportDto,
  ReportMetric,
} from 'tapestry-shared/src/data-transfer/resources/dtos/admin'
import { resource } from '../../../services/rest-resources'
import { Range } from './range'

export function fetchReport(
  metric: ReportMetric,
  range: Range,
  compare: ReportComparison,
  includeAdmins: boolean,
  signal?: AbortSignal,
) {
  return resource('adminReportQueries').create(
    { metric, from: range.from, to: range.to, compare, includeAdmins },
    {},
    { signal },
  )
}

export interface ReportState {
  report: ReportDto | undefined
  loading: boolean
  error: unknown
}

/**
 * Loads one report. Without a range, the report is computed over all time and without comparison:
 * that is what current-state reports need, since they don't depend on the selected range.
 */
export function useReport(
  metric: ReportMetric,
  range: Range | null,
  compare: ReportComparison,
  includeAdmins: boolean,
): ReportState {
  // All-time reports end "now", fixed when the page opens so that they are loaded only once
  const [now] = useState(() => new Date())
  const fromTime = range ? (range.from?.getTime() ?? null) : null
  const toTime = range ? range.to.getTime() : now.getTime()
  const effectiveCompare = range ? compare : 'none'

  const { data, loading, error } = useAsync(
    ({ signal }) =>
      fetchReport(
        metric,
        { from: fromTime === null ? null : new Date(fromTime), to: new Date(toTime) },
        effectiveCompare,
        includeAdmins,
        signal,
      ),
    [metric, fromTime, toTime, effectiveCompare, includeAdmins],
    { clearDataOnReload: false },
  )

  return { report: data, loading, error }
}
