import { describe, expect, it } from 'vitest'
import { TIERS } from './config'
import { NOSE, PUDDLE_SLOT, SPOTS, STONE_SPOT, WHEEL } from './layout'
import { lightFor } from './ply'
import { holeOf, knuckleOf, wakeOf } from './poses'
import { blankSheets, emptyRecording, recordingContext, tracingContext } from './recorder'
import { Finger } from './script'
import { drawn } from './things'
import type { Toy } from './toy'
import { View } from './view'
import { PLACES } from './wood'

// The look in the frame, through `Play` and the view: every stamped piece
// in the painting made for the way it stands, the sheets that flip with the
// season, and the small things the sheet names that must be drawn.

const WIDTH = 1180, HEIGHT = 820, DPR = 2
const say = (value: number): string => (Math.round(value * 100) / 100).toString()

function stampsOf(view: View, toy: Toy) {
  const kept = emptyRecording()
  view.draw(recordingContext(kept), WIDTH, HEIGHT, DPR, { toy, guidance: null, tier: TIERS[0] })
  return kept.stamps.map((stamp) => ({ ...stamp, key: view.sprites.keyOf(stamp.image) ?? '' }))
}
function traceOf(view: View, toy: Toy): string[] {
  const { g, trace } = tracingContext()
  view.draw(g, WIDTH, HEIGHT, DPR, { toy, guidance: null, tier: TIERS[0] })
  return trace
}
/** The calls and settings of the live path that ends in the first setting or call `mark`, from its `beginPath`. */
function pathBefore(trace: readonly string[], mark: string): string[] {
  const end = trace.indexOf(mark)
  if (end < 0) return []
  return trace.slice(trace.lastIndexOf('beginPath()', end) + 1, end)
}

describe('every piece is stamped in the painting made for the way it stands', () => {
  it('with every cover opening and shutting and the year turning: the lid of the log and the right fan of the grass throw their shadows the same way as the rest', () => {
    const view = new View(blankSheets(emptyRecording()))
    const ways = new Map<string, Set<number>>()
    let looked = 0
    const finger: Finger = new Finger(1, 20, (toy) => {
      for (const stamp of stampsOf(view, toy)) {
        const cut = /^(.*)@(\d)$/.exec(stamp.key)
        if (!cut) continue
        looked += 1
        // The painting stamped is the one whose light, under this stamp's turn and mirror, falls down and to the right.
        expect(Number(cut[2]), stamp.key).toBe(lightFor(stamp.a, stamp.b, stamp.c, stamp.d))
        const seen = ways.get(cut[1]) ?? new Set<number>()
        seen.add(Number(cut[2]))
        ways.set(cut[1], seen)
      }
    })
    for (const place of PLACES) { finger.tap(SPOTS[place].shut, `open ${place}`); finger.wait(1.2) }
    finger.tap(WHEEL, 'wheel'); finger.wait(4.5)
    expect(looked).toBeGreaterThan(3000)
    // The lid of the log is stamped mirrored: never in the painting of the piece as it was cut.
    expect([...(ways.get('cover:log') ?? [])]).not.toContain(lightFor(1, 0, 0, 1))
    // The two fans of the long grass are one piece, stamped as it was cut and mirrored: two paintings of it.
    expect((ways.get('cover:grass:spring') ?? new Set()).size).toBeGreaterThanOrEqual(2)
    // A cover that turns as it opens goes through more than one painting.
    expect((ways.get('cover:stone') ?? new Set()).size).toBeGreaterThanOrEqual(2)
  })
})

describe('the season\'s turn', () => {
  const SHEETS = ['hill:hill-far', 'hill:hill-near', 'hill:meadow', 'strip:l', 'strip:r']
  it('flips the two sheets of hills, the meadow and the strip of blades at the front to their next side, and leaves the sheet of the path and the house alone', () => {
    const view = new View(blankSheets(emptyRecording()))
    const flat = new Map<string, number>(), sides = new Map<string, Set<string>>()
    let ground = new Set<number>()
    const finger: Finger = new Finger(1, 30, (toy) => {
      for (const stamp of stampsOf(view, toy)) {
        const sheet = /^(hill:hill-far|hill:hill-near|hill:meadow|strip:l|strip:r):(\w+)$/.exec(stamp.key)
        if (sheet) {
          flat.set(sheet[1], Math.min(flat.get(sheet[1]) ?? 1, stamp.d / DPR))
          sides.set(sheet[1], (sides.get(sheet[1]) ?? new Set()).add(sheet[2]))
        }
        if (stamp.key === 'scenery') ground.add(stamp.d / DPR)
      }
    })
    finger.wait(0.2)
    for (const sheet of SHEETS) expect([...(sides.get(sheet) ?? [])], sheet).toEqual(['spring'])
    ground = new Set()
    finger.tap(WHEEL, 'wheel'); finger.wait(4.5)
    for (const sheet of SHEETS) {
      // Each showed its old side, went edge on, and shows its new side.
      expect([...(sides.get(sheet) ?? [])], sheet).toEqual(['spring', 'summer'])
      expect(flat.get(sheet), sheet).toBeLessThan(0.25)
    }
    expect([...ground]).toEqual([1])
    // At rest again every one of them lies flat, on its new side.
    const rest = stampsOf(view, finger.toy).filter((stamp) => /^(hill|strip):/.test(stamp.key))
    expect(rest).toHaveLength(5)
    for (const stamp of rest) { expect(stamp.d / DPR).toBe(1); expect(stamp.key).toMatch(/:summer$/) }
  })
})

