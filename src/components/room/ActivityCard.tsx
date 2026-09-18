import {
  CalendarClock,
  Check,
  GlassWater,
  Landmark,
  MapPin,
  Mountain,
  Trash2,
  Umbrella,
  UtensilsCrossed,
} from 'lucide-react'
import Button from '../ui/Button'
import Card from '../ui/Card'
import Chip from '../ui/Chip'
import { AvatarGroup } from '../ui/Avatar'
import { activityInterest } from '../../lib/activities'
import { formatMoney } from '../../lib/format'
import type { Activity, ActivityParticipant, ActivityStatus, Member } from '../../types'

const CATEGORY = {
  mare: { icon: Umbrella, label: 'Mare' },
  cibo: { icon: UtensilsCrossed, label: 'Cibo' },
  cultura: { icon: Landmark, label: 'Cultura' },
  drink: { icon: GlassWater, label: 'Drink' },
  panorama: { icon: Mountain, label: 'Panorama' },
  altro: { icon: MapPin, label: 'Altro' },
} as const

// "Da votare" e "In attesa" dei mockup non sono stati salvati: una tappa
// `proposta` è "da votare" finché il gruppo non è in maggioranza, e da lì si
// può confermare. Lo stato vero resta uno solo.
const STATUS: Record<ActivityStatus, { label: string; tone: 'muted' | 'ok' | 'warn' | 'info' | 'danger' }> = {
  proposta: { label: 'Da votare', tone: 'warn' },
  confermata: { label: 'Confermata', tone: 'ok' },
  prenotata: { label: 'Prenotata', tone: 'info' },
  annullata: { label: 'Annullata', tone: 'danger' },
}

function timeLabel(activity: Activity): string {
  if (!activity.starts_at) return 'Da programmare'
  const time = new Date(activity.starts_at).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
  return activity.duration_minutes ? `${time} · ~${activity.duration_minutes} min` : time
}

interface ActivityCardProps {
  activity: Activity
  participants: ActivityParticipant[]
  members: Member[]
  currentMember: Member
  onToggleGoing: (activity: Activity, going: boolean) => void
  onSetStatus: (activity: Activity, status: ActivityStatus) => void
  onDelete: (activity: Activity) => void
}

export default function ActivityCard({
  activity,
  participants,
  members,
  currentMember,
  onToggleGoing,
  onSetStatus,
  onDelete,
}: ActivityCardProps) {
  const meta = CATEGORY[activity.category]
  const Icon = meta.icon
  const status = STATUS[activity.status]
  const { going, hasMajority } = activityInterest(activity, participants, members.length)
  const iAmGoing = going.includes(currentMember.id)
  const goingMembers = members.filter((m) => going.includes(m.id))
  const cancelled = activity.status === 'annullata'
  const canDecide = currentMember.role === 'creator' || activity.created_by === currentMember.id

  return (
    <Card tone={cancelled ? 'flat' : 'surface'}>
      <div className="flex items-start gap-3">
        <span
          aria-hidden="true"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-accent-soft text-accent"
        >
          <Icon size={19} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className={`min-w-0 text-[15px] font-semibold ${cancelled ? 'text-fg-muted line-through' : 'text-fg'}`}>
              {activity.title}
            </p>
            <Chip tone={status.tone}>{status.label}</Chip>
          </div>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[12px] text-fg-muted">
            <span className="flex items-center gap-1">
              <CalendarClock aria-hidden="true" size={13} /> {timeLabel(activity)}
            </span>
            {activity.place_label && (
              <span className="flex min-w-0 items-center gap-1">
                <MapPin aria-hidden="true" size={13} />
                <span className="truncate">{activity.place_label}</span>
              </span>
            )}
            {activity.price_per_person !== null && (
              <span className="font-mono">{formatMoney(activity.price_per_person)} a testa</span>
            )}
          </p>
          {activity.note && <p className="mt-1.5 text-[13px] leading-relaxed text-fg-muted">{activity.note}</p>}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
        <div className="flex min-w-0 items-center gap-2">
          {goingMembers.length > 0 ? (
            <>
              <AvatarGroup people={goingMembers} max={5} />
              <span className="text-[12px] text-fg-muted">
                {going.length} su {members.length}
                {hasMajority && activity.status === 'proposta' && ' · c’è la maggioranza'}
              </span>
            </>
          ) : (
            <span className="text-[12px] text-fg-muted">Nessuno si è ancora aggiunto</span>
          )}
        </div>

        {!cancelled && (
          <div className="flex shrink-0 flex-wrap items-center gap-1.5">
            <Button
              size="sm"
              variant={iAmGoing ? 'teal' : 'outline'}
              aria-pressed={iAmGoing}
              onClick={() => onToggleGoing(activity, !iAmGoing)}
            >
              {iAmGoing ? (
                <>
                  <Check size={14} /> Ci sono
                </>
              ) : (
                'Mi aggiungo'
              )}
            </Button>
            {canDecide && activity.status === 'proposta' && (
              <Button size="sm" variant="surface" onClick={() => onSetStatus(activity, 'confermata')}>
                Conferma
              </Button>
            )}
            {canDecide && activity.status === 'confermata' && (
              <Button size="sm" variant="surface" onClick={() => onSetStatus(activity, 'prenotata')}>
                Prenotata
              </Button>
            )}
            {canDecide && (
              <button
                type="button"
                onClick={() => onDelete(activity)}
                aria-label={`Elimina ${activity.title}`}
                className="flex h-11 w-11 items-center justify-center rounded-full text-fg-muted active:text-danger"
              >
                <Trash2 aria-hidden="true" size={15} />
              </button>
            )}
          </div>
        )}
      </div>
    </Card>
  )
}
