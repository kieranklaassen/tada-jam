import { describe, expect, it } from 'vitest'
import { BEACHES, BRIDGE_Z, MOAT, WRONG_GROOVE_X } from './beaches'
import { JOURNEY_SECONDS } from './sun'
import { FOLK_COME } from './timeline'
import { cellAt, deltaAt, encode, groove, heightAt, makeField, tower } from './field'
import { type Kingdom, deserializeKingdom } from './kingdom'
import { EEL_BODY, crabReach, eelShown } from './folk'
import { EEL_PAST, type EelPlan } from './plan'
import { Play } from './play'

// What each of the folk does at evening with what the beach holds for it:
// right, a little wrong, and not there at all. Each is watched for a while
// on a prepared beach, and then the child changes one thing.

const DT = 1 / 60
/** Runs the evening and collects what was heard, and whatever `watch` returns each frame. */
function watch<T>(play: Play, seconds: number, each: (play: Play) => T): { heard: Set<string>; seen: T[] } {
  const heard = new Set<string>(), seen: T[] = []
  let last = play.heard[play.heard.length - 1]
  for (let t = 0; t < seconds; t += DT) {
    play.step(DT)
    const from = last ? play.heard.lastIndexOf(last) + 1 : 0
    for (const one of play.heard.slice(from)) heard.add(`${one.by}:${one.name}`)
    last = play.heard[play.heard.length - 1]
    seen.push(each(play))
  }
  return { heard, seen }
}

describe('a kingdom with something right for everyone', () => {
  const play = new Play(BEACHES.evening(7), 3)
  const { heard, seen } = watch(play, 45, (p) => ({
    crab: Math.atan2(p.folk.crab.z - MOAT.z, p.folk.crab.x - MOAT.x), crabOut: Math.hypot(p.folk.crab.x - MOAT.x, p.folk.crab.z - MOAT.z),
    star: { on: p.folk.starfish.on, spread: p.folk.starfish.spread, y: p.folk.starfish.y },
    eel: { z: p.folk.eel.z, under: p.folk.eel.under, where: p.folk.eel.where, dip: p.folk.eel.dip },
    gulls: p.folk.gulls.birds.map((bird) => bird.place),
  }))

  it('the crab patrols the wet moat all the way round on its bank, and never steps in', () => {
    const sectors = new Set(seen.map((one) => Math.floor(((one.crab + Math.PI) / (Math.PI * 2)) * 8) % 8))
    expect(sectors.size).toBe(8)
    expect(Math.min(...seen.map((one) => one.crabOut))).toBeGreaterThan(MOAT.r + 0.5)
    expect(heard.has('crab:stamp')).toBe(false)
  })

  it('the starfish lies spread out flat on top of the tower', () => {
    expect(seen.every((one) => one.star.on === 'tower')).toBe(true)
    expect(seen[seen.length - 1].star.spread).toBeGreaterThan(0.9)
    expect(seen[seen.length - 1].star.y).toBeGreaterThan(heightAt(play.field, MOAT.x, MOAT.z) - 0.05)
  })

  it('the eel swims the channel, goes under the driftwood, out of sight, and comes out again where it is seen: the water on the sea\'s side is too short for it, so it comes back out the way it went in', () => {
    expect(seen.every((one) => one.eel.where === 'groove')).toBe(true)
    expect(seen.some((one) => one.eel.under)).toBe(true)
    // Up out of the water on the moat's side of the driftwood, again and again.
    expect(seen.filter((one) => !one.eel.under && one.eel.dip < 0.5 && one.eel.z > BRIDGE_Z + 0.6).length).toBeGreaterThan(300)
    // Never lying out of sight in the short water between the driftwood and the sea.
    expect(seen.every((one) => one.eel.z > BRIDGE_Z - 0.6)).toBe(true)
    expect(heard.has('eel:sniff')).toBe(false)
  })

  it('the gulls stand in a row on the patted wall, and no one slips', () => {
    expect(seen.every((one) => one.gulls.every((place) => place === 'wall'))).toBe(true)
    expect(heard.has('gulls:slip')).toBe(false)
  })

  it('no bored small crab comes', () => {
    expect(play.folk.small.crabs.every((crab) => crab.shown === 0)).toBe(true)
  })
})

