import { describe, expect, it } from 'vitest'
import { BLADES } from './hand'
import { COLLAR_Y, LOCK_X, STEP } from './layout'
import { LOOKS, hueOf, tuftOutline } from './looks'
import { Play } from './play'
import { BUTTONS, placesOf } from './poses'
import { blankSheets, bounds, recordingSheet, type Recording } from './recorder'
import { Sprites } from './sprites'
import { CUSTOMERS } from './tastes'
import { drawFrame } from './view'
import type { Ctx, MakeSheet, Sheet } from './wash'

// A stand-in for a 2D context: it takes every call and every setting, and keeps the names of what was called.
function fakeSheets(): { make: MakeSheet; calls: string[]; made: () => number; sheets: Sheet[] } {
  const calls: string[] = [], sheets: Sheet[] = []
  let made = 0
  const make: MakeSheet = (width, height) => {
    made++
    const canvas = { width, height }
    const g = new Proxy({} as Record<string, unknown>, {
      get: (target, name: string) => {
        if (name in target) return target[name]
        return () => {
          calls.push(name)
          if (name === 'createRadialGradient') return { addColorStop: () => {} }
          if (name === 'createPattern') return {}
          return undefined
        }
      },
      set: (target, name: string, value) => { target[name] = value; return true },
    })
    const sheet = { canvas, g } as unknown as Sheet
    sheets.push(sheet)
    return sheet
  }
  return { make, calls, made: () => made, sheets }
}
const W = 2360, H = 1640
const DOOR = { x: BUTTONS.door.x + 84, y: BUTTONS.door.y + 290 }
const tap = (play: Play, at: { x: number; y: number }): void => { play.gesture({ type: 'press', at }); play.gesture({ type: 'tap', at }) }
const through = (play: Play): void => { let n = 0; while (play.inScene && n++ < 60 * 30) play.step(1 / 60, true) }
const fresh = (): Play => { const play = new Play(5); play.open(null, null); return play }
const seated = (over: object = {}): Play => {
  const first = fresh()
  tap(first, DOOR)
  through(first)
  const play = new Play(5)
  play.open({ ...first.saved(), shown: { snip: true, pull: true, ribbon: true }, ribbon: { len: 40, at: 'peg' }, ...over }, null)
  return play
}
const idle = { glow: 1, demo: 0.5, demoIndex: 0 }

