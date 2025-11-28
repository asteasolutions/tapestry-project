import LoadingLogoGif from '../../assets/gifs/loading-logo.gif'
import styles from './styles.module.css'

export function LoadingLogo() {
  return (
    <div className={styles.loadingContainer}>
      <img src={LoadingLogoGif} alt="loading" />
    </div>
  )
}
