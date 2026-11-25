import { ComponentProps, ReactNode, useEffect, useState } from 'react'
import clsx from 'clsx'
import { Icon } from 'tapestry-core-client/src/components/lib/icon/index'
import { useDebounced } from 'tapestry-core-client/src/components/lib/hooks/use-debounced'
import styles from './styles.module.css'

/** A labelled form control. Use `grow` to give it more of the row. */
export function Field({
  label,
  children,
  grow = 1,
  className,
}: {
  label: ReactNode
  children: ReactNode
  grow?: number
  className?: string
}) {
  return (
    <label className={clsx(styles.field, className)} style={{ flexGrow: grow }}>
      <span className={styles.label}>{label}</span>
      {children}
    </label>
  )
}

/** A group of controls under one label, e.g. a date field and a date range. */
export function FieldGroup({
  label,
  children,
  grow = 1,
}: {
  label: string
  children: ReactNode
  grow?: number
}) {
  return (
    <div role="group" aria-label={label} className={styles.field} style={{ flexGrow: grow }}>
      <span className={styles.label} aria-hidden>
        {label}
      </span>
      <span className={styles.group}>{children}</span>
    </div>
  )
}

/** A row of filters above a list. */
export function FilterBar({ children }: { children: ReactNode }) {
  return (
    <div role="search" className={styles.filterBar}>
      {children}
    </div>
  )
}

/** A native select: it works with the keyboard and fits dense tables. */
export function Select<V extends string>({
  value,
  options,
  onChange,
  className,
  ...props
}: Omit<ComponentProps<'select'>, 'value' | 'onChange'> & {
  value: V
  options: readonly { value: V; label: string }[]
  onChange: (value: V) => unknown
}) {
  return (
    <select
      {...props}
      className={clsx(styles.control, className)}
      value={value}
      onChange={(e) => onChange(e.target.value as V)}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  )
}

export function TextInput({ className, ...props }: ComponentProps<'input'>) {
  return <input type="text" {...props} className={clsx(styles.control, className)} />
}

/** A search box that reports its value after the user stops typing. */
export function SearchInput({
  value,
  onSearch,
  ...props
}: Omit<ComponentProps<'input'>, 'value' | 'onChange'> & {
  value: string
  onSearch: (value: string) => unknown
}) {
  const [text, setText] = useState(value)
  const debounced = useDebounced(text, 300)

  // Follow external changes, e.g. "Clear filters"
  const [prevValue, setPrevValue] = useState(value)
  if (value !== prevValue) {
    setPrevValue(value)
    setText(value)
  }

  useEffect(() => {
    if (debounced !== value) onSearch(debounced)
    // Only react to the debounced text
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced])

  return (
    <span className={styles.search}>
      <Icon icon="search" aria-hidden />
      <input
        type="search"
        {...props}
        className={styles.control}
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
    </span>
  )
}
