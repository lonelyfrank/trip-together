import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useParams } from 'react-router-dom'
import ConnectionBanner from './components/ui/ConnectionBanner'
import Toaster from './components/ui/Toaster'
import { SkeletonCard, SkeletonHeader } from './components/ui/Skeleton'

const CrewPage = lazy(() => import('./pages/Crew'))
const Home = lazy(() => import('./pages/Home'))
const Join = lazy(() => import('./pages/Join'))
const Profile = lazy(() => import('./pages/Profile'))
const Resume = lazy(() => import('./pages/Resume'))
const RoomShell = lazy(() => import('./pages/room/RoomShell'))
const RoomTabs = lazy(() => import('./pages/room/RoomTabs'))
const Activities = lazy(() => import('./pages/room/Activities'))
const RoomSubPage = lazy(() => import('./pages/room/RoomSubPage'))

// Le sezioni a percorso (/room/:id/viaggio…) sono esistite per qualche
// settimana: i link già condivisi tornano sulla tab equivalente invece di
// finire su una pagina inesistente.
const LEGACY_SECTIONS: Record<string, string> = {
  adesso: 'stanza',
  viaggio: 'auto',
  gruppo: 'spese',
}

function LegacySectionRedirect({ section }: { section: string }) {
  const { roomId } = useParams<{ roomId: string }>()
  return <Navigate to={`/room/${roomId}?tab=${LEGACY_SECTIONS[section]}`} replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <ConnectionBanner />
      <Suspense fallback={<div className="mx-auto max-w-[430px] px-2.5"><SkeletonHeader /><SkeletonCard /></div>}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/join/:inviteCode" element={<Join />} />
          <Route path="/resume/:token" element={<Resume />} />
          <Route path="/profilo" element={<Profile />} />
          <Route path="/crew/:crewId" element={<CrewPage />} />
          <Route path="/room/:roomId" element={<RoomShell />}>
            <Route index element={<RoomTabs />} />
            <Route path="attivita" element={<RoomSubPage><Activities /></RoomSubPage>} />
            {Object.keys(LEGACY_SECTIONS).map((section) => (
              <Route key={section} path={section} element={<LegacySectionRedirect section={section} />} />
            ))}
          </Route>
          <Route path="*" element={<main className="mx-auto max-w-lg space-y-4 px-6 py-16"><h1 className="font-serif text-2xl">Questa pagina non esiste</h1><a href="/" className="inline-block py-3 text-brand-text underline">Torna ai tuoi eventi</a></main>} />
        </Routes>
      </Suspense>
      <Toaster />
    </BrowserRouter>
  )
}
