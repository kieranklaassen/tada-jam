import { describe, expect, it } from 'vitest'
import { lampOf } from './company'
import { BEHIND_PEN, PACE, WAGON_UP } from './gait'
import { MAX_MARKS } from './marks'
import { between, makeRng } from './rng'
import { deserialize, serialize } from './save'
import { COUPLINGS, HOLD, Toy } from './toy'
import { VOICES } from './voices'
import { NONE, freshWorld } from './world'
import { DANDELION, ENGINE_START, PUDDLE, TAR, WRIST_STRIP, distance, inPuddle, type Pt } from './yard'

const DT = 1 / 60
/** The toy by itself: the engine alone on the tar, with the riders and the cycle off. */
const fresh = (seed = 5) => new Toy(freshWorld(null, seed, false), seed, false)
const line = (from: Pt, to: Pt, steps = 40): Pt[] => Array.from({ length: steps + 1 }, (_, i) => ({ x: from.x + ((to.x - from.x) * i) / steps, y: from.y + ((to.y - from.y) * i) / steps }))
const zigzag = (from: Pt, points = 5, pitch = 60, height = 110): Pt[] => {
  const out: Pt[] = []
  for (let i = 0; i < points; i++) out.push(...line({ x: from.x + i * pitch, y: from.y + (i % 2 ? -height : 0) }, { x: from.x + (i + 1) * pitch, y: from.y + (i % 2 ? 0 : -height) }, 8))
  return out
}
const scribble = (c: Pt): Pt[] => {
  const out: Pt[] = []
  for (let i = 0; i < 10; i++) out.push(...line({ x: c.x - 40 + i * 8, y: c.y + (i % 2 ? 35 : -35) }, { x: c.x - 32 + i * 8, y: c.y + (i % 2 ? -35 : 35) }, 6))
  return out
}
const ring = (c: Pt, r: number): Pt[] => Array.from({ length: 61 }, (_, i) => ({ x: c.x + Math.cos((i / 60) * Math.PI * 1.97) * r, y: c.y + Math.sin((i / 60) * Math.PI * 1.97) * r }))
/** Draws a shape with the finger, a point every frame, and lifts. */
const draw = (toy: Toy, raw: Pt[], framesEach = 1) => {
  toy.press(raw[0])
  for (const p of raw.slice(1)) { toy.move(p); for (let i = 0; i < framesEach; i++) toy.step(DT) }
  toy.lift()
}
const tap = (toy: Toy, at: Pt) => { toy.press(at); toy.step(DT); toy.lift() }
/** Plays until the engine rests, and gives back every sound asked for on the way. */
const settle = (toy: Toy, seconds = 30): string[] => {
  for (let t = 0; t < seconds && (toy.journey.busy || toy.journey.moving || toy.company.playing || t < 0.1); t += DT) toy.step(DT)
  return heard(toy)
}
const heard = (toy: Toy): string[] => { const keys = toy.asked.map((a) => a.key as string); toy.asked = []; return keys }
const at = (toy: Toy): Pt => ({ x: toy.journey.pose.x, y: toy.journey.pose.y })
const rested = (toy: Toy) => expect(distance(at(toy), toy.world.train)).toBeLessThan(3)

