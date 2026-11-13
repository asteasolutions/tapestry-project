import { useMemo, useState } from 'react'
import { Button } from 'tapestry-core-client/src/components/lib/buttons/index'
import { Icon } from 'tapestry-core-client/src/components/lib/icon/index'
import {
  DrillTargetDto,
  REPORT_METRICS,
  ReportComparison,
} from 'tapestry-shared/src/data-transfer/resources/dtos/admin'
import { PageHeader } from '../components/page-header'
import { ErrorText } from '../components/error-text'
import { Field, Select, TextInput } from '../components/field'
import { pluralize } from '../format'
import {
  COMPARISON_LABELS,
  describeRange,
  Preset,
  PRESET_LABELS,
  PRESETS,
  rangeFor,
  TOTAL_LABELS,
} from './range'
import { fetchReport, useReport } from './use-report'
import { downloadReportsCsv } from './report-csv'
import { Series, WeeklyChartCard } from './weekly-chart'
import { GettingStartedCard } from './getting-started'
import { InvitesCard } from './invites'
import { UsersByActivityCard } from './users-by-activity'
import { SharingLevelsCard } from './sharing-levels'
import { BarListCard } from './bar-list'
import { DrillDrawer } from './drill-drawer'
import styles from './styles.module.css'
import { useAsyncAction } from 'tapestry-core-client/src/components/lib/hooks/use-async-action'

const ACCOUNT_SERIES: Series[] = [
  { key: 'google', label: 'Google', color: 'var(--color-primary-900)' },
  { key: 'orcid', label: 'ORCID', color: 'var(--color-primary-200)' },
  { key: 'wikimedia', label: 'Wikimedia', color: 'var(--color-secondary-400)' },
  { key: 'bluesky', label: 'Bluesky', color: 'var(--color-primary-500)' },
  { key: 'ia', label: 'Internet Archive', color: 'var(--color-secondary-200)' },
]

const TAPESTRY_SERIES: Series[] = [
  { key: 'new', label: 'New', breakdownLabel: 'new', color: 'var(--color-primary-900)' },
  { key: 'forked', label: 'Forked', breakdownLabel: 'forked', color: 'var(--color-primary-200)' },
  {
    key: 'imported',
    label: 'Imported',
    breakdownLabel: 'imported',
    color: 'var(--color-secondary-400)',
  },
]

