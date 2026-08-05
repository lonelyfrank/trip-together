import assert from 'node:assert/strict'
import { test } from 'node:test'
import { parseMapInput } from './mapLinks.ts'

test('parseMapInput: Google Maps place/@lat,lng', () => {
  const r = parseMapInput('https://www.google.com/maps/place/Colosseo/@41.8902,12.4922,17z')
  assert.equal(r.ok, true)
  if (r.ok) {
    assert.equal(r.value.lat, 41.8902)
    assert.equal(r.value.lng, 12.4922)
  }
})

test('parseMapInput: Google Maps dir destination', () => {
  const r = parseMapInput('https://www.google.com/maps/dir/?api=1&destination=43.412,10.245')
  assert.equal(r.ok, true)
  if (r.ok) assert.deepEqual([r.value.lat, r.value.lng], [43.412, 10.245])
})

test('parseMapInput: Apple Maps ll', () => {
  const r = parseMapInput('https://maps.apple.com/?ll=45.4642,9.19&q=Milano')
  assert.equal(r.ok, true)
})

test('parseMapInput: coordinate grezze', () => {
  const r = parseMapInput('43.7696, 11.2558')
  assert.equal(r.ok, true)
})

test('parseMapInput: shortlink non risolvibile', () => {
  const r = parseMapInput('https://maps.app.goo.gl/abc123')
  assert.equal(r.ok, false)
  if (!r.ok) assert.equal(r.reason, 'shortlink')
})

test('parseMapInput: testo non valido', () => {
  const r = parseMapInput('ciao come stai')
  assert.equal(r.ok, false)
  if (!r.ok) assert.equal(r.reason, 'unrecognized')
})
