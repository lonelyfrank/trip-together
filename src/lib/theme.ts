import { useSyncExternalStore } from 'react'

// Preferenza di tema come store esterno, stesso pattern di online.ts e toast.ts
// (nessuna dipendenza, nessun Context). 'system' non è un terzo tema: è una
// preferenza che viene risolta qui in 'light' o 'dark' e scritta in
// data-theme. È il JS a risolverla, così il CSS definisce i valori del tema
// scuro in un solo blocco invece di ripeterli in una media query.

export type ThemePreference = 'light' | 'dark' | 'system'

const STORAGE_KEY = 'tripTogether:theme'
const DARK_QUERY = '(prefers-color-scheme: dark)'

/** Colore della barra di sistema: deve combaciare con --tt-canvas del tema attivo. */
const THEME_COLOR: Record<'light' | 'dark', string> = {
  light: '#f3f5f8',
  dark: '#0a0a0f',
}

const listeners = new Set<() => void>()

function isPreference(value: unknown): value is ThemePreference {
  return value === 'light' || value === 'dark' || value === 'system'
}

function darkMedia(): MediaQueryList | null {
  return typeof matchMedia === 'function' ? matchMedia(DARK_QUERY) : null
}

export function getThemePreference(): ThemePreference {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return isPreference(stored) ? stored : 'system'
  } catch {
    // Storage negato (navigazione privata): si ripiega sul tema di sistema.
    return 'system'
  }
}

/** Il tema effettivamente reso, risolvendo 'system' con la preferenza del dispositivo. */
export function resolveTheme(preference: ThemePreference = getThemePreference()): 'light' | 'dark' {
  if (preference !== 'system') return preference
  return darkMedia()?.matches ? 'dark' : 'light'
}

export function applyTheme(preference: ThemePreference = getThemePreference()): void {
  const theme = resolveTheme(preference)
  document.documentElement.setAttribute('data-theme', theme)
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLOR[theme])
}

export function setThemePreference(preference: ThemePreference): void {
  try {
    localStorage.setItem(STORAGE_KEY, preference)
  } catch {
    // La preferenza non sopravvive al reload, ma il tema si applica comunque.
  }
  applyTheme(preference)
  for (const listener of listeners) listener()
}

// Con 'system' attivo il tema cambia senza che nessuno tocchi l'app: il
// listener vive a livello di modulo (come quello 'online' di offlineQueue.ts)
// e non dipende dal fatto che un componente stia usando useTheme.
if (typeof document !== 'undefined') {
  darkMedia()?.addEventListener('change', () => {
    if (getThemePreference() !== 'system') return
    applyTheme('system')
    for (const listener of listeners) listener()
  })
}

function subscribe(callback: () => void): () => void {
  listeners.add(callback)
  return () => listeners.delete(callback)
}

export function useTheme(): { preference: ThemePreference; theme: 'light' | 'dark' } {
  const preference = useSyncExternalStore(subscribe, getThemePreference, () => 'system' as const)
  const theme = useSyncExternalStore(subscribe, () => resolveTheme(), () => 'light' as const)
  return { preference, theme }
}
