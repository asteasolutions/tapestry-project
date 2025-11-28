import clsx from 'clsx'
import styles from './styles.module.css'

interface SkeletonLoaderProps {
  className?: string
}

export function SkeletonLoader({ className }: SkeletonLoaderProps) {
  return (
    <div className={clsx(styles.root, className)}>
      <div className={styles.image} />
      <div className={styles.title} />
      <div className={styles.subTitle} />
    </div>
  )
}
