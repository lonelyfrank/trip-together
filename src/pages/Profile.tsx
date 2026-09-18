import { CloudOff, Monitor, Moon, RefreshCw, Sun, UsersRound } from 'lucide-react'
import { useSyncExternalStore } from 'react'
import { useNavigate } from 'react-router-dom'
import BottomNavigation from '../components/BottomNavigation'
import Avatar from '../components/ui/Avatar'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import Chip from '../components/ui/Chip'
import EmptyState from '../components/ui/EmptyState'
import ScreenHeader from '../components/ui/ScreenHeader'
import SectionHeader from '../components/ui/SectionHeader'
import { useMyCrews } from '../hooks/useMyCrews'
import { useMyRooms } from '../hooks/useMyRooms'
import { getMyName, getSavedRooms } from '../lib/localRooms'
import { flushQueue, getQueueSize, subscribeQueue } from '../lib/offlineQueue'
import { setThemePreference, useTheme, type ThemePreference } from '../lib/theme'

// Profilo: solo ciò che esiste davvero sul dispositivo e nel progetto
// (identità locale, tema, comitive, coda offline). Nessuna impostazione
// finta per riempire la pagina.

const THEMES: { id: ThemePreference; label: string; icon: typeof Sun }[] = [
  { id: 'light', label: 'Chiaro', icon: Sun },
  { id: 'dark', label: 'Scuro', icon: Moon },
  { id: 'system', label: 'Sistema', icon: Monitor },
]

export default function Profile() {
  const navigate = useNavigate()
  const myName = getMyName()
  const { preference } = useTheme()
  const { summaries } = useMyRooms()
  const { summaries: crews } = useMyCrews()
  const queueSize = useSyncExternalStore(subscribeQueue, getQueueSize, () => 0)

  // Le voci di viaggio della navigazione puntano all'ultimo evento salvato.
  const lastRoomId = getSavedRooms()[0]?.roomId
  const openCount = summaries.filter(({ room }) => room.status === 'open').length
  const archivedCount = summaries.length - openCount

  return (
    <div className="min-h-svh md:pl-[220px]">
      <main className="page-content mx-auto max-w-4xl px-4 sm:px-6">
        <ScreenHeader eyebrow="Il tuo dispositivo" title={myName || 'Profilo'} />

        <div className="space-y-7">
          <Card>
            <div className="flex items-center gap-3">
              <Avatar name={myName || '?'} size="lg" />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-fg">{myName || 'Nome non impostato'}</p>
                <p className="mt-0.5 text-[13px] leading-relaxed text-fg-muted">
                  Nessun account: il nome viene chiesto quando entri in un evento e resta su questo
                  dispositivo.
                </p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2 border-t border-line pt-4">
              <Chip tone="ok">{openCount} in programma</Chip>
              <Chip tone="muted">{archivedCount} archiviati</Chip>
              <Chip tone="muted">{crews.length} comitive</Chip>
            </div>
          </Card>

          <section aria-label="Aspetto">
            <SectionHeader title="Aspetto" hint="Come preferisci vedere l’app" />
            <div className="grid grid-cols-3 gap-2">
              {THEMES.map((option) => {
                const Icon = option.icon
                const isActive = option.id === preference
                return (
                  <button
                    key={option.id}
                    type="button"
                    aria-pressed={isActive}
                    onClick={() => setThemePreference(option.id)}
                    className={`flex min-h-[72px] flex-col items-center justify-center gap-1.5 rounded-2xl border text-[13px] font-medium transition-colors ${
                      isActive
                        ? 'border-accent bg-accent-soft text-accent'
                        : 'border-line bg-surface text-fg-muted shadow-card'
                    }`}
                  >
                    <Icon aria-hidden="true" size={19} />
                    {option.label}
                  </button>
                )
              })}
            </div>
          </section>

          <section aria-label="Comitive">
            <SectionHeader title="Le tue comitive" />
            {crews.length === 0 ? (
              <EmptyState
                icon={UsersRound}
                title="Nessuna comitiva"
                hint="Una comitiva tiene insieme gli stessi amici e tutti i vostri eventi."
                action={
                  <Button variant="surface" size="sm" onClick={() => navigate('/')}>
                    Crea comitiva
                  </Button>
                }
              />
            ) : (
              <ul className="space-y-1.5">
                {crews.map(({ crew, memberCount, eventCount }) => (
                  <li key={crew.id}>
                    <Card onClick={() => navigate(`/crew/${crew.id}`)} className="!p-3.5">
                      <div className="flex items-center gap-3">
                        <UsersRound aria-hidden="true" size={20} className="shrink-0 text-accent" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-fg">{crew.name}</p>
                          <p className="text-[12px] text-fg-muted">
                            {memberCount} partecipanti · {eventCount} eventi
                          </p>
                        </div>
                      </div>
                    </Card>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-label="Sincronizzazione">
            <SectionHeader title="Sincronizzazione" hint="Modifiche fatte senza connessione" />
            <Card>
              <div className="flex items-center gap-3">
                <CloudOff aria-hidden="true" size={20} className={queueSize > 0 ? 'text-warn' : 'text-fg-muted'} />
                <p className="min-w-0 flex-1 text-[13px] leading-relaxed text-fg-muted">
                  {queueSize === 0
                    ? 'Tutto sincronizzato: nessuna modifica in attesa.'
                    : `${queueSize} ${queueSize === 1 ? 'modifica' : 'modifiche'} in attesa. Partiranno da sole al ritorno online.`}
                </p>
              </div>
              {queueSize > 0 && (
                <Button variant="outline" size="sm" className="mt-3 w-full" onClick={() => void flushQueue()}>
                  <RefreshCw size={14} /> Sincronizza ora
                </Button>
              )}
            </Card>
          </section>

          <Button variant="surface" className="w-full" onClick={() => navigate('/')}>
            Tutti i tuoi eventi
          </Button>
        </div>
      </main>
      <BottomNavigation roomId={lastRoomId} active="profilo" />
    </div>
  )
}