describe('what the sheet names is drawn', () => {
  it('the hole the worm dived into, which the hedgehog stares at', () => {
    const finger = new Finger(1, 30), view = new View(blankSheets(emptyRecording()))
    finger.tap(SPOTS.stone.shut, 'open stone'); finger.rest()
    const at = finger.reach('worm')
    finger.drag(at, NOSE, 'worm before the hedgehog')
    let seen = 0
    for (let i = 0; i < 180; i++) {
      finger.wait(1 / 30)
      const hole = holeOf(finger.toy)
      const drawnHole = traceOf(view, finger.toy).some((line) => hole !== null && line.startsWith(`ellipse(${say(hole.at.x)},${say(hole.at.y)},${say(21 * hole.open)},`))
      expect(drawnHole).toBe(hole !== null)
      if (hole) seen += 1
    }
    // It is there for about two seconds, from the dive to the end of his stare.
    expect(seen).toBeGreaterThan(40)
  })

  it('the wake behind the feather as it glides across the water', () => {
    const finger = new Finger(1, 30), view = new View(blankSheets(emptyRecording()))
    const at = finger.reach('feather')
    finger.drag(at, PUDDLE_SLOT, 'feather in the puddle')
    let seen = 0
    for (let i = 0; i < 90; i++) {
      finger.wait(1 / 30)
      const wake = wakeOf(finger.toy)
      const lines = traceOf(view, finger.toy)
      const drawnWake = wake !== null && lines.includes(`moveTo(${say(wake.at.x - 30)},${say(wake.at.y + 2)})`) && lines.includes(`moveTo(${say(wake.at.x - 24)},${say(wake.at.y + 18)})`)
      expect(drawnWake).toBe(wake !== null)
      if (wake) seen += 1
    }
    expect(seen).toBeGreaterThan(20)
  })

  it('the toad\'s knuckle, out to the acorn on his stone with each tok', () => {
    const finger = new Finger(1, 30), view = new View(blankSheets(emptyRecording()))
    const at = finger.reach('acorn')
    finger.drag(at, STONE_SPOT, 'acorn on the stone')
    let out = 0, most = 0
    for (let i = 0; i < 120; i++) {
      finger.wait(1 / 30)
      const knuckle = knuckleOf(finger.toy)
      most = Math.max(most, knuckle)
      const drawnKnuckle = traceOf(view, finger.toy).includes('fillStyle=#8fa63c')
      if (knuckle > 0.05) { out += 1; expect(drawnKnuckle).toBe(true) }
      if (knuckle === 0) expect(drawnKnuckle).toBe(false)
    }
    expect(out).toBeGreaterThan(3)
    expect(most).toBeGreaterThan(0.8)
  })

  it('the button\'s glint is one short arc along its rim: no crossed strokes', () => {
    const finger = new Finger(1, 60), view = new View(blankSheets(emptyRecording()))
    const at = finger.reach('button')
    finger.down(at, 'touch the button'); finger.up()
    let glinted = 0
    for (let i = 0; i < 70; i++) {
      finger.wait(1 / 60)
      const own = drawn(finger.toy, 'button')!.pose.own
      const glint = pathBefore(traceOf(view, finger.toy), 'strokeStyle=#ffffff')
      if (own <= 0) { expect(glint).toEqual([]); continue }
      glinted += 1
      expect(glint.filter((line) => line.startsWith('arc('))).toHaveLength(1)
      expect(glint.filter((line) => line.startsWith('lineTo(') || line.startsWith('moveTo('))).toEqual([])
    }
    expect(glinted).toBeGreaterThan(8)
  })
})
