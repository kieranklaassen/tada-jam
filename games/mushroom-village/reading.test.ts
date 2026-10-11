import { describe, expect, it } from 'vitest'
import { TAP_S } from './config'
import { GNOMES, SEATS, SNAIL, footFor, groundAt, kindAt, under, type GnomeId } from './ground'
import { Hints } from './hint'
import { Idleness, toRest } from './idle'
import { CORNER } from './overlay'
import { HEAP, ROUNDS, snailPebbles } from './scenes'
import { stepAt } from './shapes'
import { HAT_OFF } from './touch'
import { EVERY, OUT, type Village } from './village'
import { BELL, FRAME, LOOSEN_S, ON_CART, PUFF, RED, chestOf, doorOf, hatOf, hold, loaded, run, stored, tap, village, type At } from './testkit'

// What the first fresh reading of this folder found, one named test for each
// finding: each fails on the game as that reader read it.

/** Steps the village frame by frame and hands each frame to `each`. */
function frames(v: Village, seconds: number, each: (t: number) => void): void {
  for (let t = 0; t < seconds - 1e-9; t += FRAME) { v.step(FRAME); each(t) }
}

/** A finger that lands, goes from point to point in short steps, and lets go. */
function draw(v: Village, points: readonly At[], step = 10): void {
  v.press(points[0])
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1], b = points[i], n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / step))
    for (let k = 1; k <= n; k++) v.drag({ x: a.x + ((b.x - a.x) * k) / n, y: a.y + ((b.y - a.y) * k) / n })
  }
  v.lift()
}

const NOBODY = { tall: null, sleepy: null, sneezy: null, baker: null } as const
const pebbleCount = (v: Village): number => v.toSave().paths.reduce((sum, path) => sum + path.length, 0)

describe('1. the idle hand\'s path move', () => {
  /** A place for a house near a gnome's seat, at a slope from him: the first of a few that the moss gives. */
  const placeNear = (who: GnomeId, dy: number): At => {
    for (const dx of [0, 40, -40, 80, -80, 120]) {
      const at = { x: SEATS[who].x + dx, y: dy }, foot = footFor(at.x, at.y)
      if (foot && foot.x === at.x && foot.y === at.y) return at
    }
    throw new Error(`no place near the ${who} gnome`)
  }

  it.each(GNOMES.flatMap((who) => [400, 440, 500].map((y) => [who, y] as const)))('copied point by point from the %s gnome to a door at height %i, lays pebbles to the door and pulls no hat', (who, y) => {
    // A house with a door, nobody in it, and one pebble at its step, so that the sleepy one does not walk in over the moss.
    const place = placeNear(who, y), step = stepAt(place)
    const lone = { x: Math.round(step.x / 20) * 20, y: Math.round(step.y / 20) * 20 }
    const v = village({ mushrooms: [{ id: 1, x: place.x, y: place.y, size: 6, door: true }], paths: [[lone]] })
    const want = v.want()
    expect(want.act).toBe('path')
    if (want.act !== 'path') return
    // The hand comes down on a gnome, and goes to the doorstep.
    expect(under(want.from.x, want.from.y).what).toBe('gnome')
    expect(want.to).toEqual(stepAt(place))
    const hints = new Hints()
    let down = false, lifted = false
    for (let p = 0; p <= 1; p += 1 / 180) {
      const hand = hints.update({ glow: 1, demo: p, demoIndex: 0 }, () => true, want)!.hand!
      const at = { x: hand.x, y: hand.y }
      if (!down && !lifted && hand.press >= 0.5) { v.press(at); down = true }
      else if (down && hand.press >= 0.5) v.drag(at)
      else if (down) { v.lift(); down = false; lifted = true }
      v.step(FRAME)
      for (const g of GNOMES) {
        const seen = v.show().gnomes[g]
        // No hat comes off: no bare head, and no hat in the air.
        expect(seen.hands, `the ${g} gnome's hands`).toBe(false)
        expect(seen.hatUp, `the ${g} gnome's hat`).toBeLessThan(25)
      }
    }
    expect(lifted).toBe(true)
    expect(pebbleCount(v)).toBeGreaterThan(1)
    // The pebbles reach the door: somebody has moved in.
    expect(Object.values(v.toSave().homes)).toContain(1)
  })

  it('keeps the hat pull for an upward tug that starts on his hat', () => {
    const v = village()
    const on = hatOf('baker')
    v.press(on)
    for (let up = 5; up <= HAT_OFF + 30; up += 5) v.drag({ x: on.x, y: on.y - up })
    expect(v.show().gnomes.baker.hatPull).toBeGreaterThan(40)
    v.lift()
    run(v, 0.3)
    expect(v.show().gnomes.baker.hands).toBe(true)
    expect(pebbleCount(v)).toBe(0)
  })

  it('takes a finger that starts on his body and goes straight up, through his hat and on, for a path from him', () => {
    const v = village()
    const on = chestOf('baker')
    draw(v, [on, { x: on.x, y: on.y - 260 }], 5)
    run(v, 0.3)
    expect(v.show().gnomes.baker.hatPull).toBe(0)
    expect(v.show().gnomes.baker.hands).toBe(false)
    expect(pebbleCount(v)).toBeGreaterThan(2)
  })
})

