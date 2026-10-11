import { ICE, bumpThing, canJoin, join, mannerOf, radiusOf, type Kind } from './kinds'
import { JAR, JAR_MID } from './layout'

// The pile in the jar: round soft bodies under gravity between two walls and a
// floor, stepped at a fixed rate on game time alone, with no chance in it, so
// the same let-go always gives the same pile. Bodies are pushed apart by
// position and never gain speed from an overlap, so a pile is squashy and
// never bursts. Two that touch join by the one rule in kinds.ts; two that
// cannot join bump as the thing they share (ART.md, the grid's third column).
// A pile that stands over the rim burps its top layer out, here, in the step
// where it comes to stand so: the pile on screen and the pile a save works out
// ahead are then the same steps of the same rules, and end the same.
// Pure: no drawing and no sound. What happened in a step is handed back as
// events, and the game turns those into sound and dust.

export type Mood = 'calm' | 'shut' | 'glee' | 'squeezed' | 'yawn'

export type Snack = {
  id: number
  k: Kind
  x: number
  y: number
  vx: number
  vy: number
  /** Its radius now, which grows to `full` after a join. */
  r: number
  full: number
  /** How it is turned, and the turn it eases to when it lies still: 0 is upright. */
  ang: number
  lie: number
  /** The squash spring: above 0 it is flatter and wider. */
  sq: number
  sqv: number
  /** The pop spring of a snack that has just been made: above 0 it is bigger than its size. */
  pop: number
  popv: number
  /** The wobble spring of anything with jelly in it. */
  wob: number
  wobv: number
  /** Seconds of shivering left. */
  shiver: number
  mood: Mood
  moodFor: number
  asleep: boolean
  /** Seconds it has been slow, on the way to sleep. */
  slow: number
  /** Let go and not landed yet. */
  fresh: boolean
  /** Let go or just made, and not yet bumped: its first bump throws it about as the thing it is, and later ones do not, so a pile comes to rest. */
  lively: boolean
  /** Seconds before it may join, so the pop that made it is seen. */
  lock: number
  /** Lively bounces it still has (cheese), seconds without grip (egg), seconds held fast (jelly). */
  bounces: number
  slip: number
  stick: number
  /** Seconds it has been squeezed against the one it is about to join, and that one's id (or -1). */
  squeeze: number
  mate: number
  /** How fast it comes off the one it stuck to (jelly). */
  peel: number
  /** How often it has come back up off the floor since it last lay still: once, and the next landing holds it. */
  hops: number
}

export type JarEvent =
  | { type: 'land'; k: Kind; x: number; y: number; speed: number }
  | { type: 'bump'; thing: number; arrived: Kind; other: Kind; x: number; y: number; speed: number }
  | { type: 'join'; a: Kind; b: Kind; into: Kind; x: number; y: number }
  /** The jar was too full: these snacks left it, the highest first, from where they lay. */
  | { type: 'burp'; thrown: { k: Kind; x: number; y: number }[] }

export const GRAVITY = 2400
export const STEP = 1 / 120
const ITERATIONS = 4
/** The radius a new snack is born with at least, however little room it has. */
const SMALLEST_BORN = 26
const STIFF = 0.8
/** Stage units a second that a new snack's radius grows by. */
const GROW = 130
/** A closing speed under this is a resting contact and does not bounce. */
const REST_SPEED = 90
/** A first touch at this speed or over is a bump the child hears. */
const BUMP_SPEED = 150
const SLEEP_SPEED = 36
const SLEEP_AFTER = 0.35
/** How long two that can join squeeze together before they pop into one, in seconds. */
export const SQUEEZE = 0.14
/** How fast a thing with ice in it sets off along the floor where it lands, for one that is all ice. */
export const ICE_SLIDE = 300
/** A sleeper wakes when something closes on it this fast; a knock this hard wakes the pile. */
const WAKE_SPEED = 60
const STIR_SPEED = 140
/** Seconds a snack lies slow above the rim before the jar burps. */
const OVER_AFTER = 0.2
/** A pile that has not come to rest this long after it was last disturbed is laid to rest. */
const UNREST = 8
/** The most snacks a jar holds. More than fit under the rim are burped out long before this. */
export const MOST_SNACKS = 40
/** A burp throws out the snacks whose middle lies within this of the rim, at most `THROWN`. */
const TOP_LAYER = 150
export const THROWN = 4

