import { describe, expect, it } from 'vitest'
import { ARM_LONG, FRAME_BUDGET, buildFrame, catFace, catLooksAt, drawCount } from './frame'
import { REEL_OPENS, REEL_STEP, type Game } from './game'
import { CELLS, cellKey, type CellKey } from './grid'
import type { Guidance } from './guidance'
import type { Item } from './items'
import { FRAME, beside, bring, draw, make, run } from './kit'
import { CAT_ACTS, CAT_BEATS, OPINIONS, PAT_LIFTS, droolOf, patOf, type Catch } from './motion'
import { SPRITES } from './rig'
import { UNDER_THE_ROD } from './save'
import { BAITS, CREATURE_IDS, PEGS, TUB_SLOTS, type Bait, type CreatureId } from './sea'

// The frame budget (docs/art-direction.md: under about 80 draw calls). A frame
// is a list of sprite stamps and live strokes, so the count needs no canvas.
// Every moment a child can reach is counted here, the fullest ones on purpose.

const GLOW: Guidance = { glow: 1, demo: 0.5, demoIndex: 1 }
const FULL = ['puffer', 'squid', 'jelly', 'octopus'] as const
const items: Item[] = []

/** The fullest frame while `seconds` are played, with the idle ladder's glow and hand drawn on top of each. */
function fullest(game: Game, seconds: number, each?: () => void): number {
  let most = 0
  run(game, seconds, () => {
    each?.()
    most = Math.max(most, drawCount(buildFrame(game, GLOW, items)))
  })
  return most
}