describe('2. what a villager does by himself is not the child\'s touch', () => {
  it('lets the ghost hand come at night, through the snores and the smoke', () => {
    const v = village({ mushrooms: [{ ...RED, door: true }, { ...PUFF, door: true }], homes: { ...NOBODY, sleepy: 3 }, night: true })
    const idle = new Idleness(0)
    let hand = false, own = 0, t = 0
    frames(v, EVERY.snore * 3, () => {
      t += FRAME
      expect(v.busy).toBe(false)
      if (idle.frame(t, v.busy).demo !== null) hand = true
      own += v.takeFired().length
    })
    expect(own).toBeGreaterThan(2)
    expect(hand).toBe(true)
  })

  it('counts neither a sneeze indoors nor the baker\'s walk for water', () => {
    const v = village({ mushrooms: [{ ...RED, door: true }, { ...PUFF, door: true }], homes: { ...NOBODY, baker: 1, sneezy: 3 } })
    let walked = false, sneezed = 0
    frames(v, EVERY.fetch + 6, () => {
      expect(v.busy).toBe(false)
      if (v.sceneRunning) walked = true
      sneezed += v.takeFired().length
    })
    expect(walked).toBe(true)
    expect(sneezed).toBeGreaterThan(0)
  })

  it('still counts what the child\'s own touch set off', () => {
    const v = village({ mushrooms: [RED] })
    tap(v, { x: RED.x, y: RED.y - 60 })
    expect(v.busy).toBe(true)
    run(v, 3)
    expect(v.busy).toBe(false)
  })
})

describe('3. a door fitted at night', () => {
  const dark = () => village({ mushrooms: [RED, { ...PUFF, door: true }], homes: { ...NOBODY, sleepy: 3 }, night: true })

  it('lights its window at once when it is carried in and nobody moves in, as a load shows it', () => {
    const v = dark()
    v.press(ON_CART)
    for (let i = 1; i <= 12; i++) v.drag({ x: ON_CART.x + ((RED.x - ON_CART.x) * i) / 12, y: ON_CART.y + ((RED.y - 30 - ON_CART.y) * i) / 12 })
    v.lift()
    run(v, 1.2)
    expect(v.sceneRunning).toBe(false)
    expect(v.toSave().homes).toEqual({ ...NOBODY, sleepy: 3 })
    const lit = (of: Village) => of.show().mushrooms.find((m) => m.id === 1)!.glow
    expect(lit(v)).toBeGreaterThan(0.9)
    expect(lit(loaded(v))).toBe(1)
  })

  it('lights it when a tap on the cart sends the door, too', () => {
    const v = dark()
    tap(v, ON_CART)
    run(v, 1.5)
    expect(v.show().mushrooms.find((m) => m.id === 1)!.glow).toBeGreaterThan(0.9)
  })
})

