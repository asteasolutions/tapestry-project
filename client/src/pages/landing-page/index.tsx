import clsx from 'clsx'
import { useNarrtiveDesignSystem } from '../../hooks/use-narrative-design-system'
import styles from './styles.module.css'
import { HeadingSection } from './heading-section'
import { MediaSection } from './media-section'
import { UsageSection } from './usage-section'
import { OpenSourceSection } from './open-source-section'
import { EventsSection } from './events-section'

export function LandingPage() {
  const narrativeDesignClassName = useNarrtiveDesignSystem()
  return (
    <div className={clsx(styles.root, narrativeDesignClassName)}>
      <HeadingSection />
      <EventsSection />
      <MediaSection />
      <UsageSection />
      <OpenSourceSection />
    </div>
  )
}
