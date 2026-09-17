import { WifiOff } from 'lucide-react'
import { useSyncExternalStore } from 'react'
import { useOnline } from '../../lib/online'
import { flushQueue, getQueueSize, subscribeQueue } from '../../lib/offlineQueue'

/** Banner discreto (non modale): stato offline e/o modifiche in coda da sincronizzare. */
export default function ConnectionBanner() {
  const online = useOnline()
  const queueSize = useSyncExternalStore(subscribeQueue, getQueueSize, getQueueSize)
  if (online && queueSize === 0) return null

  const message =
    online && queueSize > 0
      ? `${queueSize} modifiche in attesa di sincronizzazione`
      : queueSize > 0
        ? `Sei offline — ${queueSize} modifiche in coda, partiranno al ritorno online`
        : 'Sei offline — le modifiche partiranno al ritorno online'

  return (
    <div
      role="status"
      className="sticky inset-x-0 top-0 z-20 mx-auto flex items-center justify-center gap-2 bg-ink-deep px-4 py-2 text-coral"
      style={{ animation: 'fade-slide-down 0.22s ease-out' }}
    >
      <WifiOff size={13} />
      <span className="text-xs">{message}</span>
      {online && queueSize > 0 && <button type="button" onClick={() => void flushQueue()} className="min-h-11 shrink-0 px-2 text-sm underline">Riprova</button>}
    </div>
  )
}