describe('4. a slow tap is still a tap', () => {
  const TAPS = [0.1, 0.3, 0.44]

  it('says so in one number', () => {
    expect(TAP_S).toBeGreaterThanOrEqual(0.44)
    expect(TAP_S).toBeLessThanOrEqual(0.5)
  })

  it.each(TAPS.flatMap((s) => [RED, BELL, PUFF].map((m) => [s, m] as const)))('pokes a mushroom under a press of %f s and adds no step', (seconds, m) => {
    const v = village({ mushrooms: [m] })
    hold(v, { x: m.x, y: m.y - 30 }, seconds)
    expect(v.toSave().mushrooms[0].size).toBe(m.size)
    // A poke swings or sneezes; the end of a hold would not.
    let swung = 0, spores = 0
    frames(v, 0.7, () => { swung = Math.max(swung, Math.abs(v.show().mushrooms[0].swing)); spores = Math.max(spores, v.show().specks.length) })
    expect(m === PUFF ? spores : swung).toBeGreaterThan(m === PUFF ? 5 : 0.12)
  })

  it.each(TAPS)('brings a gnome out of his door under a press of %f s on it', (seconds) => {
    const v = village({ mushrooms: [{ ...RED, door: true }], homes: { ...NOBODY, sneezy: 1 } })
    hold(v, doorOf(v, 1), seconds)
    expect(v.sceneRunning).toBe(true)
    expect(v.toSave().mushrooms[0].size).toBe(RED.size)
  })

  it('shows the swelling start after that: the cap stretches before the first step comes', () => {
    const v = village({ mushrooms: [RED] })
    v.press({ x: RED.x, y: RED.y - 30 })
    run(v, TAP_S - 0.03)
    const before = v.show().mushrooms[0].squash
    run(v, 0.1)
    expect(v.toSave().mushrooms[0].size).toBe(RED.size)
    expect(v.show().mushrooms[0].squash).toBeGreaterThan(before + 0.02)
    run(v, 0.2)
    expect(v.toSave().mushrooms[0].size).toBe(RED.size + 1)
    run(v, 0.5)
    v.lift()
    expect(v.toSave().mushrooms[0].size).toBeGreaterThanOrEqual(RED.size + 3)
  })

  it.each([0.1, 0.4, 1])('pulls a mushroom up by movement after a rest of %f s on it', (rest) => {
    const v = village({ mushrooms: [RED] })
    const cap = { x: RED.x, y: RED.y - 100 }
    v.press(cap)
    run(v, rest)
    for (let up = 10; up <= OUT + 40; up += 10) v.drag({ x: cap.x, y: cap.y - up })
    run(v, LOOSEN_S)
    v.lift()
    expect(v.count).toBe(0)
  })

  it.each([0.1, 0.4, 1])('carries a door off by movement after a rest of %f s on it', (rest) => {
    const v = village({ mushrooms: [{ ...RED, door: true }] })
    const door = doorOf(v, 1)
    v.press(door)
    run(v, rest)
    for (let i = 1; i <= 15; i++) v.drag({ x: door.x - i * 10, y: door.y + i * 4 })
    expect(v.show().door).not.toBeNull()
    v.takeAway()
  })

  it('still lets a finger that has swollen a mushroom drift a finger\'s width', () => {
    const v = village({ mushrooms: [RED] })
    const cap = { x: RED.x, y: RED.y - 100 }
    v.press(cap)
    run(v, 0.9)
    v.drag({ x: cap.x, y: cap.y - 30 })
    run(v, 0.4)
    expect(v.show().mushrooms[0].pull).toBe(0)
    expect(v.toSave().mushrooms[0].size).toBeGreaterThan(RED.size + 3)
    v.lift()
  })
})

