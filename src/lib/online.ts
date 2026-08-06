import { useSyncExternalStore } from 'react'

// Stato di connessione come store esterno (navigator.onLine + eventi online/offline).
function subscribe(callback: () => void) {
  window.addEventListener('online', callback)
  window.addEventListener('offline', callback)
  return () => {
    window.removeEventListener('online', callback)
    window.removeEventListener('offline', callback)
  }
}

export function useOnline(): boolean {
  return useSyncExternalStore(subscribe, isOnline, () => true)
}

export function isOnline(): boolean {
  return navigator.onLine
}
