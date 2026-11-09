import { useEffect } from 'react'
import { NARRATIVE_DESIGN_SYSTEM, NarrativeDesignSystem } from '../theme/narrative-design-system'
import {
  cssBlock,
  cssVars,
  typographyClassName,
  writeStyleTag,
} from 'tapestry-core-client/src/theme'

const NARRATIVE_DESING_SYSTEM_CLASS_NAME = 'narrative-design-system'

function serializeNarrativeDesignSystem(
  designSystem: NarrativeDesignSystem,
  rootClassName: string,
) {
  const typographyVariants = Object.keys(
    designSystem.typography,
  ) as (keyof NarrativeDesignSystem['typography'])[]
  const typographyClasses = typographyVariants.map((name) =>
    cssBlock(`.${typographyClassName(name)}`, designSystem.typography[name]),
  )

  const varsDeclaration = cssVars('color', designSystem.colors)

  return cssBlock(`.${rootClassName}`, [...varsDeclaration, ...typographyClasses])
}

export function useNarrtiveDesignSystem() {
  useEffect(() => {
    writeStyleTag('narrative-design-system-sheet', () =>
      serializeNarrativeDesignSystem(NARRATIVE_DESIGN_SYSTEM, NARRATIVE_DESING_SYSTEM_CLASS_NAME),
    )
  }, [])

  return NARRATIVE_DESING_SYSTEM_CLASS_NAME
}
