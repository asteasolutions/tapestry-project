import styles from './styles.module.css'
import LoadingAnimationSource from '../../assets/gifs/loading-dots.gif'

export function LoadingDots() {
  return (
    <div className="loading-dots">
      <img src={LoadingAnimationSource} className={styles.loadingAnimation} />
    </div>
  )
}
