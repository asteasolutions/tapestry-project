import { TableOfContent, TocEntry as TocEntryModel } from '@asteasolutions/epub-reader'
import { useState } from 'react'
import { IconButton, MenuItemButton } from '../../../lib/buttons/index'
import { Modal } from '../../../lib/modal/index'

interface ToCButtonProps {
  onClick: () => unknown
  onSelected: (href: string) => unknown
  toc: TableOfContent
}

export function ToCButton({ onClick, onSelected, toc }: ToCButtonProps) {
  const [showToc, setShowToc] = useState(false)

  return (
    <>
      <IconButton
        icon="toc"
        aria-label="Table of contents"
        onClick={() => {
          onClick()
          setShowToc(true)
        }}
      />
      {showToc && (
        <ToCModal
          toc={toc}
          onClose={() => setShowToc(false)}
          onClick={(href) => {
            setShowToc(false)
            onSelected(href)
          }}
        />
      )}
    </>
  )
}

interface TocEntryProps {
  entry: TocEntryModel
  onClick: (href: string) => unknown
  indent?: number
}
function TocEntry({ entry, onClick, indent = 0 }: TocEntryProps) {
  const href = entry.href
  return (
    <>
      {href ? (
        <MenuItemButton onClick={() => onClick(href)}>{entry.title}</MenuItemButton>
      ) : (
        <span>{entry.title}</span>
      )}
      {entry.children.length > 0 && (
        <div style={{ marginLeft: `${(indent + 1) * 20}px` }}>
          {entry.children.map((e) => (
            <TocEntry key={e.tocIndex} entry={e} onClick={onClick} indent={indent + 1} />
          ))}
        </div>
      )}
    </>
  )
}
interface ToCModalProps {
  toc: TableOfContent
  onClose: () => unknown
  onClick: (href: string) => unknown
}
function ToCModal({ toc, onClose, onClick }: ToCModalProps) {
  return (
    <Modal onClose={onClose}>
      <div>
        {toc.map((e) => (
          <TocEntry key={e.tocIndex} entry={e} onClick={onClick} />
        ))}
      </div>
    </Modal>
  )
}
