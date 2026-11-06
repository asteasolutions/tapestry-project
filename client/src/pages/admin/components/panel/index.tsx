import { ComponentProps, ReactNode } from 'react'
import clsx from 'clsx'
import styles from './styles.module.css'

interface PanelProps extends Omit<ComponentProps<'section'>, 'title'> {
  title?: ReactNode
  subtitle?: ReactNode
  /** Shown at the right of the title */
  actions?: ReactNode
  /** Removes the horizontal padding, e.g. for tables that span the whole panel */
  flush?: boolean
  headingLevel?: 'h2' | 'h3'
}

/** A white card holding one block of content. */
export function Panel({
  title,
  subtitle,
  actions,
  flush,
  headingLevel: Heading = 'h2',
  className,
  children,
  ...props
}: PanelProps) {
  return (
    <section className={clsx(styles.root, { [styles.flush]: flush }, className)} {...props}>
      {(title ?? actions) && (
        <div className={styles.header}>
          <div className={styles.titles}>
            {title && <Heading>{title}</Heading>}
            {subtitle && <span>{subtitle}</span>}
          </div>
          {actions && <div className={styles.actions}>{actions}</div>}
        </div>
      )}
      {children}
    </section>
  )
}
