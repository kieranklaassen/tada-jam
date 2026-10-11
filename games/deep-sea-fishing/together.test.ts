import { describe, expect, it } from 'vitest'
import { anglerBulb, buildFrame, catLooksAt } from './frame'
import { DRIPS, PULL_OUT, type Game } from './game'
import { CELLS, type CellKey } from './grid'
import type { Item } from './items'
import { FRAME, beside, bring, draw, make, run } from './kit'
import { CAT_ACTS, CAT_BEATS, OPINIONS, catPose, hang, type Catch } from './motion'
import { TIP, TIP_LASTS } from './scenes'
import { CAT, CAT_IN_TUB, CREATURES, CREATURE_IDS, WATERLINE, type Bait, type CreatureId } from './sea'
import { notesOf } from './voices'

// What belongs together stays together (ART.md): an opinion and its catch, a
// joke and its sounds, a drop and its drip, the curl and its scene; and nothing
// begins before the child's first touch on the line.

const items: Item[] = []
type Stamp = Extract<Item, { k: 'sprite' }>
const stamps = (game: Game, id: string): Stamp[] => buildFrame(game, null, items).filter((item): item is Stamp => item.k === 'sprite' && item.id === id)
/** A catch on the hook is lifted out and swung in, until the cat has its opinion of it. */
const land = (game: Game, id: Catch): void => {
  for (let i = 0; i < 6 * 60 && game.cat.act !== OPINIONS[id]; i++) { draw(game, { x: 620, y: 150 }, 0); run(game, FRAME) }
  expect(game.cat.act).toBe(OPINIONS[id])
  game.release()
}

describe('the cat\'s opinion and its catch', () => {
  it('follows its catch: when another catch is tipped back and this one closes up, the stare, the paw and the octopus\'s arm go with it', () => {
    for (const id of Object.keys(OPINIONS) as Catch[]) {
      const other: Catch = id === 'squid' ? 'puffer' : 'squid'
      const game = make({ tub: [other], hooked: id, hook: { x: 640, y: 300 } })
      land(game, id)
      run(game, 0.5)
      expect(game.tub, id).toEqual([other, id])
      const was = { ...game.creatures[id].off }, first = game.creatures[other].off
      game.press({ x: first.x + game.boat.shift, y: first.y })
      expect(game.tub, id).toEqual([id])
      let moved = 0
      while (game.cat.act === OPINIONS[id]) {
        run(game, FRAME)
        if (game.cat.act !== OPINIONS[id]) break
        const lies = game.creatures[id].off
        moved = Math.max(moved, Math.abs(lies.x - was.x))
        // Where the cat's eyes and paw are aimed is where the catch is at this moment.
        expect(game.cat.slot.x + CAT.x, id).toBeCloseTo(lies.x, 6)
        expect(game.cat.slot.y + CAT.y, id).toBeCloseTo(lies.y, 6)
        expect(catLooksAt(game).x, id).toBeCloseTo(lies.x + game.boat.shift, 6)
        if (id === 'octopus') {
          for (const arm of stamps(game, 'octopusArm').filter((each) => each.y < 170)) expect(Math.hypot(arm.x - (lies.x + 14 + game.boat.shift), arm.y - (lies.y - 6))).toBeLessThan(6)
        }
      }
      // It did close up while the cat still had its opinion: the test saw the move.
      expect(moved, id).toBeGreaterThan(20)
    }
  })

  it('stops sounding in the frame something else takes its place: the tip-out, and a pull that makes the cat cling', () => {
    /** Plays on, holding in every frame that an opinion which is cut off before its time asks for the cat's voices to stop. */
    const watch = (game: Game, seconds: number, each: () => void = () => {}): number => {
      let cut = 0
      for (let left = seconds; left > 1e-9; left -= FRAME) {
        const act = game.cat.act, since = game.cat.since
        game.hushes.length = 0
        each()
        game.step(FRAME)
        game.cues.length = 0
        if (act !== null && act.startsWith('op') && game.cat.act !== act && since + FRAME < CAT_ACTS[act]) {
          cut++
          expect(game.hushes, act).toContain('cat')
        }
      }
      return cut
    }
    // A fourth catch is landed and the full tub is tapped while the cat is still giving its opinion.
    const full = make({ tub: ['squid', 'jelly', 'blobfish'], hooked: 'puffer', hook: { x: 640, y: 300 } })
    land(full, 'puffer')
    run(full, 0.4)
    full.hushes.length = 0
    full.press({ x: 285, y: 140 })
    expect(full.tip).not.toBeNull()
    expect(full.cat.act).toBeNull()
    expect(full.hushes).toContain('cat')
    const purrs = (CAT_BEATS.opPuffer ?? []).map((beat) => beat.cue as string)
    expect(run(full, 3).map((cue) => cue.name).filter((name) => purrs.includes(name))).toEqual([])
    // The hook is drawn straight from a landed squid down to the anglerfish, whose pull makes the cat cling.
    const game = make({ hooked: 'squid', hook: { x: 640, y: 300 } })
    land(game, 'squid')
    game.press(game.touchPoint('angler'))
    const cut = watch(game, 2.5, () => { if (game.creatures.angler.cell === null) game.drag(game.touchPoint('angler')) })
    expect(game.creatures.angler.cell).toBe('none.angler')
    expect(cut).toBe(1)
  })
})