describe('5. the tall gnome\'s hat on a walk', () => {
  it('stays on the step, he walks out without it, and he bumps twice and crawls in again', () => {
    const low = { ...RED, size: 3, door: true }, step = stepAt(low)
    const path = [0, 1, 2, 3, 4, 5].map((i) => ({ x: 1000 - i * 20, y: 540 }))
    const v = village({ mushrooms: [low], paths: [path], homes: { ...NOBODY, tall: 1 }, hatOff: true })
    expect(Math.hypot(path[0].x - step.x, path[0].y - step.y)).toBeLessThan(34)
    tap(v, doorOf(v, 1))
    expect(v.sceneRunning).toBe(true)
    let out = 0, bumps = 0, shut = false, low_ = 0
    frames(v, 30, () => {
      if (!v.sceneRunning) return
      const seen = v.show(), tall = seen.gnomes.tall
      expect(seen.hat).not.toBeNull()
      if (tall.where !== 'out') return
      out += 1
      expect(tall.bare).toBe(true)
      if (tall.face === 'shut' && !shut) bumps += 1
      shut = tall.face === 'shut'
      low_ = Math.max(low_, tall.low)
    })
    expect(out).toBeGreaterThan(60)
    expect(bumps).toBe(2)
    expect(low_).toBeGreaterThan(0.9)
    expect(v.sceneRunning).toBe(false)
    expect(v.show().hat).not.toBeNull()
    expect(v.show().gnomes.tall.where).toBe('home')
    expect(v.toSave().hatOff).toBe(true)
  })

  it('leaves the hat on the step only from the moment he crawls in', () => {
    // A low puffball suits nobody, so the one nearest the path's start goes: pebbles drawn from the tall gnome to its door.
    const low = { ...PUFF, size: 3, door: true }
    // One pebble lies at its step already, so the sleepy one does not walk in over the moss.
    const v = village({ mushrooms: [low], paths: [[{ x: 300, y: 480 }]], homes: NOBODY })
    draw(v, [{ x: SEATS.tall.x, y: 600 }, { x: SEATS.tall.x, y: 470 }, { x: 300, y: 460 }])
    expect(v.toSave().homes.tall).toBe(low.id)
    expect(v.toSave().hatOff).toBe(true)
    let before = 0
    frames(v, 30, () => {
      const seen = v.show()
      if (seen.gnomes.tall.where === 'out' && seen.gnomes.tall.low < 0.05 && !seen.hat) before += 1
      if (seen.gnomes.tall.where === 'out' && seen.hat) expect(seen.gnomes.tall.bare).toBe(true)
    })
    expect(before).toBeGreaterThan(30)
    expect(v.show().hat).not.toBeNull()
  })
})

describe('6. a loop is walked round by whoever walks it', () => {
  it('by a gnome who waits, as often as is his manner, before he scratches his head', () => {
    const v = village()
    const from = chestOf('sneezy')
    draw(v, [from, { x: 420, y: 420 }, { x: 520, y: 420 }, { x: 520, y: 520 }, { x: 440, y: 520 }], 5)
    expect(v.sceneRunning).toBe(true)
    expect(v.takeChange()).not.toBe('none')
    let sat = 0, walked = 0
    frames(v, 40, () => { const g = v.show().gnomes.sneezy; if (g.sat) sat += 1; walked = Math.max(walked, g.walked) })
    expect(sat).toBeGreaterThan(20)
    // The ring is about 380 units round.
    expect(walked).toBeGreaterThan(ROUNDS.sneezy * 340)
    expect(v.show().gnomes.sneezy.where).toBe('log')
    expect(v.toSave().homes).toEqual(NOBODY)
  })

  const ring: At[] = [...[0, 1, 2, 3, 4, 5].map((i) => ({ x: 1000 - i * 20, y: 540 })), { x: 900, y: 560 }, { x: 900, y: 580 }, ...[0, 1, 2, 3, 4, 5].map((i) => ({ x: 900 + i * 20, y: 600 })), { x: 1000, y: 580 }, { x: 1000, y: 560 }]

  it('by the baker, three times round, before he looks at the water', () => {
    const v = village({ mushrooms: [{ ...RED, door: true }], paths: [ring], homes: { ...NOBODY, baker: 1 } })
    tap(v, doorOf(v, 1))
    let sat = 0, walked = 0
    // One walk of his, and no more: by himself he would set off again for water later.
    frames(v, 20, () => { const g = v.show().gnomes.baker; if (g.sat) sat += 1; walked = Math.max(walked, g.walked) })
    expect(v.sceneRunning).toBe(false)
    expect(v.show().gnomes.baker.where).toBe('home')
    expect(sat).toBeGreaterThan(20)
    expect(walked).toBeGreaterThan(ROUNDS.baker * 300)
  })

  it('and each goes round as often as is his own manner', () => {
    expect(new Set(GNOMES.map((who) => ROUNDS[who])).size).toBeGreaterThan(2)
  })
})

