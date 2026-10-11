import { describe, expect, it } from 'vitest'
import { Jar, MOST_SNACKS, SQUEEZE, STEP, THROWN, type JarEvent } from './jar'
import { ALL_KINDS, BREAD, CHEESE, CHILLI, EGG, ICE, JELLY, canJoin, radiusOf, type Kind } from './kinds'
import { JAR, JAR_MID } from './layout'
import { makeRng } from './rng'

const floorOf = (k: Kind): number => JAR.floor - radiusOf(k)
/** How deep two snacks of a pile at rest may lie in each other, in stage units: under a twentieth of the biggest snack's width. */
const DEEPEST_AT_REST = 5
/** And in motion, for a moment, where one lands on another. */
const DEEPEST_IN_MOTION = 8

function play(jar: Jar, seconds: number): JarEvent[] {
  const events: JarEvent[] = []
  for (let t = 0; t < seconds; t += 1 / 60) events.push(...jar.step(1 / 60))
  return events
}

/** Lets `kinds` go one after the other at the places given, each once the last has had a second. */
function pour(kinds: readonly Kind[], at: (i: number) => number): { jar: Jar; events: JarEvent[] } {
  const jar = new Jar()
  const events: JarEvent[] = []
  kinds.forEach((k, i) => {
    jar.drop(k, at(i), 150)
    events.push(...play(jar, 1))
  })
  events.push(...play(jar, 3))
  return { jar, events }
}