describe('a joke cut short', () => {
  const HOLDERS = (Object.keys(CELLS) as CellKey[]).filter((key) => CELLS[key].grip === true)

  it('drops what that creature had queued earlier in the same step, and nobody else\'s: only the snap of the jaws is kept', () => {
    for (const key of [...HOLDERS, 'none.shark' as CellKey]) {
      const [bait, id] = key.split('.') as [Bait, CreatureId]
      const game = beside(id, bait)
      bring(game, id, 0.5)
      expect(game.creatures[id].cell, key).toBe(key)
      // A beat of its own and one of the cat's are already queued in this step when the finger draws the hook away.
      game.cues.push({ name: 'knock', by: id }, { name: 'catPurr', by: 'cat' }, { name: 'pop' })
      const held = { x: game.hook.x, y: game.hook.y }
      if (key === 'none.shark') { game.drag({ x: held.x, y: WATERLINE + 40 }); for (let i = 0; i < 90 && !game.creatures[id].cut; i++) { game.step(FRAME); if (!game.creatures[id].cut) game.cues.length = 0 } }
      else game.drag({ x: held.x + (held.x > 600 ? -1 : 1) * (PULL_OUT + 30), y: held.y - PULL_OUT - 30 })
      expect(game.creatures[id].cut, key).toBe(true)
      expect(game.hushes, key).toContain(id)
      const own = game.cues.filter((cue) => cue.by === id).map((cue) => cue.name)
      expect(own, key).toEqual(key === 'none.shark' ? ['snap'] : [])
      if (key !== 'none.shark') expect(game.cues.map((cue) => cue.name), key).toEqual(['catPurr', 'pop'])
    }
  })
})

describe('nothing begins before the first touch on the line', () => {
  it('leaves the jellyfish where it is beside a light that hangs near it, until the line is drawn', () => {
    // An anglerfish that follows the stick hangs about 230 from the jellyfish: a light it would drift after.
    const game = make({ bait: 'glow', following: ['angler'], hook: { x: 560, y: 620 } })
    const light = game.lights().find((each) => each.by === 'angler')!, at = game.centre('jelly')
    const away = Math.hypot(light.at.x - at.x, light.at.y - at.y)
    expect(away).toBeGreaterThan(160)
    expect(away).toBeLessThan(320)
    expect(run(game, 8)).toEqual([])
    expect(Math.hypot(game.creatures.jelly.off.x, game.creatures.jelly.off.y)).toBeLessThan(0.5)
    // The child takes the line up where it hangs: now the jellyfish drifts after the light.
    game.press({ x: game.hook.x, y: game.hook.y })
    run(game, 2)
    expect(Math.hypot(game.creatures.jelly.off.x, game.creatures.jelly.off.y)).toBeGreaterThan(20)
  })

  it('has the cat dream of the shoal under the hull only once the line has been drawn', () => {
    const game = make({ bait: 'spoon', following: ['shoal'], hook: { x: 560, y: 250 } })
    expect(run(game, 12)).toEqual([])
    expect(game.cat.act).toBeNull()
    game.press({ x: game.hook.x, y: game.hook.y })
    game.cues.length = 0
    const heard = run(game, 6).map((cue) => cue.name)
    expect(heard).toContain('plip')
  })

  it('has whoever the hook already hangs beside look at it without a sound, and answer at the first touch on the line', () => {
    for (const id of CREATURE_IDS) {
      const at = make().touchPoint(id), game = make({ hook: { x: at.x, y: at.y } })
      expect(run(game, 1.2), id).toEqual([])
      expect(game.creatures[id].cell, id).toBeNull()
      expect(game.creatures[id].notice, id).toBeGreaterThan(0.9)
      game.press({ x: game.hook.x, y: game.hook.y })
      run(game, 0.2)
      expect(game.creatures[id].cell, id).toBe(`none.${id}`)
    }
  })

  it('turns the noticing anglerfish\'s eyes from its lamp to the hook', () => {
    const at = make().touchPoint('angler')
    const pupilAims = (game: Game): { toHook: number; toBulb: number } => {
      const frame = buildFrame(game, null, items), pose = game.pose('angler'), eye = CREATURES.angler.eyes[0], centre = hang(pose, eye.x, eye.y), bulb = anglerBulb(pose)
      const pupil = frame.find((item) => item.k === 'disc' && item.dye === 'dark' && Math.hypot(item.x - centre.x, item.y - centre.y) < eye.r)! as Extract<Item, { k: 'disc' }>
      const aim = (to: { x: number; y: number }): number => ((pupil.x - centre.x) * (to.x - centre.x) + (pupil.y - centre.y) * (to.y - centre.y)) / (Math.hypot(pupil.x - centre.x, pupil.y - centre.y) * Math.hypot(to.x - centre.x, to.y - centre.y))
      return { toHook: aim(game.hook), toBulb: aim(bulb) }
    }
    // Nobody has drawn the line. With the hook far off it gazes at its lamp; with the hook beside it, at the hook.
    const alone = make()
    run(alone, 1.2)
    expect(pupilAims(alone).toBulb).toBeGreaterThan(0.999)
    const beside = make({ hook: { x: at.x + 30, y: at.y + 30 } })
    run(beside, 1.2)
    expect(beside.held).toBe(false)
    expect(beside.creatures.angler.notice).toBeGreaterThan(0.9)
    expect(pupilAims(beside).toHook).toBeGreaterThan(0.9999)
    expect(pupilAims(beside).toBulb).toBeLessThan(pupilAims(beside).toHook - 0.001)
  })
})

