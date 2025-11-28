import { useState, useEffect, ReactNode, createContext, useContext } from 'react'
import { ContextHookInvocationError } from 'tapestry-core-client/src/errors'

export enum Breakpoint {
  XS = 380,
  SM = 600,
  MD = 900,
  LG = 1200,
  XL = Infinity,
}

function breakpointForWidth(width: Breakpoint) {
  if (width <= Breakpoint.XS) {
    return Breakpoint.XS
  }
  if (width <= Breakpoint.SM) {
    return Breakpoint.SM
  }
  if (width <= Breakpoint.MD) {
    return Breakpoint.MD
  }
  if (width <= Breakpoint.LG) {
    return Breakpoint.LG
  }
  return Breakpoint.XL
}

const ResponsiveContext = createContext<Breakpoint | null>(null)

export interface ResponsiveProviderProps {
  children: ReactNode
}

export function ResponsiveProvider({ children }: ResponsiveProviderProps) {
  const [breakpoint, setBreakpoint] = useState(breakpointForWidth(window.innerWidth))

  useEffect(() => {
    const onWindowResize = () => {
      setBreakpoint(breakpointForWidth(window.innerWidth))
    }
    window.addEventListener('resize', onWindowResize)
    return () => window.removeEventListener('resize', onWindowResize)
  }, [])

  return <ResponsiveContext value={breakpoint}>{children}</ResponsiveContext>
}

export function useResponsive(): Breakpoint {
  const context = useContext(ResponsiveContext)
  if (!context) {
    throw new ContextHookInvocationError('ResponsiveProvider')
  }
  return context
}
