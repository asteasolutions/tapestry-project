import { createContext, useContext } from 'react'

interface ClickableContext {
  click?: () => void
}

export const ClickableContext = createContext<ClickableContext>({})

export function useClickableContext(): ClickableContext | undefined {
  return useContext(ClickableContext)
}
