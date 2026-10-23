import { Text } from 'tapestry-core-client/src/components/lib/text'
import { ABOUT_PAGE_TEXT } from '../../pages-text'
import BobArchive from '../../../assets/images/about-page/bob-archive.webp'
import styles from './styles.module.css'
import { ConcreteWall } from '../../../components/positioned-component'
import { Breakpoint, useResponsive } from '../../../providers/responsive-provider'

function ImageContent() {
  return (
    <>
      <div className={styles.imageContainer}>
        <img src={BobArchive} className={styles.imageElement} draggable={false} />
        <ConcreteWall width='10%' height='66%' top={25} left={-35} rotation={2} />
        <ConcreteWall width='50%' height='13%' top={10} right={-75} rotation={35} />
      </div>
      <Text component="div" variant="bodySm" className={styles.imageDescription}>
        A portion of Bob Stein's collection.
      </Text>
    </>
  )
}

export function HistorySection() {
  const { title, content } = ABOUT_PAGE_TEXT.history

  const LGOrLess = useResponsive() <= Breakpoint.LG

  return (
    <div className={styles.root}>
      <div className={styles.content}>
        {LGOrLess ? (
          <>
            <Text variant="h3" className={styles.title} component="div">
              {title}
            </Text>
            <Text component="div" variant="bodySm" className={styles.contentText}>
              {content[0]}
            </Text>
            <ImageContent />
            <Text component="div" variant="bodySm" className={styles.contentText}>
              {content[1]}
            </Text>
          </>
        ) : (
          <>
            <div>
              <Text variant="h3" className={styles.title} component="div">
                {title}
              </Text>
              <Text component="div" variant="bodySm" className={styles.contentText}>
                {content[0]}
                <br />
                <br />
                <br />
                {content[1]}
              </Text>
            </div>
            <div className={styles.imageColumn}>
              <ImageContent />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
