import { describe, expect, it } from 'vitest'
import { BEACHES } from './beaches'
import { HORIZON_Z, cameraFor, project } from './camera'
import { deserializeKingdom } from './kingdom'
import { CLOUDS, CORNER, SUN, THING_REACH, cloudTouch, homeControlBox, sunAt, targetAt } from './layout'
import { Play } from './play'

// The frame on the surfaces the sheet names: everything a finger can pick up
// or poke is inside it, clear of the home control at the top centre and the
// grown-up corner at the top right, at its day place and its evening place,
// and a finger on the drawn shape of a thing gets that thing.

const SURFACES = [[1180, 820], [1024, 768]] as const
/** The surfaces a finger is held to: the two above, and the smaller one held upright. */
const TOUCH_SURFACES = [...SURFACES, [820, 1180]] as const
const DT = 1 / 60

type Spot = { name: string; x: number; y: number; z: number; reach: number }

function spotsOf(play: Play): Spot[] {
  const drawn = play.drawn(), folk = play.folk.spots((x, z) => play.ground(x, z))
  const out: Spot[] = [
    { name: 'bucket', ...drawn.bucket, reach: THING_REACH.bucket },
    { name: 'crab', ...folk.crab, reach: 0.9 },
    { name: 'starfish', ...folk.starfish, reach: 0.8 },
  ]
  drawn.shells.forEach((shell, index) => { if (shell.shown) out.push({ name: `shell ${index}`, x: shell.x, y: shell.y, z: shell.z, reach: THING_REACH.shell }) })
  drawn.wood.forEach((piece, index) => out.push({ name: `wood ${index}`, x: piece.x, y: piece.y, z: piece.z, reach: THING_REACH.wood }))
  folk.gulls.forEach((gull, index) => out.push({ name: `gull ${index}`, ...gull, reach: 0.5 }))
  if (folk.eel.out) out.push({ name: 'eel', x: folk.eel.x, y: folk.eel.y, z: folk.eel.z, reach: 0.6 })
  return out
}

/** Every beach a child can be looking at, a few seconds in so the folk have taken their places. */
const VIEWS: [string, () => Play][] = [
  ['a first visit', () => new Play(deserializeKingdom(null, null), 1)],
  ['the kingdom by day', () => new Play(BEACHES.kingdom(7), 1)],
  ['the kingdom at evening', () => new Play(BEACHES.evening(7), 1)],
  ['the wrong beach at evening', () => new Play(BEACHES['wrong-evening'](7), 1)],
  ['the bare beach at evening', () => new Play(BEACHES.bare(7), 1)],
]

