// Dati mock per lo Step 1 — verranno sostituiti da query Supabase reali
// una volta eseguite le migration (Step 2) e collegate le pagine (Step 4+).
// I nomi dei campi rispecchiano lo schema SQL per rendere lo swap meccanico.

export const mockRoom = {
  id: 'room-1',
  invite_code: 'F3RR-82',
  title: 'Ritrovo al Faro',
  destination_label: 'Spiaggia del Faro, Torre San Lorenzo',
  destination_lat: 43.4123,
  destination_lng: 10.2456,
  status: 'open' as const,
  created_by: 'member-tu',
  created_at: '2026-07-20T10:00:00Z',
}

export const mockMembers = [
  { id: 'member-giulia', room_id: 'room-1', display_name: 'Giulia', auth_user_id: null, role: 'guest' as const },
  { id: 'member-marco', room_id: 'room-1', display_name: 'Marco', auth_user_id: null, role: 'guest' as const },
  { id: 'member-sara', room_id: 'room-1', display_name: 'Sara', auth_user_id: null, role: 'guest' as const },
  { id: 'member-dave', room_id: 'room-1', display_name: 'Dave', auth_user_id: null, role: 'guest' as const },
  { id: 'member-tu', room_id: 'room-1', display_name: 'Tu', auth_user_id: 'me', role: 'creator' as const },
  { id: 'member-elena', room_id: 'room-1', display_name: 'Elena', auth_user_id: null, role: 'guest' as const },
]

export const mockCars = [
  {
    id: 'car-giulia',
    room_id: 'room-1',
    driver_member_id: 'member-giulia',
    seats_total: 4,
    passengers: ['member-sara'],
    expenses: [{ id: 'ce-1', label: 'Benzina A14', amount: 24, paid_by_member_id: 'member-giulia' }],
    cargo: [
      { id: 'cc-1', item: 'Ombrelloni + teli', packed: true },
      { id: 'cc-2', item: 'Ghiaccio e borsa frigo', packed: false },
    ],
  },
  {
    id: 'car-marco',
    room_id: 'room-1',
    driver_member_id: 'member-marco',
    seats_total: 3,
    passengers: ['member-dave'],
    expenses: [{ id: 'ce-2', label: 'Pedaggio', amount: 8, paid_by_member_id: 'member-marco' }],
    cargo: [
      { id: 'cc-3', item: 'Casse audio', packed: true },
      { id: 'cc-4', item: 'Racchettoni', packed: true },
      { id: 'cc-5', item: 'Tenda parasole', packed: false },
    ],
  },
]

export const mockGeneralExpenses = [
  {
    id: 'ge-1',
    label: 'Ombrelloni + lettini',
    amount: 30,
    paid_by_member_id: 'member-sara',
    participant_member_ids: ['member-giulia', 'member-sara', 'member-marco', 'member-dave', 'member-tu', 'member-elena'],
  },
  {
    id: 'ge-2',
    label: 'Ghiaccio e bibite',
    amount: 12,
    paid_by_member_id: 'member-marco',
    participant_member_ids: ['member-marco', 'member-dave', 'member-tu'],
  },
]

export const mockBoardNotes = [
  { id: 'bn-1', text: "Portare crema solare e teli — non ce n'è abbastanza per tutti", pinned: true },
  { id: 'bn-2', text: 'Parcheggio pieno dopo le 11, meglio arrivare prima', pinned: false },
]

export const mockBoardLinks = [
  { id: 'bl-1', label: 'Biglietti area concerti', url: 'ticketservice.it/evento' },
  { id: 'bl-2', label: 'Noleggio SUP — 2 posti rimasti', url: 'surfshop.it/sup' },
]

export const mockRadarPositions = [
  { member_id: 'member-giulia', angle: 35, dist: 140 },
  { member_id: 'member-marco', angle: 155, dist: 55 },
  { member_id: 'member-sara', angle: 260, dist: 210 },
  { member_id: 'member-dave', angle: 305, dist: 30 },
]

export const mockEvents = [
  { id: 'faro', title: 'Ritrovo al Faro', when: 'Sab 26 lug · 10:30', people: 6, confirmed: 5, openBalance: true, radar: false, tint: '#E8A33D', icon: 'waves' as const },
  { id: 'festival', title: 'Nova Sound Festival', when: 'Ven 8 ago · 18:00', people: 9, confirmed: 7, openBalance: false, radar: true, tint: '#46D9C9', icon: 'music' as const },
  { id: 'monte', title: 'Escursione al Rifugio', when: 'Dom 14 set · 07:00', people: 5, confirmed: 3, openBalance: false, radar: false, tint: '#8FB98A', icon: 'mountain' as const },
]

export const mockPastEvents = [
  { id: 'capodanno', title: 'Capodanno in baita', when: '1 gen · archiviato', people: 8, icon: 'sparkles' as const },
]

export const mockCrew = ['Giulia', 'Marco', 'Sara', 'Dave', 'Elena', 'Luca', 'Tu', 'Anna']
