import { Icon, IconName } from 'tapestry-core-client/src/components/lib/icon/index'
import {
  AdminTapestryDto,
  SharingLevel as SharingLevelValue,
} from 'tapestry-shared/src/data-transfer/resources/dtos/admin'
import { SHARING_LEVEL_LABELS } from '../../format'
import styles from './styles.module.css'

export const SHARING_LEVEL_ICONS: Record<SharingLevelValue, IconName> = {
  owner: 'lock',
  invited: 'group',
  link: 'link',
}

/** The sharing level of a tapestry and whether it is featured in the Gallery. */
export function SharingLevel({
  tapestry,
}: {
  tapestry: Pick<AdminTapestryDto, 'sharingLevel' | 'featured' | 'invitedCount'>
}) {
  const label =
    tapestry.sharingLevel === 'invited'
      ? `Invited · ${tapestry.invitedCount}`
      : SHARING_LEVEL_LABELS[tapestry.sharingLevel]

  return (
    <div className={styles.root}>
      <span
        className={styles.level}
        aria-label={
          tapestry.sharingLevel === 'invited'
            ? `${SHARING_LEVEL_LABELS.invited} (${tapestry.invitedCount})`
            : undefined
        }
      >
        <Icon icon={SHARING_LEVEL_ICONS[tapestry.sharingLevel]} aria-hidden />
        {label}
      </span>
      {tapestry.featured && <FeaturedTag />}
    </div>
  )
}

export function FeaturedTag() {
  return (
    <span className={styles.featured}>
      <Icon icon="star" filled aria-hidden />
      Featured in Gallery
    </span>
  )
}
