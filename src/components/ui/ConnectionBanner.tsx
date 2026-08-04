import { WifiOff } from 'lucide-react'
import { useOnline } from '../../lib/online'

/** Banner discreto (non modale) mostrato quando si è offline. */
export default function ConnectionBanner() {
  const online = useOnline()
  if (online) return null

  return (
    <div className="fixed inset-x-0 top-0 z-50 mx-auto flex max-w-lg items-center justify-center gap-2 bg-coral/15 px-4 py-1.5 text-coral backdrop-blur">
      <WifiOff size={13} />
      <span className="font-mono text-[11px]">Sei offline — le modifiche partiranno al ritorno online</span>
    </div>
  )
}
