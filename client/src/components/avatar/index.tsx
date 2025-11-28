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

export function Avatar({ user, className, size, onClick, style, tooltip }: AvatarProps) {
  const [showInitials, setShowInitials] = useState(!user.avatar)

  // Family name can be returned as undefined by google and we default it to an empty string
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  const initials = `${user.givenName[0].toUpperCase()}${user.familyName[0]?.toUpperCase() ?? ''}`
  const children = showInitials ? (
    initials
  ) : (
    <img
      src={user.avatar!}
      alt={fullName(user)}
      onError={() => {
        setShowInitials(true)
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
