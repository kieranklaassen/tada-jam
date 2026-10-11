import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { frame, lensOf, postsFor } from './camera'
import { Island } from './island'
import { under, type Target } from './pick'
import { makeRng } from './rng'
import { fresh } from './save'
import { FOOT, HOME, KINDS, LAND_Y, LID, TALL, lidAt, roofAt, toWorld, type Kind } from './toys'

// The sizes the sheet holds the game to, in CSS pixels: a tablet lying down, a smaller one, and one standing up.
const SIZES = [[1180, 820], [1024, 768], [820, 1180]] as const
// The home control of the shell: 48 pixels round, 10 from the top edge, in the middle.
const CONTROL = { half: 24, bottom: 58 }

function lensFor(width: number, height: number) {
  const camera = new THREE.PerspectiveCamera()
  frame(camera, width, height)
  return lensOf(camera, width, height)
}

/** The top of the cat and of the gull as the view draws them, from the frame the island shows. */
function tops(island: Island) {
  const shown = island.show(), cat = shown.cat, gull = shown.gull
  const where = toWorld(cat.x, cat.z, shown.turn)
  // (The view stands the cat 2.25 tall on a 0.04 pad and puffs it by 0.28 of its puff; the gull is 1.42 to its neck and 0.74 above it, at 0.85.)
  const catTop = cat.y + 0.04 + cat.pose.y + 2.25 * (1 + (cat.pose.puff - 1) * 0.28) * cat.pose.squash * cat.pose.stretch
  const gullTop = gull.y + gull.pose.y + (1.42 + gull.pose.neck + 0.74) * 0.85 * (gull.pose.puff > 1 ? 1 + (gull.pose.puff - 1) * 0.5 : 1)
  return { cat: { x: where.x, y: catTop, z: where.z }, gull: { x: gull.x, y: gullTop, z: gull.z } }
}

describe('the lid of the frame', () => {
  it.each(SIZES)('lies inside the frame all the way across and from the back of the sea to the front, at %i by %i', (width, height) => {
    const lens = lensFor(width, height)
    for (let z = -7; z <= 7; z += 1) {
      for (let x = -9; x <= 9; x += 1.5) expect(lens.glass(x, lidAt(z), z).y).toBeGreaterThanOrEqual(0)
    }
    // And it is no lower than it has to be: lying down, the point it is hung from is near the top of the glass.
    if (width > height) expect(lens.glass(0, LID.y, LID.z).y).toBeLessThan(height * 0.2)
  })

  it('is lower in the middle by more than the home control hangs down, on a tablet lying down', () => {
    for (const [width, height] of SIZES.slice(0, 2)) {
      const lens = lensFor(width, height)
      for (let z = -6; z <= 2; z += 1) {
        expect(lens.glass(0, roofAt(0, z), z).y).toBeGreaterThan(CONTROL.bottom)
        // As wide as the control and a head to each side of it.
        const edge = lens.glass(HOME.half, roofAt(HOME.half, z), z)
        expect(edge.x - width / 2).toBeGreaterThan(CONTROL.half)
        expect(edge.y).toBeGreaterThan(CONTROL.bottom)
      }
    }
    expect(roofAt(HOME.half + HOME.edge, 0)).toBe(lidAt(0))
  })
})

describe('the cat and the gull, whatever is done to the island', () => {
  it('stay inside the frame: sitting, leaping, flying, riding the smoke, paddling and through the wash', () => {
    const [width, height] = SIZES[0], lens = lensFor(width, height)
    let leaps = 0, flights = 0, least = Infinity
    for (let seed = 1; seed <= 5; seed++) {
      const rng = makeRng(seed * 7919), island = new Island(fresh(seed % 2 ? 2 : 4), seed)
      island.posts = postsFor(width, height)
      const inner = island as unknown as { cat: { leap: number; high: number | null }; gull: { doing: { flying: number } } }
      let leaping = false, flying = false
      const step = (frames: number): void => {
        for (let i = 0; i < frames; i++) {
          island.step(1 / 60)
          const top = tops(island)
          const cat = lens.glass(top.cat.x, top.cat.y, top.cat.z).y, gull = lens.glass(top.gull.x, top.gull.y, top.gull.z).y
          least = Math.min(least, cat, gull)
          if (inner.cat.leap >= 0 && !leaping) {
            leaps += 1
            // It found a way round, or a way low enough: it never has to go over the top of a thing.
            expect(inner.cat.high).toBeNull()
          }
          if (inner.gull.doing.flying >= 0 && !flying) flights += 1
          leaping = inner.cat.leap >= 0
          flying = inner.gull.doing.flying >= 0
        }
      }
      const tap = (target: Target): void => { island.press(target); island.release() }
      for (let n = 0; n < 40; n++) {
        const r = rng.next(), kind = KINDS[Math.floor(rng.next() * 5)], a = rng.next() * Math.PI * 2, far = Math.sqrt(rng.next())
        if (r < 0.55) {
          tap({ kind: 'slot', toy: kind })
          step(6)
          tap(rng.next() < 0.7 ? { kind: 'land', x: Math.cos(a) * far * 2.9, z: Math.sin(a) * far * 2.9 } : { kind: 'sea', x: Math.cos(a) * 4.3, z: Math.sin(a) * 4.3 })
        } else if (r < 0.65) tap({ kind: 'toy', toy: kind })
        else if (r < 0.78) tap({ kind: 'rim', x: Math.cos(a) * 6.5, z: Math.sin(a) * 6.5 })
        else if (r < 0.84) tap({ kind: 'gull' })
        else if (r < 0.9) tap({ kind: 'cat' })
        else { tap({ kind: 'wave' }); step(600) }
        step(30 + Math.floor(rng.next() * 150))
      }
    }
    expect(leaps).toBeGreaterThan(40)
    expect(flights).toBeGreaterThan(20)
    expect(least).toBeGreaterThanOrEqual(0)
  })

  it('keeps the gull on its buoy while the chimney is under the home control, and lets it ride the smoke beside that', () => {
    const riding = (x: number, z: number): boolean => {
      const saved = fresh(4)
      saved.toys[KINDS.indexOf('house')] = { kind: 'house', where: 'land', x, z }
      const island = new Island(saved)
      for (let i = 0; i < 240; i++) island.step(1 / 60)
      return island.show().gull.y > LAND_Y + TALL.house
    }
    // At the back of the land in the middle its head would be under the control.
    expect(riding(-0.3, -2.3)).toBe(false)
    // Beside the middle, as far back, and in the middle further forward, it rides.
    expect(riding(-2, -1.6)).toBe(true)
    expect(riding(-0.3, 1.5)).toBe(true)
  })
})