describe('a beach where each thing is a little wrong', () => {
  // The sun goes down on it, so the gulls are seen trying the wall.
  const play = new Play(BEACHES.wrong(7), 3)
  play.press({ kind: 'sun' })
  play.tap()
  const before = { grains: 0 }
  const { heard, seen } = watch(play, JOURNEY_SECONDS + FOLK_COME.end + 50, (p) => ({
    stops: p.folk.crab.stops, kicked: p.grains.length,
    star: Math.hypot(p.folk.starfish.x - p.folk.crab.x, p.folk.starfish.z - p.folk.crab.z), on: p.folk.starfish.on, move: p.folk.starfish.move,
    gulls: p.folk.gulls.birds.map((bird) => bird.place),
    eelUnder: p.folk.eel.under,
  }))

  it('the crab walks to the gap in its moat, stamps there with a clack of both claws, and turns back along a dry bank kicking sand', () => {
    expect(heard.has('crab:stamp')).toBe(true)
    expect(heard.has('crab:clack')).toBe(true)
    expect(Math.max(...seen.map((one) => one.kicked))).toBeGreaterThan(before.grains)
  })

  it('the starfish, with no tower, rides the back of the crab', () => {
    const riding = seen.filter((one) => one.on === 'crab' && one.move === 'perched')
    expect(riding.length).toBeGreaterThan(seen.length / 3)
    // Behind the middle of its back, where a shell worn on its eyes is clear of it.
    expect(Math.max(...riding.map((one) => one.star))).toBeLessThan(0.6)
  })

  it('the eel swims its groove and sniffs at the driftwood lying near, with nothing to go under', () => {
    expect(heard.has('eel:sniff')).toBe(true)
    expect(seen.some((one) => one.eelUnder)).toBe(false)
  })

  it('the gulls try the lumpy wall, and one slips off it and flaps back up', () => {
    expect(heard.has('gulls:slip')).toBe(true)
    // One stays on the wall; the others are back on their log.
    expect(seen[seen.length - 1].gulls).toEqual(['wall', 'log', 'log'])
  })

  it('answers when the child puts it right: the driftwood laid across the groove, and the eel goes under it', () => {
    const from = { ...play.things.wood[1] }
    play.press({ kind: 'wood', index: 1 })
    play.dragStart()
    for (let i = 1; i <= 20; i++) {
      play.drag(from.x + ((WRONG_GROOVE_X - from.x) * i) / 20, from.z + ((0.3 - from.z) * i) / 20, 0)
      play.step(DT)
    }
    play.release()
    expect(play.heard[play.heard.length - 1].name).toBe('bridge')
    const after = watch(play, 30, (p) => p.folk.eel.under)
    expect(after.seen.some((under) => under)).toBe(true)
    // And a tower turned out: the starfish leaves the crab for it.
    tower(play.field, 3.2, 5.2, 0, 1)
    play.press({ kind: 'sand', x: -2.8, z: 6.9 })
    play.tap()
    const later = watch(play, 25, (p) => p.folk.starfish.on)
    expect(later.seen[later.seen.length - 1]).toBe('tower')
    expect(deltaAt(play.field, 3.2, 5.2)).toBeGreaterThan(0.5)
  })
})

describe('a beach with nothing built', () => {
  it('brings no one out but three bored small crabs, who scuttle along the water line', () => {
    const play = new Play(deserializeKingdom(null, 7), 3)
    play.press({ kind: 'sun' })
    play.tap()
    const { heard, seen } = watch(play, 30, (p) => ({ shown: p.folk.small.crabs.map((crab) => crab.shown), x: p.folk.small.crabs.map((crab) => crab.x), crab: p.folk.crab.out, star: p.folk.starfish.on, eel: p.folk.eel.where, gulls: p.folk.gulls.birds.map((bird) => bird.place) }))
    const last = seen[seen.length - 1]
    expect(last.shown).toEqual([1, 1, 1])
    expect(heard.has('small:scuttle')).toBe(true)
    for (const index of [0, 1, 2]) expect(new Set(seen.slice(-600).map((one) => one.x[index].toFixed(1))).size).toBeGreaterThan(3)
    expect(last.crab).toBe(false)
    expect(last.star).toBe('rock')
    expect(last.eel).toBe('rock')
    expect(last.gulls).toEqual(['log', 'log', 'log'])
    // A groove dug at evening: they go back into the sea, and someone comes.
    play.press({ kind: 'sand', x: -1, z: 3 })
    play.dragStart()
    for (let i = 1; i <= 30; i++) {
      play.drag(-1 + i * 0.1, 3, 0)
      play.step(DT)
    }
    play.release()
    const after = watch(play, 8, (p) => p.folk.small.crabs.map((crab) => crab.shown))
    expect(after.seen[after.seen.length - 1]).toEqual([0, 0, 0])
    expect(play.folk.crab.out).toBe(true)
  })
})

