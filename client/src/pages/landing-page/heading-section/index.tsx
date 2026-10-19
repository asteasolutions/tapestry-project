import styles from './styles.module.css'
import { Text } from 'tapestry-core-client/src/components/lib/text'
import { LANDING_PAGE_TEXT } from '../../pages-text'
import LeftHandWithThread from '../../../assets/images/landing-page/left-hand-thread.webp'
import RightHandWithThread from '../../../assets/images/landing-page/right-hand-thread.webp'
import TapestryString from '../../../assets/images/landing-page/tapestry-string.svg'
import Checker from '../../../assets/images/landing-page/checker.png'
import IALogoSmall from '../../../assets/images/landing-page/ia-logo.png'
import AWMTLogo from '../../../assets/images/landing-page/awmt-logo.png'
import WikipediaScreenshot from '../../../assets/images/landing-page/wikipedia-screenshot.png'
import Herkulanisher from '../../../assets/images/landing-page/Herkulaneischer_Meister.png'
import {
  ConcreteWall,
  PositionedCircle,
  PositionedImage,
} from '../../../components/positioned-component'

function PositionedElements() {
  const awmtText = LANDING_PAGE_TEXT.heading.subsections.AWMT.content

  return (
    <>
      <ConcreteWall width={275} height={200} left={350} top={-100} />
      <ConcreteWall width={120} height={165} left={0} top={30} />
      <PositionedImage src={LeftHandWithThread} left={-90} width={450} top={120} rotation={-78.5} />
      <ConcreteWall width={90} height={470} right={75} bottom={125} rotation={-3.5} />
      <ConcreteWall width={220} height={65} left={0} top={410} />
      <ConcreteWall width={470} height={170} right={10} bottom={100} />
      <PositionedImage
        src={RightHandWithThread}
        right={-85}
        width={465}
        bottom={-450}
        rotation={-65.53}
      />
      <div className={styles.stringWrapper}>
        <img src={TapestryString} className={styles.tapestryString} draggable={false} />
        <PositionedImage
          src={WikipediaScreenshot}
          width={72}
          top="32%"
          left="11%"
          style={{ transform: 'translate(-50%, -50%)' }}
        />
        <PositionedCircle
          backgroundColor="var(--color-section-blue)"
          diameter={50}
          right="7%"
          bottom="28%"
          style={{ transform: 'translate(-50%, -50%)' }}
        />
      </div>
      <PositionedImage src={Checker} right={-30} width={100} bottom={320} />
      <PositionedImage src={Herkulanisher} right={216} bottom={220} width={100} />
      <PositionedImage src={IALogoSmall} left={250} bottom={25} width={100} />
      <PositionedCircle
        left={135}
        bottom={15}
        backgroundColor="var(--color-bright-red)"
        diameter={100}
      />
      <PositionedImage src={AWMTLogo} left={120} bottom={12} width={100} />
      <Text variant="bodySm" component="div" className={styles.awmt}>
        {awmtText}
      </Text>
    </>
  )
}

export function HeadingSection() {
  const { title, subtitle, content } = LANDING_PAGE_TEXT.heading
  return (
    <div className={styles.root}>
      <PositionedElements />
      <div className={styles.sectionWrapper}>
        <Text variant="h1" className={styles.heading}>
          {title}
        </Text>
        <Text variant="h6" component="div" className={styles.subheading}>
          {subtitle}
        </Text>
        <div className={styles.content}>
          <Text variant="h5" component="div">
            {content[0]}
          </Text>
          <Text variant="h6" component="div">
            {content[1]}
          </Text>
        </div>
      </div>
    </div>
  )
}
