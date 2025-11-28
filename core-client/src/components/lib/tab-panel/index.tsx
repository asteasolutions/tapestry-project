import clsx from 'clsx'
import { Button } from '../buttons/index.js'
import styles from './styles.module.css'
import { ReactNode } from 'react'

export interface TabPanelProps<T extends string> {
  tabs: Partial<Record<T, ReactNode>>
  selected: T | null
  onSelect: (tabId: T) => void
  className?: string
}

export function TabPanel<T extends string>({
  tabs,
  selected,
  onSelect,
  className,
}: TabPanelProps<T>) {
  return (
    <div className={clsx(styles.root, className)}>
      {Object.entries(tabs as Record<string, ReactNode>).map(
        ([id, label]) =>
          label && (
            <Button
              variant="tertiary"
              key={id}
              className={clsx(styles.tab, { [styles.selected]: selected === id })}
              onClick={() => onSelect(id as T)}
              isActive={selected === id}
            >
              {label}
            </Button>
          ),
      )}
    </div>
  )
}
