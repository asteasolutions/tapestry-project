import { Text } from 'tapestry-core-client/src/components/lib/text'
import ReadingRoom from '../../../assets/images/landing-page/readingroom.webp'
import Archives from '../../../assets/images/landing-page/archives.webp'
import BlackCanvas from '../../../assets/images/landing-page/blackcanvas.webp'
import { LANDING_PAGE_TEXT } from '../../pages-text'

import styles from './styles.module.css'
import { Button } from 'tapestry-core-client/src/components/lib/buttons'

export function UsageSection() {
  const { title, subtitle, content, subsections } = LANDING_PAGE_TEXT.usage

  const usagesImages = [ReadingRoom, Archives, BlackCanvas]

  return (
    <div className={styles.root}>
      <Text variant="h3" className={styles.title} component="div">
        {title}
      </Text>
      <Text variant="bodySm" component="div" className={styles.subtitle}>
        {subtitle}
      </Text>
      <div className={styles.usageGrid}>
        {subsections.map((subsection, index) => (
          <div className={styles.usageGridColumn}>
            <Text className={styles.usageTitle}>{subsection.title}</Text>
            <img src={usagesImages[index]} draggable={false} className={styles.usageImage} />
            <Text variant="bodySm">{subsection.content}</Text>
          </div>
        ))}
      </div>
      <Text variant="h6">{content}</Text>
      <Button className={styles.reachOut} variant="mono">
        Reach out
      </Button>
    </div>
  )
}
