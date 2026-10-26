import { Text } from 'tapestry-core-client/src/components/lib/text'
import { LANDING_PAGE_TEXT } from '../../pages-text'
import EventsString from '../../../assets/images/landing-page/events-string.webp'
import EventsStringMobile from '../../../assets/images/landing-page/events-string-mobile.webp'

import styles from './styles.module.css'
import { Button } from 'tapestry-core-client/src/components/lib/buttons'
import { useRef } from 'react'
import { Breakpoint, useResponsive } from '../../../providers/responsive-provider'

export function EventsSection() {
  const { title, content } = LANDING_PAGE_TEXT.events

  const learnMoreRef = useRef<HTMLDivElement>(null)

  const XSOrLess = useResponsive() <= Breakpoint.XS

  return (
    <div className={styles.root}>
      <div className={styles.learnMoreContainer}>
        <Button
          icon="keyboard_double_arrow_down"
          variant="secondary"
          aria-label="Learn more"
          className={styles.learnMoreButton}
          onClick={() =>
            learnMoreRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
          }
        />
        <Text component="div" variant="h6" className={styles.learnMoreText} ref={learnMoreRef}>
          Learn more
        </Text>
      </div>
      <div className={styles.textWrapper}>
        <Text component="div" variant="h6" className={styles.title}>
          {title}
        </Text>
        <Text component="div" variant="bodySm">
          {content}
        </Text>
      </div>
      <Button
        component="a"
        variant="mono"
        href="https://luma.com/tapestries"
        target="_blank"
        className={styles.eventsButton}
      >
        Join a circle
      </Button>
      <img
        src={XSOrLess ? EventsStringMobile : EventsString}
        className={styles.eventsString}
        draggable={false}
      />
    </div>
  )
}