describe('7. a tap sends a waiting gnome instead, whatever his taste', () => {
  /** A door from the cart on a red mushroom no pebble leads to: the sleepy one sets off over the moss. */
  const sleepwalking = (): Village => {
    const v = village({ mushrooms: [RED] })
    tap(v, ON_CART)
    run(v, 4)
    expect(v.toSave().homes.sleepy).toBe(1)
    expect(v.show().gnomes.sleepy.where).toBe('out')
    return v
  }

  it.each([0.1, 0.44])('with no pebble route, under a tap of %f s, and the sleepy one walks back to the log seen', (seconds) => {
    const v = sleepwalking()
    v.takeChange()
    let last = v.show().gnomes.sleepy
    v.press({ x: SEATS.baker.x, y: 640 })
    frames(v, seconds, () => { last = v.show().gnomes.sleepy })
    expect(last.where).toBe('out')
    v.lift()
    expect(v.toSave().homes).toEqual({ ...NOBODY, baker: 1 })
    expect(v.takeChange()).toBe('now')
    expect(loaded(v).toSave()).toEqual(v.toSave())
    // He is where he was, turns, and walks: never a jump from one frame to the next.
    let now = v.show().gnomes.sleepy
    expect(now.where).toBe('out')
    expect(Math.hypot(now.x - last.x, now.y - last.y)).toBeLessThan(2)
    let arrived = false
    frames(v, 20, () => {
      const g = v.show().gnomes.sleepy
      if (g.where === 'out' && now.where === 'out') expect(Math.hypot(g.x - now.x, g.y - now.y)).toBeLessThan(16)
      if (g.where === 'log') arrived = true
      now = g
    })
    expect(arrived).toBe(true)
    expect(v.show().gnomes.baker.where).toBe('home')
    expect(v.show().gnomes.sleepy.asleep).toBe(false)
  })

  it('and a finger that stays on him is his grumble: the sleepy one goes in', () => {
    const v = sleepwalking()
    hold(v, { x: SEATS.baker.x, y: 640 }, 1)
    expect(v.toSave().homes).toEqual({ ...NOBODY, sleepy: 1 })
    expect(v.show().gnomes.sleepy.where).toBe('home')
  })
})

describe('8. the red mushroom\'s lift', () => {
  it('draws its one more spot as the plip sounds, and the other kinds draw none', () => {
    for (const m of [RED, BELL, PUFF]) {
      const v = village({ mushrooms: [m] })
      v.press({ x: m.x, y: m.y - 30 })
      run(v, 1)
      v.takeNotes()
      v.lift()
      expect(v.takeNotes().length).toBeGreaterThan(0)
      expect(v.show().props.some((prop) => prop.what === 'spot' && prop.id === m.id)).toBe(m === RED)
    }
  })
})

