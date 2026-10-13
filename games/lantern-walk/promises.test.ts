import { describe, expect, it } from 'vitest'
import { BLOW_SECONDS } from './badger'
import { LADDER, TAP_PRESSES } from './config'
import { drawBadger, drawFox, drawHedgehog, drawOwl } from './figures'
import { foxNose } from './fox'
import { PULL } from './game'
import { handPose, type HandPose } from './guidance'
import { Hand, gripFor, meet, meetAll, woodSave } from './hand'
import {
  BODY_APART, FOX_HOME_END, HOOK, HOOK_GRIP, HOOK_NEAR, HOOK_TOUCH, MOTHS, PAPER_BOX, PLACES, POLE, REACH, STAGE_H, STAGE_W, SURFACES, WIRE, WORMS, WORM_BOX, apart, boxAt, foxBox, hedgehogBox, perch, wormPlace,
} from './layout'
import { MOTH_REACH } from './moths'
import { BIG, RUSH_WIDE, type Big } from './seen'
import { sheetOf, type Paper, type SheetWindow } from './sheet'
import { Sketch, inside } from './sketch'
import { drawSmall } from './small'
import { SOUND_KINDS, type SoundKind } from './sounds'
import { handSpots } from './spots'
import { fit } from './stage'
import { flameOf } from './view'
import { REST_BOX, RING_SPEED, RUSH, STEP, onHook, type Patch, type Wood } from './wood'
import { HANGS, WORM_MIDDLE, WORM_REACH, mayHang, wormAt } from './worms'

// What the sheet promises of the wood, each held by a test that plays it
// through the path the Mount uses and fails when the thing is taken out:
// where the lantern is hung and where it is not, who is lit and who answers,
// what a rush is, who stands across whom, where the lantern comes to rest,
// what the ghost hand shows, and what a second finger gets.

const PAINT = { owl: drawOwl, badger: drawBadger, fox: drawFox, hedgehog: drawHedgehog } as const

/** A round window of the sheet, `r` hundredths across its half. At 75 across and 50 down it throws its light level to the right of the lantern. */
function hole(x: number, y: number, paper: Paper | null, r = 16): SheetWindow {
  const outline: number[] = []
  for (let i = 0; i < 12; i++) outline.push(Math.round(x + Math.cos((i / 12) * Math.PI * 2) * r), Math.round(y + Math.sin((i / 12) * Math.PI * 2) * r))
  return { outline, paper, cut: true }
}

const sketch = new Sketch()
sketch.wobble = 0

/** The wax of a large creature as it is drawn now: its points, x, y, x, y. */
function waxOf(wood: Wood, name: Big): number[] {
  sketch.clear()
  PAINT[name](sketch, wood, wood.time)
  return Array.from(sketch.hide.pts.subarray(0, sketch.hide.n))
}

/** How far a patch is from a set of points, by its own outline: 0 when a point lies inside it. */
function gapTo(patch: Patch, points: readonly number[]): number {
  let least = Infinity
  for (let i = 0; i < points.length; i += 2) {
    if (inside(patch.world, patch.world.length, points[i], points[i + 1])) return 0
    for (let k = 0; k < patch.world.length; k += 2) least = Math.min(least, Math.hypot(patch.world[k] - points[i], patch.world[k + 1] - points[i + 1]))
  }
  return least
}

const inFrame = (x: number, y: number) => x >= 0 && x <= STAGE_W && y >= 0 && y <= STAGE_H

describe('the hook', () => {
  it('letting go at the moths does not hang the lantern: with the ready sheet, the yellow laid on their tree and let go leaves the walk going', () => {
    for (const position of ['three-windows', 'one-window']) {
      const hand = new Hand(woodSave({ sheet: sheetOf(position) }))
      const at = gripFor(hand.wood, 'yellow', PLACES.mothTree.x, 330)
      hand.carry(at.x, at.y, 220, 0.6)
      hand.up()
      hand.wait(1)
      expect(hand.wood.hung, position).toBe(false)
      expect(hand.game.finished, position).toBe(false)
      expect(hand.game.sceneRunning, position).toBe(false)
    }
  })

  it('the lantern is hung only when it is let go with the tip of its pole on the hook, or with the finger on the hook or between the two: everywhere else across the wood it stays where it was let go', () => {
    for (let x = REACH.left; x <= REACH.right; x += 109) {
      for (let y = REACH.top; y <= REACH.bottom; y += 67) {
        const hand = new Hand(woodSave({ sheet: [], lit: false }))
        hand.carry(x, y, 2400, 0.05)
        hand.up()
        hand.wait(0.4)
        expect(hand.wood.hung, `${x}, ${y}`).toBe(Math.hypot(x - HOOK_GRIP.x, y - HOOK_GRIP.y) <= HOOK_NEAR || onHook(x, y))
      }
    }
    // On the hook itself, and at the edge of the round about it.
    for (const [dx, dy, hangs] of [[0, 0, true], [HOOK_NEAR - 3, 0, true], [0, HOOK_NEAR - 3, true], [HOOK_TOUCH + 12, 0, false], [0, HOOK_TOUCH + 6, false], [-(HOOK_TOUCH + 6), 0, false]] as const) {
      const hand = new Hand(woodSave())
      hand.carry(HOOK_GRIP.x + dx, HOOK_GRIP.y + dy, 400, 0.1)
      hand.up()
      hand.wait(0.4)
      expect(hand.wood.hung, `${dx}, ${dy}`).toBe(hangs)
    }
  })

  it('a tap never hangs it: not on the tree, not on the door, not on the hook itself', () => {
    for (const [x, y] of [[PLACES.mothTree.x, 300], [1130, 620], [1100, 500], [HOOK.x, HOOK.y], [HOOK_GRIP.x, HOOK_GRIP.y], [HOOK.x, HOOK.y + WIRE]]) {
      const hand = new Hand(woodSave())
      for (let k = 0; k < 3; k++) { hand.tap(x, y); hand.wait(0.5) }
      expect(hand.wood.hung, `${x}, ${y}`).toBe(false)
      expect(hand.game.finished).toBe(false)
    }
  })

  it('the round a let-go must land in is the hook and a finger\'s width about it, and 48 px or more across at both sizes', () => {
    for (const surface of SURFACES) {
      const scale = fit(surface.width, surface.height).scale
      expect(HOOK_NEAR * 2 * scale).toBeGreaterThanOrEqual(48)
      // The hook is drawn some 30 units across: half of that and a finger's width of 48 px is the most the round may reach.
      expect(HOOK_NEAR * scale).toBeLessThanOrEqual(15 * scale + 48)
    }
  })

  it('none of the ghost hand\'s places is in that round, with any ready sheet', () => {
    for (const position of LADDER) {
      const hand = new Hand(woodSave({ sheet: sheetOf(position) }))
      const spots = handSpots(hand.wood)
      expect(spots.length).toBeGreaterThanOrEqual(3)
      for (const spot of spots) {
        expect(Math.hypot(spot.x - HOOK_GRIP.x, spot.y - HOOK_GRIP.y), `${position} ${spot.name}`).toBeGreaterThan(HOOK_NEAR)
        expect(onHook(spot.x, spot.y), `${position} ${spot.name}`).toBe(false)
      }
    }
  })
})

