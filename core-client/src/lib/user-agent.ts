import Bowser from 'bowser'

export const browser = Bowser.parse(navigator.userAgent)
export const isMac = browser.os.name === 'macOS'
export const isMobile = browser.platform.type === 'mobile' || browser.platform.type === 'tablet'
