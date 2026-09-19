import type { DelayReason } from '../types'

export const REASON_LABELS: Record<DelayReason, string> = {
  traffico: 'Traffico',
  benzina: 'Rifornimento',
  dimenticanza: 'Dimenticanza',
  altro: 'Altro',
}

/** Titolo di un avviso di ritardo: "Ritardo · Traffico". */
export function delayTitle(reason: DelayReason): string {
  return `Ritardo · ${REASON_LABELS[reason]}`
}
