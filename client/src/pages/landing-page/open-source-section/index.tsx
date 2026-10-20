import { Text } from 'tapestry-core-client/src/components/lib/text'
import { LANDING_PAGE_TEXT } from '../../pages-text'
import styles from './styles.module.css'
import LeftHand from '../../../assets/images/landing-page/left-hand.webp'
import RightHand from '../../../assets/images/landing-page/right-hand.webp'
import VerticalString from '../../../assets/images/landing-page/vertical-string.svg'
import { NARRATIVE_DESIGN_SYSTEM } from '../../../theme/narrative-design-system'
import { PositionedImage } from '../../../components/positioned-component'
import { Button } from 'tapestry-core-client/src/components/lib/buttons'
import { Breakpoint, useResponsive } from '../../../providers/responsive-provider'

export function OpenSourceSection() {
  const { title, subtitle, content } = LANDING_PAGE_TEXT.openSource
  const LGOrLess = useResponsive() <= Breakpoint.LG

  return (
    <div className={styles.root}>
      {!LGOrLess && (
        <>
          <PositionedImage src={LeftHand} width={400} left={-130} bottom={-20} />
          <PositionedImage src={VerticalString} width={110} left={175} bottom={-20} />
          <PositionedImage src={RightHand} width={365} right={-100} bottom={-10} rotation={-27.5} />
        </>
      )}
      <div className={styles.textWrapper}>
        <Text variant="h4" component="div" className={styles.title}>
          {title}
        </Text>
        <Text
          variant="h4"
          component="div"
          className={styles.subtitle}
          style={{
            fontSize: NARRATIVE_DESIGN_SYSTEM.typography.h5.fontSize,
          }}
        >
          {subtitle}
        </Text>
        <Text variant="bodySm" component="div" className={styles.content}>
          {content}
        </Text>
      </div>
      <div className={styles.buttons}>
        <Button
          variant="mono"
          component="a"
          href="https://github.com/asteasolutions/tapestry-project"
          target="_blank"
        >
          View GitHub Repo
        </Button>
        <Button
          variant="outline"
          className={styles.outlineButton}
          component="a"
          href="mailto:tapestries@awmt.org"
        >
          Contact
        </Button>
      </div>
      {LGOrLess && (
        <div className={styles.mobileHandsContainer}>
          <img src={LeftHand} style={{ height: '130px' }} />
          <img src={RightHand} style={{ height: '130px' }} />
        </div>
      )}
    </div>
  )
}
