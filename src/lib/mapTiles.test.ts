import assert from 'node:assert/strict'
import { test } from 'node:test'
import { boundsCenter, fitZoom, TILE_SIZE, worldPx } from './mapTiles.ts'

test('worldPx: (0,0) è al centro del planisfero a ogni zoom', () => {
  for (const z of [0, 5, 12]) {
    const p = worldPx({ lat: 0, lng: 0 }, z)
    assert.equal(p.x, (TILE_SIZE * 2 ** z) / 2)
    assert.ok(Math.abs(p.y - (TILE_SIZE * 2 ** z) / 2) < 1e-6)
  }
})

test('worldPx: il nord sta più in alto (y minore)', () => {
  assert.ok(worldPx({ lat: 45, lng: 10 }, 10).y < worldPx({ lat: 40, lng: 10 }, 10).y)
})

test('fitZoom: punti lontani chiedono uno zoom più basso', () => {
  const near = [{ lat: 40.05, lng: 18.0 }, { lat: 40.06, lng: 18.01 }]
  const far = [{ lat: 41.1, lng: 16.8 }, { lat: 40.05, lng: 18.0 }]
  assert.ok(fitZoom(far, 380, 180) < fitZoom(near, 380, 180))
  assert.equal(fitZoom([{ lat: 40, lng: 18 }], 380, 180, 15), 15)
})

test('boundsCenter: media degli estremi', () => {
  assert.deepEqual(boundsCenter([{ lat: 10, lng: 20 }, { lat: 12, lng: 24 }]), { lat: 11, lng: 22 })
})