export function AdminReports() {
  const [preset, setPreset] = useState<Preset>('7d')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [compare, setCompare] = useState<ReportComparison>('previous')
  const [drill, setDrill] = useState<{ target: DrillTargetDto; title: string } | null>(null)

  const range = useMemo(
    () => rangeFor(preset, customFrom, customTo),
    [preset, customFrom, customTo],
  )

  // Reports for the selected period
  const accounts = useReport('M-01', range, compare)
  const tapestries = useReport('M-02', range, compare)
  const gettingStarted = useReport('M-03', range, compare)
  const invites = useReport('M-08', range, compare)
  // Current state: today's values, regardless of the selected period
  const usersByActivity = useReport('M-04', null, 'none')
  const mediaTypes = useReport('M-05', null, 'none')
  const sources = useReport('M-06', null, 'none')
  const editors = useReport('M-07', null, 'none')
  const sharing = useReport('M-09', null, 'none')

  const comparison = accounts.report?.comparison
  const compareLabel = comparison ? COMPARISON_LABELS[compare] : ''
  const totalLabel = TOTAL_LABELS[preset]
  const periodText = range ? describeRange(range) : ''
  let comparisonText = ''
  if (comparison) {
    comparisonText = `compared with ${describeRange(comparison)}`
  } else if (compare === 'previous' && preset === 'all') {
    comparisonText = '· “All time” has no previous period to compare with.'
  }

  const {
    loading: exporting,
    error: exportError,
    trigger: exportAll,
  } = useAsyncAction(async ({ signal }) => {
    if (!range) return
    downloadReportsCsv(
      await Promise.all(
        REPORT_METRICS.map((metric) => fetchReport(metric, range, compare, signal)),
      ),
    )
  })

  const onDrill = (target: DrillTargetDto, title: string) => setDrill({ target, title })

  return (
    <>
      <PageHeader
        title="Reports"
        description="Usage on this instance only. Admin accounts and the content they own are excluded from every figure. Select a headline number to see the users or tapestries behind it."
        actions={
          <Button
            variant="secondary"
            icon="download"
            disabled={exporting || !range}
            onClick={exportAll}
          >
            {exporting ? 'Exporting…' : 'Export all as CSV'}
          </Button>
        }
      >
        <div className={styles.controls}>
          <Field label="Time range" grow={0}>
            <Select<Preset>
              value={preset}
              onChange={setPreset}
              options={PRESETS.map((value) => ({ value, label: PRESET_LABELS[value] }))}
            />
          </Field>
          {preset === 'custom' && (
            <>
              <Field label="From" grow={0}>
                <TextInput
                  type="date"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                />
              </Field>
              <Field label="To" grow={0}>
                <TextInput
                  type="date"
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                />
              </Field>
            </>
          )}
          <Field label="Compare with" grow={0}>
            <Select<ReportComparison>
              value={compare}
              onChange={setCompare}
              options={[
                { value: 'previous', label: 'Previous period' },
                { value: 'lastYear', label: 'Same period last year' },
                { value: 'none', label: 'No comparison' },
              ]}
            />
          </Field>
          {range ? (
            <p className={styles.period}>
              <strong>{periodText}</strong> <span>{comparisonText}</span>
            </p>
          ) : (
            <p className={styles.period} role="alert">
              {preset === 'custom' && customFrom && customTo
                ? 'Choose a start date that is before the end date.'
                : 'Choose the start and end dates.'}
            </p>
          )}
        </div>
      </PageHeader>
      <ErrorText error={exportError} />

      {range && (
        <section aria-labelledby="period-heading" className={styles.section}>
          <h2 id="period-heading">Activity in this period</h2>
          <div className={styles.grid}>
            <WeeklyChartCard
              state={accounts}
              kpiLabel="Accounts created"
              chartTitle="Accounts created by week"
              chartSubtitle="By login provider"
              drillNoun="accounts"
              series={ACCOUNT_SERIES}
              totalLabel={totalLabel}
              compareLabel={compareLabel}
              onDrill={onDrill}
            />
            <WeeklyChartCard
              state={tapestries}
              kpiLabel="Tapestries created"
              chartTitle="Tapestries created by week"
              chartSubtitle="New, forked or imported"
              drillNoun="tapestries"
              series={TAPESTRY_SERIES}
              totalLabel={totalLabel}
              compareLabel={compareLabel}
              onDrill={onDrill}
            />
            <GettingStartedCard state={gettingStarted} compareLabel={compareLabel} />
            <InvitesCard state={invites} totalLabel={totalLabel} compareLabel={compareLabel} />
          </div>
        </section>
      )}

      <section aria-labelledby="state-heading" className={styles.section}>
        <div className={styles.sectionTitle}>
          <h2 id="state-heading">Current state</h2>
          <span>
            <Icon icon="schedule" aria-hidden />
            Today’s values · the time range doesn’t apply
          </span>
        </div>
        <div className={styles.grid}>
          <UsersByActivityCard state={usersByActivity} editorsState={editors} />
          <SharingLevelsCard state={sharing} />
          <BarListCard
            state={mediaTypes}
            title="Items by media type"
            tableKey="byType"
            color="var(--color-primary-900)"
            segments={{
              tableKey: 'byKind',
              colors: [
                'var(--color-primary-900)',
                'var(--color-secondary-400)',
                'var(--color-primary-200)',
                'var(--color-secondary-200)',
              ],
            }}
            subtitle={(report) => {
              const figure = (key: string) =>
                report.current.figures.find((f) => f.key === key)?.value ?? 0
              return `${pluralize(figure('items'), 'item')} · ${figure('perTapestry').toLocaleString()} per tapestry on average`
            }}
          />
          <BarListCard
            state={sources}
            title="Items by source"
            tableKey="bySource"
            color="var(--color-primary-400)"
            subtitle={(report) =>
              `${pluralize(report.current.figures.find((f) => f.key === 'total')?.value ?? 0, 'media item')}`
            }
            note={(report) => report.limitations}
          />
        </div>
      </section>

      {drill && range && (
        <DrillDrawer
          drill={drill.target}
          title={drill.title}
          subtitle={periodText}
          onClose={() => setDrill(null)}
        />
      )}
    </>
  )
}
