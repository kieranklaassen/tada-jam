import { describe, expect, it } from 'vitest'
import { FLOOR_Y, HEAD, SCENE, STRIP_W } from './layout'
import { LOOKS, RIBBON } from './looks'
import type { Play } from './play'
import { clippingBox, placesOf, ribbonShape } from './poses'
import { blankSheets, recordingSheet, type P, type Recording } from './recorder'
import { Sprites } from './sprites'
import type { Shown } from './staging'
import { drawFrame } from './view'
import { visit } from './visit'
import type { Ctx } from './wash'

// Nothing passes through anything. A canvas has no bodies to collide, so this
// measures what a child would see: a scripted finger plays whole visits at
// sixty frames a second, every frame is drawn on a context that keeps where
// each shape lands, and the test measures how far one thing is into another.
//  - The lock, the model and the ribbon are paper: where they hang side by
//    side they knock each other and never cross.
//  - Nobody's face is ever in anybody else's face: the pair coming in walk in
//    file, the pair going out pass them along the front of the floor, and a
//    friend that changes seats goes round the front of the chair.
//  - A cut piece lies on the floor, inside the scene, and never exactly on
//    another piece.
// Each finding is fixed, or allowed below with its reason and a cap.

const W = SCENE.w, H = SCENE.h
const mid = (a: P, b: P): P => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 })
const farthest = (from: P, points: readonly P[]): P => points.reduce((best, p) => (Math.hypot(p.x - from.x, p.y - from.y) > Math.hypot(best.x - from.x, best.y - from.y) ? p : best), from)

/** How far apart two line segments are at their nearest: nothing when they cross. */
function apart(a: P, b: P, c: P, d: P): number {
  const from = (p: P, a: P, b: P): number => {
    const dx = b.x - a.x, dy = b.y - a.y, long = dx * dx + dy * dy
    const t = long === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / long))
    return Math.hypot(p.x - a.x - dx * t, p.y - a.y - dy * t)
  }
  const side = (a: P, b: P, c: P): number => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x)
  if (side(a, b, c) * side(a, b, d) < 0 && side(c, d, a) * side(c, d, b) < 0) return 0
  return Math.min(from(a, c, d), from(b, c, d), from(c, a, b), from(d, a, b))
}

type Strip = { root: P; tip: P; half: number }

/** The hanging strips of one colour that were drawn from a root: one, or its three strands while it is ruffled. */
function hanging(kept: Recording, fill: string, root: P): Strip[] {
  return kept.shapes
    .filter((shape) => shape.kind === 'fill' && shape.style === fill)
    .flatMap((shape) => shape.parts)
    .filter((points) => points.length > 3 && Math.hypot(mid(points[0], points[1]).x - root.x, mid(points[0], points[1]).y - root.y) < 2)
    .map((points) => ({ root, tip: farthest(root, points), half: Math.hypot(points[1].x - points[0].x, points[1].y - points[0].y) / 2 }))
}

/** How far into each other two faces are, in head widths: nothing or less when they are clear of each other. */
function into(a: Shown, b: Shown): number {
  return a.s + b.s - Math.hypot((a.x - b.x) / HEAD.rx, (a.y - a.lift - b.y + b.lift) / HEAD.ry)
}

type Worst = { value: number; doing: string }
const worse = (worst: Worst, value: number, doing: string): void => { if (value > worst.value) { worst.value = value; worst.doing = doing } }