describe('the hand\'s places and the hook', () => {
  it('whatever window the child cut, no place the hand carries the lantern to for a creature is one where letting go would hang it: not under the hook, not on it and not between', () => {
    let near = 0
    for (let across = 5; across <= 45; across += 2) {
      for (const down of [30, 50, 70]) {
        const outline: number[] = []
        for (let i = 0; i < 12; i++) outline.push(Math.round(across + Math.cos((i / 12) * Math.PI * 2) * 9), Math.round(down + Math.sin((i / 12) * Math.PI * 2) * 9))
        const hand = new Hand(woodSave({ sheet: [{ outline, paper: 'yellow', cut: true }] }))
        for (const spot of handSpots(hand.wood)) {
          expect(onHook(spot.x, spot.y), `${across}, ${down}: ${spot.name}`).toBe(false)
          expect(Math.hypot(spot.x - HOOK_GRIP.x, spot.y - HOOK_GRIP.y), `${across}, ${down}: ${spot.name}`).toBeGreaterThan(HOOK_NEAR)
          if (Math.hypot(spot.x - HOOK.x, spot.y - HOOK.y) < HOOK_TOUCH + 60) near++
        }
      }
    }
    // Some of these windows do put a place right beside the hook's round: the rule is what keeps them out of it.
    expect(near).toBeGreaterThan(0)
  })
})

describe('the fox and a lantern that gives no light', () => {
  it('it creeps up, stretches its neck, and its muzzle knocks the glass: at the knock the muzzle is on the glass and nothing of the fox is behind the paper', () => {
    for (const [x, y] of [[700, 640], [690, 600], [620, 640]]) {
      const hand = new Hand(woodSave({ lit: false, lantern: { x: 1000, y } }))
      hand.frame = STEP
      let from = hand.wood.fox.x, knocked = false
      hand.after = (events) => {
        if (!events.some((event) => event.kind === 'dong')) return
        knocked = true
        const wood = hand.wood, fox = wood.fox
        const side = wood.lantern.x >= fox.x ? 1 : -1
        const nose = foxNose(fox.x, side, fox.reach, fox.raise)
        // The muzzle's tip is on the near edge of the paper, give or take the lantern's swing.
        expect(Math.abs(nose.x - (wood.lantern.x - side * -PAPER_BOX.left))).toBeLessThan(14)
        expect(Math.abs(nose.y - wood.lantern.y)).toBeLessThan(PAPER_BOX.bottom)
        // And the drawing agrees: the foremost point of the fox is that tip, and none of its wax lies under the paper.
        // The knock jerks the head back in this same step: the look is taken as it was the instant before.
        const recoil = fox.recoil
        fox.recoil = 0
        const wax = waxOf(wood, 'fox')
        fox.recoil = recoil
        let foremost = -Infinity
        for (let i = 0; i < wax.length; i += 2) foremost = Math.max(foremost, side * wax[i])
        expect(Math.abs(side * foremost - nose.x)).toBeLessThan(8)
        const paper = boxAt(PAPER_BOX, wood.lantern.x, wood.lantern.y)
        for (let i = 0; i < wax.length; i += 2) expect(wax[i] > paper.left + 12 && wax[i] < paper.right - 12 && wax[i + 1] > paper.top && wax[i + 1] < paper.bottom, `${wax[i]}, ${wax[i + 1]}`).toBe(false)
      }
      hand.carry(x, y, 260, 5)
      expect(knocked, `${x}, ${y}`).toBe(true)
      // It crept: its feet moved, and each pace was heard as it was seen.
      expect(Math.abs(hand.wood.fox.x - from), `${x}, ${y}`).toBeGreaterThan(20)
      expect(hand.count('pad')).toBeGreaterThan(0)
      expect(hand.count('noseSniff')).toBeGreaterThanOrEqual(2)
      from = hand.wood.fox.x
    }
  })

  it('where the lantern is out of its lane\'s reach it stretches and sniffs, and knocks nothing: no bump from far off', () => {
    // To the left of its lane, by the badger, and high above it: near enough to smell, too far to touch.
    for (const [x, y] of [[150, 640], [190, 600], [160, 720], [560, 330]]) {
      const hand = new Hand(woodSave({ lit: false, lantern: { x: 1000, y: 640 } }))
      hand.frame = STEP
      let swung = 0
      hand.carry(x, y, 260, 1.5)
      hand.watch = () => { swung = Math.max(swung, Math.abs(hand.wood.swingSpeed)) }
      hand.wait(6)
      expect(hand.count('dong'), `${x}, ${y}`).toBe(0)
      // Held still, nothing sets the lantern swinging again.
      expect(swung, `${x}, ${y}`).toBeLessThan(0.4)
    }
    // And one that it does sniff at from where its lane ends: the sniffs are heard, the knock is not.
    const hand = new Hand(woodSave({ lit: false, lantern: { x: 1000, y: 640 } }))
    hand.carry(150, 640, 260, 6)
    expect(hand.count('noseSniff')).toBeGreaterThanOrEqual(2)
    expect(hand.count('dong')).toBe(0)
  })
})

