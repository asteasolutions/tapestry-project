import { Text } from 'tapestry-core-client/src/components/lib/text'
import { LANDING_PAGE_TEXT } from '../../pages-text'
import TapestriesPresentation from '../../../assets/videos/landing-page/tapestries-presentation.mp4'
import IALogoCircle from '../../../assets/icons/ia-logo-circle-grey.svg'
import OpenverseIcon from '../../../assets/images/landing-page/openverse-icon.png'
import WikipediaIcon from '../../../assets/images/landing-page/wikipedia-icon.png'
import IIIFIcon from '../../../assets/images/landing-page/iiif-icon.png'
import YoutubeIcon from '../../../assets/images/landing-page/youtube-icon.png'
import styles from './styles.module.css'
import { Link } from 'react-router'
import { dashboardPath } from '../../../utils/paths'
import { ConcreteWall } from '../../../components/positioned-component'
import { Button } from 'tapestry-core-client/src/components/lib/buttons'

export function MediaSection() {
  const {
    media: { title, subtitle, subsections },
  } = LANDING_PAGE_TEXT

  return (
    <div className={styles.root}>
      <ConcreteWall width={400} height={300} top={40} left={100} style={{ opacity: '25%' }} />
      <div className={styles.sectionWrapper}>
        <div className={styles.titles}>
          <Text variant={'h3'} component="div" className={styles.title}>
            {title}
          </Text>
          <Text component="div" variant="bodySm">
            {subtitle}
          </Text>
        </div>
        <div className={styles.buttons}>
          <Button component={Link} variant="mono" to={dashboardPath('home')}>
            Explore the public gallery
          </Button>
          <Button
            component="a"
            variant="secondary"
            href="https://drive.google.com/file/d/110DthOEk0mQJOVXy_UDjUsFWp-0YafMc/view?usp=drive_link"
            target="_blank"
          >
            Watch demo
          </Button>
        </div>
        <div className={styles.content}>
          <div className={styles.subsections}>
            {subsections.map((subsection, index) => (
              <div className={styles.subsection} key={index}>
                <Text component="div" variant="bodySm" className={styles.subsectionTitle}>
                  {subsection.title}
                </Text>
                <Text component="div" variant="bodySm">
                  {subsection.content}
                </Text>
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
          <video
            src={TapestriesPresentation}
            className={styles.video}
            controls
            autoPlay
            loop
            disablePictureInPicture
            muted
            playsInline
          />
        </div>
      </div>
    </div>
  )
}
