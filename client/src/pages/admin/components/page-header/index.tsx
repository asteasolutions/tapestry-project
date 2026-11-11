import { ReactNode } from 'react'
import styles from './styles.module.css'

interface PageHeaderProps {
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
  /** Extra content below the title row, e.g. report controls */
  children?: ReactNode
}

/** The white card at the top of every admin section. */
export function PageHeader({ title, description, actions, children }: PageHeaderProps) {
  return (
    <header className={styles.root}>
      <div className={styles.titleRow}>
        <div className={styles.text}>
          <h1>{title}</h1>
          {description && <p>{description}</p>}
        </div>
        {actions && <div className={styles.actions}>{actions}</div>}
      </div>
      {children && <div className={styles.extra}>{children}</div>}
    </header>
  )
}