describe('the pile in the jar', () => {
  it('lets a snack fall to the floor, land once and lie still', () => {
    const jar = new Jar()
    jar.drop(BREAD, JAR_MID, 150)
    const events = play(jar, 2)
    expect(events.filter((e) => e.type === 'land')).toHaveLength(1)
    expect(jar.quiet).toBe(true)
    expect(jar.snacks[0].y).toBeCloseTo(floorOf(BREAD), 0)
    expect(jar.snacks[0].x).toBeCloseTo(JAR_MID, 0)
  })

  it('joins two different things that touch into the one snack that pair makes', () => {
    const { jar, events } = pour([BREAD, CHEESE], () => JAR_MID)
    const joins = events.filter((e) => e.type === 'join')
    expect(joins).toHaveLength(1)
    expect(joins[0]).toMatchObject({ a: BREAD, b: CHEESE, into: BREAD | CHEESE })
    expect(jar.snacks.map((s) => s.k)).toEqual([BREAD | CHEESE])
    expect(jar.snacks[0].r).toBe(radiusOf(BREAD | CHEESE))
  })

  it('goes on joining in a chain up to three things, and no further', () => {
    const { jar } = pour([BREAD, CHEESE, CHILLI, EGG], () => JAR_MID)
    expect(jar.snacks.map((s) => s.k).sort((a, b) => a - b)).toEqual([EGG, BREAD | CHEESE | CHILLI])
  })

  it('bumps two that cannot join, as the thing they share, and keeps both', () => {
    for (const [thing, k] of [[0, BREAD], [1, CHEESE], [2, EGG], [3, CHILLI], [4, JELLY], [5, ICE]] as const) {
      const { jar, events } = pour([k, k], () => JAR_MID)
      const bumps = events.filter((e) => e.type === 'bump')
      expect(bumps.length).toBeGreaterThanOrEqual(1)
      expect(bumps[0]).toMatchObject({ thing })
      expect(events.some((e) => e.type === 'join')).toBe(false)
      expect(jar.snacks).toHaveLength(2)
    }
  })

  it('slides an ice along the floor from where it lands until it meets something: the glass, or a snack in its way', () => {
    // Nothing in its way: it ends at the glass, on the side that had more room, the whole floor away if need be.
    for (const [x, wall] of [[JAR_MID - 60, JAR.right - radiusOf(ICE)], [JAR_MID + 60, JAR.left + radiusOf(ICE)], [JAR.left + 40, JAR.right - radiusOf(ICE)]] as const) {
      const jar = new Jar()
      const ice = jar.drop(ICE, x, 150)
      play(jar, 4)
      expect(jar.quiet).toBe(true)
      expect(Math.abs(ice.x - wall)).toBeLessThan(12)
      expect(ice.y).toBeCloseTo(JAR.floor - radiusOf(ICE), 0)
    }
    // An ice lies in its way: it clacks into it and stops there, well short of the glass.
    const jar = new Jar()
    const first = jar.drop(ICE, JAR_MID - 60, 150)
    play(jar, 4)
    const second = jar.drop(ICE, JAR_MID - 60, 150)
    const events = play(jar, 4)
    // It clacks into it like a billiard ball and off again, and lies still in the end, away from where it landed.
    expect(events.some((e) => e.type === 'bump' && e.thing === 5)).toBe(true)
    expect(jar.quiet).toBe(true)
    expect(Math.abs(second.x - (JAR_MID - 60))).toBeGreaterThan(60)
    expect(Math.abs(second.x - first.x)).toBeGreaterThanOrEqual(2 * radiusOf(ICE) - 5)
    // A bread stays where it lands.
    const still = new Jar()
    const bread = still.drop(BREAD, JAR_MID - 60, 150)
    play(still, 3)
    expect(Math.abs(bread.x - JAR_MID + 60)).toBeLessThan(4)
  })

  it('lets a cheese land, bounce once more, higher than anything else does, and stay down', () => {
    const rebounds = (k: Kind) => {
      const jar = new Jar()
      const snack = jar.drop(k, JAR_MID, 150)
      let ups = 0, lands = 0, highest = 0, was = snack.vy, landed = false
      for (let t = 0; t < 4; t += STEP) {
        lands += jar.step(STEP).filter((e) => e.type === 'land').length
        if (was > 0 && snack.vy < 0) {
          ups += 1
          landed = true
        }
        if (landed) highest = Math.max(highest, JAR.floor - snack.r - snack.y)
        was = snack.vy
      }
      expect(jar.quiet).toBe(true)
      return { ups, lands, highest }
    }
    const cheese = rebounds(CHEESE)
    expect(cheese.ups).toBe(1)
    // A boink where it lands and another where it comes down again.
    expect(cheese.lands).toBe(2)
    expect(cheese.highest).toBeGreaterThan(100)
    for (const k of [BREAD, EGG, CHILLI, JELLY, ICE]) {
      const other = rebounds(k)
      expect(other.ups).toBeLessThanOrEqual(1)
      expect(other.highest).toBeLessThan(cheese.highest / 2)
    }
  })

  it('draws every later bump as the thing it is too, never faster than the snack came, so the pile still comes to rest', () => {
    const again = (k: Kind) => {
      const jar = new Jar()
      const lying = jar.drop(k, JAR_MID, 150)
      play(jar, 2)
      const arrived = jar.drop(k, lying.x + 6, 150)
      play(jar, 3)
      expect(arrived.lively).toBe(false)
      // Lifted and let fall on it once more: its first bump is long spent.
      arrived.x = lying.x + 10
      arrived.y = lying.y - 2 * radiusOf(k) - 60
      arrived.vx = 0
      arrived.vy = 0
      arrived.asleep = false
      arrived.slow = 0
      const seen = { bumps: 0, bounces: 0, slip: 0, stick: 0, jumped: 0, off: 0, fastest: 0, came: 0 }
      for (let t = 0; t < 1; t += STEP) {
        const before = Math.hypot(arrived.vx, arrived.vy)
        const bumped = jar.step(STEP).filter((e) => e.type === 'bump').length
        if (bumped && seen.bumps === 0) {
          seen.came = before
          seen.off = Math.hypot(arrived.vx, arrived.vy)
          seen.bounces = arrived.bounces
          seen.slip = arrived.slip
          seen.stick = arrived.stick
          seen.jumped = -lying.vy
        }
        seen.bumps += bumped
        if (seen.bumps > 0) seen.fastest = Math.max(seen.fastest, Math.hypot(arrived.vx, arrived.vy))
      }
      play(jar, 4)
      expect(jar.quiet).toBe(true)
      expect(seen.bumps, `kind ${k}`).toBeGreaterThanOrEqual(1)
      expect(seen.off, `kind ${k}`).toBeLessThanOrEqual(seen.came)
      return seen
    }
    expect(again(CHEESE).bounces).toBeGreaterThanOrEqual(1)
    expect(again(CHEESE).off).toBeGreaterThan(100)
    expect(again(EGG).slip).toBeGreaterThan(0.2)
    expect(again(JELLY).stick).toBeGreaterThan(0.05)
    expect(again(CHILLI).jumped).toBeGreaterThan(100)
    expect(again(ICE).off).toBeGreaterThan(100)
  })

  it('squeezes two that can join together for a beat, and then pops them into one', () => {
    const jar = new Jar()
    const bread = jar.drop(BREAD, JAR_MID, 150)
    play(jar, 1.5)
    const cheese = jar.drop(CHEESE, JAR_MID + 10, JAR.floor - 2 * radiusOf(BREAD) - radiusOf(CHEESE) - 4)
    let squeezed = 0, deepest = 0, joinedAt = -1
    for (let n = 0; n < 120 && joinedAt < 0; n++) {
      const events = jar.step(STEP)
      if (events.some((e) => e.type === 'join')) joinedAt = n
      else if (bread.mate === cheese.id && cheese.mate === bread.id) {
        squeezed += 1
        deepest = Math.max(deepest, bread.r + cheese.r - Math.hypot(bread.x - cheese.x, bread.y - cheese.y))
        expect(cheese.squeeze).toBeLessThanOrEqual(SQUEEZE + STEP)
      }
    }
    // The beat is SQUEEZE long, they are held to each other through it, and neither goes into the other.
    expect(squeezed).toBeGreaterThanOrEqual(Math.floor(SQUEEZE / STEP))
    expect(squeezed).toBeLessThanOrEqual(Math.ceil(SQUEEZE / STEP) + 2)
    expect(deepest).toBeLessThan(DEEPEST_IN_MOTION)
    expect(joinedAt).toBeGreaterThan(0)
    expect(jar.snacks.map((s) => s.k)).toEqual([BREAD | CHEESE])
    expect(jar.snacks[0].mate).toBe(-1)
  })

  it('gives each thing its own bump', () => {
    const after = (k: Kind) => {
      const jar = new Jar()
      const lying = jar.drop(k, JAR_MID, 150)
      play(jar, 1.5)
      // On the one that lies there, wherever it came to lie: an ice has slid to the glass.
      const arrived = jar.drop(k, lying.x + 6, 150)
      const seen = { lie: 0, bounces: 0, slip: 0, stick: 0, shiver: 0, jumped: 0 }
      for (let t = 0; t < 1.2; t += STEP) {
        jar.step(STEP)
        const other = jar.snacks.find((s) => s !== arrived)!
        seen.lie = Math.max(seen.lie, Math.abs(arrived.lie))
        seen.bounces = Math.max(seen.bounces, arrived.bounces)
        seen.slip = Math.max(seen.slip, arrived.slip)
        seen.stick = Math.max(seen.stick, arrived.stick)
        seen.shiver = Math.max(seen.shiver, other.shiver)
        seen.jumped = Math.max(seen.jumped, -other.vy)
      }
      return seen
    }
    expect(after(BREAD).lie).toBeGreaterThan(1)
    expect(after(CHEESE).bounces).toBeGreaterThanOrEqual(1)
    expect(after(EGG).slip).toBeGreaterThan(0.5)
    expect(after(CHILLI).jumped).toBeGreaterThan(300)
    expect(after(JELLY).stick).toBeGreaterThan(0.1)
    expect(after(ICE).shiver).toBeGreaterThan(1)
  })

  it('keeps every snack inside the glass and no two deep in each other, whatever is poured in', () => {
    const kinds = Array.from({ length: 24 }, (_, i) => ALL_KINDS[(i * 7) % ALL_KINDS.length])
    const jar = new Jar()
    kinds.forEach((k, i) => {
      jar.drop(k, JAR.left + 50 + ((i * 97) % 280), 150)
      // What a full jar burps out leaves it by itself.
      for (let t = 0; t < 1.2; t += 1 / 60) jar.step(1 / 60)
    })
    play(jar, 3)
    for (const s of jar.snacks) {
      expect(Number.isFinite(s.x) && Number.isFinite(s.y)).toBe(true)
      expect(s.x - s.r).toBeGreaterThanOrEqual(JAR.left - 0.01)
      expect(s.x + s.r).toBeLessThanOrEqual(JAR.right + 0.01)
      expect(s.y + s.r).toBeLessThanOrEqual(JAR.floor + 0.01)
    }
    jar.rest()
    const snacks = jar.snacks
    for (let i = 0; i < snacks.length; i++) {
      for (let j = i + 1; j < snacks.length; j++) {
        const gap = Math.hypot(snacks[i].x - snacks[j].x, snacks[i].y - snacks[j].y) - snacks[i].r - snacks[j].r
        // A soft pile gives a little where it is wedged; nothing sits inside anything.
        expect(gap).toBeGreaterThan(-DEEPEST_AT_REST)
        // And no two that could join are left touching.
        if (canJoin(snacks[i].k, snacks[j].k)) expect(gap).toBeGreaterThan(-0.5)
      }
    }
  })

  it('lets no two snacks pass through each other in motion: every pair, every frame, over three seeded jars', () => {
    // Soft sweets give where they land, so a pair in motion may press a little deeper than one at rest: about
    // a tenth of the smallest snack's width. A snack through another would be a whole width. A new snack is
    // born no bigger than the room it has, and swells from there.
    let deepest = 0, frames = 0
    for (const seed of [1, 2, 3]) {
      const chance = makeRng(seed)
      const jar = new Jar()
      for (let n = 0; n < 30; n++) {
        const k = ALL_KINDS[Math.floor(chance.next() * 6) % 6 === 0 ? Math.floor(chance.next() * ALL_KINDS.length) : Math.floor(chance.next() * 6)]
        const r = radiusOf(k)
        jar.drop(k, JAR.left + r + 2 + chance.next() * (JAR.right - JAR.left - 2 * r - 4), 150)
        if (n % 9 === 8) jar.rock()
        for (let t = 0; t < 0.9; t += 1 / 60) {
          jar.step(1 / 60)
          frames += 1
          const snacks = jar.snacks
          for (let i = 0; i < snacks.length; i++) {
            expect(snacks[i].x - snacks[i].r).toBeGreaterThanOrEqual(JAR.left - 0.01)
            expect(snacks[i].x + snacks[i].r).toBeLessThanOrEqual(JAR.right + 0.01)
            expect(snacks[i].y + snacks[i].r).toBeLessThanOrEqual(JAR.floor + 0.01)
            for (let j = i + 1; j < snacks.length; j++) deepest = Math.max(deepest, snacks[i].r + snacks[j].r - Math.hypot(snacks[i].x - snacks[j].x, snacks[i].y - snacks[j].y))
          }
        }
      }
    }
    expect(frames).toBeGreaterThan(4000)
    expect(deepest).toBeLessThan(DEEPEST_IN_MOTION)
  })

  it('comes to lie still by itself', () => {
    const { jar } = pour(Array.from({ length: 14 }, () => BREAD), (i) => JAR.left + 50 + ((i * 97) % 280))
    expect(jar.quiet).toBe(true)
  })

  it('makes the same pile from the same let-goes, however the time is cut into frames', () => {
    const run = (frame: number) => {
      const jar = new Jar()
      const kinds = [BREAD, EGG, BREAD, CHILLI, JELLY, BREAD, ICE, CHEESE]
      kinds.forEach((k, i) => {
        jar.drop(k, JAR.left + 60 + ((i * 131) % 260), 150)
        for (let n = 0; n < Math.round(1.2 / frame); n++) jar.step(frame)
      })
      return jar.snacks.map((s) => [s.k, s.x.toFixed(3), s.y.toFixed(3)])
    }
    expect(run(STEP * 2)).toEqual(run(STEP * 2))
    expect(run(STEP)).toEqual(run(STEP * 4))
  })

  it('burps out the top layer in the step a snack comes to lie over the rim: at most four, the highest first', () => {
    const jar = new Jar()
    let burp: Extract<JarEvent, { type: 'burp' }> | undefined
    let before = 0
    for (let i = 0; i < MOST_SNACKS && !burp; i++) {
      jar.drop(BREAD, JAR.left + 50 + ((i * 97) % 280), 150)
      for (let t = 0; t < 1.4 && !burp; t += STEP) {
        before = jar.snacks.length
        burp = jar.step(STEP).find((e): e is Extract<JarEvent, { type: 'burp' }> => e.type === 'burp')
      }
    }
    expect(burp).toBeDefined()
    const thrown = burp!.thrown
    expect(thrown.length).toBeGreaterThan(0)
    expect(thrown.length).toBeLessThanOrEqual(THROWN)
    for (let i = 1; i < thrown.length; i++) expect(thrown[i].y).toBeGreaterThanOrEqual(thrown[i - 1].y)
    // They have left the jar already.
    expect(jar.snacks).toHaveLength(before - thrown.length)
    jar.rest()
    expect(jar.quiet).toBe(true)
    for (const s of jar.snacks) expect(s.y - s.r).toBeGreaterThanOrEqual(JAR.rim - 1)
  })

  it('throws one fewer when it is told to', () => {
    const jar = new Jar()
    jar.throws = THROWN - 1
    let most = 0
    for (let i = 0; i < MOST_SNACKS; i++) {
      jar.drop(BREAD, JAR.left + 50 + ((i * 97) % 280), 150)
      for (const event of play(jar, 1.4)) if (event.type === 'burp') most = Math.max(most, event.thrown.length)
    }
    expect(most).toBe(THROWN - 1)
  })

  it('burps for a snack that was set down gently on a pile that reaches the claw', () => {
    const jar = new Jar()
    const r = radiusOf(BREAD)
    // A column of bread up to the rim, and one more let go right on top of it, with no fall at all.
    for (let y = JAR.floor - r; y - r > JAR.rim - 2 * r; y -= 2 * r) jar.lay(BREAD, JAR_MID, y)
    const top = Math.min(...jar.snacks.map((s) => s.y))
    jar.drop(BREAD, JAR_MID, top - 2 * r + 1)
    expect(play(jar, 2).some((e) => e.type === 'burp')).toBe(true)
  })

  it('comes to rest in a copy exactly as it does on screen, burps and joins included', () => {
    const kinds = Array.from({ length: 30 }, (_, i) => ALL_KINDS[(i * 11) % ALL_KINDS.length])
    const jar = new Jar()
    kinds.forEach((k, i) => {
      jar.drop(k, JAR.left + 50 + ((i * 97) % 280), 150)
      // The copy is made at the let-go and played on by itself.
      const copy = jar.clone()
      const ahead = copy.rest()
      const live: JarEvent[] = []
      for (let n = 0; n < 6000 && !jar.quiet; n++) live.push(...jar.step(i % 2 ? 1 / 60 : 1 / 37))
      expect(jar.quiet).toBe(true)
      expect(jar.snacks.map((s) => [s.k, s.x, s.y])).toEqual(copy.snacks.map((s) => [s.k, s.x, s.y]))
      expect(live.filter((e) => e.type === 'burp')).toEqual(ahead.filter((e) => e.type === 'burp'))
    })
  }, 30000)

  it('does not burp while nothing reaches the rim, or for a snack that is still falling', () => {
    const jar = new Jar()
    jar.drop(BREAD, JAR_MID, 150)
    expect(jar.over()).toEqual([])
    expect(play(jar, 2).some((e) => e.type === 'burp')).toBe(false)
  })

  it('rocks at a knock on the handle and comes to rest again with nothing lost', () => {
    const { jar } = pour([ICE, ICE, ICE, ICE], (i) => JAR.left + 60 + i * 80)
    const kinds = jar.snacks.map((s) => s.k).sort()
    jar.rock()
    expect(jar.quiet).toBe(false)
    play(jar, 4)
    expect(jar.quiet).toBe(true)
    expect(jar.snacks.map((s) => s.k).sort()).toEqual(kinds)
  })

  it('plays a copy on without touching the pile it was copied from', () => {
    const jar = new Jar()
    jar.drop(BREAD, JAR_MID, 150)
    const copy = jar.clone()
    copy.rest()
    expect(copy.quiet).toBe(true)
    expect(jar.snacks[0].y).toBe(150)
    expect(jar.quiet).toBe(false)
  })

  it('lays a saved snack down asleep where it lay', () => {
    const jar = new Jar()
    jar.lay(BREAD | EGG, 500, floorOf(BREAD | EGG))
    expect(jar.quiet).toBe(true)
    expect(jar.step(0.5)).toEqual([])
    expect(jar.snacks[0]).toMatchObject({ x: 500, y: floorOf(BREAD | EGG) })
  })
})