function measure(seed: number) {
  const sprites = new Sprites(blankSheets, W, H, 1)
  const kept: Recording = { shapes: [], stamps: [], texts: 0 }
  const surface = recordingSheet(W, H, kept)
  const strips = { atRest: { value: -Infinity, doing: '' }, inPlay: { value: -Infinity, doing: '' }, inScene: { value: -Infinity, doing: '' } }
  const faces: Worst = { value: -Infinity, doing: '' }
  const floor = { nearest: Infinity, off: 0, most: 0 }
  let measured = 0
  const met = new Set<string>()
  const done = visit(seed, (play: Play, doing: string) => {
    kept.shapes.length = 0
    kept.stamps.length = 0
    drawFrame(surface.g as Ctx, W, H, sprites, { play, guidance: null })
    const game = play.game!, places = placesOf(game), staging = play.staging
    if (game.chair) met.add(game.chair)
    if (game.friend) met.add(game.friend)

    if (game.chair && game.friend && places.lock && places.model && places.friend && staging.friend && staging.hats < 0.5) {
      const dx = staging.friend.x - places.friend.x, dy = staging.friend.y - places.friend.y - staging.friend.lift
      const shape = ribbonShape(game)
      const hung: Strip[][] = [
        hanging(kept, LOOKS[game.chair].lock, places.lock),
        hanging(kept, LOOKS[game.friend].lock, { x: places.model.x + dx, y: places.model.y + dy }),
        shape?.kind === 'hang' && game.ribbon?.at !== 'peg' ? hanging(kept, RIBBON.fill, game.ribbon?.at === 'model' ? { x: shape.root.x + dx, y: shape.root.y + dy } : shape.root) : [],
      ]
      // A friend on its way round the front of the chair carries its lock, and a ribbon beside it, in front of the customer's.
      const walking = dx !== 0 || dy !== 0
      for (let i = 0; i < hung.length; i++) for (let j = i + 1; j < hung.length; j++) for (const a of hung[i]) for (const b of hung[j]) {
        if (walking && i === 0) continue
        measured++
        const overlap = a.half + b.half - apart(a.root, a.tip, b.root, b.tip)
        worse(play.inScene ? strips.inScene : play.hair.settled ? strips.atRest : strips.inPlay, overlap, doing)
      }
    }

    const seen = [staging.customer, staging.friend, ...staging.leaving.map((goer) => goer.at)].filter((at): at is Shown => at !== null && at.seen > 0.5)
    for (let i = 0; i < seen.length; i++) for (let j = i + 1; j < seen.length; j++) worse(faces, into(seen[i], seen[j]), doing)

    const lying = game.clippings.filter((piece) => piece.on === 'floor' && !play.hair.flights.has(piece)).map((piece) => clippingBox(game, piece)!)
    floor.most = Math.max(floor.most, lying.length)
    for (const box of lying) floor.off = Math.max(floor.off, FLOOR_Y + STRIP_W / 2 - box.y, box.y + STRIP_W / 2 - H, -box.x, box.x - W)
    for (let i = 0; i < lying.length; i++) for (let j = i + 1; j < lying.length; j++) floor.nearest = Math.min(floor.nearest, Math.hypot(lying[i].x - lying[j].x, lying[i].y - lying[j].y))
  })
  return { strips, faces, floor, measured, done, met }
}

const SEEDS = [7, 20261003, 3, 11]
const runs = new Map<number, ReturnType<typeof measure>>()
const run = (seed: number): ReturnType<typeof measure> => { if (!runs.has(seed)) runs.set(seed, measure(seed)); return runs.get(seed)! }

describe('nothing passes through anything', () => {
  it.each(SEEDS)('over two customers seen through and a third let in (seed %i)', (seed) => {
    const { strips, faces, floor, measured, done } = run(seed)
    // The moments that could go wrong happened: strips side by side through every move, the cape off, three pairs through the door.
    expect(measured).toBeGreaterThan(3000)
    for (const move of ['lock ruffled', 'model snipped', 'model pulled', 'cape on']) expect(done.did).toContain(move)
    expect(done.did.filter((move) => move === 'door')).toHaveLength(3)
    expect(floor.most).toBeGreaterThanOrEqual(5)

    // Still, the three strips hang clear of each other.
    expect(strips.atRest.value, `strips at rest (${strips.atRest.doing})`).toBeLessThanOrEqual(-4)
    // Allowed: a brush of a few scene units in mid-swing or mid-scene, since a strip is knocked back by its angle
    // and drawn as a turned box. Under a sixth of a strip's width, and gone when the swing is.
    expect(strips.inPlay.value, `strips in play (${strips.inPlay.doing})`).toBeLessThanOrEqual(4)
    expect(strips.inScene.value, `strips in a scene (${strips.inScene.doing})`).toBeLessThanOrEqual(4)
    // Nobody's face is in anybody else's, on any frame, coming, going or changing seats.
    expect(faces.value, `faces (${faces.doing})`).toBeLessThanOrEqual(0)
    // Pieces lie on the floor, inside the scene, and no two on one spot.
    expect(floor.off).toBeLessThanOrEqual(0)
    expect(floor.nearest).toBeGreaterThanOrEqual(8)
  })

  it('reached, between the seeds, every customer, both seats and the ribbon beside each lock', () => {
    const did = new Set(SEEDS.flatMap((seed) => run(seed).done.did)), met = new Set(SEEDS.flatMap((seed) => [...run(seed).met]))
    for (const move of ['ribbon to the lock', 'ribbon snipped', 'ribbon ruffled', 'ribbon to the model', 'ribbon to a tuft', 'ribbon to a face', 'friend sent across', 'friend sent back', 'model pulled across', 'cape off', 'scene cut by a touch', 'piece to a face']) expect(did).toContain(move)
    expect(met.size).toBe(4)
  })
})
