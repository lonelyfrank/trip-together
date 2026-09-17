// Toast centralizzato: un solo store esterno (nessuna dipendenza), consumato dal
// componente Toaster via useSyncExternalStore. Chiamabile da qualsiasi punto,
// anche fuori da React (es. dall'helper optimistic al rollback di una mutazione).

export type ToastKind = 'info' | 'error' | 'success'

export interface ToastAction {
  label: string
  onClick: () => void
}

export interface Toast {
  id: number
  message: string
  kind: ToastKind
  action?: ToastAction
  leaving?: boolean
}

// Deve combaciare con la durata della transizione di uscita in Toaster.tsx.
const EXIT_MS = 200

let toasts: Toast[] = []
let seq = 0
const listeners = new Set<() => void>()

function emit() {
  for (const l of listeners) l()
}

export function subscribeToasts(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getToasts(): Toast[] {
  return toasts
}

// Rimozione in due fasi: prima si marca "leaving" così Toaster può animare
// l'uscita, poi si toglie davvero dallo store dopo EXIT_MS. Senza, il toast
// sparirebbe di scatto e gli altri scatterebbero verso il basso.
export function dismissToast(id: number) {
  const t = toasts.find((x) => x.id === id)
  if (!t || t.leaving) return
  toasts = toasts.map((x) => (x.id === id ? { ...x, leaving: true } : x))
  emit()
  setTimeout(() => {
    toasts = toasts.filter((x) => x.id !== id)
    emit()
  }, EXIT_MS)
}

export function showToast(message: string, kind: ToastKind = 'info', action?: ToastAction): number {
  const id = ++seq
  toasts = [...toasts, { id, message, kind, action }]
  emit()
  // Gli errori restano finché non li si chiude (o si preme l'azione); gli altri
  // spariscono da soli.
  if (kind !== 'error') setTimeout(() => dismissToast(id), 3000)
  return id
}