describe('9. a gnome whose house goes', () => {
  it('stands at his door and walks back to the log, with no hop into place', () => {
    const v = village({ mushrooms: [{ ...RED, door: true }], homes: { ...NOBODY, sneezy: 1 } })
    const cap = { x: RED.x, y: RED.y - 110 }
    v.press(cap)
    for (let up = 10; up <= OUT + 30; up += 10) v.drag({ x: cap.x, y: cap.y - up })
    run(v, LOOSEN_S)
    v.lift()
    expect(v.toSave().homes.sneezy).toBeNull()
    let now = v.show().gnomes.sneezy
    expect(now.where).toBe('out')
    expect({ x: now.x, y: now.y }).toEqual(stepAt(RED))
    // Parked now, he is on the log, as a load has him.
    expect(loaded(v).show().gnomes.sneezy.where).toBe('log')
    let steps = 0, arrived = false
    frames(v, 12, () => {
      const g = v.show().gnomes.sneezy
      if (g.where === 'out') { steps += 1; expect(Math.hypot(g.x - now.x, g.y - now.y)).toBeLessThan(16) }
      if (g.where === 'log') arrived = true
      now = g
    })
    expect(steps).toBeGreaterThan(120)
    expect(arrived).toBe(true)
    expect(v.busy).toBe(false)
  })
})

describe('10. the first pebbles', () => {
  it('come from beside the snail, which never leaves its stone, and land at the log one by one', () => {
    const v = village({ mushrooms: [RED], shown: ['cart'] })
    tap(v, ON_CART)
    expect(v.toSave().shown).toContain('pebbles')
    expect(v.toSave().paths).toEqual([snailPebbles(RED.x)])
    let lying = 0, flying = 0, laid = 0
    frames(v, 6, () => {
      const seen = v.show()
      expect({ x: seen.snail.x, y: seen.snail.y }).toEqual({ x: SNAIL.x, y: SNAIL.y })
      const tossed = seen.props.filter((prop) => prop.what === 'toss')
      for (const prop of tossed) expect(HEAP).toContainEqual({ x: prop.x, y: prop.y })
      lying = Math.max(lying, tossed.filter((prop) => prop.phase === 'lie').length)
      if (tossed.some((prop) => prop.phase === 'fly')) flying += 1
      expect(seen.pebbles.length).toBeGreaterThanOrEqual(laid)
      expect(seen.pebbles.length - laid).toBeLessThanOrEqual(1)
      laid = seen.pebbles.length
    })
    expect(lying).toBe(3)
    expect(flying).toBeGreaterThan(60)
    expect(laid).toBe(3)
  })

  it('lie in front of the snail on the bank before they fly: beside it, not on it, and not in the water', () => {
    const body = { x0: 985, y0: 690, x1: SNAIL.x + SNAIL.r, y1: 790 }
    for (const pebble of HEAP) {
      expect(pebble.x, 'clear of the snail as it is drawn').toBeLessThan(body.x0 - 10)
      expect(Math.hypot(pebble.x - SNAIL.x, pebble.y - SNAIL.y)).toBeLessThan(SNAIL.r * 2.2)
      expect(groundAt(pebble.x, pebble.y).what).toBe('moss')
    }
    // Crooked, like everything the snail lays: no two level, no even steps.
    expect(new Set(HEAP.map((pebble) => pebble.y)).size).toBe(3)
    expect(HEAP[1].x - HEAP[0].x).not.toBe(HEAP[2].x - HEAP[1].x)
  })

  it('are laid at once by a touch, with nothing left in the air', () => {
    const v = village({ mushrooms: [RED], shown: ['cart'] })
    tap(v, ON_CART)
    run(v, 1)
    v.press({ x: 300, y: 200 })
    expect(v.show().pebbles.length).toBe(3)
    expect(v.show().props.some((prop) => prop.what === 'toss')).toBe(false)
    v.lift()
  })
})

describe('11. the snail\'s trail', () => {
  it('bends toward the fitted door for every door place', () => {
    for (let x = 26; x <= 1154; x += 2) {
      const [, second, third] = snailPebbles(x)
      if (x !== second.x) expect(Math.sign(third.x - second.x), `a door at ${x}`).toBe(Math.sign(x - second.x))
    }
  })
})