describe('the finger lands', () => {
  it('is answered in the same call, before anything is known about the mark: a sound, dust, a line begun, and the engine looking', () => {
    const toy = fresh()
    toy.press({ x: 600, y: 300 })
    expect(heard(toy)).toEqual(['land-tar', 'toot'])
    expect(toy.bits.list.filter((b) => b.kind === 'dust').length).toBeGreaterThan(5)
    expect(toy.live?.p).toEqual([{ x: 600, y: 300 }])
    toy.step(DT)
    expect(toy.life.bearing.toot).toBeGreaterThan(0)
    expect(toy.life.bearing.eyeX).toBeGreaterThan(0.3)
  })

  it('is answered by what lies under it', () => {
    const sounds = (p: Pt) => { const toy = fresh(); toy.press(p); return heard(toy)[0] }
    expect(sounds({ x: PUDDLE.x, y: PUDDLE.y })).toBe('land-water')
    expect(sounds({ x: DANDELION.x, y: DANDELION.y - 30 })).toBe('land-weed')
    expect(sounds({ x: ENGINE_START.x, y: ENGINE_START.y - 60 })).toBe('land-engine')
    expect(sounds({ x: ENGINE_START.x + 20, y: ENGINE_START.y + 2 })).toBe('land-engine')
    expect(sounds({ x: 900, y: 300 })).toBe('land-tar')
  })

  it('is answered by an empty wagon with a knock and a hop of its own, and the tap is then a tap on the tar under it', () => {
    const toy = fresh()
    const wagon = toy.wagon(1), on = { x: wagon.x, y: wagon.y - WAGON_UP }
    toy.press(on)
    expect(heard(toy)).toEqual(['land-wagon', 'toot'])
    expect(toy.hops).toEqual([0, 1])
    toy.step(DT)
    expect(toy.hops[1]).toBeGreaterThan(0)
    expect(toy.hops[1]).toBeLessThan(1)
    toy.lift()
    // It is a tap on the tar like any other, which the train trundles to, and the hop is over well inside a second.
    expect(toy.world.marks.length).toBeGreaterThan(0)
    expect(toy.journey.busy).toBe(true)
    for (let t = 0; t < 0.5; t += DT) toy.step(DT)
    expect(toy.hops).toEqual([0, 0])
    // The other wagon answers a little higher, and the tar just beside a wagon is tar.
    settle(toy)
    for (let t = 0; t < 5; t += DT) toy.step(DT)
    heard(toy)
    const first = toy.wagon(0)
    toy.press({ x: first.x, y: first.y - WAGON_UP })
    expect(toy.asked[0]).toMatchObject({ key: 'land-wagon', pitch: 1 })
    toy.lift()
    settle(toy)
    for (let t = 0; t < 5; t += DT) toy.step(DT)
    heard(toy)
    toy.press({ x: toy.wagon(1).x, y: toy.wagon(1).y + 80 })
    expect(heard(toy)[0]).toBe('land-tar')
  })

  it('lays nothing for a palm: what landed is dropped, and the finger that draws next begins a mark of its own', () => {
    const toy = fresh(), had = toy.world.marks.length
    toy.press({ x: 900, y: 300 })
    // The engine sets off for where the palm landed while it rests there.
    for (let t = 0; t < 0.4; t += DT) toy.step(DT)
    expect(toy.journey.moving).toBe(true)
    toy.drop()
    expect(toy.drawing).toBe(false)
    expect(toy.live).toBeNull()
    expect(toy.world.marks).toHaveLength(had)
    // It stands where it had got to, and the world has it there.
    for (let t = 0; t < 1; t += DT) toy.step(DT)
    expect(toy.journey.busy).toBe(false)
    rested(toy)
    // The finger draws its line, and that line is the only mark.
    draw(toy, line({ x: 500, y: 520 }, { x: 800, y: 560 }))
    settle(toy)
    expect(toy.world.marks).toHaveLength(had + 1)
    expect(toy.world.marks[had].p.length).toBeGreaterThan(2)
  })

  it('is answered by the lamp of a stop, which lights up with a ting and dims again', () => {
    const toy = new Toy(freshWorld(null, 5), 5, true)
    tap(toy, { x: 600, y: 420 })
    settle(toy)
    const stop = toy.company.stage().stops[0]
    expect(stop).toBeDefined()
    heard(toy)
    toy.press(lampOf(stop))
    expect(heard(toy)).toEqual(['land-lamp', 'toot'])
    expect(toy.company.stage().stops[0].lit).toBe(1)
    toy.lift()
    for (let t = 0; t < 0.3; t += DT) toy.step(DT)
    expect(toy.company.stage().stops.find((s) => s.kind === stop.kind)?.lit).toBeGreaterThan(0)
    for (let t = 0; t < 0.7; t += DT) toy.step(DT)
    expect(toy.company.stage().stops.find((s) => s.kind === stop.kind)?.lit ?? 0).toBe(0)
    // The slab the rider stands on is no lamp.
    settle(toy)
    heard(toy)
    toy.press({ x: stop.x + 120, y: stop.y + 40 })
    expect(heard(toy)[0]).not.toBe('land-lamp')
  })
})