describe('a toy carried by a finger, wherever the finger takes it', () => {
  it.each(SIZES)('stays inside the frame and is never inside another toy or the cat, at %i by %i', (width, height) => {
    const lens = lensFor(width, height)
    let frames = 0, round = 0, leastTop = Infinity, leastSide = Infinity, deepest = Infinity
    for (let seed = 1; seed <= 4; seed++) {
      const rng = makeRng(seed * 104729 + width), island = new Island(fresh(seed % 2 ? 2 : 4), seed)
      island.posts = postsFor(width, height)
      const step = (n: number): void => { for (let i = 0; i < n; i++) island.step(1 / 60) }
      const inner = island as unknown as { cat: { leap: number } }
      for (let n = 0; n < 12; n++) {
        const kind: Kind = KINDS[Math.floor(rng.next() * 5)], out = island.state.toys[KINDS.indexOf(kind)].where !== 'tray'
        island.press(out ? { kind: 'toy', toy: kind } : { kind: 'slot', toy: kind })
        island.dragStart()
        // From where it is, by way of three places anywhere on the glass above the tray, slowly and fast.
        const from = island.show().toys[KINDS.indexOf(kind)]
        const start = from.on === 'island' ? toWorld(from.x, from.z, island.show().turn) : from
        let at = lens.glass(start.x, 0.3, start.z)
        for (let leg = 0; leg < 3; leg++) {
          const to = { x: (0.06 + rng.next() * 0.88) * width, y: (0.04 + rng.next() * 0.7) * height }, steps = 4 + Math.floor(rng.next() * 24)
          for (let i = 1; i <= steps; i++) {
            island.drag(under(lens, at.x + ((to.x - at.x) * i) / steps, at.y + ((to.y - at.y) * i) / steps))
            island.step(1 / 60)
            frames += 1
            const shown = island.show(), toy = shown.toys[KINDS.indexOf(kind)], tall = TALL[kind] * toy.pose.sy
            // Its top against the top of the frame, and its sides against the sides.
            leastTop = Math.min(leastTop, lens.glass(toy.x, toy.y + toy.pose.y + tall, toy.z).y)
            leastSide = Math.min(leastSide, lens.glass(toy.x - FOOT[kind] * 0.5, toy.y + tall / 2, toy.z).x, width - lens.glass(toy.x + FOOT[kind] * 0.5, toy.y + tall / 2, toy.z).x)
            // Against every other toy: no nearer than their grounds allow while their heights overlap.
            for (const other of shown.toys) {
              if (other.kind === kind) continue
              const where = other.on === 'island' ? toWorld(other.x, other.z, shown.turn) : other
              if (toy.y >= other.y + TALL[other.kind] || other.y >= toy.y + tall) continue
              deepest = Math.min(deepest, Math.hypot(toy.x - where.x, toy.z - where.z) - FOOT[kind] - FOOT[other.kind])
            }
            // Against the cat where it sits: as a post as wide as its body.
            if (inner.cat.leap < 0) {
              const cat = toWorld(shown.cat.x, shown.cat.z, shown.turn)
              if (toy.y < shown.cat.y + 2.3 && shown.cat.y < toy.y + tall) deepest = Math.min(deepest, Math.hypot(toy.x - cat.x, toy.z - cat.z) - FOOT[kind] - 0.7)
            }
            // How often it is held beside what the finger is over, and not over it.
            const finger = under(lens, at.x + ((to.x - at.x) * i) / steps, at.y + ((to.y - at.y) * i) / steps)
            if (finger && Math.hypot(toy.x - finger.x, toy.z - finger.z) > 0.3) round += 1
          }
          at = to
        }
        if (rng.next() < 0.75) island.drop()
        else island.cancel()
        step(60 + Math.floor(rng.next() * 60))
      }
    }
    expect(frames).toBeGreaterThan(1500)
    // The lid did its work: it was carried round things, and not only over them.
    expect(round).toBeGreaterThan(50)
    expect(leastTop).toBeGreaterThanOrEqual(0)
    expect(leastSide).toBeGreaterThanOrEqual(0)
    expect(deepest).toBeGreaterThanOrEqual(-0.02)
  })
})
