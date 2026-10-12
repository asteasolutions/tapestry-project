import { ReactNode } from 'react'
import styles from './styles.module.css'
import clsx from 'clsx'
import { useThemeCss } from 'tapestry-core-client/src/components/lib/hooks/use-theme-css'
import { Header } from './header'
import { Footer } from './footer'

export interface NavigationLayoutProps {
  children: ReactNode
}

export function NavigationLayout({ children }: NavigationLayoutProps) {
  useThemeCss('light')

  return (
    <div className={clsx(styles.root, 'navigation-layout')}>
      <Header />
      {children}
      <Footer />
    </div>
  )
}
