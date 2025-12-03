import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './app'
import { BrowserRouter, Routes, Route } from 'react-router'
import { GoogleFonts } from 'tapestry-core-client/src/components/lib/icon'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GoogleFonts />
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
