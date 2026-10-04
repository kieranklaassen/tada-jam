import { describe, expect, it } from 'vitest'
import { BLADES } from './hand'
import { COLLAR_Y, DOOR as DOOR_AT, LOCK_X, LOOKING_GLASS, STEP } from './layout'
import { LOOKS, hueOf, tuftOutline } from './looks'
import { PERSONALITIES } from './personality'
import { Play } from './play'
import { Puppet } from './puppet'
import { makeRng } from './rng'
import { BUTTONS, placesOf, ribbonShape } from './poses'
import { blankSheets, bounds, recordingSheet, type Recording } from './recorder'
import { Sprites } from './sprites'
import { CUSTOMERS } from './tastes'
import { drawFrame, fallen } from './view'
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

describe('the salon around them', () => {
  const frame = (play: Play, time = 0): { kept: Recording; sprites: Sprites } => {
    const kept: Recording = { shapes: [], stamps: [], texts: 0 }
    const sprites = new Sprites(blankSheets, 1180, 820, 1), surface = recordingSheet(1180, 820, kept)
    play.time = time
    for (let i = 0; i < 3; i++) { kept.shapes.length = 0; kept.stamps.length = 0; drawFrame(surface.g as Ctx, 1180, 820, sprites, { play, guidance: null }) }
    return { kept, sprites }
  }
  const inBox = (corners: readonly { x: number; y: number }[], box: { x: number; y: number; w: number; h: number }, slack = 0): boolean => { const b = bounds(corners); return b.x + b.w / 2 >= box.x - slack && b.x + b.w / 2 <= box.x + box.w + slack && b.y + b.h / 2 >= box.y - slack && b.y + b.h / 2 <= box.y + box.h + slack }

  it('shows the customer in the looking glass: its whole mane as one sheet, the other way round, with its face', () => {
    const play = seated(), { kept, sprites } = frame(play)
    const who = play.game!.chair!, mane = sprites.mane(who, play.game!.mane, true)!
    const glass = { x: LOOKING_GLASS.x - LOOKING_GLASS.rx, y: LOOKING_GLASS.y - LOOKING_GLASS.ry, w: LOOKING_GLASS.rx * 2, h: LOOKING_GLASS.ry * 2 }
    const shown = kept.stamps.filter((stamp) => stamp.image === mane.sheet.canvas)
    expect(shown).toHaveLength(1)
    expect(inBox(shown[0].corners, glass)).toBe(true)
    // Flipped: the sheet's left edge is drawn to the right of its right edge.
    expect(shown[0].corners[0].x).toBeGreaterThan(shown[0].corners[1].x)
    const faces = kept.stamps.filter((stamp) => stamp.image === sprites.animal(who).face.sheet.canvas)
    expect(faces).toHaveLength(2)
    expect(faces.filter((stamp) => inBox(stamp.corners, glass))).toHaveLength(1)
    // Nobody in the chair, nobody in the glass.
    expect(frame(fresh()).kept.stamps.some((stamp) => inBox(stamp.corners, glass) && bounds(stamp.corners).w < 400)).toBe(false)
  })

  it('lays the whole mane together again only when a length has changed and nothing is in the fingers', () => {
    const sprites = new Sprites(blankSheets, 1180, 820, 1), mane = [40, 90, 12, 50, 55, 61, 47, 33, 58]
    const first = sprites.mane('lion', mane, true)!
    expect(sprites.mane('lion', mane, true)).toBe(first)
    const cut = mane.map((steps, i) => (i === 1 ? 45 : steps))
    // While it is held, the sheet it has is shown.
    expect(sprites.mane('lion', cut, false)).toBe(first)
    const second = sprites.mane('lion', cut, true)!
    expect(second).not.toBe(first)
    expect(first.sheet.canvas.width).toBe(0)
  })

  it('draws each of the pair at the door as one sheet with its eyes on top, behind rain that moves', () => {
    const play = fresh(), { kept, sprites } = frame(play)
    const pane = DOOR_AT.glass
    for (const who of play.game!.waiting) {
      const stamps = kept.stamps.filter((stamp) => stamp.image === sprites.waiting(who).sheet.canvas)
      expect(stamps).toHaveLength(1)
      expect(inBox(stamps[0].corners, pane, 60)).toBe(true)
    }
    const rain = (k: Recording) => JSON.stringify(k.shapes.find((shape) => shape.kind === 'stroke' && shape.parts.length === 9)?.points.map((p) => Math.round(p.y)))
    expect(rain(kept)).toBeDefined()
    expect(rain(frame(fresh(), 0.5).kept)).not.toBe(rain(kept))
    // Somebody goes by in the street now and then, and is not there the rest of the time.
    const passing = (time: number): boolean => { const made = frame(fresh(), time); return made.kept.stamps.some((stamp) => stamp.image === made.sprites.passer.sheet.canvas) }
    expect(passing(2)).toBe(true)
    expect(passing(9)).toBe(false)
  })
})

