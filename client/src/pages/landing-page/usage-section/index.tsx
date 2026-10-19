import { Text } from 'tapestry-core-client/src/components/lib/text'
import AccentBlob from '../../../assets/images/landing-page/accent-blob.svg'
import MobileBlobYellow from '../../../assets/images/landing-page/mobile-blob-yellow.svg'
import MobileBlobRed from '../../../assets/images/landing-page/mobile-blob-red.svg'
import ReadingRoom from '../../../assets/images/landing-page/readingroom.webp'
import Archives from '../../../assets/images/landing-page/archives.webp'
import BlackCanvas from '../../../assets/images/landing-page/blackcanvas.webp'
import { LANDING_PAGE_TEXT } from '../../pages-text'
import styles from './styles.module.css'
import { Button } from 'tapestry-core-client/src/components/lib/buttons'
import { PositionedMask } from '../../../components/positioned-component'
import { Breakpoint, useResponsive } from '../../../providers/responsive-provider'

export function UsageSection() {
  const {
    usage: { title, subtitle, content, subsections },
    ceciliaQuote,
  } = LANDING_PAGE_TEXT

  const usagesImages = [ReadingRoom, Archives, BlackCanvas]

  const SMOrLess = useResponsive() <= Breakpoint.SM

  return (
    <div className={styles.root}>
      <div className={styles.quote}>
        {SMOrLess ? (
          <>
            <PositionedMask
              src={MobileBlobRed}
              left={-15}
              top={-45}
              width={310}
              height={235}
              backgroundColor="var(--color-section-red)"
            />
            <PositionedMask
              src={MobileBlobYellow}
              left={-10}
              top={-40}
              width={310}
              height={265}
              backgroundColor="var(--color-cream-yellow)"
            />
          </>
        ) : (
          <>
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
          </>
        )}
        <Text component="div" variant="bodyXs" className={styles.quoteText}>
          {ceciliaQuote.content}
        </Text>
      </div>
      <div className={styles.textWrapper}>
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