describe('12. a housed sneezy gnome', () => {
  const window = (v: Village, id: number) => v.show().mushrooms.find((m) => m.id === id)!

  it('does not answer a puffball far from his house', () => {
    const v = village({ mushrooms: [{ ...RED, door: true }, PUFF], homes: { ...NOBODY, sneezy: 1 } })
    tap(v, { x: PUFF.x, y: PUFF.y - 30 })
    frames(v, 1.5, () => {
      expect(Math.abs(window(v, 1).jerk)).toBeLessThan(1e-9)
      expect(v.show().props.some((prop) => prop.what === 'hatOut')).toBe(false)
    })
  })

  it('answers one near his house, and it is seen: his window jerks and his hat pops out', () => {
    const house = { id: 1, x: 480, y: 460, size: 6, door: true }, puff = { id: 3, x: 340, y: 470, size: 6, door: false }
    expect(kindAt(house.x, house.y)).toBe('red')
    expect(kindAt(puff.x, puff.y)).toBe('puff')
    const v = village({ mushrooms: [house, puff], homes: { ...NOBODY, sneezy: 1 } })
    tap(v, { x: puff.x, y: puff.y - 30 })
    let jerk = 0, hat = false
    frames(v, 1.5, () => {
      jerk = Math.max(jerk, Math.abs(window(v, 1).jerk))
      if (v.show().props.some((prop) => prop.what === 'hatOut' && prop.id === 1)) hat = true
    })
    expect(jerk).toBeGreaterThan(0.05)
    expect(hat).toBe(true)
  })
})

describe('13. the sun', () => {
  it.each([0.1, 0.3, 0.44])('brings the night under a tap of %f s', (seconds) => {
    const v = village()
    hold(v, { x: 968, y: 132 }, seconds)
    expect(v.toSave().night).toBe(true)
  })

  it('hums under a finger that stays, and brings no night', () => {
    const v = village()
    v.press({ x: 968, y: 132 })
    run(v, 0.7)
    expect(v.show().sun.cheeks).toBeGreaterThan(0.2)
    v.lift()
    expect(v.toSave().night).toBe(false)
  })
})

describe('14. the idle ladder at put-away', () => {
  it('is taken down, so a parked game and a loaded one start it alike', () => {
    const parked = new Idleness(0)
    expect(parked.frame(4.5, false).glow).toBeGreaterThan(0.9)
    parked.rest(4.5)
    const fresh = new Idleness(4.5)
    for (const later of [4.5, 5, 7.4, 8, 9.6]) expect({ ...parked.frame(later, false) }).toEqual({ ...fresh.frame(later, false) })
    expect(parked.frame(5, false).glow).toBe(0)
  })

  it('goes down in the one call the Mount makes at put-away, which also ends what was playing where it was kept', () => {
    const v = village({ mushrooms: [RED], shown: ['cart'] })
    tap(v, ON_CART)
    run(v, 1)
    expect(v.show().props.some((prop) => prop.what === 'toss')).toBe(true)
    const idle = new Idleness(0)
    expect(idle.frame(4.5, false).glow).toBeGreaterThan(0.9)
    toRest(4.5, idle, v)
    expect(v.show().props.some((prop) => prop.what === 'toss')).toBe(false)
    expect(v.show().pebbles.length).toBe(3)
    expect(v.busy).toBe(false)
    expect(idle.frame(5, false).glow).toBe(0)
    // Before the save has been read there is no glade yet, and the ladder still goes down.
    const early = new Idleness(0)
    toRest(4.5, early, null)
    expect(early.frame(5, false).glow).toBe(0)
  })
})

