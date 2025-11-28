import { Button } from 'tapestry-core-client/src/components/lib/buttons/index'
import { Text } from 'tapestry-core-client/src/components/lib/text/index'
import { Breakpoint, useResponsive } from '../../../../providers/responsive-provider'
import TapestryCardsImage from '../../../../assets/images/tapestry-cards.png'
import styles from './styles.module.css'
import clsx from 'clsx'

interface NoTapestriesPlaceholder {
  onNewTapestry: () => unknown
  showNewTapestryButton: boolean
}

export function NoTapestriesPlaceholder({
  onNewTapestry,
  showNewTapestryButton,
}: NoTapestriesPlaceholder) {
  const smOrLess = useResponsive() <= Breakpoint.SM

  return (
    <div className={clsx(styles.root, 'no-tapestries')}>
      <img src={TapestryCardsImage} />
      <Text variant={smOrLess ? 'h6' : 'h4'} className={styles.placeholderText}>
        No tapestries found
      </Text>
      {showNewTapestryButton && (
        <Button icon="add" onClick={() => onNewTapestry()}>
          Create new
        </Button>
      )}
    </div>
  )
}
