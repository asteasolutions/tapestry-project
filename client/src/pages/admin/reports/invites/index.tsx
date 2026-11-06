import { ReportCard, CardNote, Headline } from '../report-card'
import { Delta } from '../delta'
import { ReportState } from '../use-report'

/** Invites to view or edit tapestries sent in the period. */
export function InvitesCard({
  state,
  totalLabel,
  compareLabel,
}: {
  state: ReportState
  totalLabel: string
  compareLabel: string
}) {
  return (
    <ReportCard
      state={state}
      title="User sharing"
      subtitle="People invited to view and edit tapestries"
      exportName="invites sent"
    >
      {(report) => {
        const figure = (key: string, comparison = false) =>
          (comparison ? report.comparison : report.current)?.figures.find((f) => f.key === key)
            ?.value ?? null
        const total = figure('total')
        return (
          <>
            <Headline value={total?.toLocaleString() ?? '—'} label={totalLabel}>
              <Delta current={total} previous={figure('total', true)} label={compareLabel} />
            </Headline>
            <CardNote>
              {(figure('view') ?? 0).toLocaleString()} to view ·{' '}
              {(figure('edit') ?? 0).toLocaleString()} to view and edit. {report.limitations}
            </CardNote>
          </>
        )
      }}
    </ReportCard>
  )
}
