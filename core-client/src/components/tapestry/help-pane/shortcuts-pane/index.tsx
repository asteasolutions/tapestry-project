import { ReactNode, useState } from 'react'
import { deepFreeze } from 'tapestry-core/src/utils'
import { Icon } from '../../../../../src/components/lib/icon/index'
import { SearchInput } from '../../../../../src/components/lib/search-input/index'
import { Text } from '../../../../../src/components/lib/text/index'
import { shortcutLabel } from '../../../../../src/lib/keyboard-event'
import { isMac } from '../../../../../src/lib/user-agent'
import styles from './styles.module.css'

export enum CustomKeys {
  Arrows = 'arrows',
  Pan = 'pan',
  Meta = 'meta',
}

interface Action {
  name: string
  shortcut: string
}

export type ActionsSection = {
  title: string
  actions: Action[]
}

export const DEFAULT_ACTIONS: ActionsSection[] = deepFreeze([
  {
    title: 'General shortcuts',
    actions: [
      {
        name: 'Search objects',
        shortcut: '/',
      },
    ],
  },
  {
    title: 'Navigation',
    actions: [
      { name: 'Move around', shortcut: CustomKeys.Arrows },
      { name: 'Move fast', shortcut: `shift + ${CustomKeys.Arrows}` },
      { name: 'Move faster', shortcut: `meta + shift + ${CustomKeys.Arrows}` },
      { name: 'Pan the canvas', shortcut: CustomKeys.Pan },
      { name: 'Zoom in', shortcut: '+' },
      { name: 'Zoom out', shortcut: '-' },
      { name: 'Zoom to fit', shortcut: 'F' },
      { name: 'Reset viewport', shortcut: 'meta + shift + 0' },
    ],
  },
  {
    title: 'Item shortcuts',
    actions: [
      {
        name: 'Select multiple items',
        shortcut: 'Shift',
      },
      {
        name: 'Focus item(s)',
        shortcut: 'F',
      },
      {
        name: 'Deselect item(s)',
        shortcut: 'Esc',
      },
    ],
  },
])

function filterActions(actions: ActionsSection[], searchTerm: string): ActionsSection[] {
  const shouldDisplay = (action: Action) =>
    action.name.toLowerCase().includes(searchTerm.toLowerCase())

  return actions
    .filter((section) => section.actions.some((action) => shouldDisplay(action)))
    .map((section) => ({
      ...section,
      actions: section.actions.filter((action) => shouldDisplay(action)),
    }))
}

interface ShortcutProps {
  keys: string[]
}

const customKeysMap: Record<string, ReactNode> = {
  arrows: [
    <Icon className={styles.icon} icon="keyboard_arrow_left" />,
    <Icon className={styles.icon} icon="keyboard_arrow_right" />,
  ],
  pan: ['Space', 'Drag'],
  meta: [isMac ? '⌘' : 'Ctrl'],
} satisfies Record<CustomKeys, ReactNode[]>

function Shortcut({ keys }: ShortcutProps) {
  const displayedKeys = keys.flatMap((key) => customKeysMap[key] ?? key)

  return (
    <div className={styles.shortcut}>
      {displayedKeys.map((key, index) => (
        <Text component="div" className={styles.key} key={index} variant="bodySm">
          {key}
        </Text>
      ))}
    </div>
  )
}
interface ActionProps {
  action: Action
}

function Action({ action }: ActionProps) {
  return (
    <div className={styles.action}>
      <Text component="div" variant="bodySm">
        {action.name}
      </Text>
      <div>
        {shortcutLabel(action.shortcut)
          .split(', ')
          .map((shortcut) => (
            <Shortcut keys={shortcut.split(' + ')} key={shortcut} />
          ))}
      </div>
    </div>
  )
}

interface ShortcutsPaneProps {
  actions: ActionsSection[]
}

export function ShortcutsPane({ actions }: ShortcutsPaneProps) {
  const [searchTerm, setSearchTerm] = useState('')

  const displayedActions = filterActions(actions, searchTerm)

  return (
    <div className={styles.root}>
      <SearchInput
        onSearch={(term) => setSearchTerm(term)}
        placeholder="Search for action"
        className={styles.searchInput}
      />
      {displayedActions.map((section) => (
        <div className={styles.section} key={section.title}>
          <Text component="div" className={styles.sectionTitle}>
            {section.title}
          </Text>
          {section.actions.map((action) => (
            <Action action={action} key={action.name} />
          ))}
        </div>
      ))}
    </div>
  )
}
