import { CalendarPlus, Compass, Plus } from 'lucide-react'
import { type FormEvent, useMemo, useState } from 'react'
import AlertBanner from '../../components/ui/AlertBanner'
import BottomSheet from '../../components/ui/BottomSheet'
import Button from '../../components/ui/Button'
import EmptyState from '../../components/ui/EmptyState'
import SectionHeader from '../../components/ui/SectionHeader'
import TextField from '../../components/ui/TextField'
import ActivityCard from '../../components/room/ActivityCard'
import { useRoomContext } from '../../hooks/useRoomContext'
import { useRoomOptimistic } from '../../hooks/useRoomOptimistic'
import { dayKey, defaultDayKey, groupByDay } from '../../lib/activities'
import { mutateNotify } from '../../lib/db'
import { fromDatetimeLocal, toDatetimeLocal } from '../../lib/format'
import {
  deleteActivity,
  insertActivity,
  joinActivity,
  leaveActivity,
  setActivityStatus,
} from '../../lib/mutations'
import type { Activity, ActivityCategory, ActivityStatus } from '../../types'

const CATEGORIES: { id: ActivityCategory; label: string }[] = [
  { id: 'mare', label: 'Mare' },
  { id: 'cibo', label: 'Cibo' },
  { id: 'cultura', label: 'Cultura' },
  { id: 'drink', label: 'Drink' },
  { id: 'panorama', label: 'Panorama' },
  { id: 'altro', label: 'Altro' },
]