describe('the badger', () => {
  it('in red the thin stream of its breath is seen to bend the flame over, away from it, before the candle goes out; a great puff bends nothing', () => {
    const bends: Record<string, number> = {}
    for (const paper of ['red', 'yellow'] as const) {
      const hand = new Hand(woodSave({ sheet: [hole(20, 50, paper)], lantern: { x: 700, y: 640 } }))
      hand.frame = STEP
      let most = 0, leanMost = 0
      hand.watch = () => {
        if (!hand.wood.lit) return
        most = Math.max(most, Math.abs(hand.wood.bend))
        leanMost = Math.max(leanMost, flameOf(hand.wood, hand.game.time).lean)
        // Away from the badger: the lantern is to its right, so the flame leans right.
        expect(hand.wood.bend).toBeGreaterThanOrEqual(0)
      }
      hand.shine(paper, PLACES.badger.x, PLACES.badger.y - 120, 2.4, 200)
      expect(hand.wood.lit, paper).toBe(false)
      bends[paper] = most
      if (paper === 'red') expect(leanMost).toBeGreaterThan(14)
    }
    expect(bends.red).toBeGreaterThan(0.7)
    expect(bends.yellow).toBe(0)
  })

  it('it holds its breath between 0.62 and 1.15 seconds before it blows, and taking the light away in that time cancels the blow', () => {
    expect([...BLOW_SECONDS]).toEqual([0.62, 0.95, 1.15])
    const hand = new Hand(woodSave({ sheet: [hole(20, 50, 'blue')], lantern: { x: 700, y: 640 } }))
    hand.frame = STEP
    let drawing = false
    hand.watch = () => { drawing = drawing || hand.wood.badger.mode === 'draw' }
    const to = gripFor(hand.wood, 'blue', PLACES.badger.x, PLACES.badger.y - 120)
    hand.down(hand.wood.want.x, hand.wood.want.y)
    // The light is brought on step by step, and stopped in the step the badger begins to draw its breath.
    for (let x = hand.wood.want.x; x > to.x && !drawing; x -= 200 * STEP) { hand.move(x, to.y); hand.wait(STEP) }
    expect(drawing).toBe(true)
    // Half a second into a yawn of 1.15: the light is taken away, and the candle burns on.
    hand.wait(0.5)
    hand.slide(hand.wood.want.x + 300, to.y - 200, 600)
    hand.wait(2)
    expect(hand.wood.lit).toBe(true)
    expect(hand.wood.badger.mode).toBe('sit')
    expect(hand.count('blow')).toBe(0)
  })

  it('in the ending it answers whether or not it sits: asleep or resting, it sits up and blows from far off at a candle that burns; at one that is out it does not', () => {
    for (const mode of ['asleep', 'sit', 'grin'] as const) {
      // Met by the walk: it blew the candle out, and a tap on the lantern lit it again.
      const hand = new Hand(woodSave({ lantern: { x: 420, y: 640 } }))
      meet(hand, 'badger')
      expect(hand.wood.met.has('badger')).toBe(true)
      expect(hand.wood.lit).toBe(true)
      hand.carry(HOOK_GRIP.x, HOOK_GRIP.y, 400, 0.1)
      hand.wood.badger.mode = mode
      hand.wood.badger.rest = 9
      hand.up()
      hand.wait(7.4)
      expect(hand.count('farBlow'), mode).toBe(1)
      expect(hand.wood.badger.mode, mode).toBe('sit')
      expect(hand.wood.lit).toBe(true)
    }
    // Met, and the candle left as the badger left it: out.
    const dark = new Hand(woodSave({ lantern: { x: 420, y: 640 } }))
    dark.shine('red', PLACES.badger.x, PLACES.badger.y - 120, 2.4, 150)
    expect(dark.wood.met.has('badger')).toBe(true)
    expect(dark.wood.lit).toBe(false)
    dark.carry(HOOK_GRIP.x, HOOK_GRIP.y, 400, 0.1)
    dark.up()
    dark.wait(8.5)
    expect(dark.wood.hung).toBe(true)
    expect(dark.count('farBlow')).toBe(0)
  })
})

describe('the ghost hand', () => {
  it('taps once: the showing of a tap has one press, so no showing starts or ends a scene by a second press of its own', () => {
    expect(TAP_PRESSES).toBe(1)
    const pose: HandPose = { travel: 0, press: 0, opacity: 0 }
    let presses = 0, down = false
    for (let p = 0; p <= 1; p += 0.002) {
      handPose(p, false, pose)
      if (!down && pose.press > 0.5) { presses++; down = true }
      if (down && pose.press < 0.2) down = false
    }
    expect(presses).toBe(1)
  })
})

