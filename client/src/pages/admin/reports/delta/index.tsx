import clsx from 'clsx'
import styles from './styles.module.css'

const numberFormat = new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 })

interface DeltaProps {
  current: number | null | undefined
  previous: number | null | undefined
  /** Compare percentages in points rather than as a relative change */
  points?: boolean
  /** E.g. "vs previous period" */
  label: string
}

/** The change of a value compared with another period, e.g. "▲ +12 (+15%) vs previous period". */
export function Delta({ current, previous, points, label }: DeltaProps) {
  if (current === null || current === undefined || previous === null || previous === undefined) {
    return null
  }
  const change = current - previous
  const arrow = change > 0 ? '▲' : change < 0 ? '▼' : ''
  const sign = change > 0 ? '+' : change < 0 ? '−' : ''
  let text: string
  if (points) {
    text = `${sign}${numberFormat.format(Math.abs(change))} pts`
  } else {
    text = `${sign}${numberFormat.format(Math.abs(change))}`
    if (previous !== 0) {
      text += ` (${sign}${numberFormat.format(Math.abs((change / previous) * 100))}%)`
    }
  }

  return (
    <span className={clsx(styles.root, { [styles.up]: change > 0, [styles.down]: change < 0 })}>
      {arrow && <span aria-hidden>{arrow} </span>}
      {change !== 0 && <span className={styles.direction}>{change > 0 ? 'Up ' : 'Down '}</span>}
      {change === 0 ? 'No change' : text} {label}
    </span>
  )
}