describe('a tap alone', () => {
  it('calls the engine: it trundles over the bare tar, slow and bumping, and sits on the dot with a hoot', () => {
    const toy = fresh()
    tap(toy, { x: 900, y: 300 })
    heard(toy)
    let top = 0
    for (let t = 0; t < 30 && toy.journey.busy; t += DT) { toy.step(DT); top = Math.max(top, toy.journey.pose.speed) }
    const sounds = heard(toy)
    expect(top).toBeLessThanOrEqual(PACE.tar)
    expect(PACE.tar).toBeLessThan(PACE.chalk * 0.6)
    expect(sounds.filter((s) => s === 'bump').length).toBeGreaterThanOrEqual(2)
    expect(sounds).toContain('tick-then-hoot')
    expect(distance(at(toy), { x: 900, y: 300 })).toBeLessThan(4)
    rested(toy)
    expect(toy.world.marks.length).toBe(2)
  })
})

describe('a line', () => {
  it('is ridden as it is drawn: the engine sets off before the finger lifts and never passes the chalk', () => {
    const toy = fresh()
    const raw = line({ x: 620, y: 460 }, { x: 1080, y: 440 }, 120)
    toy.press(raw[0])
    for (const p of raw.slice(1)) {
      toy.move(p)
      toy.step(DT)
      const pose = toy.journey.pose
      expect(pose.x).toBeLessThanOrEqual(Math.max(ENGINE_START.x, p.x - BEHIND_PEN + 14))
    }
    expect(toy.journey.pose.x).toBeGreaterThan(ENGINE_START.x + 100)
    expect(toy.journey.busy).toBe(true)
    toy.lift()
    const sounds = settle(toy)
    expect(Math.abs(toy.journey.pose.x - 1080)).toBeLessThan(8)
    rested(toy)
    expect(sounds).toContain('chuff')
    expect(sounds).toContain('brake')
    // It peers over the open end.
    toy.step(DT)
    expect(toy.life.bearing.lean).toBeGreaterThan(0)
  })

  it('gives a scrape while the chalk comes out, and sleepers a moment behind', () => {
    const toy = fresh()
    const raw = line({ x: 400, y: 300 }, { x: 800, y: 300 }, 60)
    toy.press(raw[0])
    heard(toy)
    for (const p of raw.slice(1)) { toy.move(p); toy.step(DT) }
    const sounds = heard(toy)
    expect(sounds.filter((s) => s === 'scrape').length).toBeGreaterThan(5)
    expect(sounds.filter((s) => s === 'sleeper').length).toBeGreaterThan(5)
    toy.lift()
  })

  it('is ridden with its form: a clack at each corner, a swoop and the cap off on a loop, a sneeze out of a scribble', () => {
    const corners = fresh()
    draw(corners, zigzag({ x: 640, y: 460 }))
    const zz = settle(corners)
    expect(zz.filter((s) => s === 'clack').length).toBe(4)
    expect(zz.filter((s) => s === 'hiccup-toots').length).toBe(4)

    const loops = fresh()
    const arc = Array.from({ length: 51 }, (_, i) => { const a = Math.PI / 4 - (Math.PI * 1.6 * i) / 50; return { x: 930 + Math.cos(a) * 113, y: 340 + Math.sin(a) * 113 } })
    draw(loops, [...line({ x: 560, y: 460 }, { x: 1010, y: 420 }, 14), ...arc, ...line({ x: 879, y: 441 }, { x: 1146, y: 576 }, 12)])
    let capOff = 0, upside = false
    for (let t = 0; t < 30 && loops.journey.busy; t += DT) {
      loops.step(DT)
      capOff = Math.max(capOff, loops.life.bearing.capOff)
      if (Math.cos(loops.journey.pose.angle) < -0.3) upside = true
    }
    expect(heard(loops)).toContain('swoop-whistle')
    expect(capOff).toBeGreaterThan(20)
    expect(upside).toBe(true)

    const tangle = fresh()
    draw(tangle, scribble({ x: 800, y: 280 }))
    let dusted = 0
    for (let t = 0; t < 30 && tangle.journey.busy; t += DT) { tangle.step(DT); dusted = Math.max(dusted, tangle.life.bearing.dusted) }
    expect(dusted).toBeGreaterThan(0.5)
    expect(heard(tangle)).toContain('engine-sneeze')
  })

  it('whistles on a long straight run', () => {
    const toy = fresh()
    draw(toy, line({ x: 560, y: 300 }, { x: 1150, y: 300 }))
    expect(settle(toy)).toContain('long-whistle')
  })

  it('that goes on and on becomes more than one mark, and the engine rides them all', () => {
    const toy = fresh()
    const long = [...line({ x: 220, y: 460 }, { x: 1100, y: 460 }, 100), ...line({ x: 1100, y: 460 }, { x: 1100, y: 100 }, 60), ...line({ x: 1100, y: 100 }, { x: 150, y: 100 }, 100), ...line({ x: 150, y: 100 }, { x: 150, y: 300 }, 30)]
    draw(toy, long)
    expect(toy.world.marks.length).toBeGreaterThan(2)
    settle(toy, 60)
    expect(distance(at(toy), { x: 150, y: 300 })).toBeLessThan(10)
    rested(toy)
  })
})

