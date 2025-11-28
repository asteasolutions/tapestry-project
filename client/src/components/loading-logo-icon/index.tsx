import clsx from 'clsx'
import LoadingGIF from '../../assets/gifs/loading-logo-icon.gif'
import styles from './styles.module.css'

interface LoadingLogoIconProps {
  className?: string
}

export function LoadingLogoIcon({ className }: LoadingLogoIconProps) {
  return (
    <div className={clsx(styles.root, className)}>
      <img className={styles.icon} src={LoadingGIF} />
    </div>
  )
}
