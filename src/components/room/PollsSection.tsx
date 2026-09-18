import { BarChart3, Check, Plus, Trash2, X } from 'lucide-react'
import { type FormEvent, useMemo, useState } from 'react'
import BottomSheet from '../ui/BottomSheet'
import Button from '../ui/Button'
import Card from '../ui/Card'
import Chip from '../ui/Chip'
import EmptyState from '../ui/EmptyState'
import SectionHeader from '../ui/SectionHeader'
import TextField from '../ui/TextField'
import { mutateNotify } from '../../lib/db'
import { fromDatetimeLocal } from '../../lib/format'
import { useRoomOptimistic } from '../../hooks/useRoomOptimistic'
import {
  castPollVote,
  closePoll,
  deletePoll,
  insertPoll,
  insertPollOption,
  retractPollVote,
} from '../../lib/mutations'
import { sortPolls, tallyPoll } from '../../lib/polls'
import type { Member, RoomPoll, RoomPollOption, RoomPollVote } from '../../types'

// "Sondaggio di gruppo" dei mockup. Le decisioni che nelle chat diventano
// venti messaggi e nessuna conclusione ("io direi il mare", "per me uguale")
// qui sono una domanda con risposte contate.
//
// Non c'è un pulsante "vedi chi ha votato cosa": il conteggio serve a
// decidere, sapere chi ha votato cosa serve solo a discuterne dopo.

const MAX_OPTIONS = 6
const EMPTY_OPTIONS = ['', '']

interface PollsSectionProps {
  roomId: string
  currentMember: Member
  memberCount: number
  polls: RoomPoll[]
  pollOptions: RoomPollOption[]
  pollVotes: RoomPollVote[]
}

