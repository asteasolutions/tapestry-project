import { Text } from 'tapestry-core-client/src/components/lib/text'
import { ABOUT_PAGE_TEXT } from '../../pages-text'
import BobArchive from '../../../assets/images/about-page/bob-archive.webp'
import styles from './styles.module.css'
import { ConcreteWall } from '../../../components/positioned-component'

export function HistorySection() {
  const { title, content } = ABOUT_PAGE_TEXT.history

  return (
    <div className={styles.root}>
      <ConcreteWall width={230} height={45} top={57} right={10} rotation={30} />
      <div className={styles.content}>
        <div>
          <Text variant="h3" className={styles.title} component="div">
            {title}
          </Text>
          <Text component="div" variant="bodySm" className={styles.contentText}>
            {content}
          </Text>
        </div>
        <div className={styles.imageColumn}>
          <div className={styles.imageContainer}>
            <ConcreteWall width={45} height={230} top={25} left={-35} rotation={2} />
            <img src={BobArchive} className={styles.imageElement} draggable={false} />
          </div>
          <Text component="div" variant="bodySm" className={styles.imageDescription}>
            A portion of Bob Stein's collection.
          </Text>
        </div>
      </div>
    </div>
  )
}
