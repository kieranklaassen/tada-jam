import { beforeAll, describe, expect, it } from 'vitest'
import { draftOf, type Build } from './build'
import { launch, liftSun, run, sail, worldWith } from './drive'
import { setUp, type Easel } from './easel'
import { LINE, POND } from './layout'
import { INSIDE } from './sceneryArt'
import { fit } from './stage'
import { step } from './tick'
import { STEP, buildNow, type World } from './world'

// The morning scene, as a child sees it: when the sun is lifted nothing at
// the pond vanishes. The gnome on his pad, the berry on its pad, the pads
// piled at the bow and the boat at its mooring stay where they are and leave
// with the pond as the view runs back up the brook; each lamp goes out as
// the edge of the wash passes it.

const BOAT: Partial<Build> = { masts: ['twig', null], sails: ['birch', null], deck: ['berry', 'pebble'] }
const BEFORE: Build[] = [
  { hull: 'walnut', masts: ['twig', 'stem'], sails: ['feather', 'birch'], deck: ['cap'] },
  { hull: 'pod', masts: ['stem', null], sails: ['birch', null], deck: [] },
]

type Sheet = { sheet: unknown }
type Sheets = { gnome: { head: Sheet; hat: Sheet }; makings: { berry: Sheet }; props: { lit: Sheet }; places: { pile: Sheet } }

let easel: Easel
let sheets: Sheets
const by = fit(1180, 820)

/** Where a sheet was stamped inside the print in the last frame, in stage units. What lies in a frame that is not in view is not seen. */
function seen(sheet: Sheet): { x: number; y: number }[] {
  return easel.surface.stamped.filter((stamped) => stamped.image === sheet.sheet).map((stamped) => ({ x: (stamped.x / 2 - by.x) / by.scale, y: (stamped.y / 2 - by.y) / by.scale })).filter((spot) => spot.x > INSIDE.left - 40 && spot.x < INSIDE.right + 40)
}

function atThePond(): World {
  const w = worldWith(BOAT, { pond: BEFORE })
  run(w, 0.3)
  launch(w)
  expect(sail(w, (world) => world.finished && !world.scene)).toBe(true)
  run(w, 0.5)
  return w
}

beforeAll(() => {
  easel = setUp()
  sheets = (easel.view as unknown as { sheets: Sheets }).sheets
})