/** The longest reach of each shell from its middle, before its size. */
const SHELL_REACH = [0.58, 0.78, 0.72]

/**
 * How deep the eel, while it shows, is in a shell or under the crab: its head and neck as the rounds it is made
 * of, a shell as a low round box where it lies and a ball where it stands in a tower, the crab by its reach.
 */
function eelIn(play: Play): { deep: number; what: string } {
  const eel = play.folk.eel, crab = play.folk.crab
  let deep = 0, what = ''
  if (eel.where !== 'groove' || eel.dip >= 0.97) return { deep, what }
  const fx = Math.sin(eel.yaw), fz = Math.cos(eel.yaw)
  for (const [along, r] of EEL_BODY) {
    const x = eel.x + fx * along, z = eel.z + fz * along
    const legs = r - crabReach(crab, x, z)
    if (legs > deep) {
      deep = legs
      what = 'the crab'
    }
    play.things.shells.forEach((shell, index) => {
      if (shell.state === 'bucket' || play.hat === index) return
      const at = play.shellPose(index), reach = SHELL_REACH[index] * at.wide, tipped = Math.abs(Math.sin(at.tip))
      const low = at.y - (tipped > 0.6 ? reach * 0.6 : 0.3 * at.tall), high = at.y + (tipped > 0.6 ? reach * 0.6 : 0.3 * at.tall)
      const inside = Math.min(reach + r - Math.hypot(at.x - x, at.z - z), eel.y + r - low, high - (eel.y - r))
      if (inside > deep) {
        deep = inside
        what = `shell ${index}, ${shell.state}`
      }
    })
  }
  return { deep, what }
}

