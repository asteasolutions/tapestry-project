import { DesignSystem, LiteralColor } from 'tapestry-core-client/src/theme/types'

export interface NarrativeDesignSystem {
  typography: DesignSystem['typography']
  colors: {
    sectionGreen: LiteralColor
    sectionYellow: LiteralColor
    sectionBlue: LiteralColor
    sectionRed: LiteralColor
    subheadingGray: LiteralColor
    brightRed: LiteralColor
    lightGray: LiteralColor
    creamYellow: LiteralColor
    warmWhite: LiteralColor
  }
}

export const NARRATIVE_DESIGN_SYSTEM: NarrativeDesignSystem = {
  typography: {
    h1: {
      fontFamily: 'Inter',
      fontSize: '96px',
      lineHeight: '100%',
      fontWeight: '700',
    },
    h2: {
      fontFamily: 'IBM Plex Serif', // heading L serif
      fontSize: '48px',
      lineHeight: '115%',
      fontWeight: '400',
    },
    h3: {
      fontFamily: 'IBM Plex Serif', // heading M serif
      fontSize: '40px',
      lineHeight: '120%',
      fontWeight: '400',
    },
    h4: {
      fontFamily: 'Martian Mono', // heading mono
      fontSize: '40px',
      lineHeight: '130%',
      fontWeight: '400',
    },
    h5: {
      fontFamily: 'Inter', // Subheading
      fontSize: '24px',
      lineHeight: '130%',
      fontWeight: '500',
    },
    h6: {
      fontFamily: 'IBM Plex Serif', // Subheading serif / CTA Large
      fontSize: '24px',
      lineHeight: '130%',
      fontWeight: '400',
    },
    body: {
      fontFamily: 'Inter',
      fontSize: '20px',
      lineHeight: '160%',
      fontWeight: '400',
    },
    bodySm: {
      fontFamily: 'Inter', // Caption
      fontSize: '16px',
      lineHeight: '160%',
      fontWeight: '400',
    },
    bodyXs: {
      fontFamily: 'Martian Mono', // Body mono
      fontSize: '14px',
      lineHeight: '160%',
      fontWeight: '400',
    },
  },
  colors: {
    sectionGreen: '#447742',
    sectionYellow: '#FDBF68',
    sectionBlue: '#1D6596',
    sectionRed: '#FC9B94',
    subheadingGray: '#2C2C2C',
    brightRed: '#FA5144',
    lightGray: '#F2F2F2',
    creamYellow: '#F0E4C8',
    warmWhite: '#FAF8F5',
  },
}
