import { ChevronRight, Clock, Infinity as InfinityIcon, Lock, LockOpen, Navigation, ShieldCheck, Users } from 'lucide-react'
import { useEffect, useState } from 'react'
import { usePagerActive } from '../../../components/pagerActive'
import TripHero from '../../../components/room/TripHero'
import AlertBanner from '../../../components/ui/AlertBanner'
import Avatar from '../../../components/ui/Avatar'
import BottomSheet from '../../../components/ui/BottomSheet'
import Button from '../../../components/ui/Button'
import Card from '../../../components/ui/Card'
import CardTitle from '../../../components/ui/CardTitle'
import PageTitle from '../../../components/ui/PageTitle'
import StaticMap, { type MapPoint } from '../../../components/ui/StaticMap'
import { useRadarSharing } from '../../../hooks/useRadarSharing'
import { useRoomContext } from '../../../hooks/useRoomContext'
import { distanceMeters, formatDistance } from '../../../lib/geo'
import { boundsCenter, fitZoom, type LatLng } from '../../../lib/mapTiles'
import { formatRelativeTime } from '../../../lib/time'
import type { Member } from '../../../types'

const STALE_AFTER_MS = 5 * 60_000
const MAP_BOX = { width: 330, height: 120 }

// Radar: la posizione del gruppo. La condivisione è SPENTA di default e mai
// automatica — la accende solo il bottone, e uscire dalla tab la spegne
// (l'hook vive in questa pagina, che il pager smonta quando cambi sezione).
export default function RadarPage() {
  const { room, currentMember, members, radarPositions, phase, sectionErrors, refetch, goTo } = useRoomContext()
  const { active, myPos, error, toggle } = useRadarSharing(room, currentMember, usePagerActive())
  const [privacyOpen, setPrivacyOpen] = useState(false)
  const [peopleOpen, setPeopleOpen] = useState(false)
  const [focusMe, setFocusMe] = useState(false)
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(id)
  }, [])

  const destination: LatLng | null =
    room.destination_lat !== null && room.destination_lng !== null
      ? { lat: room.destination_lat, lng: room.destination_lng }
      : null
  // Le posizioni più vecchie di 5 minuti non si mostrano: sarebbero un posto
  // dove quella persona non è più.
  const fresh = radarPositions.filter(
    (p) => p.member_id !== currentMember.id && now - Date.parse(p.updated_at) < STALE_AFTER_MS,
  )
  const sharing = new Map(fresh.map((p) => [p.member_id, p]))
  const activeCount = fresh.length + (active && myPos ? 1 : 0)
  const memberById = (id: string) => members.find((m) => m.id === id)

  const people: { member: Member; point: LatLng; updatedAt: string | null; me: boolean }[] = [
    ...(active && myPos ? [{ member: currentMember, point: myPos, updatedAt: null, me: true }] : []),
    ...fresh
      .map((p) => ({ member: memberById(p.member_id), point: { lat: p.lat, lng: p.lng }, updatedAt: p.updated_at, me: false }))
      .filter((entry): entry is { member: Member; point: LatLng; updatedAt: string; me: false } => !!entry.member),
  ]

  const framePoints = focusMe && myPos ? [myPos] : people.length > 0 ? people.map((p) => p.point) : destination ? [destination] : []
  const center = framePoints.length > 0 ? boundsCenter(framePoints) : null
  const zoom = focusMe && myPos ? 16 : people.length > 0 ? fitZoom(framePoints, MAP_BOX.width, MAP_BOX.height, 16, 5) : 14

  const mapPoints: MapPoint[] = people.map(({ member, point, me }) => ({
    key: member.id,
    lat: point.lat,
    lng: point.lng,
    node: <MapPerson member={member} me={me} />,
  }))
  if (destination && people.length === 0) {
    mapPoints.push({ key: 'meet', ...destination, node: <span className="block h-3 w-3 rounded-full border-2 border-surface bg-danger shadow-float" /> })
  }

  // Chi condivide in cima, poi gli altri; tu in testa se stai condividendo.
  const roster = [...members].sort((a, b) => {
    const rank = (m: Member) => (m.id === currentMember.id ? (active ? 0 : 3) : sharing.has(m.id) ? 1 : 2)
    return rank(a) - rank(b) || a.display_name.localeCompare(b.display_name, 'it')
  })
  const updates = people
    .filter((p) => !p.me)
    .sort((a, b) => Date.parse(b.updatedAt!) - Date.parse(a.updatedAt!))

  const distanceFromMe = (point: LatLng) => (myPos ? formatDistance(distanceMeters(myPos, point)) : null)

  if (sectionErrors.radar) {
    return (
      <AlertBanner
        tone="danger"
        title="Non riusciamo a caricare questa sezione"
        action={
          <Button variant="outline" size="sm" onClick={refetch}>
            Riprova
          </Button>
        }
      >
        La posizione degli altri non è disponibile. Riprova tra poco.
      </AlertBanner>
    )
  }

  return (
    <div className="flex flex-col">
      <TripHero room={room} phase={phase} size="medium" onDetails={() => goTo('stanza')} />
      <div className="mt-[9px] px-px">
        <PageTitle title="Radar" hint="Posizione del gruppo" />
      </div>

      <Card onClick={() => setPrivacyOpen(true)} label="Privacy della posizione" row className="mt-[7px] h-[46px] gap-[9px] !px-2.5 !py-0">
        <span className={`flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full ${active ? 'bg-warning-soft' : 'bg-brand-soft'}`}>
          {active ? (
            <LockOpen aria-hidden="true" size={17} className="text-warning-text" />
          ) : (
            <Lock aria-hidden="true" size={17} className="fill-brand-button text-brand-button" />
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[11.5px] font-bold leading-[1.2] text-fg">
            {active ? 'Stai condividendo la tua posizione' : 'Condivisione posizione disattivata di default'}
          </span>
          <span className="mt-0.5 block truncate text-[10.5px] leading-[1.25] text-fg-muted">
            {active ? 'Si ferma da sola quando esci da Radar' : 'Si attiva solo quando la scegli tu'}
          </span>
        </span>
        <ChevronRight aria-hidden="true" size={14} strokeWidth={2.2} className="shrink-0 text-fg-muted" />
      </Card>

      {error && (
        <AlertBanner tone="warn" title="Radar in pausa" className="mt-[7px]">
          {error}
        </AlertBanner>
      )}

      <section
        aria-label="Mappa del gruppo"
        data-no-swipe
        className="relative mt-[7px] h-[214px] shrink-0 overflow-hidden rounded-card border border-line bg-surface shadow-card"
      >
        {center ? (
          <StaticMap
            center={center}
            zoom={zoom}
            points={mapPoints}
            className="absolute inset-0"
            attribution="top-right"
            label={
              people.length > 0
                ? `Mappa: ${people.map((p) => (p.me ? 'tu' : p.member.display_name)).join(', ')}`
                : `Mappa del ritrovo: ${room.destination_label ?? 'posizione salvata'}`
            }
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-grey-soft px-10 text-center text-[11px] leading-[1.4] text-fg-muted">
            Nessuna posizione da mostrare: scegliete il ritrovo o accendi la condivisione.
          </div>
        )}

        <p className="absolute left-2 top-2.5 flex h-[26px] items-center gap-1.5 rounded-[13px] bg-surface/95 pl-[9px] pr-2.5 text-[11px] font-semibold text-fg shadow-float">
          <span className={`h-[7px] w-[7px] rounded-full ${activeCount > 0 ? 'bg-brand' : 'bg-line-dashed'}`} />
          <Users aria-hidden="true" size={14} className="text-purple" />
          {activeCount === 1 ? '1 attivo ora' : `${activeCount} attivi ora`}
        </p>

        <button
          type="button"
          onClick={() => setFocusMe((f) => !f)}
          disabled={!myPos}
          aria-pressed={focusMe}
          aria-label={focusMe ? 'Mostra tutto il gruppo' : 'Centra sulla mia posizione'}
          className="press absolute right-0 top-0 flex h-[50px] w-[50px] items-center justify-center disabled:opacity-60"
        >
          <span className={`flex h-[34px] w-[34px] items-center justify-center rounded-[9px] shadow-float ${focusMe ? 'bg-brand-soft' : 'bg-surface/95'}`}>
            <Navigation aria-hidden="true" size={17} strokeWidth={1.8} className="text-fg" />
          </span>
        </button>

        <button
          type="button"
          onClick={toggle}
          aria-pressed={active}
          className={`press press-btn absolute inset-x-2 bottom-[5px] flex h-[35px] items-center justify-center gap-[7px] rounded-[18px] text-[13px] font-semibold ${
            active
              ? 'border border-danger/20 bg-surface text-danger-text shadow-float'
              : 'bg-gradient-to-b from-brand-button-top to-brand-button text-white shadow-cta'
          }`}
        >
          <Navigation aria-hidden="true" size={15} />
          {active ? (myPos ? 'Interrompi la condivisione' : 'In attesa del GPS… tocca per annullare') : 'Condividi la mia posizione'}
        </button>
      </section>

      <div className="mt-[9px] grid grid-cols-[minmax(0,1.11fr)_minmax(0,1fr)] gap-[7px]">
        <Card onClick={() => setPeopleOpen(true)} label="Chi condivide: vedi tutti" className="min-h-[168px]">
          <CardTitle icon={Users} title="Chi condivide" tone="purple" bare chevron />
          <ul className="mt-[3px]">
            {roster.slice(0, 4).map((member) => (
              <RosterRow
                key={member.id}
                member={member}
                me={member.id === currentMember.id}
                sharing={member.id === currentMember.id ? active : sharing.has(member.id)}
                distance={sharing.has(member.id) ? distanceFromMe(sharing.get(member.id)!) : null}
              />
            ))}
          </ul>
        </Card>

        <div className="min-h-[168px] overflow-hidden rounded-card border border-line bg-surface p-[9px] shadow-card">
          <CardTitle icon={Clock} title="Ultimi aggiornamenti" tone="blue" bare />
          <ul className="mt-[3px]">
            {updates.length === 0 && (
              <li className="pt-2 text-[10.5px] leading-[1.35] text-fg-muted">
                Nessuno sta condividendo la posizione in questo momento.
              </li>
            )}
            {updates.slice(0, 4).map((entry, i, list) => (
              <li
                key={entry.member.id}
                className={`flex h-[34px] items-center gap-1.5 ${i < list.length - 1 ? 'border-b border-divider' : ''}`}
              >
                <Navigation aria-hidden="true" size={15} strokeWidth={1.7} className="shrink-0 text-fg" />
                <div className="min-w-0">
                  <p className="truncate text-[10.5px] leading-[1.15] text-fg">
                    <b className="font-bold">{entry.member.display_name}</b> · {formatRelativeTime(entry.updatedAt!)}
                  </p>
                  <p className="truncate text-[9.5px] leading-[1.2] text-fg-muted">
                    {destination
                      ? `a ${formatDistance(distanceMeters(entry.point, destination))} dal ritrovo`
                      : distanceFromMe(entry.point)
                        ? `a ${distanceFromMe(entry.point)} da te`
                        : 'Posizione condivisa'}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-[7px] flex h-[47px] shrink-0 items-center overflow-hidden rounded-card border border-line bg-surface px-[9px] shadow-card">
        <div className="flex min-w-0 flex-1 items-center gap-[7px]">
          <span className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full bg-brand-soft">
            <ShieldCheck aria-hidden="true" size={16} className="text-brand-button" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-[11px] font-bold leading-[1.2] text-fg">Mai automatico</p>
            <p className="mt-px text-[8.5px] leading-[1.25] text-fg-muted">La tua posizione si condivide solo quando lo decidi tu.</p>
          </div>
        </div>
        <span aria-hidden="true" className="mx-2 h-[30px] border-l-[1.5px] border-dotted border-line-dashed" />
        <div className="flex min-w-0 flex-1 items-center gap-[7px]">
          <span className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full bg-blue-soft">
            <InfinityIcon aria-hidden="true" size={17} className="text-blue" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-[11px] font-bold leading-[1.2] text-fg">Puoi interrompere quando vuoi</p>
            <p className="mt-px text-[8.5px] leading-[1.25] text-fg-muted">Basta un tap, in qualsiasi momento.</p>
          </div>
        </div>
      </div>

      <BottomSheet open={privacyOpen} onClose={() => setPrivacyOpen(false)} title="La tua posizione">
        <div className="space-y-3 text-[13px] leading-relaxed text-fg-muted">
          <p>
            La condivisione parte <b className="text-fg">spenta</b> e si accende solo con il bottone “Condividi la mia
            posizione”. Non si riattiva da sola, nemmeno riaprendo l’app.
          </p>
          <p>
            Si ferma quando esci dalla sezione Radar o quando la interrompi. La posizione non viene conservata come
            storico: resta solo l’ultima, e viene cancellata quando smetti di condividerla.
          </p>
          <p>
            La precisione dipende dal segnale GPS. Se perdi la connessione, l’ultima posizione può restare visibile agli
            altri per qualche minuto; dopo cinque minuti non viene più mostrata.
          </p>
          <Button className="w-full" variant={active ? 'outline' : 'primary'} onClick={() => { toggle(); setPrivacyOpen(false) }}>
            {active ? 'Interrompi la condivisione' : 'Condividi la mia posizione'}
          </Button>
        </div>
      </BottomSheet>

      <BottomSheet open={peopleOpen} onClose={() => setPeopleOpen(false)} title="Chi condivide">
        <ul className="space-y-1">
          {roster.map((member) => (
            <RosterRow
              key={member.id}
              member={member}
              me={member.id === currentMember.id}
              sharing={member.id === currentMember.id ? active : sharing.has(member.id)}
              distance={sharing.has(member.id) ? distanceFromMe(sharing.get(member.id)!) : null}
              roomy
            />
          ))}
        </ul>
      </BottomSheet>
    </div>
  )
}

function RosterRow({ member, me, sharing, distance, roomy = false }: { member: Member; me: boolean; sharing: boolean; distance: string | null; roomy?: boolean }) {
  return (
    <li className={`flex items-center gap-1.5 ${roomy ? 'min-h-12' : 'h-[34px]'}`}>
      <span className="relative shrink-0">
        <Avatar name={member.display_name} seed={member.id} size={roomy ? 34 : 27} />
        <span
          className={`absolute -bottom-px -right-px h-2 w-2 rounded-full border-[1.5px] border-surface ${sharing ? 'bg-brand' : 'bg-line-dashed'}`}
        />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[11.5px] font-bold leading-[1.15] text-fg">
          {member.display_name}
          {me && <span className="font-medium text-fg-muted"> (tu)</span>}
        </p>
        <p className="truncate text-[9.5px] leading-[1.2] text-fg-muted">
          {sharing ? 'Condivide la posizione' : 'Non condivide'}
        </p>
      </div>
      {sharing ? (
        <span className="shrink-0 text-[10.5px] font-semibold text-brand-text">{distance ?? 'Attivo ora'}</span>
      ) : null}
    </li>
  )
}

function MapPerson({ member, me }: { member: Member; me: boolean }) {
  return (
    <span className="flex w-11 flex-col items-center">
      <span className="relative">
        <Avatar
          name={member.display_name}
          seed={member.id}
          size={32}
          className="border-2 border-surface shadow-[0_1px_5px_rgb(16_26_58/25%)]"
        />
        <span className="absolute -bottom-px -right-0.5 h-2.5 w-2.5 rounded-full border-[1.5px] border-surface bg-brand" />
      </span>
      <span className="mt-0.5 whitespace-nowrap text-[9.5px] font-bold text-fg [text-shadow:0_0_3px_#fff,0_0_3px_#fff,0_0_3px_#fff]">
        {me ? 'Tu' : member.display_name}
      </span>
    </span>
  )
}
