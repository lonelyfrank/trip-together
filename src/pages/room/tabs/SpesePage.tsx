import { Car, ChevronRight, Plus, Send, Users } from 'lucide-react'
import { useState } from 'react'
import { CoinsIcon } from '../../../components/icons'
import SpeseTab from '../../../components/room/SpeseTab'
import TripHero from '../../../components/room/TripHero'
import { expenseCategory } from '../../../components/room/expenseCategory'
import AlertBanner from '../../../components/ui/AlertBanner'
import Avatar from '../../../components/ui/Avatar'
import Button from '../../../components/ui/Button'
import Card from '../../../components/ui/Card'
import { ICON_TONES } from '../../../components/ui/iconTones'
import Chip from '../../../components/ui/Chip'
import PageTitle from '../../../components/ui/PageTitle'
import ProgressBar from '../../../components/ui/ProgressBar'
import { useRoomContext } from '../../../hooks/useRoomContext'
import { computeBalances, computeTransfers } from '../../../lib/balances'
import { formatEuro, formatMoney } from '../../../lib/format'
import { computePayments } from '../../../lib/payments'
import { shareOrCopy } from '../../../lib/share'

const LEDGER_ANCHOR = 'spese-gestione'

function scrollToLedger() {
  document.getElementById(LEDGER_ANCHOR)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

const shortDate = (iso: string) => new Date(iso).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })


// Spese: i conti del gruppo in una schermata. Le spese dell'auto restano
// separate (le gestisce la tab Auto) e la card che lo dice non si toglie:
// è il vincolo "mai mescolare le spese tra auto diverse" reso visibile.
export default function SpesePage() {
  const ctx = useRoomContext()
  const { room, currentMember, members, dataIncomplete, phase, sectionErrors, refetch, goTo } = ctx
  const [adding, setAdding] = useState(false)
  const [nudged, setNudged] = useState(false)

  const summary = computePayments(ctx)
  const transfers = dataIncomplete ? [] : computeTransfers(computeBalances(ctx))
  const memberName = (id: string | null) => members.find((m) => m.id === id)?.display_name ?? '—'
  const settledPct = summary.total > 0 ? Math.round((summary.settledAmount / summary.total) * 100) : 0

  const rows = [...summary.rows].sort((a, b) => b.paid - a.paid || a.displayName.localeCompare(b.displayName, 'it'))
  const general = [...ctx.generalExpenses].filter((e) => !e.waived).reverse()
  const participantsOf = (expenseId: string) =>
    ctx.generalExpenseParticipants.filter((p) => p.expense_id === expenseId).length

  // Ultime attività: spese (anche dell'auto) e rimborsi, dalla più recente.
  const activity = [
    ...ctx.generalExpenses.filter((e) => !e.waived).map((e) => ({
      id: e.id, at: e.created_at, label: e.label, detail: `Pagato da ${memberName(e.paid_by_member_id)}`, amount: e.amount, kind: 'expense' as const,
    })),
    ...ctx.carExpenses.map((e) => ({
      id: e.id, at: e.created_at, label: e.label, detail: `Auto · pagato da ${memberName(e.paid_by_member_id)}`, amount: e.amount, kind: 'car' as const,
    })),
    ...ctx.settlements.map((s) => ({
      id: s.id, at: s.created_at, label: 'Rimborso', detail: `${memberName(s.from_member_id)} → ${memberName(s.to_member_id)}`, amount: s.amount, kind: 'settlement' as const,
    })),
  ]
    .sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
    .slice(0, 3)

  // "Sollecita pagamento": non esiste un canale di notifica nell'app, quindi
  // il sollecito è un messaggio pronto da mandare nella chat del gruppo, con
  // chi deve cosa a chi.
  async function nudge() {
    if (transfers.length === 0) return
    const lines = transfers.map((t) => `• ${memberName(t.fromMemberId)} → ${memberName(t.toMemberId)}: ${formatMoney(t.amount)}`)
    const result = await shareOrCopy({
      title: `Conti di "${room.title}"`,
      text: `Mancano ancora questi rimborsi per "${room.title}":\n${lines.join('\n')}\n\nQuando avete fatto, segnatelo su Trip Together.`,
      url: `${window.location.origin}/room/${room.id}?tab=spese`,
    })
    if (result === 'copied') {
      setNudged(true)
      setTimeout(() => setNudged(false), 1800)
    }
  }

  if (sectionErrors.spese) {
    return (
      <div className="flex flex-col gap-2.5">
        <TripHero room={room} phase={phase} size="compact" />
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
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      <TripHero room={room} phase={phase} size="compact" />
      <PageTitle
        title="Spese"
        hint="Conti chiari, saldi veloci"
        icon={CoinsIcon}
        className="mt-2.5"
        action={
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="press press-btn flex h-11 items-center"
          >
            <span className="flex h-[31px] items-center gap-1.5 rounded-[10px] border border-line bg-surface pl-2 pr-[11px] text-[11.5px] font-bold text-fg shadow-card">
              <span className="flex h-[17px] w-[17px] items-center justify-center rounded-full bg-brand">
                <Plus aria-hidden="true" size={11} strokeWidth={3} className="text-white" />
              </span>
              Aggiungi spesa
            </span>
          </button>
        }
      />

      {dataIncomplete && (
        <AlertBanner tone="danger" title="Alcune spese sono incomplete" className="mt-[9px]">
          Manca chi ha pagato o chi divide: i saldi non sono affidabili finché non si sistemano.
        </AlertBanner>
      )}

      <section
        aria-label="Saldo del gruppo"
        className="mt-[9px] flex min-h-[128px] shrink-0 gap-2.5 overflow-hidden rounded-card border border-line bg-surface px-[11px] py-[9px] shadow-card"
      >
        <div className="relative min-w-0 flex-1">
          <div className="flex items-center gap-[5px]">
            <h3 className="text-[12.5px] font-bold text-fg">Saldo del gruppo</h3>
            <span
              title="Totale delle spese del gruppo e delle auto; la barra è la parte già sistemata."
              className="flex h-[13px] w-[13px] items-center justify-center rounded-full bg-track text-[9px] font-bold text-fg-muted"
            >
              i
            </span>
            <Chip tone={summary.outstanding > 0 ? 'brand' : 'grey'} className="ml-auto !px-[9px] !text-[10px]">
              {summary.outstanding > 0 ? 'Da saldare' : summary.total > 0 ? 'Tutto saldato' : 'Nessuna spesa'}
            </Chip>
          </div>
          <p className="mt-[11px] text-[29px] font-bold leading-none tracking-[-0.8px] text-fg">
            {formatEuro(summary.total, 'always')}
          </p>
          <ProgressBar value={summary.settledAmount} max={summary.total} height={13} label="Quota già sistemata" className="mt-[13px]" />
          <div className="mt-2 flex justify-between">
            <div>
              <p className="text-[12.5px] font-bold leading-[1.1] text-fg">{formatEuro(summary.settledAmount)}</p>
              <p className="mt-0.5 text-[10.5px] leading-[1.25] text-fg-muted">a posto ({settledPct}%)</p>
            </div>
            <div className="text-right">
              <p className="text-[12.5px] font-bold leading-[1.1] text-fg">{formatEuro(summary.outstanding)}</p>
              <p className="mt-0.5 text-[10.5px] leading-[1.25] text-fg-muted">
                da saldare ({summary.total > 0 ? 100 - settledPct : 0}%)
              </p>
            </div>
          </div>
        </div>
        <div className="relative h-[109px] w-[115px] shrink-0 rounded-card bg-brand-tint p-[9px] max-[379px]:hidden">
          <div className="flex items-center gap-1.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface">
              <Users aria-hidden="true" size={17} className="text-brand-button" />
            </span>
            <p className="text-[10px] font-semibold leading-[1.15] text-fg">
              {members.length} {members.length === 1 ? 'viaggiatore' : 'viaggiatori'}
              <br />
              <span className="font-medium text-fg-muted">insieme</span>
            </p>
          </div>
          <Send aria-hidden="true" size={13} strokeWidth={1.6} className="absolute right-2 top-[30px] text-brand/50" />
          <p
            aria-hidden="true"
            className="font-hand absolute bottom-[7px] left-[9px] -rotate-[9deg] text-[15px] leading-[0.95] text-fg-soft"
          >
            Piccole spese
            <br />
            grandi ricordi ♡
          </p>
        </div>
      </section>

      <div className="mt-[7px] grid grid-cols-2 gap-[7px]">
        <Card onClick={scrollToLedger} label="Chi ha pagato: vedi tutti" className="min-h-[191px]">
          <CardHeader title="Chi ha pagato?" />
          <ul className="mt-[3px]">
            {rows.slice(0, 6).map((row) => (
              <li key={row.memberId} className="flex h-[27px] items-center gap-1.5">
                <Avatar name={row.displayName} seed={row.memberId} size={25} />
                <span className="min-w-0 flex-1 truncate text-[11.5px] font-semibold text-fg">{row.displayName}</span>
                <span
                  className={`shrink-0 text-[11.5px] font-semibold ${
                    !dataIncomplete && row.net < -0.01 ? 'max-[400px]:text-danger-text' : 'text-fg'
                  }`}
                >
                  {formatEuro(row.paid)}
                </span>
                <span className="shrink-0 max-[400px]:hidden [&>span]:!px-1.5 [&>span]:!text-[9px]">
                  {dataIncomplete ? null : row.net < -0.01 ? (
                    <Chip tone="danger" size="sm">Deve ancora</Chip>
                  ) : row.paid > 0 ? (
                    <Chip tone="brand" size="sm">Ha pagato</Chip>
                  ) : (
                    <Chip tone="grey" size="sm">In pari</Chip>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </Card>

        <Card onClick={scrollToLedger} label="Riepilogo per persona: vedi tutti" className="min-h-[191px]">
          <CardHeader title="Riepilogo per persona" />
          <ul className="mt-[3px]">
            {rows.slice(0, 6).map((row) => {
              const positive = row.net > 0.01
              const negative = row.net < -0.01
              return (
                <li key={row.memberId} className="flex h-[27px] items-center gap-1.5">
                  <Avatar name={row.displayName} seed={row.memberId} size={25} />
                  <span className="min-w-0 flex-1 truncate text-[11.5px] font-semibold text-fg">
                    {row.displayName}
                    {row.memberId === currentMember.id && <span className="font-medium text-fg-muted"> (tu)</span>}
                  </span>
                  <span
                    className={`min-w-[46px] rounded-[9px] px-1.5 py-[5px] text-center text-[11.5px] font-bold leading-none ${
                      positive ? 'bg-brand-soft text-brand-text' : negative ? 'bg-danger-soft text-danger-text' : 'bg-grey-soft text-fg-muted'
                    }`}
                  >
                    {dataIncomplete ? '—' : positive ? `+${formatEuro(row.net)}` : negative ? `- ${formatEuro(-row.net)}` : '€ 0'}
                  </span>
                  <ChevronRight aria-hidden="true" size={12} strokeWidth={2.2} className="shrink-0 text-fg-muted" />
                </li>
              )
            })}
          </ul>
        </Card>
      </div>

      <div className="mt-[7px] grid grid-cols-[minmax(0,1.09fr)_minmax(0,1fr)] gap-2">
        <div className="min-h-[196px] overflow-hidden rounded-card border border-line bg-surface p-[9px] shadow-card">
          <div className="flex h-5 items-center justify-between">
            <h3 className="text-[12.5px] font-bold text-fg">Spese generali</h3>
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="press -my-3 -mr-2 flex min-h-11 items-center gap-1 pl-2 pr-2 text-[10px] text-fg-muted"
            >
              Aggiungi
              <span className="flex h-[17px] w-[17px] items-center justify-center rounded-full bg-brand">
                <Plus aria-hidden="true" size={11} strokeWidth={3} className="text-white" />
              </span>
            </button>
          </div>
          <ul className="mt-0.5 h-[135px]">
            {general.length === 0 && (
              <li className="pt-2 text-[10.5px] leading-[1.35] text-fg-muted">
                Casa, pranzi, spesa: tutto quello che il gruppo divide fuori dalle auto.
              </li>
            )}
            {general.slice(0, 3).map((expense) => {
              const category = expenseCategory(expense.label)
              const Icon = category.icon
              const colors = ICON_TONES[category.tone]
              return (
                <li key={expense.id} className="flex h-[45px] items-center gap-[7px]">
                  <span className={`flex h-[33px] w-[33px] shrink-0 items-center justify-center rounded-[9px] ${colors.circle}`}>
                    <Icon aria-hidden="true" size={17} className={colors.icon} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[11.5px] font-bold leading-[1.15] text-fg">{expense.label}</p>
                    <p className="truncate text-[9px] leading-[1.2] text-fg-muted">
                      Pagata da {memberName(expense.paid_by_member_id)} • {participantsOf(expense.id)} persone
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-[11.5px] font-bold leading-[1.15] text-fg">{formatEuro(expense.amount)}</p>
                    <p className="text-[9px] leading-[1.2] text-fg-muted">{shortDate(expense.created_at)}</p>
                  </div>
                </li>
              )
            })}
          </ul>
          <button
            type="button"
            onClick={scrollToLedger}
            className="press mt-[3px] flex h-[22px] w-full items-center justify-center gap-1 rounded-lg bg-grey-soft text-[10px] text-fg"
          >
            Vedi tutte le spese <ChevronRight aria-hidden="true" size={11} strokeWidth={2.2} />
          </button>
        </div>

        <div className="flex min-w-0 flex-col gap-[7px]">
          <button
            type="button"
            onClick={() => goTo('auto')}
            className="press flex h-[66px] items-center gap-2 rounded-card border border-blue/10 bg-blue-soft px-[9px] text-left"
          >
            <span className="flex h-[31px] w-[31px] shrink-0 items-center justify-center rounded-full bg-surface">
              <Car aria-hidden="true" size={17} className="text-blue" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[10.5px] font-bold leading-[1.2] text-fg">Le spese dell’auto restano separate</span>
              <span className="mt-0.5 block text-[8.5px] leading-[1.25] text-fg-muted">
                Carburante, pedaggi e parcheggi sono gestiti nella sezione Auto.
              </span>
            </span>
            <ChevronRight aria-hidden="true" size={12} strokeWidth={2.2} className="shrink-0 text-fg" />
          </button>

          <Card onClick={scrollToLedger} label="Ultime attività: vedi tutte" className="min-h-[123px]">
            <div className="flex h-[18px] items-center justify-between">
              <h3 className="text-[12px] font-bold text-fg">Ultime attività</h3>
              <span className="flex items-center gap-px text-[9px] text-fg-muted">
                Vedi tutte <ChevronRight aria-hidden="true" size={10} strokeWidth={2.2} />
              </span>
            </div>
            <ul className="mt-0.5">
              {activity.length === 0 && (
                <li className="pt-2 text-[10px] leading-[1.35] text-fg-muted">Qui compaiono spese e rimborsi appena registrati.</li>
              )}
              {activity.map((entry) => {
                const category =
                  entry.kind === 'settlement'
                    ? { icon: Send, tone: 'brand' as const }
                    : entry.kind === 'car'
                      ? { icon: Car, tone: 'blue' as const }
                      : expenseCategory(entry.label)
                const Icon = category.icon
                const colors = ICON_TONES[category.tone]
                return (
                  <li key={entry.id} className="flex h-[33px] items-center gap-1.5">
                    <span className={`flex h-[23px] w-[23px] shrink-0 items-center justify-center rounded-[7px] ${colors.circle}`}>
                      <Icon aria-hidden="true" size={13} className={colors.icon} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[10px] font-semibold leading-[1.15] text-fg">{entry.label}</p>
                      <p className="truncate text-[8.5px] leading-[1.2] text-fg-muted">{entry.detail}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-[10.5px] font-bold leading-[1.15] text-fg">{formatEuro(entry.amount)}</p>
                      <p className="text-[8.5px] leading-[1.2] text-fg-muted">{shortDate(entry.at)}</p>
                    </div>
                  </li>
                )
              })}
            </ul>
          </Card>
        </div>
      </div>

      <button
        type="button"
        onClick={nudge}
        disabled={transfers.length === 0}
        className="press press-btn relative mt-1.5 flex h-8 shrink-0 items-center justify-center gap-2 rounded-[10px] bg-gradient-to-b from-brand-button-top to-brand-button text-[13.5px] font-bold text-white shadow-cta disabled:from-track disabled:to-track disabled:text-fg-muted disabled:shadow-none"
      >
        <Send aria-hidden="true" size={15} />
        {transfers.length === 0 ? 'Nessun pagamento da sollecitare' : nudged ? 'Messaggio copiato!' : 'Sollecita pagamento'}
        {transfers.length > 0 && (
          <ChevronRight aria-hidden="true" size={14} strokeWidth={2.4} className="absolute right-[11px]" />
        )}
      </button>

      <section id={LEDGER_ANCHOR} aria-label="Tutte le spese" className="mt-5 flex scroll-mt-2 flex-col gap-3">
        <SpeseTab
          roomId={room.id}
          currentMember={currentMember}
          members={members}
          cars={ctx.cars}
          carPassengers={ctx.carPassengers}
          carExpenses={ctx.carExpenses}
          generalExpenses={ctx.generalExpenses}
          generalExpenseParticipants={ctx.generalExpenseParticipants}
          settlements={ctx.settlements}
          adding={adding}
          onAddingChange={setAdding}
        />
      </section>
    </div>
  )
}

function CardHeader({ title }: { title: string }) {
  return (
    <div className="flex h-5 items-center justify-between">
      <h3 className="truncate text-[12.5px] font-bold text-fg">{title}</h3>
      <span className="flex shrink-0 items-center gap-px text-[10px] text-fg-muted">
        Vedi tutti <ChevronRight aria-hidden="true" size={11} strokeWidth={2.2} />
      </span>
    </div>
  )
}