describe('lit means answered', () => {
  it('a large creature is drawn lit exactly when a patch touches any of it as it is drawn, and then the light it answers is that patch\'s', () => {
    let lit = 0, dark = 0
    for (const paper of ['yellow', 'red', 'blue', null] as const) {
      const hand = new Hand(woodSave({ sheet: [hole(75, 50, paper, 7)] }))
      hand.watch = () => {
        const wood = hand.wood, patch = wood.patches[0]
        for (const name of BIG) {
          const wax = waxOf(wood, name)
          const gap = gapTo(patch, wax)
          // Clear of the edge either way, the two must agree.
          if (gap === 0) { expect(wood.sight[name].touch, name).toBe(patch); expect(wood.sight[name].light, name).toBe(paper ?? 'plain'); lit++ }
          else if (gap > 8) { expect(wood.sight[name].touch, name).toBeNull(); expect(wood.sight[name].light, name).toBeNull(); dark++ }
        }
      }
      hand.down(hand.wood.want.x, hand.wood.want.y)
      for (const [x, y] of [[420, 680], [250, 740], [90, 400], [600, 760], [700, 620]]) hand.slide(x, y, 190)
      hand.up()
    }
    expect(lit).toBeGreaterThan(500)
    expect(dark).toBeGreaterThan(500)
  })

  it('the fox answers a light that lies only on its feet, and the badger one that lies only on its flank: wherever a creature is lit, it answers', () => {
    const fox = new Hand(woodSave({ sheet: [hole(75, 50, 'yellow', 4)], lantern: { x: 700, y: 640 } }))
    fox.shine('yellow', PLACES.fox.x + 14, PLACES.fox.y - 2, 1.6, 200)
    expect(fox.wood.sight.fox.touch).not.toBeNull()
    expect(fox.count('sneeze')).toBe(1)
    const badger = new Hand(woodSave({ sheet: [hole(75, 50, 'yellow', 4)], lantern: { x: 300, y: 500 } }))
    let onFlank = false
    badger.watch = () => { onFlank = onFlank || badger.wood.sight.badger.touch !== null }
    badger.shine('yellow', PLACES.badger.x - 96, PLACES.badger.y - 46, 1.6, 200)
    expect(onFlank).toBe(true)
    expect(badger.count('blow')).toBe(1)
  })

  it('a creature that rests when the light reaches it shows in that same step that it was touched, and again while the light stays', () => {
    // The owl and the hedgehog are not among them: neither has a rest from a light. The owl turns away the step one touches it, and the hedgehog walks in it or sits down at its edge.
    const cases: [Big | 'moths', number, number][] = [['fox', PLACES.fox.x, PLACES.fox.y - 120], ['badger', PLACES.badger.x, PLACES.badger.y - 120], ['moths', perch(6).x, perch(6).y]]
    for (const [name, x, y] of cases) {
      const hand = new Hand(woodSave({ sheet: [hole(75, 50, 'yellow', 6)], lantern: name === 'moths' ? { x: 560, y: 600 } : { x: 640, y: 420 } }))
      hand.frame = STEP
      const body = name === 'moths' ? hand.wood.moths : hand.wood[name]
      const touched = () => (name === 'moths' ? hand.wood.moths.list.some((moth) => hand.wood.touching(moth.x, moth.y, MOTH_REACH) !== null) : hand.wood.sight[name].touch !== null)
      let glances = 0, late = false, was = false, before = 0
      hand.watch = () => {
        body.rest = 5
        const now = touched()
        // The step the light arrives is the step the glance begins.
        if (now && !was && body.glance !== 1) late = true
        if (body.glance === 1 && before < 1) glances++
        before = body.glance
        was = now
      }
      hand.shine('yellow', x, y, 3.2, 170)
      expect(was, name).toBe(true)
      expect(late, name).toBe(false)
      expect(glances, name).toBeGreaterThanOrEqual(2)
    }
  })

  it('the glance is drawn: a large creature\'s eyes shut and the moths\' wings flick', () => {
    const hand = new Hand(woodSave())
    const lines = (paint: () => void) => { sketch.clear(); paint(); return Array.from(sketch.lines.pts.subarray(0, sketch.lines.n)).concat(Array.from(sketch.whites.pts.subarray(0, sketch.whites.n))).join(',') }
    for (const name of BIG) {
      const calm = lines(() => PAINT[name](sketch, hand.wood, 1))
      hand.wood[name].glance = 1
      expect(lines(() => PAINT[name](sketch, hand.wood, 1)), name).not.toBe(calm)
      hand.wood[name].glance = 0
    }
    const calm = lines(() => drawSmall(sketch, hand.wood, 1, false))
    hand.wood.moths.glance = 1
    expect(lines(() => drawSmall(sketch, hand.wood, 1, false))).not.toBe(calm)
  })
})

