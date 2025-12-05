/// <reference types="vite-plugin-pwa/client" />
import { enableMapSet, enablePatches } from 'immer'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import {
  createBrowserRouter,
  Location,
  Navigate,
  Outlet,
  RouterProvider,
  useLocation,
} from 'react-router'

import { useResponsiveClass } from 'tapestry-core-client/src/components/lib/hooks/use-responsive-class'
import { GoogleFonts } from 'tapestry-core-client/src/components/lib/icon/index'
import { registerSW } from 'virtual:pwa-register'

import './index.css'
import { SessionLayout } from './layouts/session/index'
import { Dashboard } from './pages/dashboard/index'
import { TapestryBySlugPage, TapestryPage } from './pages/tapestry/index'
import { UserProfile } from './pages/user-profile/index'
import { ResponsiveProvider } from './providers/responsive-provider'
import { dashboardPath } from './utils/paths'

enableMapSet()
enablePatches()

function Providers() {
  useResponsiveClass()
  return (
    <ResponsiveProvider>
      <SessionLayout>
        <Outlet />
      </SessionLayout>
    </ResponsiveProvider>
  )
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Providers />,
    children: [
      { path: '/dashboard/:section?', element: <Dashboard /> },
      { path: '/user-profile/:section?', element: <UserProfile /> },
      { path: '/t/:id/:edit?', element: <TapestryPage /> },
      { path: '/u/:username/:slug/:edit?', element: <TapestryBySlugPage /> },
      {
        path: '*?',
        Component: () => {
          const location = useLocation() as Location<unknown>
          return (
            <Navigate
              to={{ pathname: dashboardPath('home'), search: location.search }}
              state={location.state}
              replace
            />
          )
        },
      },
    ],
  },
])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GoogleFonts />
    <RouterProvider router={router} />
  </StrictMode>,
)

if (import.meta.env.PROD) {
  registerSW()
}
