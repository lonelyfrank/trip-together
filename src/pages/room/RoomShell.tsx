import { useEffect, useMemo, useState } from 'react'
import { Outlet, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import ArchiveSummary from '../../components/room/ArchiveSummary'
import BottomNavigation from '../../components/BottomNavigation'
import { isTabId, type TabId } from '../../lib/tabs'
import TripHeader from '../../components/TripHeader'
import TripSwitcher from '../../components/TripSwitcher'
import Button from '../../components/ui/Button'
import { Skeleton, SkeletonCard, SkeletonHeader } from '../../components/ui/Skeleton'
import { useRoomData } from '../../hooks/useRoomData'
import type { RoomContextValue } from '../../hooks/useRoomContext'
import { getSavedRoomEntry, saveRoomEntry } from '../../lib/localRooms'
import { roomPhase } from '../../lib/phase'
import { ensureAnonymousSession, supabase } from '../../lib/supabase'

// Shell della stanza: legge i dati una volta, tiene header e navigazione
// stabili fra le tab e passa tutto alle pagine figlie via Outlet context.
// Gli stati di accesso (gate, errore, invito mancante, archivio) restano qui
// perché valgono per tutte le tab, non per una sola.
//
// La tab attiva vive nell'URL (`?tab=auto`) e cambia con `replace`: il tasto
// indietro esce dalla stanza invece di ripercorrere ogni tab visitata.

export default function RoomShell() {
  const { roomId } = useParams<{ roomId: string }>()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [searchParams] = useSearchParams()
  const tabParam = searchParams.get('tab')
  const onSubPage = pathname.endsWith('/attivita')
  const active: TabId = !onSubPage && isTabId(tabParam) ? tabParam : 'stanza'

  const entry = useMemo(() => (roomId ? getSavedRoomEntry(roomId) : null), [roomId])
  const [identity, setIdentity] = useState<{ roomId: string; userId: string; memberIds: string[] } | null>(null)
  const [accessError, setAccessError] = useState(false)
  const [accessAttempt, setAccessAttempt] = useState(0)
  const [inviteCode, setInviteCode] = useState('')
  const [switching, setSwitching] = useState(false)
  const checkedMembership = identity?.roomId === roomId

  useEffect(() => {
    if (!roomId) return
    let cancelled = false
    setAccessError(false)
    setIdentity(null)
    void (async () => {
      try {
        const session = await ensureAnonymousSession()
        const { data: devices, error } = await supabase
          .from('member_devices')
          .select('member_id')
          .eq('auth_user_id', session.user.id)
        if (error) throw error
        if (!cancelled) {
          setIdentity({ roomId, userId: session.user.id, memberIds: (devices ?? []).map((d) => d.member_id) })
        }
      } catch (error) {
        console.error('[accesso evento]', error)
        if (!cancelled) setAccessError(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [roomId, accessAttempt])

  const data = useRoomData(checkedMembership ? roomId : undefined)
  const { room, members, cars, carExpenses, generalExpenses, generalExpenseParticipants, sectionErrors } = data
  const ownMembers = members.filter(
    (m) => m.auth_user_id === identity?.userId || identity?.memberIds.includes(m.id),
  )
  const currentMember = ownMembers.find((m) => m.id === entry?.memberId) ?? ownMembers[0]

  const restoredRoomId = room?.id
  const restoredCode = room?.invite_code
  const restoredMemberId = currentMember?.id
  useEffect(() => {
    // Ripristina la navigazione locale solo dopo la lettura consentita dalle RLS.
    if (restoredRoomId && restoredCode && restoredMemberId) {
      saveRoomEntry({ roomId: restoredRoomId, memberId: restoredMemberId, inviteCode: restoredCode })
    }
  }, [restoredRoomId, restoredCode, restoredMemberId])

  if ((!checkedMembership && !accessError) || data.isLoading) {
    return (
      <div className="mx-auto flex min-h-svh max-w-[430px] flex-col">
        <Skeleton className="mx-4 mt-3 h-3 w-24 sm:mx-6" />
        <SkeletonHeader />
        <div className="flex-1 space-y-2.5 px-4 pb-10 sm:px-6">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    )
  }

  // Errore di lettura (es. tabella mancante) ≠ stanza inesistente: stato distinto.
  if (data.error || accessError) {
    return (
      <div className="mx-auto flex min-h-svh max-w-[430px] flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-danger-text">Non riusciamo a caricare questo evento.</p>
        <p className="text-sm text-fg-muted">Controlla la connessione e riprova.</p>
        <Button
          variant="outline"
          onClick={() => (accessError ? setAccessAttempt((n) => n + 1) : void data.refetch())}
        >
          Riprova
        </Button>
      </div>
    )
  }

  if (!room) {
    return (
      <div className="mx-auto flex min-h-svh max-w-[430px] flex-col items-center justify-center gap-4 px-6 text-center">
        <h1 className="font-serif text-2xl text-fg">Serve un invito per aprire questo evento</h1>
        <form
          className="flex w-full max-w-sm flex-col gap-3"
          onSubmit={(event) => {
            event.preventDefault()
            if (inviteCode.trim()) navigate(`/join/${encodeURIComponent(inviteCode.trim().toUpperCase())}`)
          }}
        >
          <label htmlFor="event-invite" className="text-sm text-fg-muted">
            Codice invito
          </label>
          <input
            id="event-invite"
            required
            maxLength={64}
            autoCapitalize="characters"
            autoComplete="off"
            value={inviteCode}
            onChange={(event) => setInviteCode(event.target.value)}
            className="rounded-xl border border-line bg-surface px-3 py-3 text-fg"
          />
          <Button type="submit" disabled={!inviteCode.trim()}>
            Continua con il codice
          </Button>
        </form>
        <button onClick={() => navigate('/')} className="min-h-11 text-sm text-fg-muted underline">
          Torna alla home
        </button>
      </div>
    )
  }

  const phase = roomPhase(room.status, cars.map((c) => c.travel_status))
  const switcher = <TripSwitcher open={switching} onClose={() => setSwitching(false)} currentRoomId={room.id} />

  if (room.status === 'closed') {
    return (
      <div className="mx-auto flex min-h-svh max-w-[430px] flex-col">
        <TripHeader room={room} onSwitch={() => setSwitching(true)} />
        {switcher}
        <ArchiveSummary data={data} />
      </div>
    )
  }

  if (!currentMember) {
    return (
      <div className="mx-auto flex min-h-svh max-w-[430px] flex-col">
        <TripHeader room={room} onSwitch={() => setSwitching(true)} />
        {switcher}
        <div className="space-y-4 px-6 py-8 text-center">
          <p className="text-fg-muted">La tua partecipazione non è stata trovata su questo dispositivo.</p>
          <Button onClick={() => navigate(`/join/${room.invite_code}`)}>Rientra con l’invito</Button>
        </div>
      </div>
    )
  }

  // Un dato economico incompleto non deve diventare un saldo plausibile ma
  // falso: si dichiara, e l'archiviazione resta bloccata.
  const dataIncomplete =
    !!(sectionErrors.auto || sectionErrors.spese) ||
    generalExpenses.some(
      (expense) =>
        !expense.waived &&
        (!expense.paid_by_member_id ||
          !generalExpenseParticipants.some((participant) => participant.expense_id === expense.id)),
    ) ||
    carExpenses.some((expense) => !expense.paid_by_member_id || !cars.some((car) => car.id === expense.car_id))

  const context: RoomContextValue = {
    ...data,
    room,
    currentMember,
    dataIncomplete,
    phase,
    refetch: () => void data.refetch(),
    goTo: (section) =>
      section === 'attivita'
        ? navigate(`/room/${room.id}/attivita`)
        : navigate(`/room/${room.id}?tab=${section}`, { replace: !onSubPage }),
    openSwitcher: () => setSwitching(true),
  }
  const openDelays = data.delayReports.filter((d) => !d.resolved_at).length

  return (
    <div className="fixed inset-0 flex flex-col bg-canvas">
      <TripHeader
        room={room}
        alertCount={openDelays}
        onAlerts={() => context.goTo('auto')}
        onSwitch={() => setSwitching(true)}
      />
      {switcher}
      <Outlet context={context} />
      <BottomNavigation active={active} onSelect={(tab) => context.goTo(tab)} />
    </div>
  )
}