describe('the train at rest', () => {
  it('settles to a gentle tilt however steep the line ends, and stands as the line slopes again once it rides', () => {
    const toy = fresh()
    draw(toy, zigzag({ x: 640, y: 460 }))
    settle(toy)
    for (let i = 0; i < 60; i++) toy.step(DT)
    // The line ends steeply; the engine sits nearly level.
    expect(Math.abs(toy.journey.pose.angle)).toBeGreaterThan(0.8)
    expect(Math.abs(toy.engine.angle)).toBeLessThanOrEqual(0.2 + 1e-9)
    draw(toy, line({ x: 1000, y: 300 }, { x: 1000, y: 100 }, 20))
    let steep = 0
    for (let t = 0; t < 8; t += DT) { toy.step(DT); if (toy.journey.pose.speed > 100) steep = Math.max(steep, Math.abs(toy.engine.angle)) }
    expect(steep).toBeGreaterThan(1.2)
  })

  it('keeps its wagons coupled behind it and never in a heap, through a zigzag and at rest', () => {
    const toy = fresh()
    draw(toy, zigzag({ x: 640, y: 460 }))
    for (let t = 0; t < 12; t += DT) {
      toy.step(DT)
      const chain = [toy.journey.pose, toy.wagon(0), toy.wagon(1)]
      for (let i = 1; i < chain.length; i++) {
        const apart = distance(chain[i], chain[i - 1])
        expect(apart).toBeGreaterThan(110)
        expect(apart).toBeLessThan(COUPLINGS[i - 1] + 60)
      }
    }
  })
})