describe('the eel is seen', () => {
  it('in a plain evening it is up out of the water for more than a fifth of two minutes, twice what it was, and for most of the time the crab is not over it and it is not under its driftwood', () => {
    for (const seed of [1, 5]) {
      const play = new Play(BEACHES.evening(7), seed), eel = play.folk.eel, crab = play.folk.crab
      let frames = 0, up = 0, clear = 0, upClear = 0
      for (let t = 0; t < 120; t += DT) {
        play.step(DT)
        frames += 1
        const isUp = eel.where === 'groove' && eel.dip < 0.5
        if (isUp) up += 1
        // Nothing near it: no part of its head and neck within a hand of the crab's legs and claws, and not under the wood.
        const fx = Math.sin(eel.yaw), fz = Math.cos(eel.yaw)
        if (eel.where === 'groove' && !eel.under && EEL_BODY.every(([along, r]) => crabReach(crab, eel.x + fx * along, eel.z + fz * along) >= r + 0.4)) {
          clear += 1
          if (isUp) upClear += 1
        }
      }
      // It was an eighth of the time, when it came out each time into the short water by the sea and lay there unseen.
      expect(up / frames, `seed ${seed}`).toBeGreaterThan(0.2)
      expect(clear / frames, `seed ${seed}`).toBeGreaterThan(0.35)
      expect(upClear / clear, `seed ${seed}`).toBeGreaterThan(0.54)
    }
  })

  /** A ring for the crab on the left of the beach, and on the right a long groove from the sea with driftwood across the middle of it. */
  function longGroove(to = 4.6, woodZ = 1): Kingdom {
    const state = BEACHES.first(7), field = makeField(), turn = (i: number): number => (i / 24) * Math.PI * 2
    groove(field, 2, -2.6, 2, to)
    for (let i = 0; i < 24; i++) groove(field, -3 + Math.cos(turn(i)), 4.6 + Math.sin(turn(i)), -3 + Math.cos(turn(i + 1)), 4.6 + Math.sin(turn(i + 1)))
    state.sand = encode(field)
    state.dug = [cellAt(2, -2.6)]
    state.sun = 'down'
    state.finished = true
    state.bucket = { x: 6.2, z: 6.9, holds: 'nothing', shell: false, side: false }
    state.wood = [{ x: 5.6, z: 7.9, turn: 0.1 }, { x: 2, z: woodZ, turn: 0.1 }]
    state.shells = [{ x: -6.4, z: 2.4, up: true, state: 'lying' }, { x: -5.6, z: 7.9, up: true, state: 'lying' }, { x: 6.6, z: 3.4, up: false, state: 'lying' }]
    return state
  }
  /**
   * How far the eel as it is drawn is into the bough: its head as a ball, and its neck along its middle line,
   * sloped as it is pitched and a quarter larger than modelled (view/folkView.ts), against the bough as a rod
   * 0.2 thick from tip to tip. Nothing while it is not drawn.
   */
  const inBough = (play: Play, index: number): number => {
    const eel = play.folk.eel
    if (!eelShown(eel)) return -Infinity
    const wood = play.woodPose(index), ax = Math.cos(wood.turn), az = Math.sin(wood.turn)
    const off = (x: number, y: number, z: number): number => {
      const along = Math.max(-1.26, Math.min(1.26, (x - wood.x) * ax + (z - wood.z) * az))
      return Math.hypot(x - wood.x - ax * along, y - wood.y, z - wood.z - az * along)
    }
    const sy = Math.sin(eel.yaw), cy = Math.cos(eel.yaw), sp = Math.sin(eel.pitch), cp = Math.cos(eel.pitch)
    let deep = 0.725 + 0.2 - off(eel.x, eel.y, eel.z)
    for (let a = 0.3; a <= 1.6001; a += 0.05) {
      const up = (-0.02 * cp + a * sp) * 1.25, back = (-0.02 * sp - a * cp) * 1.25
      deep = Math.max(deep, 0.27 * 1.25 + 0.2 - off(eel.x + back * sy, eel.y + up, eel.z + back * cy))
    }
    return deep
  }
  /** What the game has planned for the eel. */
  const eelPlan = (play: Play): EelPlan => (play as unknown as { plan: { eel: EelPlan } }).plan.eel
  /** The eel watched for a while: the share of frames in which it is drawn, how many of them on either side of the wood, and the longest it went undrawn. */
  const seen = (play: Play, seconds: number, woodZ: number): { share: number; low: number; high: number; gone: number; swum: number; deep: number } => {
    const eel = play.folk.eel
    let drawn = 0, low = 0, high = 0, gone = 0, since = 0, swum = 0, frames = 0, deep = -Infinity
    for (let t = 0; t < seconds; t += DT) {
      play.step(DT)
      frames += 1
      deep = Math.max(deep, inBough(play, 1))
      if (eel.where === 'groove') swum += 1
      if (eelShown(eel)) {
        drawn += 1
        since = 0
        if (eel.where === 'groove') {
          if (eel.z < woodZ) low += 1
          else high += 1
        }
      } else since += DT
      gone = Math.max(gone, since)
    }
    return { share: drawn / frames, low, high, gone, swum, deep }
  }

  it('with water long enough for it on one side of the driftwood only, it comes back out the way it went in, and a load finds it on that side, drawn', () => {
    // The wood near the inland end of the groove: beyond it the water is two points long.
    const play = new Play(longGroove(3, 2.2), 3), eel = play.folk.eel, plan = eelPlan(play)
    expect(plan.kind).toBe('groove')
    if (plan.kind !== 'groove') return
    expect(plan.bridge).not.toBeNull()
    expect(plan.path.length - 1 - plan.bridge!).toBeLessThan(EEL_PAST)
    expect(plan.rests[1]).toBeNull()
    expect(plan.rests[0]).not.toBeNull()
    // As the load leaves it: in the long water, drawn, the whole of it clear of the wood.
    expect(eel.where).toBe('groove')
    expect(eelShown(eel)).toBe(true)
    expect(eel.z).toBeLessThan(2.2 - 2.2)
    expect(inBough(play, 1)).toBeLessThan(0)
    // It goes under, and every time it comes out again on the side it went in: it is never sent to lie under the
    // water in the short end beyond the wood.
    const went = seen(play, 40, 2.2)
    expect(went.high).toBe(0)
    expect(went.low).toBeGreaterThan(600)
    expect(went.gone).toBeLessThan(4)
    // With its neck sloping down under the bough where it lies nearest, no part of it as drawn is in the wood.
    expect(went.deep).toBeLessThan(0)
  })

  it('in the shortest water it is given beside the driftwood it is up with its head clear of the wood, and no part of it as drawn is in the bough', () => {
    // The wood across the groove of the beach where each thing is a little wrong, as the child puts it right,
    // and across longer grooves six points from one end: each side in turn is the only one long enough.
    for (const [to, woodZ] of [[1, 0.3], [3.4, 0.4], [3.1, 0.2], [2.6, -0.1]] as const) {
      const play = new Play(longGroove(to, woodZ), 3), plan = eelPlan(play), name = `a groove to ${to} with the wood at ${woodZ}`
      expect(plan.kind, name).toBe('groove')
      if (plan.kind !== 'groove') continue
      expect(plan.bridge, name).not.toBeNull()
      expect(eelShown(play.folk.eel), name).toBe(true)
      const went = seen(play, 40, woodZ)
      expect(went.low + went.high, name).toBeGreaterThan(600)
      expect(went.gone, name).toBeLessThan(4)
      expect(went.deep, name).toBeLessThan(0)
      expect(went.deep, name).toBeGreaterThan(-1)
      // The sun is lifted a little way and let go: the eel goes home to its rock and comes back to its water, and
      // comes up there on a side that has room for it, seen as before.
      play.press({ kind: 'sun' })
      play.dragStart()
      for (let t = 0; t < 4; t += DT) {
        play.drag(null, null, -0.3)
        play.step(DT)
      }
      expect(play.folk.eel.where, name).toBe('rock')
      play.release()
      // From the frame it is in its water again, it is up and drawn within a second, and stays so for a second.
      let inWater = 0, firstDrawn = -1, drawnFor = 0
      for (let t = 0; t < 8; t += DT) {
        play.step(DT)
        if (play.folk.eel.where !== 'groove') continue
        inWater += DT
        if (firstDrawn < 0 && eelShown(play.folk.eel)) firstDrawn = inWater
        if (firstDrawn >= 0 && inWater < firstDrawn + 1 && eelShown(play.folk.eel)) drawnFor += DT
      }
      expect(firstDrawn, name).toBeGreaterThan(0)
      expect(firstDrawn, name).toBeLessThan(1)
      expect(drawnFor, name).toBeGreaterThan(0.9)
      expect(play.sun.home, name).toBe('down')
      expect(play.folk.eel.where, name).toBe('groove')
      const again = seen(play, 30, woodZ)
      expect(again.low + again.high, name).toBeGreaterThan(450)
      expect(again.gone, name).toBeLessThan(4)
      expect(again.deep, name).toBeLessThan(0)
    }
  })

  it('a ditch with too little water on both sides of the driftwood is no water for the eel: it keeps to its rock, and is seen there', () => {
    for (const [to, woodZ] of [[1.5, 0], [1, -0.4], [1.2, -0.2]] as const) {
      const play = new Play(longGroove(to, woodZ), 3), plan = eelPlan(play), name = `a ditch to ${to} with the wood at ${woodZ}`
      // The ditch has water in it and the wood lies across it: with the wood away the eel takes it.
      expect(plan.kind, name).toBe('rock')
      const state = longGroove(to, woodZ)
      state.wood[1] = { x: 5.6, z: 5.2, turn: 0.1 }
      expect(eelPlan(new Play(state, 3)).kind, name).toBe('groove')
      const went = seen(play, 30, woodZ)
      expect(went.swum, name).toBe(0)
      expect(went.share, name).toBeGreaterThan(0.5)
      expect(went.gone, name).toBeLessThan(3)
    }
  })

  it('with water long enough for it on both sides of the driftwood it goes under and comes out the other side, every time, and is seen on both sides', () => {
    const play = new Play(longGroove(), 3), eel = play.folk.eel
    let low = 0, high = 0, went = 0, side = 0, in_ = 0
    for (let t = 0; t < 60; t += DT) {
      const was = eel.under
      play.step(DT)
      const now = eel.z < 1 - 0.6 ? -1 : eel.z > 1 + 0.6 ? 1 : 0
      if (eel.where !== 'groove') continue
      if (!eel.under && eel.dip < 0.5) {
        if (now < 0) low += 1
        if (now > 0) high += 1
      }
      // The side it went under from, and the side it is on when it is next clear of the wood.
      if (eel.under && !was) in_ = side
      if (!eel.under && now !== 0) {
        if (in_ !== 0) {
          expect(now, `after ${play.time.toFixed(2)} s`).toBe(-in_)
          went += 1
          in_ = 0
        }
        side = now
      }
    }
    expect(went).toBeGreaterThan(5)
    expect(low).toBeGreaterThan(300)
    expect(high).toBeGreaterThan(300)
  })
})

