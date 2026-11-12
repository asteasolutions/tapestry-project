import clsx from 'clsx'
import { useNarrtiveDesignSystem } from '../../hooks/use-narrative-design-system'
import styles from './styles.module.css'
import { AboutSection } from './about-section'
import { HistorySection } from './history-section'
import { SnapshotsSection } from './snapshots-section'
import { PrinciplesSection } from './principles-section'
import { TeamSection } from './team-section'
import { setLastDashboardPath } from '../dashboard'

export function AboutPage() {
  const narrativeDesignClassName = useNarrtiveDesignSystem()
  setLastDashboardPath('/about')
  return (
    <div className={clsx(styles.root, narrativeDesignClassName)}>
      <AboutSection />
      <HistorySection />
      <SnapshotsSection />
      <PrinciplesSection />
      <TeamSection />
    </div>
  )
}
