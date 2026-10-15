import { Text } from 'tapestry-core-client/src/components/lib/text'
import styles from './styles.module.css'
import OpenSourceIcon from '../../../assets/images/about-page/open-source.webp'
import PortableIcon from '../../../assets/images/about-page/portable.webp'
import CommunityIcon from '../../../assets/images/about-page/community.webp'
import AIIcon from '../../../assets/images/about-page/ai.webp'
import { ABOUT_PAGE_TEXT } from '../../pages-text'

export function PrinciplesSection() {
  const { title, subsections } = ABOUT_PAGE_TEXT.principles

  const PRINCIPLE_IMAGE = [OpenSourceIcon, PortableIcon, CommunityIcon, AIIcon]
  const PRINCIPLE_BACKGROUND_COLOR = [
    'var(--color-section-red)',
    'var(--color-section-blue)',
    'var(--color-section-yellow)',
    'var(--color-light-gray)',
  ]
  const PRINCIPLE_INDEX_COLOR = ['black', 'white', 'black', 'black']

  return (
    <div className={styles.root}>
      <div className={styles.sectionWrapper}>
        <Text component="div" variant="h3" className={styles.title}>
          {title}
        </Text>
        {subsections.map((subsection, index) => (
          <div className={styles.principleGrid} key={index}>
            <Text
              component="div"
              variant="h6"
              className={styles.principleIndex}
              style={{
                backgroundColor: PRINCIPLE_BACKGROUND_COLOR[index],
                color: PRINCIPLE_INDEX_COLOR[index],
              }}
            >
              {(index + 1).toString().padStart(2, '0')}
            </Text>
            <div className={styles.principleTitle}>
              <Text component="div" variant="h3">
                {subsection.title}
              </Text>
              <div
                className={styles.titleDivider}
                style={{
                  backgroundColor: PRINCIPLE_BACKGROUND_COLOR.at(
                    (index + 1) % PRINCIPLE_BACKGROUND_COLOR.length,
                  ),
                }}
              />
            </div>
            <Text component="div" variant="bodySm" className={styles.principleContent}>
              {subsection.content}
            </Text>
            <img src={PRINCIPLE_IMAGE[index]} className={styles.principleIcon} draggable="false" />
          </div>
        ))}
      </div>
    </div>
  )
}
