import { lazy, Suspense } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import ConnectionBanner from './components/ui/ConnectionBanner'
import Toaster from './components/ui/Toaster'
import { SkeletonCard, SkeletonHeader } from './components/ui/Skeleton'

const CrewPage = lazy(() => import('./pages/Crew'))
const Home = lazy(() => import('./pages/Home'))
const Join = lazy(() => import('./pages/Join'))
const Resume = lazy(() => import('./pages/Resume'))
const RoomPage = lazy(() => import('./pages/Room'))


export default function App() {
  return (
    <BrowserRouter>
      <ConnectionBanner />
      <Suspense fallback={<div className="mx-auto max-w-4xl px-4"><SkeletonHeader /><SkeletonCard /></div>}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/join/:inviteCode" element={<Join />} />
          <Route path="/resume/:token" element={<Resume />} />
          <Route path="/crew/:crewId" element={<CrewPage />} />
          <Route path="/room/:roomId" element={<RoomPage />} />
          <Route path="*" element={<main className="mx-auto max-w-lg space-y-4 px-6 py-16"><h1 className="font-serif text-2xl">Questa pagina non esiste</h1><a href="/" className="inline-block py-3 text-teal underline">Torna ai tuoi eventi</a></main>} />
        </Routes>
      </Suspense>
      <Toaster />
    </BrowserRouter>
  )
}
