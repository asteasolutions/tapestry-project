import { ReportDto } from 'tapestry-shared/src/data-transfer/resources/dtos/admin'
import { ReportCard, CardNote } from '../report-card'
import { Delta } from '../delta'
import { ReportState } from '../use-report'
import styles from './styles.module.css'

const numberFormat = new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 })

function value(report: ReportDto, key: string, comparison = false) {
  const data = comparison ? report.comparison : report.current
  return data?.figures.find((f) => f.key === key)?.value ?? null
}

const STEPS = [
  {
    label: 'Made a first tapestry',
    count: 'withTapestry',
    share: 'withTapestryShare',
    median: 'medianDaysToTapestry',
  },
  {
    label: 'Added a first media item',
    count: 'withMedia',
    share: 'withMediaShare',
    median: 'medianDaysToMedia',
  },
]

/** How many of the users who signed up in the period went on to create content. */
export function GettingStartedCard({
  state,
  compareLabel,
}: {
  state: ReportState
  compareLabel: string
}) {
  const newUsers = state.report ? value(state.report, 'newUsers') : null
  return (
    <ReportCard
      state={state}
      title="New users getting started"
      subtitle={
        newUsers === null
          ? 'Of the accounts created in this period'
          : `Of the ${newUsers.toLocaleString()} accounts created in this period · counts content that still exists`
      }
      exportName="new users getting started"
    >
      {(report) => (
        <>
          {STEPS.map((step, index) => {
            const share = value(report, step.share)
            const count = value(report, step.count) ?? 0
            const median = value(report, step.median)
            return (
              <div key={step.label} className={styles.step}>
                <div className={styles.line}>
                  <span className={styles.label}>{step.label}</span>
                  <span>
                    <strong>{share === null ? '—' : `${numberFormat.format(share)}%`}</strong>{' '}
                    <span className={styles.detail}>
                      ({count.toLocaleString()} {count === 1 ? 'person' : 'people'})
                      {median !== null &&
                        ` · median ${numberFormat.format(median)} ${median === 1 ? 'day' : 'days'} after sign-up`}
                    </span>
                  </span>
                </div>
                <div aria-hidden className={styles.track}>
                  <span
                    className={index === 0 ? styles.primary : styles.secondary}
                    style={{ width: `${share ?? 0}%` }}
                  />
                </div>
                <Delta
                  current={share}
                  previous={value(report, step.share, true)}
                  points
                  label={compareLabel}
                />
              </div>
            )
          })}
          {report.limitations && <CardNote>{report.limitations}</CardNote>}
        </>
      )}
    </ReportCard>
  )
}