describe('chalk on the engine', () => {
  it('holds the engine still while the finger is on it, and answers a poke with a smoke ring', () => {
    const toy = fresh()
    const body = toy.body
    tap(toy, body)
    expect(heard(toy)).toContain('poot')
    for (let i = 0; i < 30; i++) toy.step(DT)
    expect(toy.bits.list.some((b) => b.kind === 'ring')).toBe(true)
    expect(at(toy)).toEqual({ x: ENGINE_START.x, y: ENGINE_START.y })
    expect(toy.world.marks.length).toBe(1)
  })

  it('stripes it with a zigzag, dusts it with a scribble and lassoes it with a ring, and it does not ride away', () => {
    const striped = fresh()
    draw(striped, zigzag({ x: striped.body.x - 90, y: striped.body.y + 40 }, 4, 45, 80))
    expect(heard(striped)).toContain('wheezy-steam-giggle')
    expect(striped.stripes).toBe(0)
    expect(striped.looksVersion).toBe(1)
    expect(at(striped)).toEqual({ x: ENGINE_START.x, y: ENGINE_START.y })

    const dusty = fresh()
    draw(dusty, scribble(dusty.body))
    expect(heard(dusty)).toContain('cough-puff')
    expect(at(dusty)).toEqual({ x: ENGINE_START.x, y: ENGINE_START.y })
    expect(dusty.world.marks.length).toBe(1)

    const lasso = fresh()
    const body = lasso.body
    expect(HOLD).toBeGreaterThan(120)
    draw(lasso, ring(body, 120))
    expect(heard(lasso)).toContain('kettle-whistle')
    expect(at(lasso)).toEqual({ x: ENGINE_START.x, y: ENGINE_START.y })
    lasso.step(DT)
    expect(lasso.life.bearing.dizzy).toBe(1)
    expect(lasso.world.marks.length).toBe(2)
  })

  it('pulls it away with a line that starts on it', () => {
    const toy = fresh()
    draw(toy, line(toy.body, { x: 700, y: 300 }, 60))
    const sounds = settle(toy)
    expect(sounds).toContain('screech')
    expect(distance(at(toy), { x: 700, y: 300 })).toBeLessThan(8)
  })

  it('keeps its stripes until it meets water, and loses them there and not before', () => {
    const toy = fresh()
    draw(toy, zigzag({ x: toy.body.x - 90, y: toy.body.y + 40 }, 4, 45, 80))
    draw(toy, line({ x: 240, y: 470 }, { x: 320, y: PUDDLE.y }, 30))
    settle(toy)
    expect(toy.stripes).toBe(0)
    heard(toy)
    toy.press({ x: 490, y: PUDDLE.y })
    for (const p of line({ x: 490, y: PUDDLE.y }, { x: 800, y: PUDDLE.y }, 60).slice(1)) toy.move(p)
    toy.lift()
    // The world already knows the stripes will be washed off; the engine is seen in them until it reaches the water.
    expect(toy.world.train.stripes).toBe(NONE)
    expect(toy.stripes).toBe(0)
    const sounds = settle(toy)
    expect(sounds).toContain('hiss')
    expect(toy.stripes).toBe(NONE)
    expect(toy.bits.list.some((b) => b.kind === 'print') || sounds.length > 0).toBe(true)
  })
})

describe('chalk on the water and the weed', () => {
  it('plops for a tap in the puddle and tints the water with a scribble, and neither calls the engine', () => {
    const toy = fresh()
    tap(toy, { x: PUDDLE.x + 30, y: PUDDLE.y })
    expect(heard(toy)).toContain('plop')
    expect(toy.bits.list.filter((b) => b.kind === 'ripple').length).toBeGreaterThanOrEqual(2)
    draw(toy, scribble({ x: PUDDLE.x, y: PUDDLE.y }))
    expect(heard(toy)).toContain('glug')
    expect(toy.world.water).not.toBe(NONE)
    settle(toy, 2)
    // It may have started toward the first chalk in the water; it has not been carried anywhere it did not ride.
    rested(toy)
    expect(toy.world.marks.length).toBe(1)
  })

  it('bursts the seed head with a tap, and the head grows back', () => {
    const toy = fresh()
    tap(toy, { x: DANDELION.x + 4, y: DANDELION.y - 50 })
    expect(heard(toy)).toContain('soft-puff')
    expect(toy.weed.seeds).toBe(0)
    expect(toy.bits.list.filter((b) => b.kind === 'seed').length).toBeGreaterThan(10)
    for (let t = 0; t < 3; t += DT) toy.step(DT)
    expect(toy.weed.seeds).toBe(1)
  })

  it('opens the flower inside a ring and gives the weed a tuft under a scribble', () => {
    const toy = fresh()
    draw(toy, ring({ x: DANDELION.x, y: DANDELION.y - 20 }, 80))
    expect(heard(toy)).toContain('petal-rustle')
    for (let t = 0; t < 1.5; t += DT) toy.step(DT)
    expect(toy.weed.bloom).toBe(1)
    const tufted = fresh()
    draw(tufted, scribble({ x: DANDELION.x, y: DANDELION.y - 28 }))
    expect(tufted.weed.tuft).toBe(true)
    expect(settle(tufted, 40)).toContain('muffled-toot')
  })
})

