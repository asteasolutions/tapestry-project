import { ReactNode } from 'react'
import clsx from 'clsx'
import { IconButton } from 'tapestry-core-client/src/components/lib/buttons/index'
import { ReportDto } from 'tapestry-shared/src/data-transfer/resources/dtos/admin'
import { Panel } from '../../components/panel'
import { ErrorText } from '../../components/error-text'
import { downloadReportCsv } from '../report-csv'
import { ReportState } from '../use-report'
import styles from './styles.module.css'

interface ReportCardProps {
  state: ReportState
  title: ReactNode
  subtitle?: ReactNode
  /** Used in the label of the export button */
  exportName: string
  children: (report: ReportDto) => ReactNode
}

/** A card showing one report, with an export button and loading and error states. */
export function ReportCard({ state, title, subtitle, exportName, children }: ReportCardProps) {
  const { report, loading, error } = state
  return (
    <Panel
      headingLevel="h3"
      title={title}
      subtitle={subtitle}
      aria-busy={loading}
      className={clsx(styles.root, { [styles.loading]: loading && report })}
      actions={
        <IconButton
          icon="download"
          aria-label={`Export ${exportName} as CSV`}
          tooltip={{ side: 'bottom', children: 'Export CSV' }}
          disabled={!report}
          onClick={() => report && downloadReportCsv(report)}
        />
      }
    >
      <ErrorText error={error} />
      {report ? children(report) : !error && <p className={styles.placeholder}>Loading…</p>}
    </Panel>
  )
}

/** A small explanatory note at the bottom of a card. */
export function CardNote({ children }: { children: ReactNode }) {
  return <p className={styles.note}>{children}</p>
}

/** A headline number of a card. */
export function Headline({
  value,
  label,
  children,
}: {
  value: ReactNode
  label?: ReactNode
  children?: ReactNode
}) {
  return (
    <div className={styles.headline}>
      <span className={styles.value}>{value}</span>
      {label && <span className={styles.label}>{label}</span>}
      {children}
    </div>
  )
}