describe('15. a touch that ends dusk', () => {
  it('keeps the scene\'s notes apart from the touch\'s own, and says that what was ringing is to be cut', () => {
    const v = village({ mushrooms: [{ ...RED, door: true }, { ...BELL, door: true }, { ...PUFF, door: true }] })
    tap(v, { x: 968, y: 132 })
    // The shimmer is the tap's own answer; the sun going down belongs to the scene.
    expect(v.takeNotes().length).toBeGreaterThan(0)
    expect(v.takeSceneNotes().length).toBeGreaterThan(0)
    expect(v.takeCut()).toBe(false)
    run(v, 0.5)
    v.takeNotes()
    run(v, 2.7)
    expect(v.takeNotes()).toEqual([])
    expect(v.takeSceneNotes().length).toBeGreaterThan(0)
    run(v, 0.2)
    v.press({ x: 300, y: 200 })
    expect(v.takeCut()).toBe(true)
    expect(v.takeSceneNotes()).toEqual([])
    expect(v.takeNotes().length).toBeGreaterThan(0)
    v.lift()
    v.takeNotes()
    frames(v, 3, () => expect(v.takeSceneNotes()).toEqual([]))
    expect(v.takeCut()).toBe(false)
  })

  it('cuts at put-away too, and queues nothing for the return', () => {
    const v = village({ mushrooms: [{ ...RED, door: true }] })
    tap(v, { x: 968, y: 132 })
    run(v, 1)
    v.takeCut()
    v.rest()
    expect(v.takeCut()).toBe(true)
    expect(v.takeSceneNotes()).toEqual([])
    expect(v.takeNotes()).toEqual([])
  })
})

describe('16. a mushroom\'s id', () => {
  it('is one more than the highest in the village when it is grown, so a pulled one\'s id may come again', () => {
    const v = village()
    const places = [{ x: 1010, y: 520 }, { x: 880, y: 540 }, { x: 300, y: 450 }]
    for (const at of places) hold(v, at, 0.3)
    const ids = () => v.toSave().mushrooms.map((m) => m.id).sort()
    expect(ids()).toEqual([1, 2, 3])
    const pull = (at: At) => { v.press({ x: at.x, y: at.y - 40 }); for (let up = 10; up <= OUT + 40; up += 10) v.drag({ x: at.x, y: at.y - 40 - up }); run(v, LOOSEN_S); v.lift(); run(v, 1) }
    pull(places[2])
    expect(ids()).toEqual([1, 2])
    hold(v, places[2], 0.3)
    expect(ids()).toEqual([1, 2, 3])
    pull(places[0])
    hold(v, places[0], 0.3)
    expect(ids()).toEqual([2, 3, 4])
    expect(JSON.stringify(stored(v))).toContain('"id":4')
  })
})

describe('the grown-up corner, through what the Mount\'s press handler calls', () => {
  const width = 1024
  const inside = { x: width - CORNER / 2, y: CORNER / 2 }

  it('hands a press there to the overlay alone: the glade answers nothing and the idle ladder stays where it is', () => {
    const v = village({ mushrooms: [RED] }), idle = new Idleness(0)
    let corner = 0
    expect(idle.frame(4.5, v.busy).glow).toBeGreaterThan(0.9)
    idle.press(inside, width, 4.5, () => v.press(inside), () => { corner += 1 })
    v.step(FRAME)
    expect(corner).toBe(1)
    expect(v.takeFired()).toEqual([])
    expect(v.takeNotes()).toEqual([])
    expect(v.busy).toBe(false)
    expect(idle.frame(4.6, v.busy).glow).toBeGreaterThan(0.9)
  })

  it('hands a press anywhere else to the glade, and that one takes the ladder down', () => {
    const v = village({ mushrooms: [RED] }), idle = new Idleness(0)
    const on = { x: width - CORNER - 4, y: CORNER / 2 }
    let corner = 0
    idle.press(on, width, 4.5, () => v.press(on), () => { corner += 1 })
    expect(corner).toBe(0)
    expect(v.takeFired().length).toBeGreaterThan(0)
    expect(idle.frame(4.6, v.busy).glow).toBe(0)
    v.lift()
  })

  it('has no corner on a surface that has not been measured', () => {
    const idle = new Idleness(0)
    let glade = 0
    idle.press({ x: 0, y: 0 }, 0, 1, () => { glade += 1 }, () => {})
    expect(glade).toBe(1)
  })
})
