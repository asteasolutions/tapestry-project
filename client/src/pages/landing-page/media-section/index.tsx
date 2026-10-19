import { Text } from 'tapestry-core-client/src/components/lib/text'
import { LANDING_PAGE_TEXT } from '../../pages-text'
import TapestriesPresentation from '../../../assets/videos/landing-page/tapestries-presentation.mp4'
import IALogoCircle from '../../../assets/icons/ia-logo-circle-grey.svg'
import OpenverseIcon from '../../../assets/images/landing-page/openverse-icon.png'
import WikipediaIcon from '../../../assets/images/landing-page/wikipedia-icon.png'
import IIIFIcon from '../../../assets/images/landing-page/iiif-icon.png'
import YoutubeIcon from '../../../assets/images/landing-page/youtube-icon.png'
import AccentBlob from '../../../assets/images/landing-page/accent-blob.svg'
import styles from './styles.module.css'
import { Link } from 'react-router'
import { dashboardPath } from '../../../utils/paths'
import { ConcreteWall, PositionedMask } from '../../../components/positioned-component'
import { Button } from 'tapestry-core-client/src/components/lib/buttons'
import { useRef } from 'react'

export function MediaSection() {
  const {
    media: { title, subtitle, subsections },
    ceciliaQuote,
  } = LANDING_PAGE_TEXT

  const sectionRef = useRef<HTMLDivElement>(null)

  return (
    <div className={styles.root} ref={sectionRef}>
      <div className={styles.learnMoreContainer}>
        <Button
          icon="keyboard_double_arrow_down"
          variant="secondary"
          aria-label="Learn more"
          className={styles.learnMoreButton}
          onClick={() => sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
        />
        <Text component="div" variant="h6" className={styles.learnMoreText}>
          Learn more
        </Text>
      </div>
      <ConcreteWall width={400} height={300} top={40} left={100} style={{ opacity: '25%' }} />
      <div className={styles.sectionWrapper}>
        <div className={styles.titles}>
          <Text variant="h3" component="div" className={styles.title}>
            {title}
          </Text>
          <Text component="div">{subtitle}</Text>
        </div>
        <div className={styles.content}>
          <div className={styles.subsections}>
            {subsections.map((subsection, index) => (
              <div className={styles.subsection} key={index}>
                <Text component="div" className={styles.subsectionTitle}>
                  {subsection.title}
                </Text>
                <Text component="div">{subsection.content}</Text>
                {index === 0 && (
                  <div className={styles.mediaIcons}>
                    <img src={OpenverseIcon} className={styles.mediaIcon} />
                    <img src={IALogoCircle} className={styles.mediaIcon} />
                    <img src={WikipediaIcon} className={styles.mediaIcon} />
                    <img src={IIIFIcon} className={styles.mediaIcon} />
                    <img src={YoutubeIcon} className={styles.mediaIcon} />
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className={styles.videoSection}>
            <video
              src={TapestriesPresentation}
              className={styles.video}
              controls={true}
              autoPlay={true}
              loop={true}
              disablePictureInPicture
            />
            <Button
              component={Link}
              className={styles.link}
              variant="mono"
              to={dashboardPath('home')}
            >
              Explore the public gallery
            </Button>
          </div>
        </div>
      </div>
      <div className={styles.quote}>
        <PositionedMask
          src={AccentBlob}
          left={-85}
          top={-60}
          width={670}
          height={200}
          rotation={-4.5}
          backgroundColor="var(--color-section-red)"
        />
        <PositionedMask
          src={AccentBlob}
          left={-70}
          top={-50}
          width={670}
          height={200}
          rotation={0.2}
          backgroundColor="var(--color-cream-yellow)"
        />
        <Text component="div" variant="bodyXs" className={styles.quoteText}>
          {ceciliaQuote.content}
        </Text>
      </div>
    </div>
  )
}
