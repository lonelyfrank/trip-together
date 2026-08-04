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
}

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

export function dismissToast(id: number) {
  toasts = toasts.filter((t) => t.id !== id)
  emit()
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
