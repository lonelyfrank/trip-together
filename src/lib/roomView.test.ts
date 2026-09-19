import assert from 'node:assert/strict'
import { test } from 'node:test'
import { dayPlan, planWindow } from './roomView.ts'
import type { Activity, Room } from '../types'

const room = (event_time: string | null): Room => ({
  id: 'r', invite_code: 'X', title: 'T', crew_id: null, destination_label: 'Bari Nord',
  destination_lat: null, destination_lng: null, event_time, status: 'open', created_by: 'u', created_at: '',
})
const activity = (id: string, starts_at: string | null, status: Activity['status'] = 'confermata'): Activity => ({
  id, room_id: 'r', title: id, starts_at, duration_minutes: null, category: 'cibo', place_label: null,
  lat: null, lng: null, status, price_per_person: null, note: null, created_by: 'm', created_at: '',
})

test('dayPlan: ritrovo e tappe del giorno dell\'evento, in ordine', () => {
  const now = Date.parse('2026-04-20T08:00:00')
  const plan = dayPlan(room('2026-04-24T09:30:00'), [
    activity('pranzo', '2026-04-24T13:00:00'),
    activity('arrivo', '2026-04-24T11:30:00'),
    activity('altro-giorno', '2026-04-25T10:00:00'),
    activity('annullata', '2026-04-24T15:00:00', 'annullata'),
    activity('senza-orario', null),
  ], now)
  assert.deepEqual(plan.map((e) => e.id), ['ritrovo', 'arrivo', 'pranzo'])
  assert.equal(plan[0].title, 'Ritrovo · Bari Nord')
})

test('dayPlan: a evento cominciato conta oggi', () => {
  const now = Date.parse('2026-04-25T09:00:00')
  const plan = dayPlan(room('2026-04-24T09:30:00'), [activity('oggi', '2026-04-25T10:00:00')], now)
  assert.deepEqual(plan.map((e) => e.id), ['oggi'])
})

test('planWindow: parte dall\'ultima voce passata', () => {
  const entries = ['a', 'b', 'c', 'd'].map((id, i) => ({ id, at: '', title: id, detail: null, kind: 'cibo' as const, past: i < 2 }))
  assert.deepEqual(planWindow(entries, 3).map((e) => e.id), ['b', 'c', 'd'])
  assert.deepEqual(planWindow(entries.map((e) => ({ ...e, past: true })), 3).map((e) => e.id), ['b', 'c', 'd'])
})