describe('the frame budget', () => {
  it('is the bar of the art direction', () => {
    expect(FRAME_BUDGET).toBe(80)
  })

  it('holds at rest, on a first visit and with a full tub, with the glow and the hand', () => {
    expect(fullest(make({ bait: 'worm', hook: { ...UNDER_THE_ROD } }), 8)).toBeLessThan(FRAME_BUDGET)
    expect(fullest(make({ tub: [...FULL] }), 8)).toBeLessThan(FRAME_BUDGET)
    expect(fullest(make({ finished: true }), 8)).toBeLessThan(FRAME_BUDGET)
  })

  it('holds through every cell of the grid, with all nine in the sea and with the tub full', () => {
    let most = 0, where = ''
    for (const key of Object.keys(CELLS).flatMap((each) => [each, each]) as CellKey[]) {
      const [bait, id] = key.split('.') as [Bait, CreatureId]
      if (key !== cellKey(bait, id, false)) continue
      // Whoever is asked is not also in the tub.
      const tub = where === key || most === 0 ? [] : FULL.filter((each) => each !== id)
      where = key
      const game = beside(id, bait, { tub: [...tub] })
      let count = 0
      bring(game, id, 0.1)
      count = fullest(game, 4.5, () => { if (game.creatures[id].cell === null && game.creatures[id].mode === 'home' && game.held) game.drag(game.touchPoint(id)) })
      most = Math.max(most, count)
      expect(count, key).toBeLessThan(FRAME_BUDGET)
    }
    expect(most).toBeGreaterThan(40)
    // Every cell twice over is a long count on a busy machine.
  }, 120_000)

  it('holds with a train of two, a full tub, a third creature answering and ink in the water', () => {
    const game = make({ bait: 'glow', following: ['angler', 'jelly'], tub: ['puffer', 'squid', 'octopus'], hook: { x: 420, y: 560 } })
    game.inks.push({ x: 300, y: 500, age: 0, size: 1 }, { x: 700, y: 500, age: 0, size: 1 })
    let most = fullest(game, 1)
    // The stick is led to the squid, which answers it while the train comes after.
    draw(game, { x: 300, y: 470 }, 0)
    most = Math.max(most, fullest(game, 5))
    expect(most).toBeLessThan(FRAME_BUDGET)
  })

  it('holds with a catch on the hook swung into a full tub while the cat ducks, and with one tipped back', () => {
    const game = beside('angler', 'worm', { tub: [...FULL] })
    bring(game, 'angler', 1.6)
    draw(game, { x: 620, y: 150 }, 0)
    expect(fullest(game, 4)).toBeLessThan(FRAME_BUDGET)
    const back = make({ tub: [...FULL] })
    back.press({ x: TUB_SLOTS[1].x, y: TUB_SLOTS[1].y })
    expect(fullest(back, 3)).toBeLessThan(FRAME_BUDGET)
  })

  it('holds through the tow, with a full tub slopping and the train it scatters', () => {
    const game = beside('shark', 'worm', { tub: [...FULL] })
    bring(game, 'shark', 0.1)
    let towed = false
    const most = fullest(game, 9, () => { if (game.tow) towed = true; else if (!towed && game.held) game.drag(game.touchPoint('shark')) })
    expect(towed).toBe(true)
    expect(most).toBeLessThan(FRAME_BUDGET)
  })

  it('holds through the tip-out, the rocking and the lantern', () => {
    const game = make({ tub: [...FULL] })
    game.press({ x: 285, y: 140 })
    expect(game.tip).not.toBeNull()
    expect(fullest(game, 10)).toBeLessThan(FRAME_BUDGET)
  })

  it('draws every bait once, wherever it is: on its peg or on the hook', () => {
    for (const on of ['none', ...BAITS] as const) {
      const game = make({ bait: on })
      run(game, 1)
      const frame = buildFrame(game, null, items)
      for (const bait of BAITS) {
        const drawn = frame.filter((item) => item.k === 'sprite' && item.id === (bait === 'worm' ? 'worm' : bait))
        expect(drawn, `${bait} with ${on} on`).toHaveLength(1)
        const at = drawn[0] as Extract<Item, { k: 'sprite' }>
        if (bait !== on) expect(Math.hypot(at.x - PEGS[bait].x, at.y - PEGS[bait].y)).toBeLessThan(1)
      }
    }
  })

  const stamps = (game: Game, id: string): Extract<Item, { k: 'sprite' }>[] => buildFrame(game, null, items).filter((item): item is Extract<Item, { k: 'sprite' }> => item.k === 'sprite' && item.id === id)
  /** The cat's opinion of a catch, from the catch on the hook: lifted out, swung in, landed. */
  const landing = (id: Catch): Game => {
    const game = make({ hooked: id, hook: { x: 640, y: 300 } })
    for (let i = 0; i < 6 * 60 && !(game.cat.act ?? '').startsWith('op'); i++) { draw(game, { x: 620, y: 150 }, 0); run(game, FRAME) }
    expect(game.cat.act).toBe(OPINIONS[id])
    return game
  }

  it('draws the jellyfish\'s boot as part of that catch wherever the catch is drawn: on the hook, in the air, in the tub and tipped back', () => {
    // One boot hangs on its peg; the other is the one the jellyfish sits on.
    const game = make({ hooked: 'jelly', hook: { x: 640, y: 300 } })
    let flown = 0
    for (let i = 0; i < 6 * 60 && !game.tub.includes('jelly') || game.flights.length > 0; i++) {
      draw(game, { x: 620, y: 150 }, 0)
      run(game, FRAME)
      if (game.flights.length > 0) flown++
      expect(stamps(game, 'boot'), `at ${game.time.toFixed(2)}`).toHaveLength(2)
    }
    expect(flown).toBeGreaterThan(20)
    expect(game.tub).toEqual(['jelly'])
    game.release()
    run(game, 3)
    const inTub = stamps(game, 'boot')
    expect(inTub).toHaveLength(2)
    // In the tub it is under the bell, at the bell's size there.
    const bell = stamps(game, 'jelly')[0], boot = inTub.find((item) => Math.abs(item.x - bell.x) < 40)!
    expect(boot.sy).toBeCloseTo(bell.sy, 5)
    game.press({ x: bell.x, y: bell.y })
    expect(game.tub).toEqual([])
    run(game, 0.3)
    expect(game.flights).toHaveLength(1)
    expect(stamps(game, 'boot')).toHaveLength(2)
  })

  it('lays one octopus arm on the cat\'s head for as long as the cat nods and purrs, patting on the purr\'s own beats', () => {
    const game = landing('octopus')
    const purrs = CAT_BEATS.opOctopus!.map((beat) => beat.at)
    let patted = 0, heard = 0
    while (game.cat.act === 'opOctopus') {
      const since = game.cat.since, arms = stamps(game, 'octopusArm'), pat = patOf(since)
      expect(arms.length, `at ${since.toFixed(2)}`).toBe(pat ? 1 : 0)
      if (since > 0.3 && since < 1.85) {
        // Its tip is on the top of the cat's head, and it starts at the octopus in the tub.
        const arm = arms[0], head = stamps(game, 'catHead')[0], long = ARM_LONG * arm.sx
        const tip = { x: arm.x + long * Math.cos(arm.r), y: arm.y + long * Math.sin(arm.r) }
        expect(Math.hypot(tip.x - head.x, tip.y - (head.y - 50)), `at ${since.toFixed(2)}`).toBeLessThan(16)
        expect(Math.abs(arm.x - (stamps(game, 'octopus')[0].x + 14))).toBeLessThan(4)
        patted++
      }
      const cues = run(game, FRAME)
      // The arm is lifted just before a purr and is down on the head at the purr.
      for (const cue of cues) if (cue.name === 'catPurr') { heard++; expect(patOf(game.cat.since)!.bob).toBeLessThan(0.2); expect(patOf(game.cat.since - PAT_LIFTS / 2)!.bob).toBeGreaterThan(0.9) }
    }
    expect(patted).toBeGreaterThan(80)
    expect(heard).toBe(purrs.length)
    expect(patOf(0.05)).toBeNull()
    expect(patOf(CAT_ACTS.opOctopus)).toBeNull()
    expect(stamps(game, 'octopusArm')).toHaveLength(0)
  })

  it('has the cat and the blobfish stare at each other, and the cat look at every catch it has an opinion of, not at the hook', () => {
    for (const id of Object.keys(OPINIONS) as Catch[]) {
      const game = landing(id)
      run(game, 0.2)
      const slot = TUB_SLOTS[game.tub.indexOf(id)]
      expect(catLooksAt(game), id).toEqual({ x: slot.x, y: slot.y })
      // Its pupils do not follow the hook while it has its opinion: wherever the hook is, they are drawn the same.
      const pupils = (): string => {
        const frame = buildFrame(game, null, items), head = frame.findIndex((item) => item.k === 'sprite' && item.id === 'catHead')
        return JSON.stringify(frame.slice(head + 1).filter((item) => item.k === 'disc' && item.dye === 'dark').slice(0, 2))
      }
      const hookAt = game.hook.x, on = pupils()
      game.hook.x = 1100
      expect(pupils(), id).toBe(on)
      game.hook.x = hookAt
      run(game, 4)
      expect(game.cat.act, id).toBeNull()
      expect(catLooksAt(game), id).toBe(game.hook)
      const after = pupils()
      game.hook.x = 1100
      expect(pupils(), id).not.toBe(after)
    }
    // The blobfish looks back at the cat for as long as it is stared at, and at the hook before and after.
    const game = landing('blobfish')
    run(game, 0.5)
    // Where its pupil is from its own middle, and where that middle is.
    const eyeOf = (): { x: number; y: number; at: number } => {
      const frame = buildFrame(game, null, items), body = frame.findIndex((item) => item.k === 'sprite' && item.id === 'blobfish')
      const pupil = frame.slice(body + 1).find((item): item is Extract<Item, { k: 'disc' }> => item.k === 'disc' && item.dye === 'dark')!
      const middle = frame[body] as Extract<Item, { k: 'sprite' }>
      return { x: pupil.x - middle.x, y: pupil.y - middle.y, at: pupil.x }
    }
    const staring = eyeOf()
    expect(catFace(game).x).toBeGreaterThan(staring.at)
    // The hook is drawn far down to the left: eyes that followed it would turn left, and these stay on the cat.
    game.release()
    game.press({ x: 200, y: 700 })
    run(game, 0.3)
    expect(game.cat.act).toBe('opBlobfish')
    const moved = (): number => Math.hypot(eyeOf().x - staring.x, eyeOf().y - staring.y)
    expect(moved()).toBeLessThan(0.5)
    run(game, 3)
    expect(game.cat.act).toBeNull()
    expect(moved()).toBeGreaterThan(1)
  })

  /** An octopus arm drawn on deck: the octopus at home in its pot has arms of its own, far below. */
  const deckArms = (game: Game): unknown[] => stamps(game, 'octopusArm').filter((arm) => arm.y < 170)

  it('ends the cat\'s opinion with its catch: tipped back, there is no arm from an empty place, no purr, no stare, in that frame and after', () => {
    for (const id of Object.keys(OPINIONS) as Catch[]) {
      const game = landing(id), beats = (CAT_BEATS[OPINIONS[id]] ?? []).map((beat) => beat.cue as string)
      game.release()
      // Before the first of the opinion's sounds, where there is one that early.
      run(game, 0.28)
      expect(game.cat.act, id).toBe(OPINIONS[id])
      const lies = game.creatures[id].off
      game.cues.length = 0
      game.hushes.length = 0
      game.press({ x: lies.x + game.boat.shift, y: lies.y })
      expect(game.tub, id).toEqual([])
      expect(game.cat.act, id).toBeNull()
      expect(game.hushes, id).toEqual(['cat'])
      expect(catLooksAt(game), id).toBe(game.hook)
      expect(deckArms(game), id).toHaveLength(0)
      const after = run(game, 3).map((cue) => cue.name)
      expect(after.filter((name) => beats.includes(name)), id).toEqual([])
      expect(deckArms(game), id).toHaveLength(0)
    }
    // In the middle of the pat: the arm is gone with the octopus.
    const game = landing('octopus')
    game.release()
    run(game, 0.8)
    expect(stamps(game, 'octopusArm')).toHaveLength(1)
    const lies = game.creatures.octopus.off
    game.press({ x: lies.x + game.boat.shift, y: lies.y })
    expect(stamps(game, 'octopusArm')).toHaveLength(0)
    expect(run(game, 3).map((cue) => cue.name)).not.toContain('catPurr')
    // The blobfish tipped back while it is stared at: the cat's eyes go back to the hook.
    const stared = landing('blobfish')
    stared.release()
    run(stared, 1)
    const from = stared.creatures.blobfish.off
    stared.press({ x: from.x + stared.boat.shift, y: from.y })
    expect(stared.cat.act).toBeNull()
    expect(catLooksAt(stared)).toBe(stared.hook)
  })

  it('draws the cat\'s drool while it dreams of the shoal: one drop that runs down from its chin, and none otherwise', () => {
    const game = make()
    const drops = (): Extract<Item, { k: 'disc' }>[] => buildFrame(game, null, items).filter((item): item is Extract<Item, { k: 'disc' }> => item.k === 'disc' && item.dye === 'cream')
    // Dreaming, its paw is out as well, which is a cream disc of its own: the drop is the one more.
    game.cat.act = 'dream'
    game.cat.since = 0.1
    const before = drops().length
    game.cat.since = 0.4
    const early = drops()
    expect(early).toHaveLength(before + 1)
    game.cat.since = 1.2
    const late = drops()
    expect(late).toHaveLength(before + 1)
    const drop = (list: Extract<Item, { k: 'disc' }>[]): Extract<Item, { k: 'disc' }> => list.find((item) => item.rx === 2.2)!
    expect(drop(late).y).toBeGreaterThan(drop(early).y + 5)
    expect(droolOf('dream', 0.1)).toBeNull()
    expect(droolOf('dream', 1.55)).toBeNull()
    expect(droolOf('stretch', 0.6)).toBeNull()
    game.cat.since = 1.55
    expect(drops()).toHaveLength(before)
  })

  it('turns the reel\'s bar with the clicks: the bar is drawn across the reel and has turned a step for every click', () => {
    const game = make()
    const bar = (): Extract<Item, { k: 'line' }> => { const frame = buildFrame(game, null, items), boat = frame.findIndex((item) => item.k === 'sprite' && item.id === 'boat'); return frame[boat + 1] as Extract<Item, { k: 'line' }> }
    const angle = (): number => { const { pts } = bar(); return Math.atan2(pts[3] - pts[1], pts[2] - pts[0]) }
    expect(bar().k).toBe('line')
    const still = angle()
    // Out one way and in the other: a click as the line pays out turns it forward a step, one as it comes in turns it back.
    const steps = (cues: readonly { name: string; up?: boolean }[]): number => cues.reduce((sum, cue) => sum + (cue.name !== 'click' ? 0 : cue.up ? -1 : 1), 0)
    const down = steps(draw(game, { x: 640, y: 600 }, 2.5))
    expect(down).toBeGreaterThan(8)
    expect(game.reel).toBeCloseTo(REEL_OPENS + down * REEL_STEP, 6)
    expect(game.reelShown).toBeCloseTo(game.reel, 2)
    expect(Math.abs(Math.sin(angle() - still - down * REEL_STEP))).toBeLessThan(0.02)
    const up = steps(draw(game, { x: 640, y: 260 }, 2.5))
    expect(up).toBeLessThan(-8)
    expect(game.reel).toBeCloseTo(REEL_OPENS + (down + up) * REEL_STEP, 6)
    // It opens aslant, and no number of steps lays it level across its drum.
    for (let steps = -400; steps <= 400; steps++) expect(Math.abs(Math.sin(REEL_OPENS + steps * REEL_STEP))).toBeGreaterThan(0.3)
  })

  it('stamps only sprites the sheet of sprites holds', () => {
    const game = make({ bait: 'worm', tub: [...FULL] })
    run(game, 1)
    for (const item of buildFrame(game, GLOW, items)) if (item.k === 'sprite') expect(SPRITES[item.id]).toBeDefined()
    expect(CREATURE_IDS).toHaveLength(9)
    expect(FRAME).toBeGreaterThan(0)
  })
})