describe('the drops of a hook just out of the water', () => {
  const lifted = (): Game => {
    const game = make({ hook: { x: 640, y: 215 } })
    game.press({ x: 640, y: 150 })
    game.cues.length = 0
    return game
  }

  it('are heard one by one from the rules, each in the step its drop leaves the hook, and tagged as the hook\'s', () => {
    const game = lifted(), heard: number[] = []
    for (let i = 0; i < 120; i++) {
      game.step(FRAME)
      for (const cue of game.cues) {
        if (cue.name !== 'drip') continue
        heard.push(cue.index!)
        expect(cue.by).toBe('hook')
        // The drop is drawn from `DRIPS[index]` on: this is its first frame.
        expect(game.dripping).toBeGreaterThanOrEqual(DRIPS[cue.index!])
        expect(game.dripping).toBeLessThan(DRIPS[cue.index!] + FRAME + 1e-9)
      }
      game.cues.length = 0
    }
    expect(heard).toEqual([0, 1, 2])
    // The splash itself carries no drip written as a delay.
    expect(notesOf({ name: 'splashOut' }).every((note) => (note.delay ?? 0) === 0)).toBe(true)
  })

  it('are gone, to see and to hear, when the hook is dipped back in', () => {
    const game = lifted()
    let heard: string[] = []
    for (let i = 0; i < 120 && !heard.includes('drip'); i++) heard = heard.concat(run(game, FRAME).map((cue) => cue.name))
    expect(heard.filter((name) => name === 'drip')).toHaveLength(1)
    game.hushes.length = 0
    game.drag({ x: 640, y: 260 })
    const after: string[] = []
    for (let i = 0; i < 60; i++) {
      after.push(...run(game, FRAME).map((cue) => cue.name))
      if (game.hook.y > WATERLINE) break
    }
    expect(game.hook.y).toBeGreaterThan(WATERLINE)
    expect(game.dripping).toBe(Infinity)
    expect(game.hushes).toContain('hook')
    expect(after.concat(run(game, 1).map((cue) => cue.name))).not.toContain('drip')
  })
})

describe('the cat\'s curl at the end of a trip', () => {
  it('is over inside the tip-out: it closes smoothly and never springs open or snaps shut', () => {
    const game = make({ tub: ['squid', 'jelly', 'blobfish', 'puffer'] })
    game.press({ x: 285, y: 140 })
    expect(game.tip).not.toBeNull()
    const curlOf = (): number => catPose(game.cat.t, game.time, game.cat.act, game.cat.since, game.cat.slot, game.cat.asleep, CAT_IN_TUB, game.cat.poked).curl
    let last = 0, steepest = 0, began = -1
    for (let left = TIP_LASTS + 1; left > 1e-9; left -= FRAME) {
      const t = game.tip ? game.tip.t : TIP_LASTS
      run(game, FRAME)
      const curl = curlOf()
      if (curl > 0 && began < 0) began = t
      expect(curl, `at ${t.toFixed(2)}`).toBeGreaterThanOrEqual(last - 1e-9)
      steepest = Math.max(steepest, curl - last)
      last = curl
    }
    expect(began).toBeGreaterThan(TIP.curls)
    expect(last).toBe(1)
    expect(game.cat.asleep).toBe(true)
    // No frame closes more than a small part of the curl.
    expect(steepest).toBeLessThan(0.08)
  })
})
