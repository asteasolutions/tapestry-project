import { deepFreeze } from 'tapestry-core/src/utils'
import { Icon, IconName } from '../../../../../src/components/lib/icon/index'
import { Text } from '../../../../../src/components/lib/text/index'
import styles from './styles.module.css'

interface Tip {
  icon: IconName
  text: string
}

interface TipGroup {
  title: string
  tips: Tip[]
}

export type GuideSection = {
  title: string
  tips?: Tip[]
  tipGroups?: TipGroup[]
}

export const DEFAULT_GUIDE: GuideSection[] = deepFreeze([
  {
    title: 'Navigate',
    tipGroups: [
      {
        title: 'Mouse',
        tips: [
          {
            icon: 'mouse',
            text: 'Control + Mouse scroll to zoom',
          },
          {
            icon: 'drag_pan',
            text: 'Space and drag to move canvas',
          },
        ],
      },
      {
        title: 'Trackpad',
        tips: [
          {
            icon: 'pinch_zoom_in',
            text: 'Pinch to zoom',
          },
          {
            icon: 'trackpad_input_2',
            text: 'Two-finger swipe to move around',
          },
        ],
      },
    ],
  },
])

interface TipProps {
  tip: Tip
}

function Tip({ tip }: TipProps) {
  return (
    <div className={styles.tip}>
      <Icon icon={tip.icon} />
      <Text>{tip.text}</Text>
    </div>
  )
}
interface GroupProps {
  group: TipGroup
}

function Group({ group }: GroupProps) {
  return (
    <>
      {group.title && (
        <Text component="div" variant="bodySm" className={styles.groupTitle}>
          {group.title}
        </Text>
      )}
      {group.tips.map((tip) => (
        <Tip tip={tip} key={tip.text} />
      ))}
    </>
  )
}

interface GuidePaneProps {
  guide: GuideSection[]
}

export function GuidePane({ guide }: GuidePaneProps) {
  return (
    <div className={styles.root}>
      {guide.map((section) => (
        <div className={styles.section} key={section.title}>
          <Text component="div" className={styles.sectionTitle}>
            {section.title}
          </Text>
          {section.tips?.map((tip) => (
            <Tip tip={tip} key={tip.text} />
          ))}
          {section.tipGroups?.map((group) => (
            <Group group={group} key={group.title} />
          ))}
        </div>
      ))}
    </div>
  )
}
