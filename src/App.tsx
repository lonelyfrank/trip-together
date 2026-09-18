import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation, useParams } from 'react-router-dom'
import ConnectionBanner from './components/ui/ConnectionBanner'
import Toaster from './components/ui/Toaster'
import { SkeletonCard, SkeletonHeader } from './components/ui/Skeleton'

const CrewPage = lazy(() => import('./pages/Crew'))
const Home = lazy(() => import('./pages/Home'))
const Join = lazy(() => import('./pages/Join'))
const Profile = lazy(() => import('./pages/Profile'))
const Resume = lazy(() => import('./pages/Resume'))
const RoomShell = lazy(() => import('./pages/room/RoomShell'))
const Now = lazy(() => import('./pages/room/Now'))
const Trip = lazy(() => import('./pages/room/Trip'))
const Activities = lazy(() => import('./pages/room/Activities'))
const Group = lazy(() => import('./pages/room/Group'))

// I link già condivisi usano /room/:id?tab=auto: le vecchie tab diventano
// sezioni, quindi il parametro va tradotto una volta invece di rompere gli
// inviti in circolazione.
const LEGACY_TABS: Record<string, string> = {
  stanza: 'adesso',
  auto: 'viaggio',
  bacheca: 'gruppo',
  spese: 'gruppo',
  radar: 'gruppo',
}

function RoomIndexRedirect() {
  const { roomId } = useParams<{ roomId: string }>()
  const tab = new URLSearchParams(useLocation().search).get('tab')
  const section = (tab && LEGACY_TABS[tab]) ?? 'adesso'
  return <Navigate to={`/room/${roomId}/${section}`} replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <ConnectionBanner />
      <Suspense fallback={<div className="mx-auto max-w-4xl px-4"><SkeletonHeader /><SkeletonCard /></div>}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/join/:inviteCode" element={<Join />} />
          <Route path="/resume/:token" element={<Resume />} />
          <Route path="/profilo" element={<Profile />} />
          <Route path="/crew/:crewId" element={<CrewPage />} />
          <Route path="/room/:roomId" element={<RoomShell />}>
            <Route index element={<RoomIndexRedirect />} />
            <Route path="adesso" element={<Now />} />
            <Route path="viaggio" element={<Trip />} />
            <Route path="attivita" element={<Activities />} />
            <Route path="gruppo" element={<Group />} />
          </Route>
          <Route path="*" element={<main className="mx-auto max-w-lg space-y-4 px-6 py-16"><h1 className="font-serif text-2xl">Questa pagina non esiste</h1><a href="/" className="inline-block py-3 text-accent underline">Torna ai tuoi eventi</a></main>} />
        </Routes>
      </Suspense>
      <Toaster />
    </BrowserRouter>
  )
}