export class Jar {
  snacks: Snack[] = []
  private nextId = 1
  private carry = 0
  private touching = new Set<number>()
  /** The most snacks one burp throws out. */
  throws = THROWN
  /** A rock of the jar still to come back: seconds until the push the other way. */
  private sloshBack = 0
  /** Seconds the pile has been shifting since it was last disturbed. */
  private unrest = 0

  /** Puts a snack in the jar as it lies, asleep: how a saved pile comes back. */
  lay(k: Kind, x: number, y: number): Snack {
    const snack = this.make(k, x, y)
    snack.asleep = true
    return snack
  }

  /** Lets a snack go at `x`, `y`: it falls from there. */
  drop(k: Kind, x: number, y: number): Snack {
    const snack = this.make(k, x, y)
    snack.fresh = true
    snack.lively = true
    snack.mood = 'glee'
    snack.moodFor = 2
    this.unrest = 0
    return snack
  }

  private make(k: Kind, x: number, y: number): Snack {
    const r = radiusOf(k)
    const snack: Snack = { id: this.nextId++, k, x: clamp(x, JAR.left + r, JAR.right - r), y: Math.min(y, JAR.floor - r), vx: 0, vy: 0, r, full: r, ang: 0, lie: 0, sq: 0, sqv: 0, pop: 0, popv: 0, wob: 0, wobv: 0, shiver: 0, mood: 'calm', moodFor: 0, asleep: false, slow: 0, fresh: false, lively: false, lock: 0, bounces: 0, slip: 0, stick: 0, squeeze: 0, mate: -1, peel: 190, hops: 0 }
    this.snacks.push(snack)
    return snack
  }

  /** A copy that plays on by itself, for working out how the pile comes to rest. */
  clone(): Jar {
    const copy = new Jar()
    copy.snacks = this.snacks.map((s) => ({ ...s }))
    copy.nextId = this.nextId
    copy.carry = this.carry
    copy.sloshBack = this.sloshBack
    copy.unrest = this.unrest
    copy.throws = this.throws
    copy.touching = new Set(this.touching)
    return copy
  }

  /** Every snack lies still. */
  get quiet(): boolean {
    return this.snacks.every((s) => s.asleep)
  }

  wake(): void {
    for (const s of this.snacks) {
      s.asleep = false
      s.slow = 0
    }
  }

  /** A knock on the handle: everything sloshes towards the handle and back. */
  rock(): void {
    this.wake()
    for (const s of this.snacks) {
      s.vx -= 210
      s.vy -= 70
      s.wobv += 5
    }
    this.sloshBack = 0.26
    this.unrest = 0
  }

  /** Plays `seconds` of game time in fixed steps and hands back what happened. */
  step(seconds: number): JarEvent[] {
    const events: JarEvent[] = []
    this.carry += seconds
    let steps = 0
    while (this.carry >= STEP && steps < 12) {
      this.sub(STEP, events)
      this.carry -= STEP
      steps += 1
    }
    if (steps === 12) this.carry = 0
    return events
  }

  /**
   * Plays on until the pile lies still, for a save: nothing is saved in the air. These are the steps the pile
   * on screen takes too, burps included, so it ends as this one does. Hands back what happened.
   */
  rest(): JarEvent[] {
    const events: JarEvent[] = []
    for (let t = 0; t < 40 && !this.quiet; t += STEP) this.sub(STEP, events)
    this.carry = 0
    return events
  }

  /**
   * The snacks a full jar burps out: none unless a snack has come to lie with its top above the rim, and then
   * the top layer, the highest first. The pile under it need not lie still, so a child who keeps letting go
   * cannot heap the jar higher than its rim.
   */
  over(): Snack[] {
    if (!this.snacks.some((s) => !s.fresh && s.y - s.r < JAR.rim - 1 && (s.asleep || s.slow >= OVER_AFTER))) return []
    return this.snacks.filter((s) => s.y < JAR.rim + TOP_LAYER).sort((a, b) => a.y - b.y || a.id - b.id).slice(0, this.throws)
  }

  remove(gone: readonly Snack[]): void {
    this.snacks = this.snacks.filter((s) => !gone.includes(s))
    this.wake()
    this.unrest = 0
  }

  /** Takes every snack out of the jar, as a tip does, and hands them back. */
  empty(): Snack[] {
    const all = this.snacks
    this.snacks = []
    this.touching.clear()
    return all
  }

