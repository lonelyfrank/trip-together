import { QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import './index.css'
import ConnectionBanner from './components/ui/ConnectionBanner'
import Toaster from './components/ui/Toaster'
import { queryClient } from './lib/queryClient'
import CrewPage from './pages/Crew'
import Home from './pages/Home'
import Join from './pages/Join'
import Resume from './pages/Resume'
import RoomPage from './pages/Room'

// Osservabilità in DEV: segnala in console le tabelle attese ma assenti sul DB.
// Import dinamico così il codice non finisce nel bundle di produzione.
if (import.meta.env.DEV) {
  import('./lib/schemaCheck').then((m) => m.checkSchema())
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ConnectionBanner />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/join/:inviteCode" element={<Join />} />
          <Route path="/resume/:token" element={<Resume />} />
          <Route path="/crew/:crewId" element={<CrewPage />} />
          <Route path="/room/:roomId" element={<RoomPage />} />
        </Routes>
        <Toaster />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
)