export default function PollsSection({
  roomId,
  currentMember,
  memberCount,
  polls,
  pollOptions,
  pollVotes,
}: PollsSectionProps) {
  const optimistic = useRoomOptimistic(roomId)
  const [creating, setCreating] = useState(false)
  const [question, setQuestion] = useState('')
  const [labels, setLabels] = useState<string[]>(EMPTY_OPTIONS)
  const [closesAt, setClosesAt] = useState('')
  const [saving, setSaving] = useState(false)

  const ordered = useMemo(() => sortPolls(polls), [polls])
  const filled = labels.map((label) => label.trim()).filter(Boolean)
  // Due opzioni distinte sono il minimo perché sia una domanda e non un
  // annuncio; il vincolo di unicità è anche sul database.
  const canSubmit = question.trim().length > 0 && new Set(filled).size >= 2

  function openSheet() {
    setQuestion('')
    setLabels(EMPTY_OPTIONS)
    setClosesAt('')
    setCreating(true)
  }

  async function createPoll(event: FormEvent) {
    event.preventDefault()
    if (saving || !canSubmit) return
    setSaving(true)
    try {
      const pollId = crypto.randomUUID()
      const { error } = await mutateNotify(
        'room_polls.insert',
        insertPoll(pollId, roomId, currentMember.id, question, fromDatetimeLocal(closesAt)),
        'Sondaggio non creato.',
      )
      if (error) return
      // Opzioni una per una: se la rete cade a metà, la coda offline riprende
      // da quelle mancanti invece di duplicare l'intero sondaggio.
      for (const label of [...new Set(filled)]) {
        await mutateNotify(
          'room_poll_options.insert',
          insertPollOption(crypto.randomUUID(), pollId, label),
          'Un’opzione non è stata salvata.',
        )
      }
      setCreating(false)
    } finally {
      setSaving(false)
    }
  }

  function vote(poll: RoomPoll, optionId: string, isMine: boolean) {
    // Ritoccare la propria opzione la ritira: cambiare idea e non avere più
    // un'opinione sono due esiti diversi, e servono entrambi.
    optimistic(
      isMine ? 'room_poll_votes.retract' : 'room_poll_votes.cast',
      (prev) => {
        const others = prev.pollVotes.filter(
          (item) => !(item.poll_id === poll.id && item.member_id === currentMember.id),
        )
        return {
          ...prev,
          pollVotes: isMine
            ? others
            : [
                ...others,
                {
                  poll_id: poll.id,
                  option_id: optionId,
                  member_id: currentMember.id,
                  room_id: roomId,
                  voted_at: new Date().toISOString(),
                },
              ],
        }
      },
      () =>
        isMine
          ? retractPollVote(poll.id, currentMember.id)
          : castPollVote(poll.id, currentMember.id, optionId),
      'Voto non salvato.',
    )
  }

  function close(poll: RoomPoll) {
    const closedAt = new Date().toISOString()
    optimistic(
      'room_polls.close',
      (prev) => ({
        ...prev,
        polls: prev.polls.map((item) => (item.id === poll.id ? { ...item, closes_at: closedAt } : item)),
      }),
      () => closePoll(poll.id, closedAt),
      'Sondaggio non chiuso.',
    )
  }

  function remove(poll: RoomPoll) {
    if (!window.confirm(`Eliminare "${poll.question}"? Anche i voti andranno persi.`)) return
    optimistic(
      'room_polls.delete',
      (prev) => ({
        ...prev,
        polls: prev.polls.filter((item) => item.id !== poll.id),
        pollOptions: prev.pollOptions.filter((item) => item.poll_id !== poll.id),
        pollVotes: prev.pollVotes.filter((item) => item.poll_id !== poll.id),
      }),
      () => deletePoll(poll.id),
      'Sondaggio non eliminato.',
    )
  }

  return (
    <>
      <SectionHeader
        icon={BarChart3}
        title="Sondaggi"
        hint="Le decisioni di gruppo, contate"
        action={
          <Button size="sm" variant="surface" onClick={openSheet}>
            <Plus size={15} /> Nuovo
          </Button>
        }
      />

      {ordered.length === 0 ? (
        <EmptyState
          icon={BarChart3}
          title="Nessun sondaggio"
          hint="Una domanda con due o più risposte: il gruppo vota e la decisione resta scritta."
          action={
            <Button variant="surface" size="sm" onClick={openSheet}>
              <Plus size={15} /> Crea un sondaggio
            </Button>
          }
        />
      ) : (
        <ul className="space-y-3">
          {ordered.map((poll) => {
            const tally = tallyPoll(poll, pollOptions, pollVotes, memberCount, currentMember.id)
            const canManage = poll.created_by === currentMember.id || currentMember.role === 'creator'
            return (
              <li key={poll.id}>
                <Card>
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-[15px] font-semibold leading-snug text-fg">{poll.question}</h3>
                    {!tally.open && <Chip tone="muted">Chiuso</Chip>}
                  </div>

                  <ul className="mt-3 space-y-2">
                    {tally.options.map((row) => {
                      const isMine = tally.myOptionId === row.option.id
                      const percent = Math.round(row.fraction * 100)
                      return (
                        <li key={row.option.id}>
                          <button
                            type="button"
                            disabled={!tally.open}
                            aria-pressed={isMine}
                            onClick={() => vote(poll, row.option.id, isMine)}
                            className={`w-full rounded-2xl border px-3 py-2.5 text-left transition-colors disabled:cursor-default ${
                              isMine ? 'border-accent bg-accent/8' : 'border-line hover:bg-canvas disabled:hover:bg-transparent'
                            }`}
                          >
                            <span className="flex items-center gap-2.5">
                              <span
                                aria-hidden="true"
                                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                                  isMine ? 'border-accent bg-accent text-on-accent' : 'border-line-strong'
                                }`}
                              >
                                {isMine && <Check size={12} strokeWidth={3} />}
                              </span>
                              <span className="min-w-0 flex-1 truncate text-[14px] text-fg">{row.option.label}</span>
                              <span className="shrink-0 font-mono text-[12px] tabular-nums text-fg-muted">
                                {percent}%
                              </span>
                            </span>
                            <span
                              aria-hidden="true"
                              className="mt-2 block h-1.5 overflow-hidden rounded-full bg-canvas"
                            >
                              <span
                                className={`block h-full rounded-full ${row.leading ? 'bg-accent' : 'bg-line-strong'}`}
                                style={{ width: `${percent}%` }}
                              />
                            </span>
                          </button>
                        </li>
                      )
                    })}
                  </ul>

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3 text-[12px] text-fg-muted">
                    <span>
                      {tally.totalVotes === 0
                        ? 'Ancora nessun voto'
                        : `${tally.totalVotes} vot${tally.totalVotes === 1 ? 'o' : 'i'}`}
                      {tally.open && tally.missingVotes > 0 && ` · mancano ${tally.missingVotes}`}
                    </span>
                    {canManage && (
                      <span className="flex items-center gap-1">
                        {tally.open && (
                          <button
                            type="button"
                            onClick={() => close(poll)}
                            className="inline-flex min-h-9 items-center gap-1 rounded-full px-2.5 text-fg-muted hover:text-fg"
                          >
                            <X size={14} /> Chiudi
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => remove(poll)}
                          aria-label={`Elimina ${poll.question}`}
                          className="inline-flex min-h-9 items-center rounded-full px-2.5 text-fg-muted hover:text-danger"
                        >
                          <Trash2 size={14} />
                        </button>
                      </span>
                    )}
                  </div>
                </Card>
              </li>
            )
          })}
        </ul>
      )}

      <BottomSheet open={creating} onClose={() => { if (!saving) setCreating(false) }} title="Nuovo sondaggio">
        <form onSubmit={createPoll} className="space-y-5" aria-busy={saving}>
          <TextField
            label="Cosa dovete decidere?"
            placeholder="Es. Dove ceniamo sabato?"
            autoFocus
            required
            maxLength={120}
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
          />

          <fieldset className="space-y-2">
            <legend className="mb-1 text-sm font-medium">Le risposte possibili</legend>
            {labels.map((label, index) => (
              <TextField
                key={index}
                label={`Opzione ${index + 1}`}
                maxLength={80}
                value={label}
                onChange={(event) =>
                  setLabels((prev) => prev.map((item, i) => (i === index ? event.target.value : item)))
                }
              />
            ))}
            {labels.length < MAX_OPTIONS && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setLabels((prev) => [...prev, ''])}
              >
                <Plus size={15} /> Aggiungi opzione
              </Button>
            )}
          </fieldset>

          <label className="block text-sm font-medium">
            Scade il (opzionale)
            <input
              type="datetime-local"
              value={closesAt}
              onChange={(event) => setClosesAt(event.target.value)}
              className="mt-2 min-h-12 w-full rounded-xl border border-line-strong bg-canvas px-3 text-base text-fg"
            />
            <span className="mt-1 block text-[12px] font-normal text-fg-muted">
              Senza scadenza resta aperto finché non lo chiudi.
            </span>
          </label>

          <Button type="submit" className="w-full" disabled={saving || !canSubmit}>
            {saving ? 'Creazione…' : 'Crea sondaggio'}
          </Button>
        </form>
      </BottomSheet>
    </>
  )
}
