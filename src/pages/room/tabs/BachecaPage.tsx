import {
  BarChart3,
  Car,
  Check,
  ClipboardCheck,
  ExternalLink,
  FileText,
  Info,
  Link2,
  MapPin,
  Pin,
  TriangleAlert,
} from 'lucide-react'
import { useState } from 'react'
import { BoardIcon } from '../../../components/icons'
import BachecaTab from '../../../components/room/BachecaTab'
import EventDetailsSheet, { MapMarker } from '../../../components/room/EventDetailsSheet'
import PollsSection from '../../../components/room/PollsSection'
import TripHero from '../../../components/room/TripHero'
import AlertBanner from '../../../components/ui/AlertBanner'
import Avatar from '../../../components/ui/Avatar'
import Button from '../../../components/ui/Button'
import Card from '../../../components/ui/Card'
import CardTitle from '../../../components/ui/CardTitle'
import PageTitle from '../../../components/ui/PageTitle'
import SectionHeader from '../../../components/ui/SectionHeader'
import StaticMap from '../../../components/ui/StaticMap'
import { useRoomContext } from '../../../hooks/useRoomContext'
import { compareRows } from '../../../lib/collectionOrder'
import { delayTitle } from '../../../lib/delays'
import { formatClock } from '../../../lib/format'
import { sortPolls, tallyPoll } from '../../../lib/polls'
import { formatRelativeTime } from '../../../lib/time'

const BOARD_ANCHOR = 'bacheca-gestione'
const POLLS_ANCHOR = 'bacheca-sondaggi'

function scrollTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function normalizedHref(url: string) {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`
}

// Bacheca: niente chat, solo cose utili. In alto il riassunto del mockup
// (checklist, note fissate, ritrovo, sondaggio, link, avvisi); sotto, dove
// le card portano, le liste complete con cui aggiungere e modificare.
export default function BachecaPage() {
  const ctx = useRoomContext()
  const { room, currentMember, members, cars, phase, sectionErrors, refetch, goTo } = ctx
  const [detailsOpen, setDetailsOpen] = useState(false)

  const hasCoords = room.destination_lat !== null && room.destination_lng !== null
  const checklist = ctx.roomChecklistItems
  const done = checklist.filter((item) => item.status === 'portato').length
  const notes = [...ctx.boardNotes]
    .sort((a, b) => Number(b.pinned) - Number(a.pinned) || compareRows(b, a, ['created_at', 'id']))
    .slice(0, 2)
  const poll = sortPolls(ctx.polls)[0]
  const tally = poll ? tallyPoll(poll, ctx.pollOptions, ctx.pollVotes, members.length, currentMember.id) : null
  const activeDelays = ctx.delayReports.filter((d) => !d.resolved_at)
  const memberById = (id: string | null) => members.find((m) => m.id === id)

  const sectionError = (
    <AlertBanner
      tone="danger"
      title="Non riusciamo a caricare questa sezione"
      action={
        <Button variant="outline" size="sm" onClick={refetch}>
          Riprova
        </Button>
      }
    >
      I tuoi dati potrebbero essere presenti. Riprova prima di aggiungerne altri.
    </AlertBanner>
  )

  return (
    <div className="flex flex-col">
      <TripHero room={room} phase={phase} size="compact" />
      <PageTitle title="Bacheca" hint="Checklist, note e link utili" icon={BoardIcon} className="mt-2.5" />

      <p className="mt-[9px] flex h-[34px] shrink-0 items-center gap-2 rounded-[11px] bg-brand-tint px-2.5 text-[11px] font-semibold text-fg">
        <FileText aria-hidden="true" size={16} strokeWidth={1.9} className="shrink-0 text-brand-button" />
        Niente chat infinita — solo cose utili per il viaggio
      </p>

      {sectionErrors.bacheca ? (
        <div className="mt-[9px]">{sectionError}</div>
      ) : (
        <>
          <div className="mt-[9px] grid grid-cols-2 gap-[7px]">
            <Card onClick={() => scrollTo(BOARD_ANCHOR)} label="Checklist condivisa" className="min-h-[190px]">
              <CardTitle icon={ClipboardCheck} title="Checklist condivisa" chevron />
              {checklist.length === 0 ? (
                <p className="mt-2 text-[10.5px] leading-[1.35] text-fg-muted">
                  Cosa porta il gruppo? Aggiungi la prima voce qui sotto.
                </p>
              ) : (
                <ul className="mt-[5px]">
                  {checklist.slice(0, 5).map((item) => {
                    const isDone = item.status === 'portato'
                    const assignee = memberById(item.assigned_to)
                    return (
                      <li key={item.id} className="flex h-[26px] items-center gap-[7px]">
                        {isDone ? (
                          <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded bg-brand">
                            <Check aria-hidden="true" size={10} strokeWidth={3.4} className="text-white" />
                          </span>
                        ) : (
                          <span className="h-3.5 w-3.5 shrink-0 rounded border-[1.5px] border-line-dashed bg-surface" />
                        )}
                        <span className={`min-w-0 flex-1 truncate text-[10.5px] ${isDone ? 'text-fg-muted line-through' : 'text-fg'}`}>
                          {item.title}
                        </span>
                        {assignee ? (
                          <Avatar name={assignee.display_name} seed={assignee.id} size={19} />
                        ) : (
                          <span className="h-[19px] w-[19px] shrink-0 rounded-full border border-dashed border-line-dashed" />
                        )}
                      </li>
                    )
                  })}
                </ul>
              )}
              {checklist.length > 0 && (
                <p className="mt-1 text-[9.5px] text-fg-muted">
                  {done} di {checklist.length} completate
                </p>
              )}
            </Card>

            <Card onClick={() => scrollTo(BOARD_ANCHOR)} label="Note importanti" className="min-h-[190px]">
              <CardTitle icon={Pin} title="Note importanti" tone="warning" chevron />
              {notes.length === 0 ? (
                <p className="mt-2 text-[10.5px] leading-[1.35] text-fg-muted">
                  Una nota breve per le cose da non perdere: orari, indirizzi, codici.
                </p>
              ) : (
                notes.map((note) => (
                  <div key={note.id} className="mt-1.5 rounded-[9px] bg-note-soft px-2 py-[7px]">
                    <p className="line-clamp-3 text-[10.5px] font-semibold leading-[1.25] text-fg">{note.text}</p>
                    <div className="mt-1.5 flex items-center gap-[5px]">
                      <p className="text-[9.5px] text-fg-muted">{formatRelativeTime(note.created_at)}</p>
                      {note.pinned && (
                        <p className="ml-auto flex items-center gap-[3px] text-[9px] font-semibold text-warning-text">
                          <Pin aria-hidden="true" size={10} /> Fissato
                        </p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </Card>
          </div>

          <Card onClick={() => setDetailsOpen(true)} label="Punto di ritrovo" row className="mt-[7px] h-20 gap-[9px]">
            {hasCoords ? (
              <StaticMap
                center={{ lat: room.destination_lat!, lng: room.destination_lng! }}
                zoom={15}
                label=""
                attribution="none"
                className="h-[62px] w-[84px] shrink-0 rounded-lg"
                points={[{ key: 'meet', lat: room.destination_lat!, lng: room.destination_lng!, node: <MapMarker /> }]}
              />
            ) : (
              <span className="flex h-[62px] w-[84px] shrink-0 items-center justify-center rounded-lg bg-grey-soft">
                <MapPin aria-hidden="true" size={20} className="text-fg-muted" />
              </span>
            )}
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-[5px] text-[12.5px] font-bold text-fg">
                <MapPin aria-hidden="true" size={13} className="shrink-0 text-danger" /> Punto di ritrovo
              </p>
              <p className="mt-1 truncate text-[11px] font-semibold text-fg">{room.destination_label || 'Da scegliere'}</p>
              <p className="mt-px truncate text-[10px] leading-[1.25] text-fg-muted">
                {room.event_time ? `ore ${formatClock(room.event_time)}` : 'Orario da decidere'}
              </p>
            </div>
            <span className="flex shrink-0 items-center gap-1 whitespace-nowrap rounded-[9px] bg-blue-soft px-[9px] py-1.5 text-[10px] font-semibold text-blue">
              <MapPin aria-hidden="true" size={12} /> {hasCoords ? 'Vedi su mappa' : 'Imposta'}
            </span>
          </Card>
          <EventDetailsSheet room={room} open={detailsOpen} onClose={() => setDetailsOpen(false)} />

          <div className="mt-[7px] grid grid-cols-2 gap-[7px]">
            <Card onClick={() => scrollTo(POLLS_ANCHOR)} label="Sondaggio del gruppo" className="min-h-[158px]">
              <CardTitle icon={BarChart3} title="Sondaggio del gruppo" tone="purple" chevron />
              {sectionErrors.sondaggi ? (
                <p className="mt-2 text-[10.5px] text-danger-text">Sondaggi non disponibili.</p>
              ) : !poll || !tally ? (
                <p className="mt-2 text-[10.5px] leading-[1.35] text-fg-muted">
                  Una domanda, risposte contate: la decisione senza venti messaggi.
                </p>
              ) : (
                <>
                  <p className="mt-1.5 truncate text-[10.5px] font-semibold text-fg">{poll.question}</p>
                  {tally.options.slice(0, 3).map((option) => (
                    <div key={option.option.id} className="relative mt-[5px] h-[26px] overflow-hidden rounded-lg bg-grey-soft">
                      <div
                        className={`absolute inset-y-0 left-0 rounded-lg transition-[width] duration-500 ${option.leading ? 'bg-brand/30' : 'bg-track'}`}
                        style={{ width: `${Math.round(option.fraction * 100)}%` }}
                      />
                      <div className={`relative flex h-full items-center px-2 text-[10px] text-fg ${option.leading ? 'font-semibold' : 'font-medium'}`}>
                        <span className="min-w-0 flex-1 truncate">{option.option.label}</span>
                        <span className="font-bold">{Math.round(option.fraction * 100)}%</span>
                      </div>
                    </div>
                  ))}
                  <p className="mt-[5px] text-[9.5px] text-fg-muted">
                    {tally.totalVotes} {tally.totalVotes === 1 ? 'voto' : 'voti'}
                    {!tally.open && ' · chiuso'}
                  </p>
                </>
              )}
            </Card>

            <div className="min-h-[158px] overflow-hidden rounded-card border border-line bg-surface shadow-card">
              <button
                type="button"
                onClick={() => scrollTo(BOARD_ANCHOR)}
                className="press block w-full px-[9px] pt-[9px] text-left"
                aria-label="Link utili: vedi tutti"
              >
                <CardTitle icon={Link2} title="Link utili" tone="blue" chevron />
              </button>
              <div className="mt-1 px-[9px]">
                {ctx.boardLinks.length === 0 ? (
                  <p className="mt-1 text-[10.5px] leading-[1.35] text-fg-muted">
                    Prenotazioni, menù, biglietti: un posto solo per i link che servono.
                  </p>
                ) : (
                  ctx.boardLinks.slice(0, 3).map((link) => (
                    <a
                      key={link.id}
                      href={normalizedHref(link.url)}
                      target="_blank"
                      rel="noreferrer"
                      className="press flex h-[33px] items-center gap-[7px]"
                    >
                      <span className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-lg bg-blue-soft">
                        <Link2 aria-hidden="true" size={14} className="text-blue" />
                      </span>
                      <span className="min-w-0 flex-1 truncate text-[10.5px] font-semibold leading-[1.2] text-fg">
                        {link.label}
                      </span>
                      <ExternalLink aria-hidden="true" size={12} className="shrink-0 text-fg-muted" />
                    </a>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="mt-[7px] h-[74px] shrink-0 overflow-hidden rounded-card border border-line bg-surface p-[9px] shadow-card">
            <p className="flex h-5 items-center gap-[7px] text-[12.5px] font-bold text-fg">
              <TriangleAlert aria-hidden="true" size={15} className="text-danger" /> Avvisi rapidi
            </p>
            <div className="mt-1.5 grid grid-cols-2 gap-[7px]">
              {activeDelays.length > 0 ? (
                <button
                  type="button"
                  onClick={() => goTo('auto')}
                  className="press flex h-8 items-center gap-1.5 rounded-lg bg-danger-soft px-2 text-left shadow-[inset_3px_0_0_var(--color-danger)]"
                >
                  <Car aria-hidden="true" size={14} className="shrink-0 text-danger" />
                  <span className="min-w-0">
                    <span className="block truncate text-[10px] font-bold leading-[1.15] text-danger-text">
                      {delayTitle(activeDelays[0].reason)}
                    </span>
                    <span className="block truncate text-[9px] leading-[1.2] text-danger-text">
                      {activeDelays[0].minutes_estimate ? `+${activeDelays[0].minutes_estimate} min · ` : ''}
                      {(() => {
                        const car = cars.find((c) => c.id === activeDelays[0].car_id)
                        const driver = memberById(car?.driver_member_id ?? null)
                        return driver ? `auto di ${driver.display_name}` : 'un’auto'
                      })()}
                    </span>
                  </span>
                </button>
              ) : (
                <div className="flex h-8 items-center gap-1.5 rounded-lg bg-brand-soft px-2">
                  <Car aria-hidden="true" size={14} className="shrink-0 text-brand-text" />
                  <span className="min-w-0">
                    <span className="block truncate text-[10px] font-bold leading-[1.15] text-brand-text">Nessun ritardo</span>
                    <span className="block truncate text-[9px] leading-[1.2] text-brand-text">Tutte le auto in orario</span>
                  </span>
                </div>
              )}
              <div className="flex h-8 items-center gap-1.5 rounded-lg bg-blue-soft px-2">
                <Info aria-hidden="true" size={14} className="shrink-0 text-blue" />
                <span className="min-w-0">
                  <span className="block truncate text-[10px] font-semibold leading-[1.15] text-fg">
                    {activeDelays.length > 1 ? `Altri ${activeDelays.length - 1} avvisi` : 'Nessun altro avviso'}
                  </span>
                  <span className="block truncate text-[9px] leading-[1.2] text-fg-muted">Aggiornamenti in tempo reale</span>
                </span>
              </div>
            </div>
          </div>

          <section id={BOARD_ANCHOR} aria-label="Note, checklist e link" className="mt-5 scroll-mt-2">
            <SectionHeader icon={BoardIcon} title="Note, checklist e link" hint="Chi porta cosa, e cosa è stato deciso" />
            <BachecaTab
              roomId={room.id}
              currentMember={currentMember}
              members={members}
              boardNotes={ctx.boardNotes}
              boardLinks={ctx.boardLinks}
              roomChecklistItems={ctx.roomChecklistItems}
            />
          </section>

          <section id={POLLS_ANCHOR} aria-label="Sondaggi del gruppo" className="mt-5 scroll-mt-2">
            {sectionErrors.sondaggi ? (
              sectionError
            ) : (
              <PollsSection
                roomId={room.id}
                currentMember={currentMember}
                memberCount={members.length}
                polls={ctx.polls}
                pollOptions={ctx.pollOptions}
                pollVotes={ctx.pollVotes}
              />
            )}
          </section>
        </>
      )}
    </div>
  )
}