describe('the ribbon on the floor', () => {
  it('lies in waves from its clip, not as a level bar', () => {
    const play = seated({ ribbon: { len: 60, at: 'floor', x: 40 } })
    const kept: Recording = { shapes: [], stamps: [], texts: 0 }
    drawFrame(recordingSheet(1180, 820, kept).g as Ctx, 1180, 820, new Sprites(blankSheets, 1180, 820, 1), { play, guidance: null })
    const band = kept.shapes.find((shape) => shape.kind === 'fill' && shape.style === hueOf('ribbon').fill && bounds(shape.points).w > 100)!
    const top = band.points.slice(0, band.points.length / 2).map((p) => Math.round(p.y))
    expect(Math.max(...top) - Math.min(...top)).toBeGreaterThanOrEqual(8)
  })
})

describe('a poke on the ribbon where it lies', () => {
  it('is seen: it jumps up short and comes back to its length', () => {
    const play = seated({ ribbon: { len: 60, at: 'floor', x: 40 }, shown: { snip: true, pull: true, ribbon: true } })
    const long = (): number => {
      const kept: Recording = { shapes: [], stamps: [], texts: 0 }
      drawFrame(recordingSheet(1180, 820, kept).g as Ctx, 1180, 820, new Sprites(blankSheets, 1180, 820, 1), { play, guidance: null })
      return Math.max(...kept.shapes.filter((shape) => shape.kind === 'fill' && shape.style === hueOf('ribbon').fill).map((shape) => bounds(shape.points).w))
    }
    const before = long()
    const shape = ribbonShape(play.game!)!
    tap(play, shape.kind === 'lie' ? { x: shape.from.x + 60, y: shape.from.y } : { x: 0, y: 0 })
    play.step(1 / 60, false)
    expect(long()).toBeLessThan(before * 0.8)
    for (let i = 0; i < 120; i++) play.step(1 / 60, true)
    expect(long()).toBeCloseTo(before, 0)
  })
})

describe('a bow', () => {
  it('sits on the end of its tuft and goes down with the head when the customer sinks', () => {
    const play = seated({ ribbon: { len: 40, at: 'mane', tuft: 4 }, shown: { snip: true, pull: true, ribbon: true } })
    const bowAt = (): { x: number; y: number; w: number; h: number } => {
      const kept: Recording = { shapes: [], stamps: [], texts: 0 }
      drawFrame(recordingSheet(1180, 820, kept).g as Ctx, 1180, 820, new Sprites(blankSheets, 1180, 820, 1), { play, guidance: null })
      const bows = kept.shapes.filter((shape) => shape.kind === 'fill' && shape.style === hueOf('ribbon').fill).map((shape) => bounds(shape.points)).filter((box) => box.y < 300)
      // On the head, and the other way round in the looking glass.
      expect(bows.length).toBe(2)
      return bows.sort((a, b) => b.x - a.x)[0]
    }
    for (let i = 0; i < 30; i++) play.step(1 / 60, true)
    const rest = bowAt(), shape = ribbonShape(play.game!)!
    expect(shape.kind === 'worn' && Math.abs(rest.x + rest.w / 2 - shape.at.x) < 12).toBe(true)
    play.customer()!.react('maneHated')
    for (let i = 0; i < 30; i++) play.step(1 / 60, false)
    expect(play.customer()!.at('sink')).toBeGreaterThan(0.3)
    expect(bowAt().y).toBeGreaterThan(rest.y + 12)
  })
})

describe('a piece on the floor', () => {
  it('lies tilted, never level, and every piece the same way, so that no two cross like a sign', () => {
    const tilts = Array.from({ length: 101 }, (_, x) => [4, 9, 20, 55].map((len) => fallen({ len, x }))).flat()
    for (const tilt of tilts) { expect(tilt).toBeLessThanOrEqual(-0.1); expect(tilt).toBeGreaterThanOrEqual(-0.4) }
    expect(new Set(tilts.map((tilt) => tilt.toFixed(3))).size).toBeGreaterThan(3)
  })
})

