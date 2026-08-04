import { Check, Circle, Plus } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import Button from '../ui/Button'
import { useRoomOptimistic } from '../../hooks/useRoomOptimistic'
import { mutate } from '../../lib/db'
import { supabase } from '../../lib/supabase'
import type { Member, RoomChecklistItem } from '../../types'

interface ChecklistSectionProps {
  roomId: string
  currentMember: Member
  members: Member[]
  items: RoomChecklistItem[]
}

export default function ChecklistSection({ roomId, currentMember, members, items }: ChecklistSectionProps) {
  const [adding, setAdding] = useState(false)
  const [title, setTitle] = useState('')
  const optimistic = useRoomOptimistic(roomId)

  const memberById = (id: string | null) => members.find((m) => m.id === id)

  async function addItem(e: FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    await mutate(
      'room_checklist_items.insert',
      supabase.from('room_checklist_items').insert({ room_id: roomId, title: title.trim(), created_by: currentMember.id }),
    )
    setTitle('')
    setAdding(false)
  }

  function selfAssign(item: RoomChecklistItem) {
    optimistic(
      'room_checklist_items.selfAssign',
      (prev) => ({
        ...prev,
        roomChecklistItems: prev.roomChecklistItems.map((i) =>
          i.id === item.id ? { ...i, assigned_to: currentMember.id } : i,
        ),
      }),
      () => supabase.from('room_checklist_items').update({ assigned_to: currentMember.id }).eq('id', item.id),
      'Assegnazione non salvata.',
    )
  }

  function toggleStatus(item: RoomChecklistItem) {
    const canToggle = currentMember.role === 'creator' || item.assigned_to === currentMember.id
    if (!canToggle) return
    const next = item.status === 'portato' ? 'da_portare' : 'portato'
    optimistic(
      'room_checklist_items.toggleStatus',
      (prev) => ({
        ...prev,
        roomChecklistItems: prev.roomChecklistItems.map((i) => (i.id === item.id ? { ...i, status: next } : i)),
      }),
      () => supabase.from('room_checklist_items').update({ status: next }).eq('id', item.id),
      'Modifica checklist non salvata.',
    )
  }

  return (
    <div className="space-y-2">
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">Cosa portiamo (tutta la comitiva)</p>
      <div className="space-y-1.5">
        {items.map((item) => {
          const assignee = memberById(item.assigned_to)
          const canToggle = currentMember.role === 'creator' || item.assigned_to === currentMember.id
          return (
            <div key={item.id} className="flex items-center gap-2 rounded-xl bg-surface/60 px-3.5 py-2.5">
              <button onClick={() => toggleStatus(item)} disabled={!canToggle} className="shrink-0">
                {item.status === 'portato' ? (
                  <Check size={15} className="text-teal" />
                ) : (
                  <Circle size={15} className={canToggle ? 'text-border-dashed' : 'text-border-soft'} />
                )}
              </button>
              <span className={`flex-1 text-[12.5px] ${item.status === 'portato' ? 'text-muted line-through' : 'text-cream'}`}>
                {item.title}
              </span>
              {assignee ? (
                <span className="shrink-0 font-mono text-[10px] text-muted">{assignee.display_name}</span>
              ) : (
                <button onClick={() => selfAssign(item)} className="shrink-0 font-mono text-[10px] text-teal underline">
                  non assegnato
                </button>
              )}
            </div>
          )
        })}
        {items.length === 0 && <p className="text-sm text-muted">Nessuna voce ancora.</p>}
      </div>

      {adding ? (
        <form onSubmit={addItem} className="flex gap-2">
          <input
            autoFocus
            className="flex-1 rounded-lg border border-border-soft bg-surface px-3 py-2 text-[13px] text-cream placeholder:text-muted"
            placeholder="Es. Ghiaccio, altoparlante, ombrelloni..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <Button type="submit" size="sm" variant="teal">
            Ok
          </Button>
        </form>
      ) : (
        <Button variant="surface" className="w-full" onClick={() => setAdding(true)}>
          <Plus size={15} /> Aggiungi voce
        </Button>
      )}
    </div>
  )
}
