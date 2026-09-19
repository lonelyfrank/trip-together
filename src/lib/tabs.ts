// Le cinque tab della stanza, nell'ordine della barra e del pager.
export const TAB_IDS = ['stanza', 'auto', 'bacheca', 'spese', 'radar'] as const

export type TabId = (typeof TAB_IDS)[number]

export const TAB_LABELS: Record<TabId, string> = {
  stanza: 'Stanza',
  auto: 'Auto',
  bacheca: 'Bacheca',
  spese: 'Spese',
  radar: 'Radar',
}

export function isTabId(value: string | null): value is TabId {
  return TAB_IDS.some((id) => id === value)
}
