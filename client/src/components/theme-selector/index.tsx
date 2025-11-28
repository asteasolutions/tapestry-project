import { IconToggle } from 'tapestry-core-client/src/components/lib/toggle/icon-toggle/index'
import styles from './styles.module.css'
import { CanvasBackgroundSelector } from '../canvas-background-selector'
import { useDispatch, useTapestryData } from '../../pages/tapestry/tapestry-providers'
import { THEMES } from 'tapestry-core-client/src/theme/themes'
import { updateTapestry } from '../../pages/tapestry/view-model/store-commands/tapestry'

export function ThemeSelector() {
  const dispatch = useDispatch()
  const { background, theme: themeName } = useTapestryData(['theme', 'background'])
  const theme = THEMES[themeName]

  return (
    <div className={styles.root}>
      <IconToggle
        label="Theme"
        value={theme.name}
        onChange={() =>
          dispatch(updateTapestry({ theme: theme.name === 'dark' ? 'light' : 'dark' }))
        }
        options={[
          { icon: 'light_mode', ariaLabel: 'light', value: 'light' },
          { icon: 'dark_mode', ariaLabel: 'dark', value: 'dark' },
        ]}
        className={styles.toggle}
        radioGroup="theme"
      />
      <CanvasBackgroundSelector
        currentColor={background}
        onChange={(background) => dispatch(updateTapestry({ background }))}
      />
    </div>
  )
}
