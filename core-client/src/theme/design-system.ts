import { get } from 'lodash-es'
import { Color, DesignSystem, isLiteralColor, LiteralColor } from './types.js'

export const DESIGN_SYSTEM: DesignSystem = {
  typography: {
    h1: {
      fontFamily: 'Plus Jakarta Sans',
      fontSize: '64px',
      lineHeight: '72px',
      fontWeight: '400',
    },
    h2: {
      fontFamily: 'Plus Jakarta Sans',
      fontSize: '48px',
      lineHeight: '56px',
      fontWeight: '400',
    },
    h3: {
      fontFamily: 'Plus Jakarta Sans',
      fontSize: '40px',
      lineHeight: '48px',
      fontWeight: '400',
    },
    h4: {
      fontFamily: 'Plus Jakarta Sans',
      fontSize: '32px',
      lineHeight: '40px',
      fontWeight: '400',
    },
    h5: {
      fontFamily: 'Plus Jakarta Sans',
      fontSize: '24px',
      lineHeight: '32px',
      fontWeight: '400',
    },
    h6: {
      fontFamily: 'Plus Jakarta Sans',
      fontSize: '20px',
      lineHeight: '24px',
      fontWeight: '400',
    },
    body: {
      fontFamily: 'Plus Jakarta Sans',
      fontSize: '16px',
      lineHeight: '24px',
      fontWeight: '400',
    },
    bodySm: {
      fontFamily: 'Plus Jakarta Sans',
      fontSize: '14px',
      lineHeight: '20px',
      fontWeight: '400',
    },
    bodyXs: {
      fontFamily: 'Plus Jakarta Sans',
      fontSize: '12px',
      lineHeight: '16px',
      fontWeight: '400',
    },
  },
  palette: {
    primary: {
      50: '#e0e8f9',
      100: '#bed0f7',
      200: '#98aeeb',
      300: '#7b93db',
      400: '#647acb',
      500: '#4d63b6',
      600: '#4055a8',
      700: '#34479c',
      800: '#2d3a8c',
      900: '#19216c',
    },
    secondary: {
      50: '#ffe8d9',
      100: '#ffd0b5',
      200: '#ffb089',
      300: '#ff9466',
      400: '#f9703e',
      500: '#f35627',
      600: '#de3a10',
      700: '#c52707',
      800: '#ad1e06',
      900: '#841103',
    },
    neutral: {
      0: '#ffffff',
      50: '#eff1f2',
      100: '#f2f2f2',
      150: '#ced2d6',
      200: '#b6bcc3',
      300: '#959ea7',
      400: '#818b96',
      500: '#616e7c',
      600: '#586471',
      700: '#454e58',
      800: '#353d44',
      900: '#292e34',
      950: '#1c1c1e',
      1000: '#000000',
    },
    success: {
      50: '#e3f9e4',
      100: '#c1f2c6',
      200: '#90e696',
      300: '#51ca58',
      400: '#31b338',
      500: '#17981d',
      600: '#108613',
      700: '#0e7817',
      800: '#05610d',
      900: '#014807',
    },
    warning: {
      50: '#fffbea',
      100: '#fff3c4',
      200: '#fce588',
      300: '#fadb5f',
      400: '#f7c948',
      500: '#f0b42a',
      600: '#de911d',
      700: '#cb6e17',
      800: '#b44d12',
      900: '#8d2b0a',
    },
    error: {
      50: '#fae7e9',
      100: '#f0b5bb',
      200: '#e9929a',
      300: '#df606c',
      400: '#d94150',
      500: '#cf1124',
      600: '#bc0f21',
      700: '#930c1a',
      800: '#720914',
      900: '#57070f',
    },
  },
}

/**
 * Gets a "raw" color from the design system palette or returns the given color value if it is a literal color.
 * This is an utility function to be used when creating themes. Do not use it when styling components, because
 * the colors will not get updated properly when the theme is changed. Use colors from the theme instead.
 */
export function getPaletteColor(name: Color, designSystem = DESIGN_SYSTEM): LiteralColor {
  return isLiteralColor(name) ? name : get(designSystem.palette, name)
}
