import { Text } from 'tapestry-core-client/src/components/lib/text'
import { ABOUT_PAGE_TEXT } from '../../pages-text'
import styles from './styles.module.css'

export function TeamSection() {
  const { title, subtitle, subsections } = ABOUT_PAGE_TEXT.team

  return (
    <div className={styles.root}>
      <Text component="div" variant="h3" className={styles.title}>
        {title}
      </Text>
      <Text component="div" variant="bodySm" className={styles.subtitle}>
        {subtitle}
      </Text>
      <div className={styles.subsectionsContainer}>
        {subsections.map((subsection, index) => (
          <div key={index}>
            <Text component="div" variant="bodySm" className={styles.subsectionTitle}>
              {subsection.title}
            </Text>
            <Text component="div" variant="bodySm">
              {subsection.content}
            </Text>
          </div>
        ))}
      </div>
    </div>
  )
}
