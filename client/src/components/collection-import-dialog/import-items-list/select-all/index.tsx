import { MAX_SELECTION } from '../..'
import { Checkbox } from 'tapestry-core-client/src/components/lib/checkbox'
import { Text } from 'tapestry-core-client/src/components/lib/text/index'
import { LoadingSpinner } from 'tapestry-core-client/src/components/lib/loading-spinner/index'
import { TypographyName } from 'tapestry-core-client/src/theme/types'

interface SelectAllProps {
  checked: boolean
  onChange: () => unknown
  total: number | undefined
  loading?: boolean
  classes?: {
    root?: string
    checkbox?: string
  }
  textVariant?: TypographyName
}

export function SelectAll({
  checked,
  onChange,
  total,
  loading,
  classes,
  textVariant = 'body',
}: SelectAllProps) {
  return (
    <div style={{ display: 'flex', gap: 16, alignItems: 'center' }} className={classes?.root}>
      {loading ? (
        <>
          <LoadingSpinner size="17px" style={{ alignSelf: 'center' }} />
          <Text variant={textVariant}>{`Select all (max. ${MAX_SELECTION} items)`}</Text>
        </>
      ) : (
        <Checkbox
          checked={checked}
          onChange={onChange}
          classes={{ checkbox: classes?.checkbox }}
          label={{
            content: `Select all (max. ${MAX_SELECTION} items)`,
            position: 'after',
            variant: textVariant,
          }}
          disabled={loading}
        />
      )}
      {total !== undefined && (
        <Text variant={textVariant} style={{ fontWeight: 700 }}>
          Total items: {total}
        </Text>
      )}
    </div>
  )
}