describe('the morning', () => {
  it('takes nothing away when the sun is lifted: the gnome, the berry, the piled pads and every lamp are where they were', () => {
    const w = atThePond()
    easel.frame(w)
    const before = { head: seen(sheets.gnome.head), hat: seen(sheets.gnome.hat), berry: seen(sheets.makings.berry), pile: seen(sheets.places.pile), lit: seen(sheets.props.lit) }
    expect(before.head.length).toBe(1)
    expect(before.berry.length).toBe(1)
    expect(before.pile.length).toBe(1)
    expect(before.lit.length).toBe(3)
    liftSun(w)
    expect(w.scene?.name).toBe('morning')
    step(w, STEP)
    easel.frame(w)
    const near = (a: { x: number; y: number }[], b: { x: number; y: number }[], within: number): boolean => a.length === b.length && a.every((spot, i) => Math.hypot(spot.x - b[i].x, spot.y - b[i].y) < within)
    // The gnome breathes, so his head may have moved a hair; nothing has jumped or gone.
    expect(near(seen(sheets.gnome.head), before.head, 8)).toBe(true)
    expect(near(seen(sheets.gnome.hat), before.hat, 12)).toBe(true)
    expect(near(seen(sheets.makings.berry), before.berry, 2)).toBe(true)
    expect(near(seen(sheets.places.pile), before.pile, 2)).toBe(true)
    expect(near(seen(sheets.props.lit), before.lit, 2)).toBe(true)
  })

  it('does not let the moored boat hop: its print rides where the boat rode, as deep as it is loaded, with its lamp\'s glow on its lamp', () => {
    const w = atThePond()
    // The boat as it rides, heavy with the pebble; the gnome has stepped off.
    const rode = w.boat.y, deep = LINE + draftOf(buildNow(w), false)
    expect(Math.abs(rode - deep)).toBeLessThan(4)
    expect(deep - LINE).toBeGreaterThan(22)
    easel.frame(w)
    const glow = seen(sheets.props.lit).sort((a, b) => b.y - a.y)[0]
    liftSun(w)
    step(w, STEP)
    easel.frame(w)
    const print = (easel.view as unknown as { lastMoored: Sheet | null }).lastMoored
    expect(print).not.toBeNull()
    const stamped = easel.surface.stamped.filter((each) => each.image === print?.sheet)
    expect(stamped.length).toBe(1)
    // Full size, not a small print stretched: 360 units wide on the stage.
    expect(stamped[0].w / 2 / by.scale).toBeCloseTo(360, 0)
    // The sheet's middle is 155 above its keel point.
    const keel = (stamped[0].y / 2 - by.y) / by.scale + 155
    expect(Math.abs(keel - rode)).toBeLessThan(4)
    // The glow is where it was, which is on the lamp of the print.
    const after = seen(sheets.props.lit).sort((a, b) => b.y - a.y)[0]
    expect(Math.hypot(after.x - glow.x, after.y - glow.y)).toBeLessThan(4)
  })

  it('puts each lamp out as the edge of the wash passes it, and none before', () => {
    const w = atThePond()
    easel.frame(w)
    const lamps = seen(sheets.props.lit)
    liftSun(w)
    let last = lamps.length
    for (let i = 0; i < 1.3 / STEP; i++) {
      step(w, STEP)
      easel.frame(w)
      const lit = seen(sheets.props.lit)
      const edge = INSIDE.top + (INSIDE.bottom - INSIDE.top) * w.show.dusk
      for (const lamp of lamps) {
        const on = lit.some((spot) => Math.hypot(spot.x - lamp.x, spot.y - lamp.y) < 2)
        if (edge > lamp.y + 24) expect(on, `the wash still covers the lamp at ${Math.round(lamp.y)}`).toBe(true)
        if (edge < lamp.y - 24) expect(on, `the wash has passed the lamp at ${Math.round(lamp.y)}`).toBe(false)
      }
      expect(lit.length).toBeLessThanOrEqual(last)
      last = lit.length
    }
    expect(last).toBe(0)
  })

  it('lets the pond leave in a seen move: what stood there slides out with the pond as the view runs back, and the gnome is on his stone when the bank comes', () => {
    const w = atThePond()
    liftSun(w)
    let was: { x: number; y: number } | null = null, slid = 0
    for (let i = 0; i < 3.4 / STEP; i++) {
      step(w, STEP)
      easel.frame(w)
      const heads = seen(sheets.gnome.head)
      // Never two of him in the print, and no jump from one step to the next while he is in it.
      const inside = heads.filter((spot) => spot.x > INSIDE.left - 40 && spot.x < INSIDE.right + 40)
      expect(inside.length).toBeLessThanOrEqual(1)
      const now = inside[0] ?? null
      if (was && now && w.cam < -1180) {
        expect(Math.hypot(now.x - was.x, now.y - was.y)).toBeLessThan(60)
        slid = Math.max(slid, POND.pad.x - 4 - now.x)
      }
      was = now
    }
    // He went out with the pond, downstream to the left, as the view ran back upstream.
    expect(slid).toBeGreaterThan(300)
    run(w, 1.5)
    expect(w.scene).toBeNull()
    expect(w.show.ghost).toBe(false)
    easel.frame(w)
    expect(seen(sheets.gnome.head).length).toBe(1)
    expect(seen(sheets.makings.berry).length).toBe(1)
    expect(seen(sheets.props.lit).length).toBe(0)
  })
})
