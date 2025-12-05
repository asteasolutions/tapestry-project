import { useEffect } from 'react'
import { isMobile } from '../../../../src/lib/user-agent'

export function useResponsiveClass() {
  useEffect(() => {
    document.body.classList.add(isMobile ? 'mobile' : 'desktop')
  }, [])
}