describe('a rush is one rule for all six', () => {
  const ANSWER: Record<string, SoundKind> = { moths: 'tumble', fox: 'scrabble', owl: 'spin', worms: 'trill', hedgehog: 'pop', badger: 'miss' }
  /** The side of each creature a light is rushed past, top to bottom or bottom to top: where its edge is, and between which heights. */
  const SIDE: Record<string, { edge: number; from: number; to: number }> = {
    moths: { edge: 990, from: 600, to: 172 },
    fox: { edge: 536, from: 250, to: 700 },
    owl: { edge: 346, from: 640, to: 172 },
    worms: { edge: wormPlace(0).x + WORM_REACH, from: 620, to: 172 },
    hedgehog: { edge: 810, from: 300, to: 710 },
    badger: { edge: 340, from: 330, to: 710 },
  }

  /** The nearest a patch came to a creature while the light moved faster than a rush, by the creature as it is drawn. */
  function nearest(hand: Hand, name: string): number {
    const wood = hand.wood, patch = wood.patches[0]
    if (name === 'moths') return Math.min(...wood.moths.list.map((moth) => Math.max(0, gapTo(patch, [moth.x, moth.y]) - MOTH_REACH)))
    if (name === 'worms') return Math.min(...Array.from({ length: WORMS }, (_, i) => Math.max(0, gapTo(patch, [wormPlace(i).x, wormPlace(i).y - WORM_MIDDLE]) - WORM_REACH)))
    return gapTo(patch, waxOf(wood, name as Big))
  }

  function rushPast(name: string, wide: number, speed: number): { heard: number; gap: number; fast: boolean } {
    const side = SIDE[name], r = 28
    const sheet = [hole(75, 50, 'yellow', 5)]
    const probe = new Hand(woodSave({ sheet })).wood
    // The right-hand edge of a large creature is the rightmost point of its wax as it sits.
    let edge = side.edge
    if (name !== 'moths' && name !== 'worms') { const wax = waxOf(probe, name as Big); edge = -Infinity; for (let i = 0; i < wax.length; i += 2) edge = Math.max(edge, wax[i]) }
    let from = gripFor(probe, 'yellow', edge + wide + r, side.from), to = gripFor(probe, 'yellow', edge + wide + r, side.to)
    if (name === 'hedgehog') {
      // The hedgehog stands on the ground, lower than a finger can sweep past: the light is rushed level, over its back.
      const wax = waxOf(probe, 'hedgehog')
      let top = Infinity
      for (let i = 1; i < wax.length; i += 2) top = Math.min(top, wax[i])
      from = gripFor(probe, 'yellow', PLACES.hedgehog.x - 330, top - wide - r)
      to = gripFor(probe, 'yellow', PLACES.hedgehog.x + 330, top - wide - r)
    }
    // The owl's side is over the badger, where no lantern is found at rest: there the light is carried up to its start, slowly.
    const hand = new Hand(woodSave(name === 'owl' ? { sheet } : { sheet, lantern: from }))
    hand.frame = STEP
    if (name === 'owl') hand.carry(from.x, from.y, 300, 0.5)
    let gap = Infinity, fast = false
    hand.watch = () => {
      // Up to its answer: after it the creature is off after the light, or tumbling through it.
      if (hand.count(ANSWER[name]) > 0 || hand.wood.speed <= (speed > RUSH ? RUSH : 0)) return
      fast = fast || hand.wood.speed > RUSH
      gap = Math.min(gap, nearest(hand, name))
    }
    hand.carry(to.x, to.y, speed, 0.6)
    return { heard: hand.count(ANSWER[name]), gap, fast }
  }

  it('faster than 640 units a second and within 70 of the creature, each of the six gives its rush; wider than that, none does; slower than that, none does', () => {
    for (const name of Object.keys(ANSWER)) {
      const near = rushPast(name, 24, 1700)
      expect(near.fast, name).toBe(true)
      expect(near.gap, `${name} near`).toBeGreaterThan(0)
      // It answers as the light comes inside the 70, before it has touched the creature.
      // (The gap is measured to the corners of the patch's outline, which reads a little over.)
      expect(near.gap, `${name} near`).toBeLessThanOrEqual(RUSH_WIDE + 6)
      // One rush is one answer: for the glow-worms that is a wave along the fern, one trill a worm.
      expect(near.heard, `${name} near`).toBe(name === 'worms' ? WORMS : 1)
      const wide = rushPast(name, 150, 1700)
      expect(wide.fast, name).toBe(true)
      expect(wide.gap, `${name} wide`).toBeGreaterThan(RUSH_WIDE + 8)
      expect(wide.heard, `${name} wide`).toBe(0)
      const slow = rushPast(name, 24, 420)
      expect(slow.fast, name).toBe(false)
      expect(slow.heard, `${name} slow`).toBe(0)
    }
  })
})

describe('the lantern\'s note', () => {
  it('a lit lantern rings once each time it swings through the middle faster than the ringing speed, and at no other time; an unlit one never rings', () => {
    for (const lit of [true, false]) {
      const hand = new Hand(woodSave({ sheet: [], lit, lantern: { x: 900, y: 700 } }))
      hand.frame = STEP
      let side = 0, speedWas = 0, crossings = 0, slow = 0
      hand.before = () => { side = Math.sign(hand.wood.swing); speedWas = hand.wood.swingSpeed }
      hand.after = (events, pointer) => {
        if (pointer) return
        const wood = hand.wood
        const crossed = side !== 0 && Math.sign(wood.swing) !== side
        const rang = events.filter((event) => event.kind === 'bell').length
        if (crossed && Math.abs(wood.swingSpeed) > RING_SPEED) crossings++
        if (crossed && Math.abs(wood.swingSpeed) <= RING_SPEED && Math.abs(speedWas) <= RING_SPEED) slow++
        expect(rang).toBe(lit && crossed && Math.abs(wood.swingSpeed) > RING_SPEED ? 1 : 0)
      }
      hand.carry(500, 700, 900, 1)
      hand.carry(800, 600, 700, 6)
      // It swung through the middle fast, and it went on swinging through it slowly as it came to rest.
      expect(crossings).toBeGreaterThan(2)
      expect(slow).toBeGreaterThan(0)
      expect(hand.count('bell')).toBe(lit ? crossings : 0)
    }
  })
})

