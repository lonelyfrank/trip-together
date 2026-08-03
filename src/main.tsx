import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import './index.css'
import CrewPage from './pages/Crew'
import Home from './pages/Home'
import Join from './pages/Join'
import RoomPage from './pages/Room'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/join/:inviteCode" element={<Join />} />
        <Route path="/crew/:crewId" element={<CrewPage />} />
        <Route path="/room/:roomId" element={<RoomPage />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