  private sub(h: number, events: JarEvent[]): void {
    if (this.sloshBack > 0) {
      this.sloshBack -= h
      if (this.sloshBack <= 0) for (const s of this.snacks) s.vx += 250
    }
    for (const s of this.snacks) {
      const manner = mannerOf(s.k)
      if (s.r < s.full) s.r = Math.min(s.full, s.r + GROW * h)
      s.sqv += (-manner.squashStiff * s.sq - manner.squashDamp * s.sqv) * h
      s.sq += s.sqv * h
      s.popv += (-260 * s.pop - 13 * s.popv) * h
      s.pop += s.popv * h
      s.wobv += (-190 * s.wob - (5.5 - 4.3 * manner.wobble) * s.wobv) * h
      s.wob += s.wobv * h
      if (s.shiver > 0) s.shiver -= h
      if (s.lock > 0) s.lock -= h
      if (s.slip > 0) s.slip -= h
      if (s.moodFor > 0) {
        s.moodFor -= h
        if (s.moodFor <= 0) {
          // The yawn is over: a bread that flopped sits up again.
          if (s.mood === 'yawn') s.lie = 0
          s.mood = 'calm'
        }
      }
      if (s.stick > 0) {
        s.stick -= h
        if (s.stick > 0) continue
        // Peels off with a pop.
        s.vy = -s.peel
        s.wobv += 7
      }
      // A snack lying still eases upright, or onto the side it flopped on.
      const turn = Math.atan2(Math.sin(s.lie - s.ang), Math.cos(s.lie - s.ang))
      if (s.asleep) {
        s.ang += turn * Math.min(1, 5 * h)
        continue
      }
      s.vy += GRAVITY * h
      s.x += s.vx * h
      s.y += s.vy * h
      if (Math.abs(s.vx) + Math.abs(s.vy) < 120) s.ang += turn * Math.min(1, 5 * h)
    }

    const touching = new Set<number>()
    let joined: [Snack, Snack] | null = null
    let stirred = false
    const met = new Set<Snack>()
    const pressed = new Set<Snack>()
    for (let iteration = 0; iteration < ITERATIONS; iteration++) {
      const snacks = this.snacks
      for (let i = 0; i < snacks.length; i++) {
        const a = snacks[i]
        for (let j = i + 1; j < snacks.length; j++) {
          const b = snacks[j]
          // Two that both lie still stay as they lie.
          if (a.asleep && b.asleep) continue
          const dx = b.x - a.x, dy = b.y - a.y
          // Two that are squeezing together are held to each other, a hair's breadth included.
          const mates = a.mate === b.id && b.mate === a.id
          const sum = a.r + b.r
          const near = sum + (mates ? 3 : 0)
          if (Math.abs(dx) >= near || Math.abs(dy) >= near) continue
          const d2 = dx * dx + dy * dy
          if (d2 >= near * near) continue
          const mayJoin = canJoin(a.k, b.k)
          let squeezing = false
          if (mayJoin && a.lock <= 0 && b.lock <= 0 && a.stick <= 0 && b.stick <= 0) {
            // Two that can join squeeze together for a beat, and then pop into one.
            if (a.mate < 0 && b.mate < 0) {
              a.mate = b.id
              b.mate = a.id
              a.squeeze = 0
              b.squeeze = 0
            }
            if (a.mate === b.id && b.mate === a.id) {
              if (a.squeeze >= SQUEEZE) {
                joined ??= [a, b]
                continue
              }
              squeezing = true
              pressed.add(a)
              pressed.add(b)
              a.asleep = false
              b.asleep = false
            }
          }
          const d = Math.sqrt(d2)
          const nx = d > 0.001 ? dx / d : 0, ny = d > 0.001 ? dy / d : -1
          const closing = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny
          if (closing < -WAKE_SPEED) {
            // What rests on a sleeper that is knocked aside must fall too, so a real knock stirs the whole pile.
            if ((a.asleep || b.asleep) && closing < -STIR_SPEED) stirred = true
            a.asleep = false
            b.asleep = false
          }
          // A new snack that swells shoves its neighbours: one it presses on cannot sleep through it.
          if ((a.asleep || b.asleep) && (a.r < a.full || b.r < b.full) && sum - Math.sqrt(d2) > 2) {
            stirred = true
            a.asleep = false
            b.asleep = false
          }
          const key = a.id * 65536 + b.id
          touching.add(key)
          if (a.fresh) met.add(a)
          if (b.fresh) met.add(b)
          const first = iteration === 0 && !this.touching.has(key)
          if (a.stick > 0 || b.stick > 0) continue
          const wa = a.asleep ? 0 : 1 / (a.r * a.r), wb = b.asleep ? 0 : 1 / (b.r * b.r)
          if (wa + wb === 0) continue
          const push = ((sum - d) * STIFF) / (wa + wb)
          a.x -= nx * push * wa
          a.y -= ny * push * wa
          b.x += nx * push * wb
          b.y += ny * push * wb
          if (squeezing) {
            // They go on as one: neither bounces off the other.
            const ma = a.r * a.r, mb = b.r * b.r
            const vx = (a.vx * ma + b.vx * mb) / (ma + mb), vy = (a.vy * ma + b.vy * mb) / (ma + mb)
            a.vx = b.vx = vx
            a.vy = b.vy = vy
            continue
          }
          // Two that lean on each other rub: what holds well soon stands still, and even ice does in the end.
          if (iteration === 0 && closing > -REST_SPEED && closing < REST_SPEED) {
            if (wa > 0) {
              const keep = 1 - (0.1 + 0.25 * mannerOf(a.k).grip)
              a.vx *= keep
              a.vy *= keep
            }
            if (wb > 0) {
              const keep = 1 - (0.1 + 0.25 * mannerOf(b.k).grip)
              b.vx *= keep
              b.vy *= keep
            }
          }
          if (closing >= 0) continue
          const speed = -closing
          const lively = a.bounces > 0 || b.bounces > 0
          const bounce = speed < REST_SPEED ? 0 : lively ? 0.8 : (mannerOf(a.k).bounce + mannerOf(b.k).bounce) / 2
          // Which of the two came to the other: the faster one, as they were before they met.
          const aFaster = a.vx * a.vx + a.vy * a.vy > b.vx * b.vx + b.vy * b.vy || a.fresh
          const impulse = ((1 + bounce) * speed) / (wa + wb)
          a.vx -= nx * impulse * wa
          a.vy -= ny * impulse * wa
          b.vx += nx * impulse * wb
          b.vy += ny * impulse * wb
          if (first && speed >= BUMP_SPEED && !mayJoin) {
            if (a.bounces > 0) a.bounces -= 1
            if (b.bounces > 0) b.bounces -= 1
            const arrived = b.fresh || !aFaster ? b : a
            const other = arrived === a ? b : a
            this.bump(arrived, other, speed, events)
          }
        }
      }
      for (const s of snacks) this.walls(s, iteration === 0, events)
    }
    this.touching = touching
    // A snack that has touched another is no longer falling, however gently it was set down.
    for (const s of met) s.fresh = false
    if (stirred) this.wake()
    for (const s of this.snacks) {
      if (s.mate < 0) continue
      if (pressed.has(s)) s.squeeze += h
      else {
        s.squeeze = 0
        s.mate = -1
      }
    }

    if (joined) this.join(joined[0], joined[1], events)

    for (const s of this.snacks) {
      if (s.asleep || s.stick > 0 || s.mate >= 0) continue
      if (s.vx * s.vx + s.vy * s.vy < SLEEP_SPEED * SLEEP_SPEED && s.r >= s.full) {
        s.slow += h
        if (s.slow >= SLEEP_AFTER) {
          s.asleep = true
          s.hops = 0
          s.vx = 0
          s.vy = 0
        }
      } else s.slow = 0
    }

    // A pile that will not settle is laid to rest where it is, eased apart first so nothing is left wedged deep.
    if (this.quiet) this.unrest = 0
    else {
      this.unrest += h
      if (this.unrest >= UNREST) {
        this.unrest = 0
        this.settle()
      }
    }

    // A jar that stands over its rim burps its top layer out, here and now.
    const over = this.over()
    if (over.length > 0) {
      events.push({ type: 'burp', thrown: over.map((s) => ({ k: s.k, x: s.x, y: s.y })) })
      this.remove(over)
    }
  }

