import { Text } from 'tapestry-core-client/src/components/lib/text'
import styles from './styles.module.css'
import OpenSourceIcon from '../../../assets/images/about-page/open-source.webp'
import PortableIcon from '../../../assets/images/about-page/portable.webp'
import CommunityIcon from '../../../assets/images/about-page/community.webp'
import AIIcon from '../../../assets/images/about-page/ai.webp'
import { ABOUT_PAGE_TEXT } from '../../pages-text'
import { Breakpoint, useResponsive } from '../../../providers/responsive-provider'

const PRINCIPLES_PROPS: { image: string; backgroundColor: string; indexColor?: string }[] = [
  {
    image: OpenSourceIcon,
    backgroundColor: 'var(--color-section-red)',
  },
  {
    image: PortableIcon,
    backgroundColor: 'var(--color-section-blue)',
    indexColor: 'white',
  },
  {
    image: CommunityIcon,
    backgroundColor: 'var(--color-section-yellow)',
  },
  {
    image: AIIcon,
    backgroundColor: 'var(--color-light-gray)',
  },
]

export function PrinciplesSection() {
  const { title, subsections } = ABOUT_PAGE_TEXT.principles
  const MDOrLess = useResponsive() <= Breakpoint.MD

  return (
    <div className={styles.root}>
      <div className={styles.sectionWrapper}>
        <Text component="div" variant="h3" className={styles.title}>
          {title}
        </Text>
        {subsections.map((subsection, index) => {
          const { backgroundColor, image, indexColor } = PRINCIPLES_PROPS[index]
          return (
            <div className={styles.principleGrid} key={index}>
              <Text
                component="div"
                variant="h6"
                className={styles.principleIndex}
                style={{
                  backgroundColor,
                  color: indexColor,
                }}
              >
                {(index + 1).toString().padStart(2, '0')}
              </Text>
              <div className={styles.principleTitle}>
                <Text component="div" variant={MDOrLess ? 'h6' : 'h3'}>
                  {subsection.title}
                </Text>
                <div
                  className={styles.titleDivider}
                  style={{
                    backgroundColor:
                      PRINCIPLES_PROPS[(index + 1) % PRINCIPLES_PROPS.length].backgroundColor,
                  }}
                />
              </div>
              <Text component="div" variant="bodySm" className={styles.principleContent}>
                {subsection.content}
              </Text>
              {!MDOrLess && <img src={image} className={styles.principleIcon} draggable="false" />}
            </div>
          )
        })}
      </div>
    </div>
  )
}
