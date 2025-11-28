import clsx from 'clsx'
import styles from './styles.module.css'
import { Text } from '../../text/index.js'
import { Icon, IconName } from '../../icon/index.js'

interface Option {
  icon: IconName
  ariaLabel: string
  value: string
}

function ToggleIcon({ icon, ariaLabel, selected }: Option & { selected: boolean }) {
  return <Icon key={icon} icon={icon} className={clsx({ selected })} aria-label={ariaLabel} />
}

interface IconToggleProps {
  label: string
  onChange: () => unknown
  value: string
  options: [Option, Option]
  className?: string
  radioGroup?: string
}

export function IconToggle({
  label,
  onChange,
  value,
  options,
  className,
  radioGroup,
}: IconToggleProps) {
  const toggled = value === options[1].value
  if (radioGroup) {
    return (
      <div role="radiogroup" className={clsx(styles.root, className)}>
        <Text variant="bodyXs">{label}</Text>
        <div className={clsx(styles.buttonsContainer, { toggled })}>
          {options.map((option) => (
            <label key={option.icon}>
              <input
                type="radio"
                name={radioGroup}
                onClick={onChange}
                onKeyUp={(e) => {
                  if (e.code === 'Space') {
                    onChange()
                  }
                }}
              />
              <ToggleIcon {...option} selected={value === option.value} />
            </label>
          ))}
        </div>
      </div>
    )
  }
  return (
    <label className={clsx(styles.root, className)}>
      {label}
      <div className={clsx(styles.buttonsContainer, { toggled })}>
        {options.map((option) => (
          <ToggleIcon key={option.icon} {...option} selected={value === option.value} />
        ))}
        <input type="checkbox" checked={toggled} onChange={onChange} />
      </div>
    </label>
  )
}