  /** Lays the whole pile to rest: every snack full grown, pushed clear of its neighbours and the glass, asleep. */
  private settle(): void {
    for (const s of this.snacks) {
      s.r = s.full
      s.stick = 0
      s.fresh = false
    }
    for (let round = 0; round < 24; round++) {
      const snacks = this.snacks
      for (let i = 0; i < snacks.length; i++) {
        const a = snacks[i]
        for (let j = i + 1; j < snacks.length; j++) {
          const b = snacks[j]
          const dx = b.x - a.x, dy = b.y - a.y
          const sum = a.r + b.r
          const d = Math.hypot(dx, dy)
          if (d >= sum) continue
          const nx = d > 0.001 ? dx / d : 0, ny = d > 0.001 ? dy / d : -1
          const wa = 1 / (a.r * a.r), wb = 1 / (b.r * b.r)
          const push = ((sum - d) * 0.5) / (wa + wb)
          a.x -= nx * push * wa
          a.y -= ny * push * wa
          b.x += nx * push * wb
          b.y += ny * push * wb
        }
      }
      for (const s of snacks) {
        s.x = clamp(s.x, JAR.left + s.r, JAR.right - s.r)
        s.y = Math.min(s.y, JAR.floor - s.r)
      }
    }
    for (const s of this.snacks) {
      s.asleep = true
      s.slow = 0
      s.vx = 0
      s.vy = 0
    }
  }