describe('eyes and lamps', () => {
  it('the eyes of the moths and the glow-worms follow the lantern, as the others\' do', () => {
    const pupils = (x: number) => {
      const hand = new Hand(woodSave({ lantern: { x, y: 520 } }))
      sketch.clear()
      drawSmall(sketch, hand.wood, 1, false)
      return Array.from(sketch.pupils.pts.subarray(0, sketch.pupils.n))
    }
    const left = pupils(80), right = pupils(1100)
    expect(left.length).toBe(right.length)
    // Each pupil is a little round of points: with the lantern on the left they all lie further left than with it on the right.
    let moved = 0
    for (let i = 0; i < left.length; i += 2) if (right[i] - left[i] > 0.8) moved++
    // Eight moths and five worms with two eyes each, and the spider's two, at five points or more a pupil.
    expect(moved).toBeGreaterThanOrEqual((MOTHS * 2 + WORMS * 2) * 5)
  })

  it('the glow-worms that light are exactly those the blue patch touches while it is the topmost light on them, and each keeps its lamp when the patch has gone', () => {
    // A narrow blue window, brought down from above onto the middle worm only.
    const at = wormPlace(2)
    const above = { x: at.x - 212, y: 270 }
    const narrow = new Hand(woodSave({ sheet: [hole(75, 50, 'blue', 2)], lantern: above }))
    const touched = () => Array.from({ length: WORMS }, (_, i) => narrow.wood.touching(wormPlace(i).x, wormPlace(i).y - WORM_MIDDLE, WORM_REACH) !== null)
    expect(touched()).toEqual([false, false, false, false, false])
    narrow.shine('blue', at.x, at.y - WORM_MIDDLE, 1.5, 60)
    expect(touched()).toEqual([false, false, true, false, false])
    expect(narrow.wood.worms.lamps).toBe(1 << 2)
    expect(narrow.count('chime')).toBe(1)
    // Lifted off again the way it came: the lamp stays lit, and no other was lit.
    narrow.carry(above.x, above.y, 120, 1)
    expect(touched()).toEqual([false, false, false, false, false])
    expect(narrow.wood.worms.lamps).toBe(1 << 2)
    // The same blue with a yellow window cut over the same place: the yellow is on top, and no lamp lights.
    const under = new Hand(woodSave({ sheet: [hole(75, 50, 'blue', 6), hole(75, 50, 'yellow', 6)], lantern: above }))
    under.shine('blue', at.x, at.y - WORM_MIDDLE, 1.5, 120)
    expect(under.wood.touching(at.x, at.y - WORM_MIDDLE, WORM_REACH)?.paper).toBe('yellow')
    expect(under.wood.worms.lamps).toBe(0)
    expect(under.count('chime')).toBe(0)
  })
})

describe('the ending', () => {
  it('a lantern hung and pulled down again within the same breath leaves nothing of the ending in the save: the next walk finds the fox and the hedgehog at home', () => {
    const hand = new Hand(woodSave())
    meetAll(hand, ['fox', 'hedgehog', 'moths'])
    for (const name of ['fox', 'hedgehog', 'moths'] as const) expect(hand.wood.met.has(name), name).toBe(true)
    hand.carry(HOOK_GRIP.x, HOOK_GRIP.y, 400, 0.1)
    hand.up()
    // Inside the 0.3 s the let-go waits: a finger lands on the place where the lantern will hang, which hangs it, and pulls.
    hand.wait(0.1)
    const x = HOOK.x + 30, y = HOOK.y + 60
    expect(Math.hypot(x - HOOK_GRIP.x, y - HOOK_GRIP.y)).toBeGreaterThan(140)
    hand.down(x, y)
    expect(hand.wood.hung).toBe(true)
    expect(hand.game.finished).toBe(true)
    hand.slide(x - PULL - 30, y + 20, 600)
    expect(hand.game.place).toBe('table')
    const save = hand.game.toSave()
    expect(save.finished).toBe(false)
    expect(save.fox.x).toBe(PLACES.fox.x)
    expect(save.hedgehog.x).toBe(PLACES.hedgehog.x)
    expect(save.moths).toBe('bark')
    hand.up()
    hand.wait(5)
    expect(hand.game.toSave().fox.x).toBe(PLACES.fox.x)
  })
})

describe('no sound without sight', () => {
  it('the moths\' ring whirrs in the step the first of them leaves the bark to circle, and once for each lap after it', () => {
    const hand = new Hand(woodSave({ sheet: [hole(75, 50, 'red')], lantern: { x: 1000, y: 520 } }))
    hand.frame = STEP
    let firstOrbit = -1, firstWhirr = -1
    hand.after = (events) => {
      if (firstOrbit < 0 && hand.wood.moths.list.some((moth) => moth.mode === 'orbit')) firstOrbit = hand.game.time
      if (firstWhirr < 0 && events.some((event) => event.kind === 'whirr')) firstWhirr = hand.game.time
    }
    hand.shine('red', PLACES.mothTree.x, PLACES.mothTree.y, 6, 200)
    expect(firstOrbit).toBeGreaterThan(0)
    expect(firstWhirr).toBe(firstOrbit)
    expect(hand.count('whirr')).toBeGreaterThanOrEqual(2)
  })

  it('no footstep sounds anywhere: nobody is drawn walking the lantern out or in, and the game has no such sound', () => {
    expect((SOUND_KINDS as readonly string[]).includes('step')).toBe(false)
  })
})