describe('chalk on a line already there', () => {
  it('calls the engine along the line with a tap, and it rings its bell there', () => {
    const toy = fresh()
    draw(toy, line({ x: 600, y: 300 }, { x: 1100, y: 300 }))
    settle(toy)
    heard(toy)
    tap(toy, { x: 800, y: 304 })
    const sounds = settle(toy)
    expect(sounds).toContain('bell')
    expect(sounds).not.toContain('bump')
    expect(Math.abs(toy.journey.pose.x - 800)).toBeLessThan(8)
    expect(toy.journey.pose.facing).toBe(-1)
  })

  it('clacks twice over a crossing', () => {
    const toy = fresh()
    draw(toy, line({ x: 600, y: 200 }, { x: 610, y: 700 }))
    settle(toy)
    draw(toy, line({ x: 620, y: 690 }, { x: 300, y: 400 }, 30))
    settle(toy)
    draw(toy, line({ x: 430, y: 330 }, { x: 1000, y: 380 }))
    expect(settle(toy)).toContain('double-clack')
  })
})

describe('found as left', () => {
  it('finishes the mark when the finger is taken away mid-line, and saves a world at rest', () => {
    const toy = fresh()
    const raw = line({ x: 300, y: 460 }, { x: 900, y: 300 }, 60)
    toy.press(raw[0])
    for (const p of raw.slice(1, 30)) { toy.move(p); toy.step(DT) }
    // Put away: the Mount ends the touch, and what is saved is the world.
    toy.lift()
    const saved = JSON.parse(JSON.stringify(serialize(toy.world)))
    const back = new Toy(deserialize(saved, null, 1, false), 9, false)
    expect(back.world).toEqual(toy.world)
    // Opened again, the engine stands where its ride comes to rest, and nothing replays.
    expect(at(back)).toEqual({ x: toy.world.train.x, y: toy.world.train.y })
    expect(back.journey.busy).toBe(false)
    expect(back.asked).toEqual([])
    expect(back.bits.list).toEqual([])
    expect(back.stripes).toBe(toy.world.train.stripes)
  })

  it('finishes a ride already begun before it starts the next, and comes to rest where the world says', () => {
    const toy = fresh()
    draw(toy, line({ x: 220, y: 460 }, { x: 900, y: 460 }))
    for (let i = 0; i < 20; i++) toy.step(DT)
    expect(toy.journey.busy).toBe(true)
    draw(toy, line({ x: 900, y: 440 }, { x: 900, y: 150 }, 30))
    settle(toy)
    expect(distance(at(toy), { x: 900, y: 150 })).toBeLessThan(8)
    rested(toy)
  })
})

describe('any play at all', () => {
  it('answers every landing with a sound, keeps every number sane, and always comes to rest where the world says', () => {
    for (const seed of [1, 2]) {
      const rng = makeRng(seed)
      const toy = fresh(seed)
      for (let i = 0; i < 110; i++) {
        const c = { x: between(rng, -30, TAR.w + 30), y: between(rng, -30, TAR.h + 30) }
        const shape = Math.floor(rng.next() * 6)
        const raw = shape === 0 ? [c] : shape === 1 ? line(at(toy), c, 20) : shape === 2 ? zigzag(c) : shape === 3 ? ring(c, between(rng, 40, 150)) : shape === 4 ? scribble(c) : line(c, { x: between(rng, 0, TAR.w), y: between(rng, 0, TAR.h) }, 20)
        toy.press(raw[0])
        expect(toy.asked.length).toBeGreaterThan(0)
        for (const p of raw.slice(1)) { toy.move(p); if (rng.next() < 0.5) toy.step(DT) }
        if (rng.next() < 0.8) toy.lift()
        const wait = Math.floor(between(rng, 0, 90))
        for (let f = 0; f < wait; f++) toy.step(DT)
        const pose = toy.journey.pose
        for (const value of [pose.x, pose.y, pose.angle, pose.speed, toy.bunch, toy.weed.bend, ...Object.values(toy.life.bearing)]) expect(Number.isFinite(value)).toBe(true)
        expect(pose.x >= -1 && pose.x <= TAR.w + 1 && pose.y >= -1 && pose.y <= TAR.h + 1).toBe(true)
        expect(toy.bits.list.length).toBeLessThanOrEqual(220)
        expect(toy.world.marks.length).toBeLessThanOrEqual(MAX_MARKS)
        expect(toy.world.riders).toEqual([])
        for (const asked of toy.asked) expect(asked.key in VOICES).toBe(true)
        toy.asked = []
      }
      toy.lift()
      settle(toy, 120)
      expect(toy.journey.busy).toBe(false)
      rested(toy)
      expect(deserialize(JSON.parse(JSON.stringify(serialize(toy.world))), null, 1, false)).toEqual(toy.world)
    }
    // A long scenario: its own time limit, so a busy machine does not fail it at the default.
  }, 30000)

  it('points to a bare spot ahead of the engine as the one thing to want', () => {
    const toy = fresh()
    const want = toy.want
    expect(want.x).toBeGreaterThan(ENGINE_START.x + 100)
    expect(want.y).toBeLessThanOrEqual(TAR.h - WRIST_STRIP)
    expect(inPuddle(want, 30)).toBe(false)
    draw(toy, line({ x: 220, y: 460 }, { x: 1150, y: 300 }))
    settle(toy)
    // At the edge it points back the way there is room.
    expect(toy.want.x).toBeLessThan(TAR.w - 80)
    expect(toy.want.x).toBeGreaterThan(80)
  })
})

