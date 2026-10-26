import { Text } from 'tapestry-core-client/src/components/lib/text'
import DominoesThumbnail from '../../../assets/images/about-page/dominoes-thumbnail.webp'
import EncyclopediaProjectThumbnail from '../../../assets/images/about-page/encyclopedia-project-thumbnail.webp'
import { ABOUT_PAGE_TEXT } from '../../pages-text'
import styles from './styles.module.css'
import { TapestryCard } from '../../dashboard/tapestry-card'
import { TapestryListItem } from '../../dashboard/tapestry-list'

const FIRST_SNAPSHOT: TapestryListItem = {
  id: '',
  createdAt: new Date('Mar 16, 2025'),
  updatedAt: new Date('Mar 16, 2025'),
  title: 'The Encyclopedia Project',
  description:
    'Delves into a pivotal moment in Bob’s career (1980-83) when he was commissioned by Britannica and Atari Research to create a vision for an “Intelligent Encyclopedia”',
  isBookmarked: false,
  thumbnail: EncyclopediaProjectThumbnail,
  ownerId: '',
  owner: {
    id: '',
    createdAt: new Date(),
    updatedAt: new Date(),
    givenName: 'Bob',
    familyName: 'Stein',
    username: 'futureofthebook',
  },
  visibility: 'public',
  slug: '',
  allowForking: false,
  theme: 'light',
  background: '#ffffff',
}

const SECOND_SNAPSHOT: TapestryListItem = {
  id: '',
  createdAt: new Date('Mar 21, 2025'),
  updatedAt: new Date('Mar 21, 2025'),
  title: 'Dominoes by John Ré',
  description:
    'Voyager published this laserdisc in 1991, gathering 15 Music Videos on political subjects + 1000+ photos from 70s underground newspapers',
  isBookmarked: false,
  thumbnail: DominoesThumbnail,
  ownerId: '',
  owner: {
    id: '',
    createdAt: new Date(),
    updatedAt: new Date(),
    givenName: 'Bob',
    familyName: 'Stein',
    username: 'futureofthebook',
  },
  visibility: 'public',
  slug: '',
  allowForking: false,
  theme: 'light',
  background: '#ffffff',
}

export function SnapshotsSection() {
  const { title, subtitle } = ABOUT_PAGE_TEXT.snapshots

  return (
    <div className={styles.root}>
      <Text component="div" variant="h3" className={styles.title}>
        {title}
      </Text>
      <Text component="div" variant="bodySm" className={styles.subtitle}>
        {subtitle}
      </Text>
      <div className={styles.cards}>
        <TapestryCard
          tapestry={FIRST_SNAPSHOT}
          viewURL="https://tapestries.media/t/db673ba1-5231-4655-a3c0-28c1f0fbd58b"
          viewOnly
        />
        <TapestryCard
          tapestry={SECOND_SNAPSHOT}
          viewURL="https://tapestries.media/t/46adbc20-70c8-4543-942c-be5115809906"
          viewOnly
        />
      </div>
    </div>
  )
}
