import Avatar from '../ui/Avatar'
import Card from '../ui/Card'
import Chip from '../ui/Chip'
import ProgressBar from '../ui/ProgressBar'
import { formatMoney } from '../../lib/format'
import type { PaymentsSummary } from '../../lib/payments'

// "Spese condivise" + "Chi ha pagato" dei mockup, uniti in una card sola:
// erano due riquadri affiancati che ripetevano gli stessi importi.
//
// Il pulsante "Sollecita pagamento" del mockup non è qui: non esiste alcun
// canale di notifica nel progetto, e un bottone che non fa arrivare niente a
// nessuno è peggio della sua assenza.
interface PaymentsSummaryCardProps {
  summary: PaymentsSummary
  currentMemberId: string
  dataIncomplete: boolean
}

export default function PaymentsSummaryCard({
  summary,
  currentMemberId,
  dataIncomplete,
}: PaymentsSummaryCardProps) {
  const { total, perPerson, settledAmount, outstanding, rows } = summary
  // Chi ha un conto aperto va in cima: è lì che serve guardare.
  const ordered = [...rows].sort(
    (a, b) => Number(a.settled) - Number(b.settled) || a.displayName.localeCompare(b.displayName, 'it'),
  )

  return (
    <Card>
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-fg-muted">Totale spese</p>
          <p className="mt-1 font-serif text-3xl text-fg">{formatMoney(total)}</p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-fg-muted">A persona</p>
          <p className="mt-1 font-serif text-2xl text-fg">{formatMoney(perPerson)}</p>
        </div>
      </div>

      {dataIncomplete ? (
        <p className="mt-4 text-[13px] leading-relaxed text-danger">
          Alcune spese sono incomplete: i saldi mostrati non sono affidabili.
        </p>
      ) : (
        <>
          <ProgressBar
            className="mt-4"
            value={settledAmount}
            max={total}
            tone={outstanding > 0 ? 'warn' : 'ok'}
            label="Quota già sistemata"
          />
          <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-fg-muted">
            <span className="flex items-center gap-1.5">
              <span aria-hidden="true" className={`h-2 w-2 rounded-full ${outstanding > 0 ? 'bg-warn' : 'bg-ok'}`} />
              {formatMoney(settledAmount)} a posto
            </span>
            <span className="flex items-center gap-1.5">
              <span aria-hidden="true" className="h-2 w-2 rounded-full bg-canvas ring-1 ring-line-strong" />
              {formatMoney(outstanding)} da saldare
            </span>
          </p>
        </>
      )}

      {rows.length > 0 && (
        <ul className="mt-4 space-y-1 border-t border-line pt-3">
          {ordered.map((row) => (
            <li key={row.memberId} className="flex items-center justify-between gap-3 py-1.5">
              <span className="flex min-w-0 items-center gap-2.5">
                <Avatar name={row.displayName} seed={row.memberId} size="sm" />
                <span className="min-w-0 truncate text-[13px] text-fg">
                  {row.displayName}
                  {row.memberId === currentMemberId && <span className="text-fg-muted"> (tu)</span>}
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-2">
                <span className="font-mono text-[12px] tabular-nums text-fg-muted">{formatMoney(row.paid)}</span>
                {dataIncomplete ? null : row.settled ? (
                  <Chip tone="ok">a posto</Chip>
                ) : row.net > 0 ? (
                  <Chip tone="info">riceve {formatMoney(row.net)}</Chip>
                ) : (
                  <Chip tone="danger">deve {formatMoney(-row.net)}</Chip>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
