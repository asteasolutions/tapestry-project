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
      <div className={styles.sectionWrapper}>
        <Text variant="h3" className={styles.title} component="div">
          {title}
        </Text>
        <Text variant="bodySm" component="div" className={styles.subtitle}>
          {subtitle}
        </Text>
        <div className={styles.usageGrid}>
          {subsections.map((subsection, index) => (
            <div className={styles.usageGridColumn} key={index}>
              <Text className={styles.usageTitle}>{subsection.title}</Text>
              <img src={usagesImages[index]} draggable={false} className={styles.usageImage} />
              <div>
                <Text component="div" variant="bodySm" className={styles.usageSubtitle}>
                  {subsection.subtitle}
                </Text>
                <Text component="div" variant="bodySm">
                  {subsection.content}
                </Text>
              </div>
            </div>
          ))}
        </div>
        <div className={styles.reachOutSection}>
          <Text variant="h6">{content}</Text>
          <Button
            className={styles.reachOutButton}
            variant="mono"
            component="a"
            href="mailto:tapestries@awmt.org"
            target="_blank"
          >
            Reach out
          </Button>
        </div>
      </div>
    </div>
  )
}