describe('where the ways of the folk and the things cross', () => {
  /** The evening played for a while, every frame looked at. */
  const swim = (play: Play, seconds: number, doing: string, each?: (t: number) => void): number => {
    let swum = 0
    for (let t = 0; t < seconds; t += DT) {
      each?.(t)
      play.step(DT)
      if (play.folk.eel.where === 'groove' && play.folk.eel.dip < 0.97) swum += 1
      const now = eelIn(play)
      expect(now.deep, `${doing}: in ${now.what} at ${t.toFixed(2)}`).toBeLessThan(0.03)
    }
    return swum
  }

  it('the eel is right under the water before any of it is under the crab, and is never in the shell in the side of the tower', () => {
    for (const name of ['evening', 'channel'] as const) {
      const play = new Play(BEACHES[name](7), 5)
      if (name === 'channel') {
        play.press({ kind: 'sun' })
        play.tap()
      }
      // It is seen swimming for a good part of the time: it does not hide from everything.
      expect(swim(play, 60, name), name).toBeGreaterThan(400)
    }
  })

  // A shell laid at places round the moat and down the channel.
  for (const [x, z] of [[MOAT.x, MOAT.z + MOAT.r], [MOAT.x + MOAT.r, MOAT.z], [MOAT.x - 0.7, MOAT.z + 0.9], [MOAT.x + 0.4, MOAT.z + 1.5], [MOAT.x, 1.2], [MOAT.x + 0.5, 0.4], [MOAT.x, MOAT.z - MOAT.r]] as const) {
    it(`the eel goes under before a shell that lies in its water or on the edge of it is over any of it: a shell at ${x}, ${z}`, { timeout: 60_000 }, () => {
      const state = BEACHES.evening(7)
      state.shells[2] = { x, z, up: true, state: 'lying' }
      const play = new Play(state, 5)
      swim(play, 45, `a shell at ${x}, ${z}`)
    })
  }

  it('the tower patted away while the eel swims in front of it: the shell from its side drops, and the eel is under before it lands', { timeout: 60_000 }, () => {
    for (let when = 2; when <= 30; when += 2) {
      const play = new Play(BEACHES.evening(7), 5)
      let patted = 0
      swim(play, when + 12, `patted at ${when}`, (t) => {
        if (t < when || patted >= 8 || Math.round((t - when) / DT) % 12 !== 0) return
        play.press({ kind: 'sand', x: MOAT.x, z: MOAT.z })
        play.tap()
        patted += 1
      })
      expect(play.things.shells[1].state, `patted at ${when}`).toBe('lying')
    }
  })

  it('a shell dragged across the water is never in the eel', { timeout: 60_000 }, () => {
    for (let when = 3; when <= 24; when += 3) {
      const state = BEACHES.evening(7)
      state.shells[2] = { x: MOAT.x - 2.4, z: MOAT.z + 0.2, up: true, state: 'lying' }
      const play = new Play(state, 5)
      let held = false
      swim(play, when + 6, `dragged at ${when}`, (t) => {
        const part = (t - when) / 1.5
        if (part < 0 || part > 1) {
          if (held) play.release()
          held = false
          return
        }
        if (!held) {
          play.press({ kind: 'shell', index: 2 })
          play.dragStart()
          held = true
        }
        play.drag(MOAT.x - 2.4 + part * 4.8, MOAT.z + 0.2, 0)
      })
    }
  })
})