describe('the frame', () => {
  for (const [width, height] of SURFACES) {
    const camera = cameraFor(width, height)
    const home = homeControlBox(camera)

    it(`holds everything a finger can find at ${width} by ${height}, clear of the home control and the corner`, () => {
      for (const [name, open] of VIEWS) {
        const play = open()
        for (let i = 0; i < 12; i++) {
          for (let t = 0; t < 1; t += DT) play.step(DT)
          for (const spot of spotsOf(play)) {
            const at = project(camera, spot.x, spot.y, spot.z)
            const r = Math.max(8, project(camera, spot.x + spot.reach, spot.y, spot.z).x - at.x)
            const label = `${name}: ${spot.name} at ${at.x.toFixed(0)},${at.y.toFixed(0)}`
            // Its middle is on the surface, with half of it showing at the least.
            expect(at.x, label).toBeGreaterThan(r * 0.5)
            expect(at.x, label).toBeLessThan(width - r * 0.5)
            expect(at.y, label).toBeLessThan(height - Math.min(r * 0.5, 24))
            // Nothing a finger wants is under the home control or in the grown-up corner.
            const underHome = at.x + r > home.left && at.x - r < home.right && at.y - r < home.bottom
            expect(underHome, label).toBe(false)
            const inCorner = at.x + r > width - CORNER && at.y - r < CORNER
            expect(inCorner, label).toBe(false)
          }
        }
      }
    })

    it(`lays nothing in the bottom strip on a first visit at ${width} by ${height}, and each thing answers a finger over 100 pixels across`, () => {
      for (const age of [null, 3, 7]) {
        const play = new Play(deserializeKingdom(null, age), 1)
        for (const spot of spotsOf(play).filter((one) => /bucket|shell|wood/.test(one.name))) {
          const at = project(camera, spot.x, spot.y, spot.z)
          // The bottom strip, where wrists rest: the lowest 64 pixels.
          expect(at.y, spot.name).toBeLessThan(height - 64)
          // A finger 49 pixels from its middle, on any side, still gets it.
          const folk = play.folk.spots((x, z) => play.ground(x, z))
          for (const [dx, dy] of [[49, 0], [-49, 0], [0, 49], [0, -49]]) {
            const target = targetAt(camera, at.x + dx, at.y + dy, play.field, folk, play.sea, play.drawn())
            expect(target.kind, `${spot.name} from ${dx},${dy}`).toBe(spot.name.split(' ')[0])
          }
        }
      }
    })

    it(`brings none of the folk to rest over a thing a finger must find at ${width} by ${height}`, () => {
      for (const [name, open] of VIEWS) {
        const play = open()
        let before = new Map<string, Spot>()
        for (let i = 0; i < 60; i++) {
          for (let t = 0; t < 0.5; t += DT) play.step(DT)
          const spots = spotsOf(play)
          const was = before
          before = new Map(spots.map((spot) => [spot.name, spot]))
          const folk = spots.filter((spot) => /crab|starfish|gull|eel/.test(spot.name)), things = spots.filter((spot) => /bucket|shell|wood/.test(spot.name))
          for (const one of folk) {
            // At rest: where it was half a second ago. One that is on its way past is not judged.
            const earlier = was.get(one.name)
            if (!earlier || Math.hypot(earlier.x - one.x, earlier.y - one.y, earlier.z - one.z) > 0.01) continue
            // The starfish riding the crab has no place of its own: it stops where the crab stops, which is clear on the sand.
            if (one.name === 'starfish' && play.folk.starfish.on === 'crab') continue
            for (const thing of things) {
              const a = project(camera, one.x, one.y, one.z), b = project(camera, thing.x, thing.y, thing.z)
              // The middle of the thing shows: it is not behind the middle of one of the folk.
              expect(Math.hypot(a.x - b.x, a.y - b.y), `${name} after ${(i + 1) / 2} s: ${one.name} over ${thing.name}`).toBeGreaterThan(20)
            }
          }
        }
      }
    })

    it(`keeps the sun's whole path on the surface at ${width} by ${height}, clear of the home control and the corner`, () => {
      for (const t of [0, 0.25, 0.5, 0.75, 1]) {
        const sun = sunAt(t)
        const at = project(camera, sun.x, sun.y, HORIZON_Z)
        const r = project(camera, sun.x + SUN.radius, sun.y, HORIZON_Z).x - at.x
        expect(at.x - r * 0.6).toBeGreaterThan(0)
        expect(at.y).toBeGreaterThan(0)
        expect(at.x + r).toBeLessThan(home.left)
        expect(at.y).toBeLessThan(height * 0.5)
        // Big enough for a small finger.
        expect(r * 2).toBeGreaterThan(100)
      }
    })

    it(`gives a finger on the drawn shape of a thing that thing at ${width} by ${height}`, () => {
      for (const [name, open] of VIEWS) {
        const play = open()
        for (let t = 0; t < 3; t += DT) play.step(DT)
        const drawn = play.drawn(), folk = play.folk.spots((x, z) => play.ground(x, z))
        const on = (x: number, y: number, z: number) => {
          const at = project(camera, x, y, z)
          return targetAt(camera, at.x, at.y, play.field, folk, play.sea, drawn)
        }
        expect(on(drawn.bucket.x, drawn.bucket.y, drawn.bucket.z), `${name}: bucket`).toEqual({ kind: 'bucket' })
        drawn.shells.forEach((shell, index) => { if (shell.shown) expect(on(shell.x, shell.y, shell.z), `${name}: shell ${index}`).toEqual({ kind: 'shell', index }) })
        drawn.wood.forEach((piece, index) => expect(on(piece.x, piece.y, piece.z), `${name}: wood ${index}`).toEqual({ kind: 'wood', index }))
        expect(on(folk.crab.x, folk.crab.y, folk.crab.z), `${name}: crab`).toMatchObject({ kind: 'folk', who: 'crab' })
        expect(on(folk.starfish.x, folk.starfish.y, folk.starfish.z), `${name}: starfish`).toMatchObject({ kind: 'folk', who: 'starfish' })
        folk.gulls.forEach((gull, index) => expect(on(gull.x, gull.y, gull.z), `${name}: gull ${index}`).toEqual({ kind: 'folk', who: 'gull', index }))
        const sun = project(camera, drawn.sun.x, drawn.sun.y, HORIZON_Z)
        expect(targetAt(camera, sun.x, sun.y, play.field, folk, play.sea, drawn), `${name}: sun`).toEqual({ kind: 'sun' })
      }
    })
  }
})

