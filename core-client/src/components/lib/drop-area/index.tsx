import clsx from 'clsx'
import { DragEvent, PropsWithChildren, useState } from 'react'
import { Icon } from '../icon/index'
import { Text } from '../text/index'
import ImportGIF from '../../../assets/gifs/import.gif'
import styles from './styles.module.css'
import { PropsWithStyle } from '..'
import { Button, ButtonProps } from '../buttons'

interface DropAreaProps extends PropsWithStyle<PropsWithChildren, 'root' | 'dropHint'> {
  allowDrop: (items: DataTransferItem[]) => boolean
  onDrop: (event: DragEvent<HTMLDivElement>) => unknown
  onClick?: ButtonProps['onClick']
  title?: string
  subtitle?: string
  disabled?: boolean
  alwaysVisible?: boolean
}

export function DropArea({
  children,
  allowDrop,
  onDrop,
  onClick,
  title,
  subtitle,
  style,
  classes,
  disabled,
  alwaysVisible,
}: DropAreaProps) {
  const [isDragging, setIsDragging] = useState(false)

  return (
    <div
      className={clsx(styles.root, classes?.root, {
        [styles.visible]: isDragging || alwaysVisible,
      })}
      style={style}
      onDrop={(e) => {
        e.preventDefault()
        onDrop(e)
        setIsDragging(false)
      }}
      onDragOver={(e) => {
        if (disabled) {
          return
        }
        setIsDragging(allowDrop(Array.from(e.dataTransfer.items)))
        e.preventDefault()
      }}
      onDragLeave={(e) => {
        /* relatedTarget denotes the new EventTarget the pointer entered.
             currentTarget is the element the handler is attached to.
             DragLeave is also fired when entering and exiting child elements,
             with target set to the current element and the child element respectively.
             We need to filter out these cases.
          */
        if (
          e.relatedTarget === null ||
          (e.relatedTarget instanceof HTMLElement && !e.currentTarget.contains(e.relatedTarget))
        ) {
          setIsDragging(false)
        }
      }}
    >
      {children}
      <div className={styles.overlay}>
        <Button
          variant="clear"
          className={clsx(styles.dropHint, { [styles.dragging]: isDragging }, classes?.dropHint)}
          onClick={onClick}
        >
          {isDragging ? (
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
        </Button>
      </div>
    </div>
  )
}