describe('standing across', () => {
  const BIG_ROOM = (wood: Wood) => ({ fox: foxBox(wood.fox.x), hedgehog: hedgehogBox(wood.hedgehog.x) })

  it('the fox keeps to the left of the hedgehog by a body\'s length at every step, led by every light and by a rush, and each steps aside for the other', () => {
    let closest = Infinity, foxWent = false, hogWent = false, foxAside = false, hogAside = false
    for (const paper of ['red', 'yellow', 'blue', null] as const) {
      const hand = new Hand(woodSave({ sheet: [hole(75, 50, paper, 14)] }))
      hand.watch = () => {
        const wood = hand.wood, rooms = BIG_ROOM(wood)
        closest = Math.min(closest, wood.hedgehog.x - wood.fox.x)
        expect(apart(rooms.fox, rooms.hedgehog), `${paper}: fox ${wood.fox.x} ${wood.fox.mode}, hedgehog ${wood.hedgehog.x} ${wood.hedgehog.mode}`).toBe(true)
        if (wood.fox.x > PLACES.fox.x + 60) foxWent = true
        if (wood.hedgehog.x < PLACES.hedgehog.x - 60) hogWent = true
        if (wood.fox.aside !== null) foxAside = true
        if (wood.hedgehog.aside !== null) hogAside = true
      }
      // The red leads the fox right, into the hedgehog's place; any light leads the hedgehog left, into the fox's.
      for (const [x, y] of [[900, 560], [1080, 560], [600, 560], [760, 760], [500, 760], [900, 760], [400, 760]]) hand.shine(paper, x, y, 0.9, 150)
      hand.shine(paper, 1000, 600, 0.5, 1600)
      hand.shine(paper, 380, 740, 0.5, 1600)
      hand.shine(paper, 1000, 740, 0.5, 1600)
      hand.up()
      hand.wait(2)
    }
    expect(closest).toBeGreaterThanOrEqual(BODY_APART)
    expect(foxWent).toBe(true)
    expect(hogWent).toBe(true)
    expect(foxAside).toBe(true)
    expect(hogAside).toBe(true)
  })

  it('in the ending, with the fox met and the hedgehog not, the hedgehog steps out of its road and the fox comes to its place: the two are never nearer than a body\'s length', () => {
    const hand = new Hand(woodSave({ hedgehog: { x: 760, y: PLACES.hedgehog.y }, lantern: { x: 700, y: 640 } }))
    meet(hand, 'fox')
    expect(hand.wood.met.has('fox')).toBe(true)
    expect(hand.wood.met.has('hedgehog')).toBe(false)
    let closest = Infinity
    hand.watch = () => { closest = Math.min(closest, hand.wood.hedgehog.x - hand.wood.fox.x) }
    hand.carry(HOOK_GRIP.x, HOOK_GRIP.y, 400, 0.1)
    hand.up()
    hand.wait(9)
    expect(closest).toBeGreaterThanOrEqual(BODY_APART)
    expect(hand.wood.fox.x).toBe(FOX_HOME_END)
    expect(hand.game.toSave().fox.x).toBe(Math.round(hand.wood.fox.x))
    expect(hand.game.toSave().hedgehog.x).toBe(Math.round(hand.wood.hedgehog.x))
    expect(hand.wood.hedgehog.x - hand.wood.fox.x).toBeGreaterThanOrEqual(BODY_APART)
  })

  it('a glow-worm that hangs by a cold lantern keeps off the fox and the hedgehog: only those with room there let themselves down, and one carried at them is whipped up its thread', () => {
    const at = { x: 0, y: 0 }
    let hung = 0, lost = 0
    for (const [x, y] of [[560, 520], [640, 560], [700, 600], [520, 470], [790, 470]]) {
      const hand = new Hand(woodSave({ lit: false, lantern: { x: 1000, y: 600 } }))
      hand.watch = () => {
        const wood = hand.wood, rooms = BIG_ROOM(wood)
        for (let i = 0; i < WORMS; i++) {
          // One on its way down to a seat with room may cross a corner on the way; one at its seat, or one that has lost its room, may not.
          const has = mayHang(wood, i)
          if (wood.worms.hang[i] < HANGS || (has && wood.worms.hang[i] < 1)) continue
          if (has) hung++; else lost++
          wormAt(wood, i, at)
          const worm = boxAt(WORM_BOX, at.x, at.y)
          expect(apart(worm, rooms.fox), `worm ${i} on the fox with the lantern at ${x}, ${y}`).toBe(true)
          expect(apart(worm, rooms.hedgehog), `worm ${i} on the hedgehog`).toBe(true)
        }
      }
      hand.carry(x - POLE.x, y - POLE.y - WIRE, 240, 5)
      // And then carried straight at the fox and at the hedgehog, faster than a worm climbs.
      hand.carry(PLACES.fox.x - POLE.x, 640, 1500, 0.6)
      hand.carry(x - POLE.x, y - POLE.y - WIRE, 240, 4)
      hand.carry(PLACES.hedgehog.x - POLE.x + 40, 800, 1500, 0.6)
    }
    expect(hung).toBeGreaterThan(200)
    expect(lost).toBeGreaterThan(0)
  })

  it('let go on a creature, the lantern comes to rest beside it: its paper and its flame on nobody\'s room, wherever it was let go', () => {
    let slid = 0
    for (let x = 60; x <= 1100; x += 65) {
      for (let y = 280; y <= 800; y += 65) {
        const hand = new Hand(woodSave({ sheet: [], lit: false, lantern: { x: 1000, y: 300 } }))
        hand.carry(x, y, 2600, 0.02)
        hand.up()
        hand.wait(0.34)
        const wood = hand.wood
        // Where it will hang when it has swung to rest: under the tip of its pole.
        const rest = boxAt(REST_BOX, wood.want.x + POLE.x, wood.want.y + POLE.y + WIRE)
        for (const room of wood.rooms()) expect(apart(rest, room), `${x}, ${y}`).toBe(true)
        if (Math.hypot(wood.want.x - x, wood.want.y - y) > 1) slid++
        // And what is saved is where it rests.
        expect(hand.game.toSave().lantern).toEqual({ x: Math.round(wood.want.x), y: Math.round(wood.want.y) })
      }
    }
    expect(slid).toBeGreaterThan(20)
  })
})

