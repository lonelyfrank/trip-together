import assert from 'node:assert/strict'
import test from 'node:test'
import { todayPlan } from './todayPlan.ts'

const NOW = Date.parse('2026-09-18T12:00:00.000Z')

const room = {
  id: 'r1',
  invite_code: 'ABC1234',
  title: 'Domenica al lago',
  crew_id: null,
  destination_label: 'Lago di Garda',
  destination_lat: null,
  destination_lng: null,
  event_time: '2026-09-18T09:00:00.000Z',
  status: 'open',
  created_by: 'u1',
  created_at: '2026-09-01T00:00:00.000Z',
} as const

const members = [
  { id: 'm1', display_name: 'Franco' },
  { id: 'm2', display_name: 'Luca' },
  { id: 'm3', display_name: 'Sara' },
] as never[]

function car(overrides: Record<string, unknown> = {}) {
  return {
    id: 'c1',
    room_id: 'r1',
    driver_member_id: 'm1',
    seats_total: 4,
    travel_status: 'non_partita',
    travel_status_updated_at: '2026-09-18T10:00:00.000Z',
    travel_status_updated_by: 'm1',
    created_at: '2026-09-18T08:00:00.000Z',
    ...overrides,
  } as never
}

const base = { room, members, cars: [], carPassengers: [], stopProposals: [], stopProposalVotes: [] } as never

test('piano di oggi: il ritrovo già passato è concluso, quello senza orario resta il prossimo passo', () => {
  const [ritrovo] = todayPlan(base, NOW)
  assert.equal(ritrovo.label, 'Ritrovo')
  assert.equal(ritrovo.detail, 'Lago di Garda')
  assert.equal(ritrovo.state, 'done')

  const senzaOrario = todayPlan({ ...(base as object), room: { ...room, event_time: null } } as never, NOW)
  assert.equal(senzaOrario[0].state, 'next')
  assert.equal(senzaOrario[0].at, null)
})

test('piano di oggi: un’auto non partita non compare, una ferma è lo stato attuale', () => {
  assert.equal(todayPlan({ ...(base as object), cars: [car()] } as never, NOW).length, 1)

  const ferma = todayPlan({ ...(base as object), cars: [car({ travel_status: 'fermo' })] } as never, NOW)
  assert.equal(ferma.length, 2)
  assert.equal(ferma[1].label, 'In viaggio · auto di Franco')
  assert.equal(ferma[1].state, 'now')
  assert.equal(ferma[1].detail, 'ferma in questo momento')

  const arrivata = todayPlan({ ...(base as object), cars: [car({ travel_status: 'arrivata' })] } as never, NOW)
  assert.equal(arrivata[1].label, 'Arrivo · auto di Franco')
  assert.equal(arrivata[1].state, 'done')
})

test('piano di oggi: solo le soste accettate entrano, e in ordine di orario', () => {
  const proposal = (id: string, votes: number) => ({
    proposta: {
      id,
      room_id: 'r1',
      car_id: null,
      proposed_by: 'm1',
      type: 'benzina',
      note: 'al casello',
      created_at: '2026-09-18T11:00:00.000Z',
      expires_at: '2026-09-18T11:15:00.000Z',
    },
    voti: Array.from({ length: votes }, (_, i) => ({
      proposal_id: id,
      member_id: `m${i + 1}`,
      vote: 'yes',
      voted_at: '2026-09-18T11:01:00.000Z',
      room_id: 'r1',
    })),
  })

  // Un solo sì su tre aventi diritto non raggiunge la maggioranza.
  const respinta = proposal('p1', 1)
  assert.equal(
    todayPlan(
      { ...(base as object), stopProposals: [respinta.proposta], stopProposalVotes: respinta.voti } as never,
      NOW,
    ).length,
    1,
  )

  const accettata = proposal('p2', 2)
  const piano = todayPlan(
    {
      ...(base as object),
      cars: [car({ travel_status: 'in_viaggio' })],
      stopProposals: [accettata.proposta],
      stopProposalVotes: accettata.voti,
    } as never,
    NOW,
  )
  assert.deepEqual(
    piano.map((entry) => entry.label),
    ['Ritrovo', 'In viaggio · auto di Franco', 'Sosta benzina'],
  )
  assert.equal(piano[2].detail, 'al casello')
})