  private walls(s: Snack, first: boolean, events: JarEvent[]): void {
    if (s.asleep) {
      // A sleeper that a growing neighbour pushed stays inside all the same.
      s.x = clamp(s.x, JAR.left + s.r, JAR.right - s.r)
      s.y = Math.min(s.y, JAR.floor - s.r)
      return
    }
    const manner = mannerOf(s.k)
    const bounce = s.bounces > 0 ? 0.8 : manner.bounce
    if (s.x - s.r < JAR.left) {
      s.x = JAR.left + s.r
      if (s.vx < 0) s.vx = -s.vx < REST_SPEED ? 0 : -s.vx * bounce
    } else if (s.x + s.r > JAR.right) {
      s.x = JAR.right - s.r
      if (s.vx > 0) s.vx = s.vx < REST_SPEED ? 0 : -s.vx * bounce
    }
    if (s.y + s.r >= JAR.floor) {
      s.y = JAR.floor - s.r
      if (s.vy > 0) {
        const speed = s.vy
        // It comes back up off the floor once (the cheese highest of all), and its next landing holds it.
        // One thrown off another like a rubber ball (`bounces`) keeps its bounces.
        const up = s.bounces > 0 ? bounce : s.hops > 0 ? 0 : bounce
        s.vy = speed < REST_SPEED ? 0 : -speed * up
        if (speed >= REST_SPEED && s.bounces <= 0) s.hops += 1
        if (first && (s.fresh || speed > 320)) {
          events.push({ type: 'land', k: s.k, x: s.x, y: JAR.floor, speed })
          s.sqv += manner.squash * Math.min(1, speed / 900) * 26
          s.wobv += 9 * Math.min(1, speed / 900)
          if (s.fresh) {
            s.mood = 'shut'
            s.moodFor = 0.35
            // Ice lands and slides along the floor until it meets something: the way it was going, or
            // towards the side with more room.
            if (s.k & ICE) {
              const way = Math.abs(s.vx) > 20 ? Math.sign(s.vx) : s.x < JAR_MID ? 1 : -1
              s.vx = way * Math.max(Math.abs(s.vx), ICE_SLIDE * (1 - manner.grip))
            }
          }
          s.fresh = false
          if (s.bounces > 0) s.bounces -= 1
        }
      }
      if (first) s.fresh = false
      // The floor holds what stands on it, and lets ice slide: while a thing with ice in it is sliding fast,
      // the floor hardly slows it, so an ice crosses the whole jar if nothing is in its way.
      const hold = manner.grip * (s.k & ICE && Math.abs(s.vx) > REST_SPEED ? 0.1 : 1)
      if (s.slip <= 0) s.vx -= s.vx * Math.min(1, hold * 9 * STEP)
      // What rolls along the floor turns as it goes; an egg that slips does not.
      if (s.slip <= 0 && manner.grip > 0.2) s.ang += (s.vx / s.r) * STEP * 0.25
      if (Math.abs(s.vx) > 90) s.lie = 0
    }
  }

