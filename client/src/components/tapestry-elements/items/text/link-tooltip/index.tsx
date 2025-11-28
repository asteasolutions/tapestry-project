import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { Button } from 'tapestry-core-client/src/components/lib/buttons/index'
import { Icon } from 'tapestry-core-client/src/components/lib/icon/index'
import { Input } from 'tapestry-core-client/src/components/lib/input/index'
import { Text } from 'tapestry-core-client/src/components/lib/text/index'
import { elementIdFromLink } from 'tapestry-core-client/src/components/tapestry/items/text/viewer'
import { DOM_CONTAINER_CLASS } from 'tapestry-core-client/src/stage/utils'
import { isHTTPURL } from 'tapestry-core/src/utils'
import { useTapestryData } from '../../../../../pages/tapestry/tapestry-providers'
import styles from './styles.module.css'

function LinkElement({ link }: { link: string }) {
  const { items, groups } = useTapestryData(['items', 'groups'])
  const id = elementIdFromLink(link, items, groups)

  return id ? (
    <Link to={{ search: new URL(link).search.slice(1) }} state={{ timestamp: Date.now() }}>
      {link}
    </Link>
  ) : (
    <a target="_blank" href={link}>
      {link}
    </a>
  )
}

export interface LinkTooltipProps {
  content?: string
  element: HTMLElement
  onRemove: () => unknown
  onApply: (link: string, text?: string) => unknown
}

export function LinkTooltip({ content, element, onRemove, onApply }: LinkTooltipProps) {
  const scale = useTapestryData('viewport.transform.scale')

  const link = element.tagName === 'A' ? (element as HTMLAnchorElement).href : undefined

  const [mode, setMode] = useState<'view' | 'edit'>(link ? 'view' : 'edit')

  const [href, setHref] = useState(link ?? '')
  const [text, setText] = useState(content ?? '')

  const style = useMemo(() => {
    const itemRect = element.closest(`.${DOM_CONTAINER_CLASS}`)!.getBoundingClientRect()
    const elementRect = element.getBoundingClientRect()
    return {
      top: `${(elementRect.bottom - itemRect.top) / scale}px`,
      left: `${(elementRect.left - itemRect.left) / scale}px`,
      transform: `scale(${1 / scale})`,
      transformOrigin: 'left top',
    }
  }, [element, scale])

  return (
    <div className={styles.root} style={style} data-captures-pointer-events>
      {mode === 'view' ? (
        <div className={styles.form}>
          <Text variant="bodyXs" className={styles.link}>
            <Icon icon="open_in_new" />
            <Text variant="bodyXs" style={{ color: 'var(--theme-text-primary)' }}>
              Open
            </Text>
            <LinkElement link={link!} />{' '}
          </Text>
          <Button variant="secondary" size="small" onClick={() => onRemove()}>
            <Icon icon="link_off" />
            Remove
          </Button>
          <Button variant="secondary" size="small" onClick={() => setMode('edit')}>
            <Icon icon="edit" />
            Change
          </Button>
        </div>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            onApply(isHTTPURL(href) ? href : `https://${href}`, content === text ? undefined : text)
          }}
          className={styles.form}
        >
          <Input placeholder="Text" value={text} onChange={(e) => setText(e.target.value)} />
          <br />
          <Input
            placeholder="Type or paste a link"
            value={href}
            onChange={(e) => setHref(e.target.value)}
            autoFocus
          />
          <Button
            variant="primary"
            size="small"
            disabled={!href || !(isHTTPURL(href) || isHTTPURL(`https://${href}`)) || !text}
          >
            Apply
          </Button>
        </form>
      )}
    </div>
  )
}