describe('one frame', () => {
  it('draws the bare room before the slot has been read, in one stamp', () => {
    const { make, calls } = fakeSheets()
    const sprites = new Sprites(make, W, H, 1), surface = make(W, H), play = new Play(1)
    const painting = calls.length
    expect(drawFrame(surface.g as Ctx, W, H, sprites, { play, guidance: null })).toBe(1)
    expect(calls.slice(painting)).toEqual(['setTransform', 'drawImage'])
  })

  it('writes nothing, ever: no text call in the painting or in any frame of a whole visit', () => {
    const { make, calls } = fakeSheets()
    const sprites = new Sprites(make, W, H, 1), surface = make(W, H), play = fresh()
    const frames = (seconds: number) => { for (let i = 0; i < seconds * 30; i++) { play.step(1 / 30, true); drawFrame(surface.g as Ctx, W, H, sprites, { play, guidance: { glow: 1, demo: (i % 30) / 30, demoIndex: i % 4 } }) } }
    frames(1)
    tap(play, DOOR); frames(9)
    tap(play, { x: BUTTONS.bench.x + 100, y: BUTTONS.bench.y + 60 }); frames(9)
    tap(play, placesOf(play.game!).knot!); frames(9)
    tap(play, DOOR); frames(9)
    for (const name of ['fillText', 'strokeText', 'measureText']) expect(calls).not.toContain(name)
    expect(play.game!.chair).not.toBe('lion')
  })

  it.each(CUSTOMERS)('draws the %s in the chair, with each of the others as its friend', (who) => {
    const { make } = fakeSheets()
    const sprites = new Sprites(make, W, H, 1), surface = make(W, H)
    for (const friend of CUSTOMERS.filter((other) => other !== who)) {
      const play = seated({ chair: who, friend })
      play.step(1 / 60, true)
      const drawn = drawFrame(surface.g as Ctx, W, H, sprites, { play, guidance: null })
      expect(drawn).toBeGreaterThan(30)
      // A frame with nothing happening: well inside the jam's bar of about 80 draws.
      expect(drawn).toBeLessThanOrEqual(70)
    }
  })

  it('stays under the budget of pieces in the busiest frames', () => {
    const { make } = fakeSheets()
    const sprites = new Sprites(make, W, H, 1), surface = make(W, H)
    // A full floor, a stroke through the mane and both locks, fluff in the air, the ribbon beside the lock.
    const busy = seated({ clippings: Array.from({ length: 12 }, (_, i) => ({ len: 20 + i, hue: i % 2 ? 'lion' : 'ribbon', on: 'floor', x: i * 8 })), ribbon: { len: 40, at: 'lock' } })
    busy.gesture({ type: 'press', at: { x: 330, y: 150 } })
    busy.gesture({ type: 'dragStart', from: { x: 330, y: 150 } })
    busy.gesture({ type: 'dragMove', from: { x: 330, y: 150 }, at: { x: 640, y: 150 } })
    busy.gesture({ type: 'dragMove', from: { x: 330, y: 150 }, at: { x: 700, y: COLLAR_Y + 20 * STEP - BLADES.y } })
    busy.gesture({ type: 'dragMove', from: { x: 330, y: 150 }, at: { x: LOCK_X - 40, y: COLLAR_Y + 20 * STEP - BLADES.y } })
    busy.hair.ruffled('lock')
    busy.step(1 / 60, false)
    expect(busy.hair.puffs.length).toBeGreaterThan(4)
    // The jam's bar is about 80 draws a frame. This frame is everything at once, which play does not reach.
    expect(drawFrame(surface.g as Ctx, W, H, sprites, { play: busy, guidance: null })).toBeLessThanOrEqual(80)
    // The idle ladder at its fullest: the glow and the ghost hand with its scissors.
    expect(drawFrame(surface.g as Ctx, W, H, sprites, { play: seated(), guidance: idle })).toBeLessThanOrEqual(80)
    // The most figures on stage: one pair going out and one coming in, the door open.
    const crowd = seated()
    tap(crowd, placesOf(crowd.game!).knot!); through(crowd); tap(crowd, DOOR)
    let most = 0
    for (let i = 0; i < 150; i++) { crowd.step(1 / 30, true); most = Math.max(most, drawFrame(surface.g as Ctx, W, H, sprites, { play: crowd, guidance: null })) }
    expect(most).toBeLessThanOrEqual(80)
    // And the cape coming off, with the showing acted out.
    const off = seated()
    tap(off, placesOf(off.game!).knot!)
    for (let i = 0; i < 240; i++) { off.step(1 / 30, true); most = Math.max(most, drawFrame(surface.g as Ctx, W, H, sprites, { play: off, guidance: null })) }
    expect(most).toBeLessThanOrEqual(80)
  })

  it('makes at most one full-surface composite a frame: the room, stamped once', () => {
    const { make, sheets } = fakeSheets()
    const sprites = new Sprites(make, W, H, 1), surface = make(W, H), play = seated()
    const full = new Set(sheets.filter((sheet) => sheet.canvas.width === W && sheet.canvas.height === H).map((sheet) => sheet.canvas))
    let stamps = 0
    const g = new Proxy(surface.g as unknown as Record<string, unknown>, { get: (target, name: string) => (name === 'drawImage' ? (image: unknown) => { if (full.has(image as never)) stamps++ } : target[name]), set: (target, name: string, value) => { target[name] = value; return true } })
    drawFrame(g as unknown as Ctx, W, H, sprites, { play, guidance: idle })
    expect(stamps).toBe(1)
  })

  it('paints each tuft once, and again only when its length has changed enough to show', () => {
    const { make } = fakeSheets()
    const sprites = new Sprites(make, W, H, 1), surface = make(W, H), play = seated({ seat: 'across' })
    for (let i = 0; i < 60; i++) { play.step(1 / 60, true); drawFrame(surface.g as Ctx, W, H, sprites, { play, guidance: null }) }
    const count = play.game!.mane.length
    expect(sprites.repaints).toBe(count)
    // A long, slow pull on one tuft: the sheet it has is stretched, and painted again only a few times.
    const start = { x: 520, y: 150 }
    play.gesture({ type: 'press', at: start })
    play.gesture({ type: 'dragStart', from: start })
    for (let i = 1; i <= 60; i++) {
      play.gesture({ type: 'dragMove', from: start, at: { x: 520, y: 150 - i * 2 } })
      play.step(1 / 60, false)
      drawFrame(surface.g as Ctx, W, H, sprites, { play, guidance: null })
    }
    const during = sprites.repaints - count
    expect(during).toBeLessThanOrEqual(4)
    play.gesture({ type: 'dragEnd', from: start, at: { x: 520, y: 30 } })
    drawFrame(surface.g as Ctx, W, H, sprites, { play, guidance: null })
    expect(sprites.repaints - count).toBeLessThanOrEqual(during + 1)
  })

  it('makes its sheets once for a size: everyone is painted ahead over the first frames, and then a frame makes none', () => {
    const { make, made } = fakeSheets()
    const sprites = new Sprites(make, W, H, 1), surface = make(W, H), play = seated()
    const frame = (): number => { const before = made(); play.step(1 / 60, true); drawFrame(surface.g as Ctx, W, H, sprites, { play, guidance: idle }); return made() - before }
    frame()
    // After the first frame, which paints what it shows, no frame paints more than a couple of pieces.
    let most = 0
    for (let i = 0; i < 40; i++) most = Math.max(most, frame())
    expect(most).toBeGreaterThan(0)
    expect(most).toBeLessThanOrEqual(2)
    for (let i = 0; i < 30; i++) expect(frame()).toBe(0)
  })

  it('gives its sheets back when it is done with them', () => {
    const { make, sheets } = fakeSheets()
    const sprites = new Sprites(make, W, H, 1), play = seated()
    const mine = sheets.length
    const surface = make(W, H)
    drawFrame(surface.g as Ctx, W, H, sprites, { play, guidance: null })
    const kept = sheets.filter((_, i) => i !== mine)
    expect(kept.some((sheet) => sheet.canvas.width > 0)).toBe(true)
    sprites.dispose()
    expect(kept.every((sheet) => sheet.canvas.width === 0 && sheet.canvas.height === 0)).toBe(true)
  })
})

