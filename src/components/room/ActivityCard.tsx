import { CalendarClock, Check, MapPin, Trash2 } from 'lucide-react'
import Button from '../ui/Button'
import Card from '../ui/Card'
import Chip from '../ui/Chip'
import { AvatarGroup } from '../ui/Avatar'
import { CATEGORY } from './activityCategories'
import { activityInterest } from '../../lib/activities'
import { formatMoney } from '../../lib/format'
import type { Activity, ActivityParticipant, ActivityStatus, Member } from '../../types'


// "Da votare" e "In attesa" dei mockup non sono stati salvati: una tappa
// `proposta` è "da votare" finché il gruppo non è in maggioranza, e da lì si
// può confermare. Lo stato vero resta uno solo.
const STATUS: Record<ActivityStatus, { label: string; tone: 'muted' | 'ok' | 'warn' | 'info' | 'danger' }> = {
  proposta: { label: 'Da votare', tone: 'warn' },
  confermata: { label: 'Confermata', tone: 'ok' },
  prenotata: { label: 'Prenotata', tone: 'info' },
  annullata: { label: 'Annullata', tone: 'danger' },
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
    <Card tone={cancelled ? 'flat' : 'surface'} className="!p-3">
      <div className="flex gap-2.5">
        <span
          aria-hidden="true"
          className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white ${meta.tile} ${cancelled ? 'opacity-40' : ''}`}
        >
          <Icon size={24} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-1.5">
            <p className={`min-w-0 text-[13px] font-bold leading-snug ${cancelled ? 'text-fg-muted line-through' : 'text-fg'}`}>
              {activity.title}
            </p>
            <Chip tone={status.tone} className="shrink-0 !px-2 !py-0.5 !text-[9.5px]">
              {status.label}
            </Chip>
          </div>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[10.5px] text-fg-muted">
            {activity.place_label && (
              <span className="flex min-w-0 items-center gap-1">
                <MapPin aria-hidden="true" size={11} className="shrink-0" />
                <span className="truncate">{activity.place_label}</span>
              </span>
            )}
            {activity.duration_minutes && (
              <span className="flex items-center gap-1">
                <CalendarClock aria-hidden="true" size={11} /> circa {activity.duration_minutes} min
              </span>
            )}
          </p>
          {activity.note && <p className="mt-0.5 text-[11px] leading-relaxed text-fg-muted">{activity.note}</p>}
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          {goingMembers.length > 0 ? (
            <>
              <AvatarGroup people={goingMembers} max={3} size="xs" />
              <span className="text-[11px] text-fg-muted">
                {going.length} su {members.length}
                {hasMajority && activity.status === 'proposta' && ' · maggioranza'}
              </span>
            </>
          ) : (
            <span className="text-[11px] text-fg-muted">Nessuno si è ancora aggiunto</span>
          )}
          {activity.price_per_person !== null && (
            <span className="text-[11px] font-bold text-fg">
              {formatMoney(activity.price_per_person)} <span className="font-medium text-fg-muted">a persona</span>
            </span>
          )}
        </div>

        {!cancelled && (
          <div className="flex shrink-0 flex-wrap items-center gap-1.5">
            <Button
              size="sm"
              variant={iAmGoing ? 'soft' : activity.status === 'proposta' ? 'primary' : 'outline'}
              aria-pressed={iAmGoing}
              onClick={() => onToggleGoing(activity, !iAmGoing)}
            >
              {iAmGoing ? (
                <>
                  <Check size={14} /> Ci sono
                </>
              ) : activity.status === 'proposta' ? (
                'Vota'
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
                className="flex h-11 w-11 items-center justify-center rounded-full text-fg-muted active:text-danger-text"
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
