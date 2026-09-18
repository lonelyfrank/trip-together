import { ChevronRight, ClipboardList, Link2, Pin, Plus } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import Button from '../ui/Button'
import Card from '../ui/Card'
import { useRoomOptimistic } from '../../hooks/useRoomOptimistic'
import { compareRows } from '../../lib/collectionOrder'
import { mutateNotify } from '../../lib/db'
import { insertBoardLink, insertBoardNote, toggleBoardNotePin } from '../../lib/mutations'
import type { BoardLink, BoardNote, Member, RoomChecklistItem } from '../../types'
import ChecklistSection from './ChecklistSection'

interface BachecaTabProps {
  roomId: string
  currentMember: Member
  members: Member[]
  boardNotes: BoardNote[]
  boardLinks: BoardLink[]
  roomChecklistItems: RoomChecklistItem[]
}

export default function BachecaTab({
  roomId,
  currentMember,
  members,
  boardNotes,
  boardLinks,
  roomChecklistItems,
}: BachecaTabProps) {
  const [addingNote, setAddingNote] = useState(false)
  const [noteText, setNoteText] = useState('')
  const [notePinned, setNotePinned] = useState(false)

  const [addingLink, setAddingLink] = useState(false)
  const [linkLabel, setLinkLabel] = useState('')
  const [linkUrl, setLinkUrl] = useState('')
  const optimistic = useRoomOptimistic(roomId)

  const notes = [...boardNotes].sort((a, b) => Number(b.pinned) - Number(a.pinned) || compareRows(a, b, ['created_at', 'id']))

  async function addNote(e: FormEvent) {
    e.preventDefault()
    if (!noteText.trim()) return
    const { error } = await mutateNotify('board_notes.insert', insertBoardNote(roomId, noteText, notePinned), 'Nota non salvata.')
    if (error) return
    setNoteText('')
    setNotePinned(false)
    setAddingNote(false)
  }

  function togglePin(note: BoardNote) {
    optimistic(
      'board_notes.togglePin',
      (prev) => ({
        ...prev,
        boardNotes: prev.boardNotes.map((n) => (n.id === note.id ? { ...n, pinned: !n.pinned } : n)),
      }),
      () => toggleBoardNotePin(note.id, !note.pinned),
      'Nota non aggiornata.',
    )
  }

  async function addLink(e: FormEvent) {
    e.preventDefault()
    if (!linkLabel.trim() || !linkUrl.trim()) return
    const { error } = await mutateNotify('board_links.insert', insertBoardLink(roomId, linkLabel, linkUrl), 'Link non salvato.')
    if (error) return
    setLinkLabel('')
    setLinkUrl('')
    setAddingLink(false)
  }

  function normalizedHref(url: string) {
    return /^https?:\/\//i.test(url) ? url : `https://${url}`
  }

  return (
    <div className="space-y-3">
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">Note</p>
      <div className="space-y-2">
        {notes.map((n) => (
          <Card key={n.id} tone={n.pinned ? 'highlight' : 'surface'} className="flex gap-2.5 !p-3.5">
            <ClipboardList size={15} className={`mt-0.5 shrink-0 ${n.pinned ? 'text-amber' : 'text-muted'}`} />
            <p className="flex-1 text-[13px] leading-relaxed text-cream">{n.text}</p>
            <button onClick={() => togglePin(n)} className="shrink-0">
              <Pin size={14} className={n.pinned ? 'fill-amber text-amber' : 'text-muted'} />
            </button>
          </Card>
        ))}
        {notes.length === 0 && <p className="text-sm text-muted">Nessuna nota ancora.</p>}
      </div>

      {addingNote ? (
        <form onSubmit={addNote} className="flex flex-col gap-2">
          <textarea
            autoFocus
            className="rounded-lg border border-border-soft bg-surface px-3 py-2 text-[13px] text-cream placeholder:text-muted"
            placeholder="Scrivi una nota..."
            rows={2}
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
          />
          <label className="flex items-center gap-2 text-[12px] text-muted">
            <input type="checkbox" checked={notePinned} onChange={(e) => setNotePinned(e.target.checked)} />
            Fissa in alto
          </label>
          <div className="flex gap-2">
            <Button type="submit" size="sm" variant="teal">
              Aggiungi
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => setAddingNote(false)}>
              Annulla
            </Button>
          </div>
        </form>
      ) : (
        <Button variant="surface" className="w-full" onClick={() => setAddingNote(true)}>
          <Plus size={15} /> Aggiungi nota
        </Button>
      )}

      <div className="border-t border-border-soft pt-3">
        <ChecklistSection roomId={roomId} currentMember={currentMember} members={members} items={roomChecklistItems} />
      </div>

      <p className="pt-2 font-mono text-[10px] uppercase tracking-[0.2em] text-muted">Link utili</p>
      <div className="space-y-2">
        {boardLinks.map((l) => (
          <a
            key={l.id}
            href={normalizedHref(l.url)}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-between rounded-2xl bg-surface/60 p-3.5 transition-transform active:scale-[0.98]"
          >
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-ink">
                <Link2 size={13} className="text-teal" />
              </div>
              <div>
                <p className="text-[13px] text-cream">{l.label}</p>
                <p className="font-mono text-[10px] text-muted">{l.url}</p>
              </div>
            </div>
            <ChevronRight size={14} className="text-muted" />
          </a>
        ))}
        {boardLinks.length === 0 && <p className="text-sm text-muted">Nessun link ancora.</p>}
      </div>

      {addingLink ? (
        <form onSubmit={addLink} className="flex flex-col gap-2">
          <input
            autoFocus
            className="rounded-lg border border-border-soft bg-surface px-3 py-2 text-[13px] text-cream placeholder:text-muted"
            placeholder="Etichetta (es. Biglietti concerto)"
            value={linkLabel}
            onChange={(e) => setLinkLabel(e.target.value)}
          />
          <input
            className="rounded-lg border border-border-soft bg-surface px-3 py-2 text-[13px] text-cream placeholder:text-muted"
            placeholder="URL"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
          />
          <div className="flex gap-2">
            <Button type="submit" size="sm" variant="teal">
              Aggiungi
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => setAddingLink(false)}>
              Annulla
            </Button>
          </div>
        </form>
      ) : (
        <Button variant="surface" className="w-full" onClick={() => setAddingLink(true)}>
          <Plus size={15} /> Aggiungi link
        </Button>
      )}
    </div>
  )
}