  /** Two that cannot join met: the answer of the thing they share, on the model's side (ART.md, the third column). */
  private bump(arrived: Snack, other: Snack, speed: number, events: JarEvent[]): void {
    const thing = bumpThing(arrived.k, other.k)
    const dx = arrived.x - other.x, dy = arrived.y - other.y
    const d = Math.hypot(dx, dy) || 1
    const ax = dx / d, ay = dy / d
    const side = dx > 0 || (dx === 0 && arrived.id % 2 === 0) ? 1 : -1
    const kick = Math.min(1, speed / 900)
    arrived.sqv += mannerOf(arrived.k).squash * kick * 22
    other.sqv += mannerOf(other.k).squash * kick * 16
    arrived.wobv += 8 * kick
    other.wobv += 8 * kick
    arrived.fresh = false
    other.asleep = false
    // Every bump is drawn as the thing it is. The first one after a let-go throws the snack about at full
    // strength; a later one moves it with no more than the speed it came with, so each is weaker than the
    // last and the pile comes to rest.
    const thrown = arrived.lively
    arrived.lively = false
    switch (thing) {
      case 0:
        // Bread: like pillows, and the one that arrived flops onto its side and yawns.
        arrived.lie = side * 1.35
        arrived.mood = 'yawn'
        arrived.moodFor = 1.6
        break
      case 1:
        // Cheese: off it goes like a rubber ball, twice.
        if (!thrown) {
          arrived.bounces = 1
          arrived.vx = ax * speed * 0.7
          arrived.vy = ay * speed * 0.7
          break
        }
        arrived.bounces = 2
        arrived.vx = ax * Math.max(speed * 0.8, 330)
        arrived.vy = ay * Math.max(speed * 0.8, 330) - 140
        break
      case 2:
        // Egg: slips off like wet soap.
        if (!thrown) {
          arrived.slip = 0.4
          arrived.vx = side * speed * 0.6
          arrived.vy *= 0.2
          break
        }
        arrived.slip = 0.7
        arrived.vx += side * 300
        arrived.vy *= 0.2
        break
      case 3:
        // Chilli: the one it touched jumps, and the chilli hops clear of it and sniggers.
        other.mood = 'squeezed'
        other.moodFor = 0.9
        arrived.mood = 'glee'
        arrived.moodFor = 0.9
        if (!thrown) {
          other.vy = Math.min(other.vy, -speed * 0.5)
          arrived.vy = Math.min(arrived.vy, -speed * 0.6)
          break
        }
        other.vy = -470
        arrived.vy = Math.min(arrived.vy, -620)
        arrived.vx += side * 60
        break
      case 4:
        // Jelly: sticks for a moment, then peels off with a pop.
        arrived.wobv += 6
        other.wobv += 6
        arrived.stick = thrown ? 0.2 : 0.12
        arrived.peel = thrown ? 190 : Math.min(190, speed * 0.6)
        arrived.vx = 0
        arrived.vy = 0
        break
      default:
        // Ice: clacks off, and the one it struck shivers.
        other.shiver = 1.2
        other.mood = 'squeezed'
        other.moodFor = 1.2
        arrived.vx = ax * (thrown ? Math.max(speed * 0.7, 250) : speed * 0.6)
        arrived.vy = ay * (thrown ? Math.max(speed * 0.7, 250) : speed * 0.6)
    }
    events.push({ type: 'bump', thing, arrived: arrived.k, other: other.k, x: (arrived.x + other.x) / 2, y: (arrived.y + other.y) / 2, speed })
  }

  private join(a: Snack, b: Snack, events: JarEvent[]): void {
    const ma = a.r * a.r, mb = b.r * b.r
    const k = join(a.k, b.k)
    this.snacks = this.snacks.filter((s) => s !== a && s !== b)
    const made = this.make(k, (a.x * ma + b.x * mb) / (ma + mb), (a.y * ma + b.y * mb) / (ma + mb))
    // It starts no bigger than the room it has, so it is never born inside a neighbour, and swells from there.
    let room = Math.min(Math.max(a.r, b.r), made.x - JAR.left, JAR.right - made.x, JAR.floor - made.y)
    for (const s of this.snacks) if (s !== made) room = Math.min(room, Math.hypot(s.x - made.x, s.y - made.y) - s.r)
    made.r = Math.max(SMALLEST_BORN, room)
    made.vx = ((a.vx * ma + b.vx * mb) / (ma + mb)) * 0.4
    made.vy = ((a.vy * ma + b.vy * mb) / (ma + mb)) * 0.4 - 130
    made.popv = 6.5
    made.wobv = 9
    made.lock = 0.2
    made.mood = 'glee'
    made.moodFor = 1
    made.lively = true
    this.wake()
    this.unrest = 0
    events.push({ type: 'join', a: a.k, b: b.k, into: k, x: made.x, y: made.y })
  }
}

function clamp(value: number, low: number, high: number): number {
  return Math.max(low, Math.min(high, value))
}
