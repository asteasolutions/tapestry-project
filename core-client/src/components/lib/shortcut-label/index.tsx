import { Text } from '../text/index'

interface ShortcutLabelProps {
  text: string
  children: string
}

export function ShortcutLabel({ text, children }: ShortcutLabelProps) {
  return (
    <div style={{ whiteSpace: 'nowrap' }}>
      <Text variant="bodyXs">{text}</Text>
      <Text
        variant="bodyXs"
        style={{
          backgroundColor: 'var(--theme-background-secondary-inverse)',
          borderRadius: '2px',
          padding: '1px 7px',
          marginLeft: '10px',
        }}
      >
        {children}
      </Text>
    </div>
  )
}
