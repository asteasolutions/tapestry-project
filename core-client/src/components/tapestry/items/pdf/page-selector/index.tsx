import { clamp } from 'lodash-es'
import { IconButton } from '../../../../lib/buttons/index'
import { Text } from '../../../../lib/text/index'
import styles from './styles.module.css'
import { SubmitOnBlurInput } from '../../../../lib/submit-on-blur-input/index'

export interface PdfPageSelectorProps {
  total: number
  page: number
  onChange: (page: number) => unknown
  showTotal: boolean
}

export function PdfPageSelector({ total, page, onChange, showTotal }: PdfPageSelectorProps) {
  return (
    <div className={styles.pageSelector}>
      <IconButton
        icon="chevron_left"
        aria-label="previous page"
        className={styles.pageInputButton}
        disabled={page === 1}
        onClick={() => onChange(page - 1)}
      />
      <SubmitOnBlurInput
        value={String(page)}
        className={styles.pageInput}
        onSubmit={(val) => val !== '' && onChange(Number(val))}
        parse={(val) => {
          const intValue = Number.parseInt(val)

          return String(Number.isNaN(intValue) ? '' : clamp(Math.abs(intValue), 1, total))
        }}
      />
      {showTotal && <Text style={{ color: 'var(--theme-text-primary)' }}>{`/ ${total}`}</Text>}
      <IconButton
        icon="chevron_right"
        aria-label="next page"
        className={styles.pageInputButton}
        disabled={page === total}
        onClick={() => onChange(page + 1)}
      />
    </div>
  )
}