describe('how it rides a bend and a slope', () => {
  /** How far the engine as seen leans from the way the rail has it, at the most, while it rides. */
  const leans = (toy: Toy): number => {
    let most = 0
    for (let t = 0; t < 30 && (toy.journey.busy || toy.journey.moving || t < 0.1); t += DT) {
      toy.step(DT)
      if (toy.journey.pose.speed > 1) most = Math.max(most, Math.abs(toy.engine.angle - toy.journey.pose.angle))
    }
    return most
  }

  it('leans into a bend, stands as the rail has it on a straight, and is upright again at rest', () => {
    const straight = fresh()
    draw(straight, line({ x: ENGINE_START.x + 40, y: ENGINE_START.y }, { x: 1000, y: ENGINE_START.y }))
    expect(leans(straight)).toBeLessThan(0.02)
    const round = fresh()
    draw(round, Array.from({ length: 41 }, (_, i) => ({ x: 700 + Math.cos(Math.PI / 2 - (i / 40) * Math.PI) * 160, y: 300 + Math.sin(Math.PI / 2 - (i / 40) * Math.PI) * 160 })))
    expect(leans(round)).toBeGreaterThan(0.05)
    for (let t = 0; t < 2; t += DT) round.step(DT)
    expect(Math.abs(round.engine.angle)).toBeLessThanOrEqual(0.21)
  })

  it('chuffs harder up a slope than on the flat: oftener and louder', () => {
    const chuffs = (to: Pt): { count: number; loud: number } => {
      const toy = fresh()
      draw(toy, line({ x: ENGINE_START.x + 40, y: ENGINE_START.y }, to))
      let count = 0, loud = 0
      for (let t = 0; t < 30 && (toy.journey.busy || toy.journey.moving || t < 0.1); t += DT) {
        toy.step(DT)
        for (const a of toy.asked) if (a.key === 'chuff') { count++; loud = Math.max(loud, a.level) }
        toy.asked = []
      }
      return { count, loud }
    }
    // Two lines of the same length: one flat, one climbing.
    const flat = chuffs({ x: ENGINE_START.x + 40 + 360, y: ENGINE_START.y }), up = chuffs({ x: ENGINE_START.x + 40 + 255, y: ENGINE_START.y - 255 })
    expect(up.count).toBeGreaterThan(flat.count)
    expect(up.loud).toBeGreaterThan(flat.loud)
  })
})

describe('wanting chalk', () => {
  it('leans at rest toward the nearest chalk it is not standing on, and toward the chalk under the finger', () => {
    const toy = fresh()
    for (let t = 0; t < 1; t += DT) toy.step(DT)
    // Its own stub of rail lies behind it.
    expect(toy.life.bearing.lean).toBeLessThan(-0.04)
    // A finger lands just ahead of its nose, near enough to hold it still: it leans that way while it watches.
    toy.press({ x: ENGINE_START.x + 120, y: ENGINE_START.y - 65 })
    for (let t = 0; t < 0.6; t += DT) toy.step(DT)
    expect(toy.life.bearing.lean).toBeGreaterThan(0.02)
    toy.lift()
  })
})