// Itinerario dell'evento. I giorni non stanno nel database: si ricavano dagli
// orari delle tappe più quello dell'evento (vedi lib/activities.ts).
export default function Activities() {
  const ctx = useRoomContext()
  const { room, currentMember, members, activities, activityParticipants, sectionErrors, refetch } = ctx
  const optimistic = useRoomOptimistic(room.id)

  const days = useMemo(() => groupByDay(room, activities), [room, activities])
  const [selectedDay, setSelectedDay] = useState<string | null | undefined>(undefined)
  // `undefined` = l'utente non ha ancora scelto: si segue il giorno di default,
  // che cambia se arrivano tappe di un nuovo giorno.
  const activeKey = selectedDay === undefined ? defaultDayKey(days) : selectedDay
  const activeDay = days.find((day) => day.key === activeKey) ?? days[0]

  const [adding, setAdding] = useState(false)
  const [title, setTitle] = useState('')
  const [startsAt, setStartsAt] = useState('')
  const [category, setCategory] = useState<ActivityCategory>('altro')
  const [place, setPlace] = useState('')
  const [price, setPrice] = useState('')
  const [saving, setSaving] = useState(false)

  function openSheet() {
    setTitle('')
    // Prepara l'orario sul giorno visualizzato: è quasi sempre quello giusto.
    setStartsAt(activeDay?.key ? `${activeDay.key}T10:00` : toDatetimeLocal(room.event_time))
    setCategory('altro')
    setPlace('')
    setPrice('')
    setAdding(true)
  }

  async function addActivity(event: FormEvent) {
    event.preventDefault()
    const amount = price.trim() === '' ? null : Number(price)
    if (saving || !title.trim() || (amount !== null && (!Number.isFinite(amount) || amount < 0))) return
    setSaving(true)
    try {
      const id = crypto.randomUUID()
      const { error } = await mutateNotify(
        'activities.insert',
        insertActivity(id, room.id, currentMember.id, {
          title,
          startsAt: fromDatetimeLocal(startsAt),
          category,
          placeLabel: place || null,
          pricePerPerson: amount,
          durationMinutes: null,
          note: null,
        }),
        'Tappa non aggiunta.',
      )
      if (error) return
      // Chi propone ci sta: la prima adesione è implicita.
      await mutateNotify('activity_participants.join', joinActivity(id, currentMember.id), 'Adesione non salvata.')
      // dayKey e non slice(0,10): la stringa ISO è in UTC e affettarla
      // sposterebbe il giorno di chi vive a est o a ovest di Greenwich.
      const iso = fromDatetimeLocal(startsAt)
      if (iso) setSelectedDay(dayKey(iso))
      setAdding(false)
    } finally {
      setSaving(false)
    }
  }

  function toggleGoing(activity: Activity, going: boolean) {
    optimistic(
      going ? 'activity_participants.join' : 'activity_participants.leave',
      (prev) => ({
        ...prev,
        activityParticipants: going
          ? [
              ...prev.activityParticipants,
              {
                activity_id: activity.id,
                member_id: currentMember.id,
                room_id: room.id,
                created_at: new Date().toISOString(),
              },
            ]
          : prev.activityParticipants.filter(
              (p) => !(p.activity_id === activity.id && p.member_id === currentMember.id),
            ),
      }),
      () => (going ? joinActivity(activity.id, currentMember.id) : leaveActivity(activity.id, currentMember.id)),
      going ? 'Adesione non salvata.' : 'Non sei riuscito a togliere l’adesione.',
    )
  }

  function changeStatus(activity: Activity, status: ActivityStatus) {
    optimistic(
      'activities.setStatus',
      (prev) => ({
        ...prev,
        activities: prev.activities.map((a) => (a.id === activity.id ? { ...a, status } : a)),
      }),
      () => setActivityStatus(activity.id, status),
      'Stato della tappa non aggiornato.',
    )
  }

  function removeActivity(activity: Activity) {
    if (!window.confirm(`Eliminare "${activity.title}"? Anche le adesioni andranno perse.`)) return
    optimistic(
      'activities.delete',
      (prev) => ({
        ...prev,
        activities: prev.activities.filter((a) => a.id !== activity.id),
        activityParticipants: prev.activityParticipants.filter((p) => p.activity_id !== activity.id),
      }),
      () => deleteActivity(activity.id),
      'Tappa non eliminata.',
    )
  }

  if (sectionErrors.attivita) {
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
        Le tue tappe potrebbero essere presenti. Riprova prima di aggiungerne altre.
      </AlertBanner>
    )
  }

  return (
    <div className="space-y-5">
      <SectionHeader
        icon={Compass}
        title="Attività"
        hint="Il vostro itinerario, giorno per giorno"
        action={
          <Button size="sm" onClick={openSheet}>
            <Plus size={15} /> Aggiungi
          </Button>
        }
      />

      {days.length > 1 && (
        <div
          role="tablist"
          aria-label="Giorni dell’itinerario"
          className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0"
        >
          {days.map((day) => {
            const isActive = day.key === activeDay?.key
            return (
              <button
                key={day.key ?? 'senza-orario'}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setSelectedDay(day.key)}
                className={`min-h-11 shrink-0 rounded-full border px-4 text-[13px] font-medium transition-colors ${
                  isActive
                    ? 'border-accent bg-accent text-on-accent'
                    : 'border-line bg-surface text-fg-muted shadow-card'
                }`}
              >
                {day.shortLabel}
                <span className="ml-1.5 font-mono text-[11px] opacity-70">{day.activities.length}</span>
              </button>
            )
          })}
        </div>
      )}

      {activities.length === 0 ? (
        <EmptyState
          icon={CalendarPlus}
          title="Nessuna tappa in programma"
          hint="Aggiungi la prima: chi ci sta si aggiunge con un tocco, e quando c’è la maggioranza la tappa si conferma."
          action={
            <Button variant="surface" size="sm" onClick={openSheet}>
              <Plus size={15} /> Aggiungi una tappa
            </Button>
          }
        />
      ) : !activeDay || activeDay.activities.length === 0 ? (
        <EmptyState
          title="Niente in programma per questo giorno"
          hint="Aggiungi una tappa oppure scegli un altro giorno."
        />
      ) : (
        <>
          {activeDay.label && <p className="text-[13px] text-fg-muted">{activeDay.label}</p>}
          <ul className="space-y-2.5">
            {activeDay.activities.map((activity) => (
              <li key={activity.id}>
                <ActivityCard
                  activity={activity}
                  participants={activityParticipants}
                  members={members}
                  currentMember={currentMember}
                  onToggleGoing={toggleGoing}
                  onSetStatus={changeStatus}
                  onDelete={removeActivity}
                />
              </li>
            ))}
          </ul>
        </>
      )}

      <BottomSheet open={adding} onClose={() => { if (!saving) setAdding(false) }} title="Nuova tappa">
        <form onSubmit={addActivity} className="space-y-5" aria-busy={saving}>
          <TextField
            label="Cosa fate?"
            placeholder="Es. Pranzo da La Puritate"
            autoFocus
            required
            maxLength={120}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Che tipo di tappa è?</legend>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  aria-pressed={category === option.id}
                  onClick={() => setCategory(option.id)}
                  className={`min-h-11 rounded-full px-4 text-[13px] ${
                    category === option.id
                      ? 'bg-accent text-on-accent'
                      : 'border border-line-strong text-fg-muted'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </fieldset>
          <label className="block text-sm font-medium">
            Quando (opzionale)
            <input
              type="datetime-local"
              value={startsAt}
              onChange={(event) => setStartsAt(event.target.value)}
              className="mt-2 min-h-12 w-full rounded-xl border border-line-strong bg-canvas px-3 text-base text-fg"
            />
          </label>
          <TextField
            label="Dove (opzionale)"
            placeholder="Es. Via Riviera, Gallipoli"
            maxLength={120}
            value={place}
            onChange={(event) => setPlace(event.target.value)}
          />
          <TextField
            label="Quanto costa a persona (opzionale)"
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            value={price}
            onChange={(event) => setPrice(event.target.value)}
          />
          <Button type="submit" className="w-full" disabled={saving || !title.trim()}>
            {saving ? 'Salvataggio…' : 'Aggiungi tappa'}
          </Button>
        </form>
      </BottomSheet>
    </div>
  )
}
