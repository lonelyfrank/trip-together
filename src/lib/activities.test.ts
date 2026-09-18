import assert from 'node:assert/strict'
import test from 'node:test'
import { activityInterest, dayKey, defaultDayKey, groupByDay } from './activities.ts'

// Gli istanti si costruiscono da date LOCALI: fissare un orario UTC legherebbe
// i test al fuso della macchina (verificato: con UTC+14 o UTC-11 cambiavano
// giorno). Così valgono dappertutto.
const localIso = (year: number, month: number, day: number, hour = 9) =>
  new Date(year, month - 1, day, hour).toISOString()

const room = { event_time: localIso(2026, 4, 24, 7) } as never

function attivita(id: string, startsAt: string | null) {
  return { id, room_id: 'r1', title: id, starts_at: startsAt, status: 'proposta' } as never
}

test('giorni: ricavati dagli orari delle tappe più quello dell’evento', () => {
  const days = groupByDay(room, [
    attivita('a1', localIso(2026, 4, 25, 11)),
    attivita('a2', localIso(2026, 4, 24, 9)),
    attivita('a3', localIso(2026, 4, 25, 16)),
  ])

  assert.deepEqual(days.map((d) => d.key), ['2026-04-24', '2026-04-25'])
  assert.match(days[0].label, /^Giorno 1 · /)
  assert.deepEqual(days[0].activities.map((a) => a.id), ['a2'])
  assert.deepEqual(days[1].activities.map((a) => a.id), ['a1', 'a3'])
})

test('giorni: con un solo giorno il numero non compare', () => {
  const days = groupByDay(room, [attivita('a1', localIso(2026, 4, 24))])
  assert.equal(days.length, 1)
  assert.doesNotMatch(days[0].label, /Giorno/)
})

test('giorni: le tappe senza orario finiscono in un gruppo a parte, in fondo', () => {
  const days = groupByDay(room, [attivita('a1', null), attivita('a2', localIso(2026, 4, 24))])
  assert.equal(days.length, 2)
  assert.equal(days[1].key, null)
  assert.equal(days[1].shortLabel, 'Da programmare')
  assert.deepEqual(days[1].activities.map((a) => a.id), ['a1'])
})

test('giorni: un evento senza data e senza tappe non produce giorni', () => {
  assert.deepEqual(groupByDay({ event_time: null } as never, []), [])
})

test('chiave-giorno: usa il fuso locale, non UTC', () => {
  // Verificato contro un'implementazione indipendente ('sv-SE' rende
  // YYYY-MM-DD in ora locale), così il test vale con qualunque TZ di macchina
  // invece di dipendere da Europe/Rome.
  for (const iso of [
    new Date(2026, 3, 24, 23, 30).toISOString(),
    new Date(2026, 3, 24, 0, 15).toISOString(),
    new Date(2026, 11, 31, 23, 0).toISOString(),
  ]) {
    const locale = new Date(iso).toLocaleDateString('sv-SE')
    assert.equal(dayKey(iso), locale, `${iso} deve cadere nel giorno locale ${locale}`)
  }
})

test('giorno iniziale: oggi se è nell’itinerario, altrimenti il primo', () => {
  const days = groupByDay(room, [
    attivita('a1', localIso(2026, 4, 24)),
    attivita('a2', localIso(2026, 4, 26)),
  ])
  assert.equal(defaultDayKey(days, Date.parse(localIso(2026, 4, 26, 8))), '2026-04-26')
  assert.equal(defaultDayKey(days, Date.parse(localIso(2026, 5, 10, 8))), '2026-04-24')
  assert.equal(defaultDayKey([], Date.now()), null)
})

test('interesse: la maggioranza è metà più uno, come per le soste', () => {
  const partecipanti = (ids: string[]) =>
    ids.map((memberId) => ({ activity_id: 'a1', member_id: memberId, room_id: 'r1' })) as never[]
  const a = attivita('a1', null)

  assert.equal(activityInterest(a, partecipanti(['m1', 'm2']), 5).hasMajority, false)
  assert.equal(activityInterest(a, partecipanti(['m1', 'm2', 'm3']), 5).hasMajority, true)
  assert.deepEqual(activityInterest(a, partecipanti(['m1']), 5).going, ['m1'])
  // Senza membri non esiste una maggioranza da raggiungere.
  assert.equal(activityInterest(a, [], 0).hasMajority, false)
})
