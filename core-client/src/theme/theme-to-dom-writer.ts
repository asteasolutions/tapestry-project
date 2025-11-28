import { serializeDesignSystem, serializeTheme } from './index.js'
import { DESIGN_SYSTEM } from './design-system.js'
import { Theme, ThemeName, THEMES } from './themes.js'

class ThemeToDOMWriter {
  constructor(
    private designSystem = DESIGN_SYSTEM,
    private theme = THEMES.light,
  ) {}

  init() {
    this.writeStyleTag('design-system', () => serializeDesignSystem(this.designSystem))
    this.updateTheme(this.theme)
  }

  updateTheme(theme: Theme | ThemeName) {
    this.theme = typeof theme === 'string' ? THEMES[theme] : theme
    this.writeStyleTag('theme', () => serializeTheme(this.theme), this.theme.name)
  }

  private writeStyleTag(id: string, generateContent: () => string, key?: string) {
    let styleTag = document.getElementById(id) as HTMLStyleElement | null
    if (!styleTag) {
      styleTag = document.createElement('style')
      styleTag.id = id
      document.head.appendChild(styleTag)
    }
    if (!key || styleTag.dataset.key !== key) {
      styleTag.innerHTML = generateContent()
      styleTag.dataset.key = key
    }
  }
}

export const themeToDOMWriter = new ThemeToDOMWriter()