describe('the ready sheet works', () => {
  it('from the door step no light of a ready sheet lies on a creature or runs off the frame', () => {
    for (const position of LADDER) {
      const hand = new Hand(woodSave({ sheet: sheetOf(position) }))
      const wood = hand.wood
      for (const name of BIG) expect(wood.sight[name].touch, `${position} ${name}`).toBeNull()
      for (let i = 0; i < MOTHS; i++) expect(wood.touching(perch(i).x, perch(i).y, MOTH_REACH), position).toBeNull()
      for (let i = 0; i < WORMS; i++) expect(wood.touching(wormPlace(i).x, wormPlace(i).y - WORM_MIDDLE, WORM_REACH), position).toBeNull()
      for (const patch of wood.patches) for (let k = 0; k < patch.world.length; k += 2) expect(inFrame(patch.world[k], patch.world[k + 1]), `${position} ${patch.paper}`).toBe(true)
    }
  })

  // The yellow of a ready sheet is thrown up and to the right, so that laying it on the moths keeps the pole clear of
  // the hook. From there no resting lantern lays it on the fox, the hedgehog or the badger, who are met with the
  // lantern in the hand (and the hedgehog, on the ground, by the red alone); the hand shows the places there are.
  it('the ghost hand has a place for every creature a resting lantern can light, and found there the lantern stands on nobody and its light lies on that creature', () => {
    for (const position of ['three-windows', 'one-window']) {
      const sheet = sheetOf(position)
      const spots = handSpots(new Hand(woodSave({ sheet })).wood)
      expect(spots.map((spot) => spot.name).sort(), position).toEqual(position === 'three-windows' ? ['fox', 'hedgehog', 'moths', 'owl', 'worms'] : ['moths', 'owl', 'worms'])
      for (const spot of spots) {
        const hand = new Hand(woodSave({ sheet, lantern: { x: spot.x, y: spot.y } }))
        const wood = hand.wood
        const rest = boxAt(REST_BOX, wood.lantern.x, wood.lantern.y)
        for (const room of wood.rooms()) expect(apart(rest, room), `${position} ${spot.name}`).toBe(true)
        const lit = spot.name === 'moths' ? wood.moths.list.some((moth) => wood.touching(moth.x, moth.y, MOTH_REACH) !== null)
          : spot.name === 'worms' ? Array.from({ length: WORMS }, (_, i) => wormPlace(i)).some((at) => wood.touching(at.x, at.y - WORM_MIDDLE, WORM_REACH) !== null)
            : wood.sight[spot.name].touch !== null
        expect(lit, `${position} ${spot.name}`).toBe(true)
      }
    }
  })

  it('with the three-window sheet each creature\'s rule is reached from the hand\'s place for it: found there and touched, the creature answers with its rule', () => {
    const sheet = sheetOf('three-windows')
    for (const spot of handSpots(new Hand(woodSave({ sheet })).wood)) {
      const hand = new Hand(woodSave({ sheet, lantern: { x: spot.x, y: spot.y } }))
      // The lantern is taken hold of where it is and moved a finger's width, slowly, so the light is one that moves.
      hand.carry(spot.x + 12, spot.y, 40, 1)
      hand.carry(spot.x - 12, spot.y, 40, 4)
      expect(hand.wood.met.has(spot.name), spot.name).toBe(true)
    }
  })

  it('the red of the ready sheet can reach the hedgehog, which trots in it and spikes an apple, and the fox, which steps into it', () => {
    const sheet = sheetOf('three-windows')
    const hog = new Hand(woodSave({ sheet }))
    // Down from the step and along the ground: the lantern is lowered, not lifted.
    hog.carry(PLACES.lantern.x, 790, 150, 0.2)
    const to = gripFor(hog.wood, 'red', PLACES.hedgehog.x - 20, PLACES.hedgehog.y - 76)
    hog.carry(to.x, to.y, 110, 1.5)
    expect(hog.wood.sight.hedgehog.touch?.paper).toBe('red')
    hog.carry(to.x - 120, to.y, 60, 1.5)
    expect(hog.wood.met.has('hedgehog')).toBe(true)
    expect(hog.count('feet')).toBeGreaterThan(2)
    expect(hog.count('spike')).toBeGreaterThan(0)
    const fox = new Hand(woodSave({ sheet }))
    fox.shine('red', PLACES.fox.x + 60, PLACES.fox.y - 100, 2.5, 150)
    expect(fox.wood.sight.fox.touch?.paper).toBe('red')
    expect(fox.wood.met.has('fox')).toBe(true)
  })
})

describe('a second finger', () => {
  it('in the wood, while one finger carries the lantern, another that lands is answered where it lands with a nick in the wax and a tap, and takes nothing', () => {
    const hand = new Hand(woodSave())
    hand.carry(600, 500, 300, 0.3)
    const held = { x: hand.wood.want.x, y: hand.wood.want.y }
    const before = hand.count('tap')
    expect(hand.down(300, 420, 2)).toBe(false)
    expect(hand.count('tap')).toBe(before + 1)
    expect(hand.wood.nick.pulse).toBe(1)
    expect([hand.wood.nick.x, hand.wood.nick.y]).toEqual([300, 420])
    expect(hand.wood.holding).toBe(true)
    expect(hand.wood.want).toEqual(held)
    hand.wait(1)
    expect(hand.wood.nick.pulse).toBe(0)
    // The first finger still carries.
    hand.slide(700, 520, 300)
    expect(hand.wood.want.x).toBe(700)
  })
})
