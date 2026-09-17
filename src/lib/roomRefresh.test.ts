import assert from 'node:assert/strict'
import { test } from 'node:test'
import { ROOM_POLL_MS, roomRefresh } from './roomRefresh.ts'

test('polling: pausa in background, ritorno immediato e silenzio realtime di 90 secondi', () => {
  let now = 0, visible = true, requests = 0
  const refresh = roomRefresh(() => { requests++ }, () => visible, () => now)
  assert.equal(ROOM_POLL_MS, 90_000)
  now = 90_000; refresh.poll(); assert.equal(requests, 1)
  visible = false; now = 180_000; refresh.poll(); refresh.onVisible(); assert.equal(requests, 1)
  refresh.onEvent()
  visible = true; refresh.onVisible(); assert.equal(requests, 2)
  now = 269_999; refresh.poll(); assert.equal(requests, 2)
  now = 270_000; refresh.poll(); assert.equal(requests, 3)
  now = 359_000; refresh.onEvent()
  now = 360_000; refresh.poll(); assert.equal(requests, 3)
})
