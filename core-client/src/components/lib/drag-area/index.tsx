import clsx from 'clsx'
import { DragEvent, PropsWithChildren, useState } from 'react'
import { Icon } from '../../../../src/components/lib/icon/index'
import { Text } from '../../../../src/components/lib/text/index'
import ImportGIF from '../../../assets/gifs/import.gif'
import styles from './styles.module.css'

interface DragAreaProps extends PropsWithChildren {
  allowDrop: (items: DataTransferItem[]) => boolean
  onDrop: (event: DragEvent<HTMLDivElement>) => unknown
  title?: string
  subtitle?: string
  classes?: {
    root?: string
    dropArea?: string
  }
  disabled?: boolean
  alwaysVisible?: boolean
}

export function DragArea({
  children,
  allowDrop,
  onDrop,
  title,
  subtitle,
  classes = {},
  disabled,
  alwaysVisible,
}: DragAreaProps) {
  const [visible, setVisible] = useState(alwaysVisible)
  const [dropAreaDragging, setDropAreaDragging] = useState(false)

  return (
    <div
      className={clsx(styles.root, classes.root, { [styles.visible]: visible })}
      onDrop={(e) => {
        e.preventDefault()
        if (!alwaysVisible) {
          setVisible(false)
        }
      }}
      onDragOver={(e) => {
        if (disabled) {
          return
        }
        if (!alwaysVisible) {
          setVisible(allowDrop(Array.from(e.dataTransfer.items)))
        }
        e.preventDefault()
      }}
    >
      <div
        className={styles.dragOverlay}
        onDragLeave={(e) => {
          /* relatedTarget denotes the new EventTarget the pointer entered.
             currentTarget is the element the handler is attatched to.
             DragLeave is also fired when entering and exiting child elements,
             with target set to the current element and the child element respectively.
             We need to filter out these cases.
          */
          if (
            !alwaysVisible &&
            (e.relatedTarget === null ||
              (e.currentTarget === e.target &&
                e.relatedTarget instanceof HTMLElement &&
                !e.currentTarget.contains(e.relatedTarget)))
          ) {
            setVisible(false)
          }
        }}
      >
        <div
          className={clsx(
            styles.dropArea,
            { [styles.dragging]: dropAreaDragging },
            classes.dropArea,
          )}
          onDragOver={(e) => {
            setDropAreaDragging(allowDrop(Array.from(e.dataTransfer.items)))
            e.preventDefault()
          }}
          onDrop={(e) => {
            if (dropAreaDragging) {
              setDropAreaDragging(false)
              e.preventDefault()
              onDrop(e)
            }
          }}
          onDragLeave={() => setDropAreaDragging(false)}
        >
          {dropAreaDragging ? (
            <img src={ImportGIF} className={styles.importGif} />
          ) : (
            <Icon icon="upload_file" className={styles.icon} />
          )}
          {title && (
            <Text variant="h5" className={styles.heading}>
              {title}
            </Text>
          )}
          {subtitle && <Text>{subtitle}</Text>}
        </div>
      </div>
      {children}
    </div>
  )
}
