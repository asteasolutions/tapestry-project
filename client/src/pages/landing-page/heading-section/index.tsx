import styles from './styles.module.css'
import { Text } from 'tapestry-core-client/src/components/lib/text'
import { LANDING_PAGE_TEXT } from '../../pages-text'
import LeftHandWithThread from '../../../assets/images/landing-page/left-hand-thread.webp'
import RightHandWithThread from '../../../assets/images/landing-page/right-hand-thread.webp'
import TapestryString from '../../../assets/images/landing-page/tapestry-string.svg'
import MobileHands from '../../../assets/images/landing-page/mobile-hands.webp'
import Checker from '../../../assets/images/landing-page/checker.png'
import IALogoSmall from '../../../assets/images/landing-page/ia-logo.png'
import AWMTLogo from '../../../assets/images/landing-page/awmt-logo.png'
import WikipediaScreenshot from '../../../assets/images/landing-page/wikipedia-screenshot.png'
import Herkulanisher from '../../../assets/images/landing-page/Herkulaneischer_Meister.png'
import {
  ConcreteWall,
  PositionedCircle,
  PositionedComponent,
  PositionedImage,
} from '../../../components/positioned-component'
import { Breakpoint, useResponsive } from '../../../providers/responsive-provider'

function PositionedElementsDesktop() {
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
    </>
  )
}

function AWMTCircles() {
  return (
    <div className={styles.awmtCircles}>
      <PositionedCircle
        left={15}
        bottom={5}
        backgroundColor="var(--color-bright-red)"
        diameter={100}
      />
      <PositionedComponent
        component="a"
        left={0}
        bottom={0}
        width={100}
        height={100}
        href="https://awmt.org"
        target="_blank"
      >
        <img src={AWMTLogo} style={{ width: '100%', height: '100%' }} />
      </PositionedComponent>
      <PositionedComponent
        component="a"
        top={0}
        right={0}
        width={100}
        height={100}
        href="https://archive.org"
        target="_blank"
      >
        <img src={IALogoSmall} style={{ width: '100%', height: '100%' }} />
      </PositionedComponent>
    </div>
  )
}

export function HeadingSection() {
  const { title, subtitle, content, subsections } = LANDING_PAGE_TEXT.heading
  const breakpoint = useResponsive()
  const LGOrLess = breakpoint <= Breakpoint.LG

  return (
    <div className={styles.root}>
      {!LGOrLess && <PositionedElementsDesktop />}
      <div className={styles.textWrapper}>
        <Text variant="h1" className={styles.heading}>
          {title}
        </Text>
        <Text variant="h6" component="div" className={styles.subheading}>
          {subtitle}
        </Text>
        {LGOrLess && <img className={styles.mobileHands} src={MobileHands} />}
        <div className={styles.content}>
          <Text variant="h5" component="div">
            {content[0]}
          </Text>
          <Text variant="h6" component="div">
            {content[1]}
          </Text>
        </div>
        <div className={styles.awmt}>
          <Text variant="bodySm" component="div">
            {subsections.AWMT.content}
          </Text>
          <AWMTCircles />
        </div>
      </div>
    </div>
  )
}
