import { ChangeEvent, useMemo } from 'react'
import { Input, InputProps } from '../input/index.js'
import { debounce } from 'lodash-es'
import clsx from 'clsx'
import styles from './styles.module.css'
import { LoadingSpinner } from '../loading-spinner/index.js'
import { Icon } from '../icon/index.js'

interface SearchInputProps extends Omit<InputProps, 'onChange' | 'value' | 'type'> {
  onSearch: (term: string) => unknown
  isLoading?: boolean
}

export function SearchInput({ onSearch, isLoading, className, ...props }: SearchInputProps) {
  const onChange = useMemo(
    () => debounce((event: ChangeEvent<HTMLInputElement>) => onSearch(event.target.value), 500),
    [onSearch],
  )
  return (
    <div className={clsx(styles.root, className)}>
      <Input type="search" onChange={onChange} className={styles.input} {...props} />
      {isLoading ? (
        <LoadingSpinner className={clsx(styles.startAdornment, styles.spinner)} />
      ) : (
        <Icon icon="search" className={clsx(styles.startAdornment, styles.icon)} />
      )}
    </div>
  )
}
