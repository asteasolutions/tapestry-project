import { PublicUserProfileDto } from 'tapestry-shared/src/data-transfer/resources/dtos/user'
import styles from './styles.module.css'
import { Button } from 'tapestry-core-client/src/components/lib/buttons/index'
import clsx from 'clsx'
import { fullName } from '../../model/data/utils'
import { useState } from 'react'
import { useClickableContext } from 'tapestry-core-client/src/components/lib/buttons/clickable-context'
import { Tooltip, TooltipProps } from 'tapestry-core-client/src/components/lib/tooltip'
import { typographyClassName } from 'tapestry-core-client/src/theme'

interface AvatarProps {
  user: PublicUserProfileDto
  size?: 'small' | 'medium' | 'large'
  className?: string
  style?: React.CSSProperties
  tooltip?: TooltipProps
  onClick?: () => unknown
}

function getInitials({ givenName, familyName, username }: PublicUserProfileDto) {
  const initials = [givenName, familyName].map((n) => n?.charAt(0) ?? '').join('')

  return (initials || username.charAt(0)).toUpperCase()
}

export function Avatar({ user, className, size, onClick, style, tooltip }: AvatarProps) {
  const [failed, setFailed] = useState(false)
  const showInitials = !user.avatar || failed

  const initials = getInitials(user)
  const children = showInitials ? (
    initials
  ) : (
    <img
      src={user.avatar!}
      alt={fullName(user)}
      onError={() => {
        setFailed(true)
      }}
    />
  )
  const classes = clsx(styles.root, 'avatar', className, styles[size ?? 'medium'])

  const clickableContext = useClickableContext()
  const isClickable = clickableContext?.click ?? onClick

  if (isClickable) {
    return (
      <Button
        className={classes}
        onClick={onClick}
        variant="tertiary"
        style={style}
        tooltip={tooltip}
      >
        {children}
      </Button>
    )
  }

  return (
    <div
      className={clsx(classes, typographyClassName('bodySm'), { [styles.withTooltip]: !!tooltip })}
      style={style}
    >
      {children}
      {tooltip && <Tooltip offset={8} {...tooltip} />}
    </div>
  )
}
