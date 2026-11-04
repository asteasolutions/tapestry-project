import { Link } from 'react-router'
import {
  MenuItemButton,
  MenuItemButtonProps,
} from 'tapestry-core-client/src/components/lib/buttons/index'
import styles from './styles.module.css'

type SectionButtons<S extends string> = Record<
  S,
  Pick<MenuItemButtonProps<typeof Link>, 'icon' | 'to' | 'children'>
>

interface SectionListProps<S extends string> {
  activeSection: S
  buttons: SectionButtons<S>
}

export function SectionList<S extends string>({ activeSection, buttons }: SectionListProps<S>) {
  const buttonProps = Object.entries(buttons) as [S, SectionButtons<S>[S]][]
  return (
    <div className={styles.root}>
      {buttonProps.map(([section, props]) => (
        <MenuItemButton
          key={section}
          {...props}
          component={Link}
          className={styles.menuButton}
          isActive={section === activeSection}
        />
      ))}
    </div>
  )
}