describe('a finger', () => {
  for (const [width, height] of TOUCH_SURFACES) {
    const camera = cameraFor(width, height)

    it(`finds each thing, each of the folk, the sun and each cloud over 48 pixels or more each way at ${width} by ${height}`, () => {
      for (const [name, open] of VIEWS) {
        const play = open()
        for (let t = 0; t < 3; t += DT) play.step(DT)
        const drawn = play.drawn(), folk = play.folk.spots((x, z) => play.ground(x, z)), clouds = play.cloudXs()
        const at = (x: number, y: number): string => JSON.stringify(targetAt(camera, x, y, play.field, folk, play.sea, drawn, clouds))
        /** How many pixels in a row through a point give what the point gives: across, and up and down. */
        const reach = (x: number, y: number): { across: number; high: number } => {
          const here = at(x, y)
          const run = (dx: number, dy: number): number => {
            let far = 0
            while (far < 60 && at(x + dx * (far + 1), y + dy * (far + 1)) === here) far += 1
            return far
          }
          return { across: run(-1, 0) + 1 + run(1, 0), high: run(0, -1) + 1 + run(0, 1) }
        }
        const held = (label: string, x: number, y: number, want: object): void => {
          expect(JSON.parse(at(x, y)), `${name}: ${label}`).toMatchObject(want)
          const found = reach(x, y)
          expect(found.across, `${name}: ${label}, across`).toBeGreaterThanOrEqual(48)
          expect(found.high, `${name}: ${label}, up and down`).toBeGreaterThanOrEqual(48)
        }
        const on = (x: number, y: number, z: number): { x: number; y: number } => project(camera, x, y, z)
        // The things as a first visit lays them out, each clear of the others. On a prepared beach a bough lies
        // right behind the bucket, and there a finger gets whichever of the two it is nearer the middle of.
        if (name === 'a first visit') {
          const bucket = on(drawn.bucket.x, drawn.bucket.y, drawn.bucket.z)
          held('bucket', bucket.x, bucket.y, { kind: 'bucket' })
          drawn.shells.forEach((shell, index) => {
            const spot = on(shell.x, shell.y, shell.z)
            held(`shell ${index}`, spot.x, spot.y, { kind: 'shell', index })
          })
          drawn.wood.forEach((piece, index) => {
            const spot = on(piece.x, piece.y, piece.z)
            held(`wood ${index}`, spot.x, spot.y, { kind: 'wood', index })
          })
        }
        // The bridge across the channel, up the beach beyond the tower the starfish lies spread on: a finger on
        // the bridge gets the bridge, not the starfish that is drawn below it.
        if (name === 'the kingdom at evening') {
          const bridge = on(drawn.wood[1].x, drawn.wood[1].y, drawn.wood[1].z)
          held('the bridge', bridge.x, bridge.y, { kind: 'wood', index: 1 })
        }
        const crab = on(folk.crab.x, folk.crab.y, folk.crab.z), star = on(folk.starfish.x, folk.starfish.y, folk.starfish.z)
        held('crab', crab.x, crab.y, { kind: 'folk', who: 'crab' })
        held('starfish', star.x, star.y, { kind: 'folk', who: 'starfish' })
        folk.gulls.forEach((gull, index) => {
          const spot = on(gull.x, gull.y, gull.z)
          held(`gull ${index}`, spot.x, spot.y, { kind: 'folk', who: 'gull', index })
        })
        const sun = project(camera, drawn.sun.x, drawn.sun.y, HORIZON_Z)
        held('sun', sun.x, sun.y, { kind: 'sun' })
        CLOUDS.forEach((cloud, index) => {
          const touch = cloudTouch(camera, cloud, clouds[index])
          held(`cloud ${index}`, touch.x, touch.y, { kind: 'cloud', index })
        })
      }
    })
  }
})
