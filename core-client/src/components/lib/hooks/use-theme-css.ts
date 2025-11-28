import { useEffect } from 'react'
import { ThemeName } from '../../../theme/themes.js'
import { themeToDOMWriter } from '../../../theme/theme-to-dom-writer.js'

let didInit = false

export function useThemeCss(themeName: ThemeName) {
  useEffect(() => {
    if (!didInit) {
      didInit = true
      themeToDOMWriter.init()
    }
  }, [])

  useEffect(() => {
    themeToDOMWriter.updateTheme(themeName)
  }, [themeName])
}
