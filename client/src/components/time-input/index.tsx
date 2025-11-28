import { clamp } from 'lodash'
import { Checkbox } from 'tapestry-core-client/src/components/lib/checkbox'
import { SubmitOnBlurInput } from 'tapestry-core-client/src/components/lib/submit-on-blur-input/index'
import styles from './styles.module.css'

interface TimeInputProps {
  text: string
  value: number | null
  onChange: (value: number | null) => unknown
  max?: number
  min?: number
}

export function TimeInput({ text, value, onChange, max = Infinity, min = 0 }: TimeInputProps) {
  const valueInt = value ?? min
  const enabled = value !== null

  const minutes = Math.floor(valueInt / 60)
  const seconds = valueInt % 60
  return (
    <div className={styles.root}>
      <Checkbox
        label={{ content: text, position: 'after' }}
        onChange={() => onChange(value === null ? min : null)}
        checked={enabled}
      />
      <div className={styles.inputContainer}>
        <SubmitOnBlurInput
          disabled={!enabled}
          value={`${minutes}`.padStart(2, '0')}
          style={{ textAlign: 'right' }}
          parse={(input) => {
            const newMinutes = Number.parseInt(input)
            return Number.isNaN(newMinutes) ? '00' : String(newMinutes).padStart(2, '0')
          }}
          onSubmit={(input) => {
            const newMinutes = Number.parseInt(input)
            if (
              Number.isNaN(newMinutes) ||
              newMinutes < 0 ||
              newMinutes * 60 + seconds > max ||
              newMinutes * 60 + seconds < min
            ) {
              return
            }

            const newValue = newMinutes * 60 + seconds

            onChange(newValue)
          }}
        />
        :
        <SubmitOnBlurInput
          disabled={!enabled}
          value={`${seconds}`.padStart(2, '0')}
          parse={(value) => {
            const newSeconds = Number.parseInt(value)
            const result = Number.isNaN(newSeconds) ? 0 : Number(String(newSeconds).slice(0, 2))
            return String(clamp(result, 0, 59)).padStart(2, '0')
          }}
          onSubmit={(input) => {
            const newSeconds = Number.parseInt(input)
            const asSeconds = minutes * 60
            if (
              Number.isNaN(newSeconds) ||
              newSeconds < 0 ||
              newSeconds > 60 ||
              asSeconds + newSeconds > max ||
              asSeconds + newSeconds < min
            ) {
              return
            }

            const newValue = asSeconds + newSeconds
            onChange(newValue)
          }}
        />
      </div>
    </div>
  )
}
