import { X } from 'lucide-react'
import type { ReactNode } from 'react'

interface BottomSheetProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
}

export default function BottomSheet({ open, onClose, title, children }: BottomSheetProps) {
  return (
    <div
      className={`fixed inset-0 z-30 transition-opacity duration-300 ${
        open ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
      }`}
    >
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div
        className={`absolute inset-x-0 bottom-0 mx-auto max-w-lg rounded-t-[28px] border-t border-border-strong bg-highlight-to px-6 pb-8 pt-3 transition-transform duration-300 ${
          open ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-border-dashed" />
        <div className="mb-4 flex items-center justify-between">
          <p className="font-serif text-[17px] text-cream">{title}</p>
          <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-full bg-ink">
            <X size={13} className="text-muted" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