describe('the eyes', () => {
  it('go after the finger that has hold of the lock, further than the head leans', () => {
    // Where the eyes are drawn, as against the face they are in.
    const gaze = (play: Play): number => {
      const kept: Recording = { shapes: [], stamps: [], texts: 0 }
      const sprites = new Sprites(blankSheets, 1180, 820, 1), surface = recordingSheet(1180, 820, kept)
      drawFrame(surface.g as Ctx, 1180, 820, sprites, { play, guidance: null })
      const face = kept.stamps.find((stamp) => stamp.image === sprites.animal(play.game!.chair!).face.sheet.canvas)!
      const eyes = kept.shapes.find((shape) => shape.kind === 'fill' && shape.style === '#3b3136' && bounds(shape.points).y < 330 && bounds(shape.points).x < 600)!
      const f = bounds(face.corners), e = bounds(eyes.points)
      return e.x + e.w / 2 - (f.x + f.w / 2)
    }
    const still = seated()
    for (let i = 0; i < 30; i++) still.step(1 / 60, false)
    const pulled = seated(), from = { x: LOCK_X, y: COLLAR_Y + 20 * STEP }
    pulled.gesture({ type: 'press', at: from })
    pulled.gesture({ type: 'dragStart', from })
    for (let i = 1; i <= 30; i++) { pulled.gesture({ type: 'dragMove', from, at: { x: from.x + i * 6, y: from.y + i * 3 } }); pulled.step(1 / 60, false) }
    expect(gaze(pulled) - gaze(still)).toBeGreaterThan(2)
  })
})

describe('the looks', () => {
  it('give each customer colours and shapes of its own, and a lock of one strong colour that is not its mane\'s', () => {
    for (const key of ['fur', 'mane', 'lock', 'tuft', 'snout', 'tail'] as const) expect(new Set(CUSTOMERS.map((who) => LOOKS[who][key])).size).toBe(4)
    expect(new Set(CUSTOMERS.map((who) => LOOKS[who].ears.kind)).size).toBe(4)
    for (const who of CUSTOMERS) {
      expect(LOOKS[who].lock).not.toBe(LOOKS[who].mane)
      expect(hueOf(who)).toEqual({ fill: LOOKS[who].lock, edge: LOOKS[who].lockEdge })
    }
    expect(hueOf('ribbon').fill).not.toBe(hueOf('lion').fill)
    expect(hueOf('no-such-hue').fill).toMatch(/^#/)
  })

  it('cut each kind of tuft its own way, from its root at the origin to as far as its length', () => {
    const kinds = ['flame', 'pom', 'curtain', 'fluff'] as const
    const shapes = kinds.map((kind) => JSON.stringify(tuftOutline(kind, 100, 80, 0.2).map((p) => [Math.round(p.x), Math.round(p.y)])))
    expect(new Set(shapes).size).toBe(4)
    for (const kind of kinds) for (const reach of [40, 170]) {
      const outline = tuftOutline(kind, reach, 80, 0.2)
      const top = Math.min(...outline.map((p) => p.y)), bottom = Math.max(...outline.map((p) => p.y))
      expect(top).toBeGreaterThanOrEqual(-reach * 1.06)
      expect(top).toBeLessThanOrEqual(-reach * 0.94)
      expect(bottom).toBeLessThanOrEqual(reach * 0.15)
    }
  })
})
