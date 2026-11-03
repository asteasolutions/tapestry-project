import { Text } from 'tapestry-core-client/src/components/lib/text'
import { ABOUT_PAGE_TEXT } from '../../pages-text'
import styles from './styles.module.css'
import QuoteBlob from '../../../assets/images/about-page/quote-blob.svg'
import QuoteBlobMobile from '../../../assets/images/about-page/quote-blob-mobile.svg'
import McLuhan from '../../../assets/images/about-page/McLuhan.png'
import { ConcreteWall, PositionedCircle } from '../../../components/positioned-component'
import { Breakpoint, useResponsive } from '../../../providers/responsive-provider'

export function AboutSection() {
  const {
    title,
    subtitle,
    content,
    subsections: { subtitleQuote, choice },
  } = ABOUT_PAGE_TEXT.about

  const breakpoint = useResponsive()
  const LGOrLess = breakpoint <= Breakpoint.LG
  const SMOrLess = breakpoint <= Breakpoint.SM

  return (
    <div className={styles.root}>
      <div className={styles.yellowPart}>
        <ConcreteWall width={400} height={300} top={40} left={100} style={{ opacity: '25%' }} />
        <ConcreteWall width={490} height={200} bottom={160} right={0} style={{ opacity: '15%' }} />
        {LGOrLess ? (
          <>
            <PositionedCircle
              diameter={60}
              top={65}
              right={46}
              backgroundColor="var(--color-section-blue)"
            />
            <PositionedCircle
              diameter={65}
              top={65}
              right={-29}
              backgroundColor="var(--color-section-red)"
            />
          </>
        ) : (
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
          <img
            src={SMOrLess ? QuoteBlobMobile : QuoteBlob}
            className={styles.subtitleQuoteBlob}
            draggable={false}
          />
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
              {choice.subtitle}
            </Text>
            <div className={styles.mcLuhan}>
              <img src={McLuhan} className={styles.mcLuhanImage} draggable={false} />
              <Text variant="bodySm">Marshall McLuhan</Text>
            </div>
          </>
        )}
        {!LGOrLess && (
          <div className={styles.content}>
            <Text component="div" variant="bodySm" className={styles.contentText}>
              {content}
            </Text>
            <div className={styles.choiceTitles}>
              <div>
                <Text component="div" variant="h6">
                  {choice.title}
                </Text>
                <Text component="div" variant="bodySm" className={styles.choiceQuoteText}>
                  {choice.subtitle}
                </Text>
              </div>
              <div className={styles.choiceQuoteBlocks}>
                <div className={styles.choiceQuoteLine} />
                <div className={styles.mcLuhan}>
                  <img src={McLuhan} className={styles.mcLuhanImage} draggable={false} />
                  <Text variant="bodySm">Marshall McLuhan</Text>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      <div className={styles.whitePart}>
        <div className={styles.choiceContent}>
          <Text component="div" variant="h1" className={styles.bigLetter}>
            {choice.content[0]}
          </Text>
          <Text component="div" variant="bodySm" className={styles.choiceContentText}>
            {choice.content.slice(1)}
          </Text>
        </div>
      </div>
    </div>
  )
}
