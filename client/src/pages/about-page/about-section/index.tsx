import { Text } from 'tapestry-core-client/src/components/lib/text'
import { ABOUT_PAGE_TEXT } from '../../pages-text'
import styles from './styles.module.css'
import LongBlob from '../../../assets/images/about-page/long-blob.svg'
import AboutMobileBlob from '../../../assets/images/about-page/about-mobile-blob.svg'
import McLuhan from '../../../assets/images/about-page/McLuhan.png'
import {
  ConcreteWall,
  PositionedCircle,
  PositionedMask,
} from '../../../components/positioned-component'
import { Breakpoint, useResponsive } from '../../../providers/responsive-provider'

export function AboutSection() {
  const {
    title,
    subtitle,
    content,
    subsections: { subtitleQuote, choice },
  } = ABOUT_PAGE_TEXT.about

  const LGOrLess = useResponsive() <= Breakpoint.LG

  return (
    <div className={styles.root}>
      <div className={styles.yellowPart}>
        <ConcreteWall width={400} height={300} top={40} left={100} style={{ opacity: '25%' }} />
        <ConcreteWall width={490} height={200} bottom={160} right={0} style={{ opacity: '15%' }} />
        {!LGOrLess && (
          <>
            <PositionedCircle
              diameter={120}
              top={80}
              right={120}
              backgroundColor="var(--color-section-blue)"
            />
            <PositionedCircle
              diameter={130}
              top={78}
              right={-50}
              backgroundColor="var(--color-section-red)"
            />
          </>
        )}
        <Text component="div" variant="h1" className={styles.title}>
          {title}
        </Text>
        <div className={styles.subtitleQuote}>
          {LGOrLess ? (
            <PositionedMask
              src={AboutMobileBlob}
              backgroundColor="var(--color-cream-yellow)"
              top={-10}
              left={-10}
              bottom={-20}
              right={-20}
            />
          ) : (
            <>
              <PositionedMask
                src={LongBlob}
                backgroundColor="var(--color-section-blue)"
                width={725}
                height={145}
                top={-20}
                left={-25}
              />
              <PositionedMask
                src={LongBlob}
                backgroundColor="var(--color-cream-yellow)"
                width={725}
                height={145}
                top={-35}
                left={-40}
              />
            </>
          )}
          <Text component="div" variant="bodyXs" className={styles.subtitleQuoteText}>
            {subtitleQuote.content}
          </Text>
        </div>
        <Text component="div" variant="h2" className={styles.subtitle}>
          {subtitle}
        </Text>
        {LGOrLess && (
          <>
            <Text component="div" variant="bodySm">
              {content}
            </Text>
            <Text component="div" variant="h6" className={styles.choiceTitle}>
              {choice.title}
            </Text>
            <Text variant="bodySm" className={styles.choiceSubtitle} component="div">
              {choice.subtitle} - Marshall McLuhan
            </Text>
            <div>
              <Text variant="h1" className={styles.bigLetter}>
                {choice.content[0]}
              </Text>
              <Text variant="bodySm">{choice.content.slice(1)}</Text>
            </div>
          </>
        )}
        {!LGOrLess && (
          <div className={styles.content}>
            <Text component="div" variant="bodySm" className={styles.contentText}>
              {content}
            </Text>
            <div className={styles.choiceTitles}>
              <Text component="div" variant="h6">
                {choice.title}
              </Text>
              <div className={styles.choiceQuote}>
                <Text variant="bodySm" className={styles.choiceQuoteText}>
                  {choice.subtitle}
                </Text>
                <div className={styles.choiceQuoteBlocks}>
                  <div className={styles.choiceQuoteLine} />
                  <div>
                    <img src={McLuhan} className={styles.mcLuhanImage} draggable={false} />
                    <Text variant="bodySm">Marshall McLuhan</Text>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      {!LGOrLess && (
        <div className={styles.whitePart}>
          <div className={styles.choiceContentContainer}>
            <div className={styles.choiceContentText}>
              <Text component="div" variant="h1" className={styles.bigLetter}>
                {choice.content[0]}
              </Text>
              <Text variant="bodySm">{choice.content.slice(1)}</Text>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
