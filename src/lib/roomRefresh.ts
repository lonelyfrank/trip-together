export const ROOM_POLL_MS = 90_000

// La stessa decisione serve al timer e al ritorno in primo piano. Il clock
// iniettabile permette di verificare le finestre senza attese reali.
export function roomRefresh(
  invalidate: () => void,
  isVisible: () => boolean,
  now: () => number = Date.now,
) {
  let lastEventAt = -Infinity
  return {
    onEvent: () => { lastEventAt = now() },
    poll: () => { if (isVisible() && now() - lastEventAt >= ROOM_POLL_MS) invalidate() },
    onVisible: () => { if (isVisible()) invalidate() },
  }
}
