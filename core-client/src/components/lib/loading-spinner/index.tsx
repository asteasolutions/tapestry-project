import clsx from 'clsx'
import styles from './styles.module.css'
import { CSSProperties } from 'react'
import LoadingSpinnerGIF from '../../../assets/gifs/loading-spinner.gif'

interface LoadingSpinnerProps {
  className?: string
  size?: string
  style?: CSSProperties
}

export function LoadingSpinner({ className, size, style }: LoadingSpinnerProps) {
  return (
    <img
      className={clsx(className, styles.spinner)}
      src={LoadingSpinnerGIF}
      style={
        {
          '--size': size,
          ...style,
        } as CSSProperties
      }
    />
  )
}