describe('limbs and the ribbon', () => {
  const drawn = (play: Play): Recording => {
    const kept: Recording = { shapes: [], stamps: [], texts: 0 }
    const sprites = new Sprites(blankSheets, 1180, 820, 1), surface = recordingSheet(1180, 820, kept)
    drawFrame(surface.g as Ctx, 1180, 820, sprites, { play, guidance: null })
    return kept
  }
  const furOf = (who: keyof typeof LOOKS) => LOOKS[who].fur

  it('draws a paw at the head while a move has one out, both hooves for the yak who hides, and a hind foot for the rabbit who drums', () => {
    const balls = (play: Play, who: keyof typeof LOOKS): number => drawn(play).shapes.filter((shape) => shape.kind === 'fill' && shape.style === furOf(who) && shape.parts.length > 0 && shape.parts.every((part) => bounds(part).w > 16 && bounds(part).w < 44 && bounds(part).y < 420)).reduce((n, shape) => n + shape.parts.length, 0)
    const lion = seated({ chair: 'lion', friend: 'poodle' })
    const calm = balls(lion, 'lion')
    lion.customer()!.react('bowHated')
    for (let i = 0; i < 36; i++) lion.step(1 / 60, false)
    expect(balls(lion, 'lion')).toBe(calm + 1)
    const yak = seated({ chair: 'yak', friend: 'poodle' })
    const before = balls(yak, 'yak')
    yak.customer()!.react('maneHated')
    for (let i = 0; i < 40; i++) yak.step(1 / 60, false)
    // Two hooves, over his eyes.
    expect(balls(yak, 'yak')).toBe(before + 2)
    const rabbit = seated({ chair: 'rabbit', friend: 'poodle' })
    const feet = (play: Play): number => drawn(play).shapes.filter((shape) => shape.kind === 'fill' && shape.style === furOf('rabbit') && bounds(shape.points).w > 70 && bounds(shape.points).w < 110 && bounds(shape.points).h < 70).length
    expect(feet(rabbit)).toBe(0)
    rabbit.customer()!.react('rubLoved')
    let seen = 0
    for (let i = 0; i < 30; i++) { rabbit.step(1 / 60, false); seen = Math.max(seen, feet(rabbit)) }
    expect(seen).toBeGreaterThan(0)
  })

  it('draws a paw and a foot of the customer under the cape after the cape, so both are seen in front of it', () => {
    const kept: Recording = { shapes: [], stamps: [], texts: 0 }
    const sprites = new Sprites(blankSheets, 1180, 820, 1), surface = recordingSheet(1180, 820, kept)
    const rabbit = seated({ chair: 'rabbit', friend: 'poodle' })
    rabbit.customer()!.react('rubLoved')
    rabbit.customer()!.react('patsItsLock')
    let footOver = false, pawOver = false
    for (let i = 0; i < 30; i++) {
      rabbit.step(1 / 60, false)
      kept.shapes.length = 0; kept.stamps.length = 0
      drawFrame(surface.g as Ctx, 1180, 820, sprites, { play: rabbit, guidance: null })
      const cape = kept.stamps.find((stamp) => stamp.image === sprites.cape.sheet.canvas)!
      for (const shape of kept.shapes) {
        if (shape.kind !== 'fill' || shape.style !== furOf('rabbit')) continue
        const box = bounds(shape.points)
        if (box.w > 70 && box.w < 110 && box.h < 70 && shape.order > cape.order) footOver = true
        if (box.w > 30 && box.w < 44 && box.y > 380 && shape.order > cape.order) pawOver = true
      }
    }
    expect(footOver).toBe(true)
    expect(pawOver).toBe(true)
  })

  it('lifts a blindfold for whoever wears it to peek, whichever of the four it is', () => {
    for (const who of CUSTOMERS) {
      const puppet = new Puppet(PERSONALITIES[who], makeRng(4))
      puppet.react('blindfolded')
      let highest = 0
      for (let i = 0; i < 120; i++) { puppet.step(1 / 60, false); highest = Math.max(highest, puppet.at('brow')) }
      expect(highest, who).toBeGreaterThan(0.5)
    }
  })

  it('spins a ruffled ribbon into a corkscrew, a strip whose width comes and goes, where hair fans out in three', () => {
    const play = seated({ ribbon: { len: 60, at: 'lock' } })
    const ribbon = (): { parts: number; widths: number[] } => {
      const shape = drawn(play).shapes.find((s) => s.kind === 'fill' && s.style === hueOf('ribbon').fill && bounds(s.points).h > 100)!
      const long = shape.parts.reduce((a, b) => (bounds(b).h > bounds(a).h ? b : a))
      const half = long.length / 2
      return { parts: shape.parts.length, widths: long.slice(0, Math.floor(half)).map((p, i) => Math.round(Math.abs(long[long.length - 1 - i].x - p.x))) }
    }
    expect(new Set(ribbon().widths.slice(0, 1)).size).toBe(1)
    play.hair.ruffled('ribbon')
    play.step(1 / 60, false)
    const twisted = ribbon()
    expect(twisted.parts).toBe(1)
    expect(Math.max(...twisted.widths) - Math.min(...twisted.widths)).toBeGreaterThan(10)
    for (let i = 0; i < 120; i++) play.step(1 / 60, true)
    expect(play.hair.strands.ribbon.flutter).toBe(0)
  })

  it('puts the ribbon\'s clip in the paw that holds the friend\'s lock when the ribbon hangs beside it', () => {
    const paw = (play: Play): number => Math.max(...drawn(play).shapes.filter((shape) => shape.kind === 'fill' && shape.style === furOf('poodle') && bounds(shape.points).h < 34 && bounds(shape.points).y > 370 && bounds(shape.points).y < 400).map((shape) => bounds(shape.points).w))
    expect(paw(seated({ ribbon: { len: 40, at: 'peg' } }))).toBeLessThan(34)
    expect(paw(seated({ ribbon: { len: 40, at: 'model' } }))).toBeGreaterThan(60)
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
