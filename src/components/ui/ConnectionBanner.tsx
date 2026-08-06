import { WifiOff } from 'lucide-react'
import { useSyncExternalStore } from 'react'
import { useOnline } from '../../lib/online'
import { getQueueSize, subscribeQueue } from '../../lib/offlineQueue'

/** Banner discreto (non modale): stato offline e/o modifiche in coda da sincronizzare. */
export default function ConnectionBanner() {
  const online = useOnline()
  const queueSize = useSyncExternalStore(subscribeQueue, getQueueSize, getQueueSize)
  if (online && queueSize === 0) return null

  const message =
    online && queueSize > 0
      ? `Sincronizzazione di ${queueSize} modifiche in corso…`
      : queueSize > 0
        ? `Sei offline — ${queueSize} modifiche in coda, partiranno al ritorno online`
        : 'Sei offline — le modifiche partiranno al ritorno online'

  return (
    <div className="fixed inset-x-0 top-0 z-50 mx-auto flex max-w-lg items-center justify-center gap-2 bg-coral/15 px-4 py-1.5 text-coral backdrop-blur">
      <WifiOff size={13} />
      <span className="font-mono text-[11px]">{message}</span>
    </div>
  )
}
