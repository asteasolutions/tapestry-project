import './index.css'
import { StrictMode, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import {
  createBrowserRouter,
  Location,
  Navigate,
  Outlet,
  RouterProvider,
  useLocation,
} from 'react-router'
import { Dashboard } from './pages/dashboard/index'
import { SessionLayout } from './layouts/session/index'
import { enableMapSet, enablePatches } from 'immer'
import { TapestryBySlugPage, TapestryPage } from './pages/tapestry/index'
import { isMobile } from 'tapestry-core-client/src/lib/user-agent'
import { ResponsiveProvider } from './providers/responsive-provider'
import { UserProfile } from './pages/user-profile/index'
import { dashboardPath } from './utils/paths'
import { GoogleFonts } from 'tapestry-core-client/src/components/lib/icon/index'

enableMapSet()
enablePatches()

function Providers() {
  useEffect(() => {
    document.body.classList.add(isMobile ? 'mobile' : 'desktop')
  }, [])
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
