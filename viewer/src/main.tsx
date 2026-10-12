import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './app'
import { BrowserRouter } from 'react-router'
import { GoogleFonts } from 'tapestry-core-client/src/components/lib/icon'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GoogleFonts />
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
