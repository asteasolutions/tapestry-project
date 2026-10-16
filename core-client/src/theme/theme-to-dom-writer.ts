import { serializeDesignSystem, serializeTheme, writeStyleTag } from './index.js'
import { DESIGN_SYSTEM } from './design-system.js'
import { Theme, ThemeName, THEMES } from './themes.js'

class ThemeToDOMWriter {
  constructor(
    private designSystem = DESIGN_SYSTEM,
    private theme = THEMES.light,
  ) {}

  init() {
    writeStyleTag('design-system', () => serializeDesignSystem(this.designSystem))
    this.updateTheme(this.theme)
  }

  updateTheme(theme: Theme | ThemeName) {
    this.theme = typeof theme === 'string' ? THEMES[theme] : theme
    writeStyleTag('theme', () => serializeTheme(this.theme), this.theme.name)
  }
}

export const themeToDOMWriter = new ThemeToDOMWriter()
