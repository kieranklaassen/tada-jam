import { describe, expect, it } from 'vitest'
import { LADDER } from './config'
import { between, makeRng } from './rng'
import { deserialize, serialize } from './save'
import { noFeels, type RiderKind } from './tastes'
import { showFirst } from './play'
import { FIRST_SHOWING_AFTER, Toy } from './toy'
import { freshWorld, railAt, type Rider } from './world'
import { PLACES, TAR, distance, type PlaceId, type Pt } from './yard'

const DT = 1 / 60
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
const seat = (kind: RiderKind, stop: PlaceId, home: PlaceId, at: Rider['at']): Rider => ({ kind, stop, home, at, chalk: 0, tar: 0, felt: noFeels() })
/** A game already begun: the first showing over, the frog aboard with its pond across the tar, and the chick waiting far off. */
const begun = (riders: Rider[] = [seat('frog', 'mid-2', 'mid-4', 'train'), seat('chick', 'top-1', 'low-1', 'next')]): Toy =>
  new Toy({ ...freshWorld(null, 3), position: 'long-way', ahead: 'long-way', shown: true, riders }, 3, true)
const draw = (toy: Toy, raw: Pt[]) => { toy.press(raw[0]); for (const p of raw.slice(1)) { toy.move(p); toy.step(DT) } toy.lift() }
const tap = (toy: Toy, at: Pt) => { toy.press(at); toy.step(DT); toy.lift() }
const heard = (toy: Toy): string[] => { const keys = toy.asked.map((a) => a.key as string); toy.asked = []; return keys }
const idle = (toy: Toy) => !toy.journey.busy && !toy.journey.moving && !toy.company.playing
const settle = (toy: Toy, seconds = 60): string[] => { for (let t = 0; t < seconds && (!idle(toy) || t < 0.1); t += DT) toy.step(DT); return heard(toy) }
const at = (toy: Toy): Pt => ({ x: toy.journey.pose.x, y: toy.journey.pose.y })
const life = (toy: Toy, kind: RiderKind) => toy.company.cast.of(kind)!
const stored = (toy: Toy) => JSON.parse(JSON.stringify(serialize(toy.world)))
/** The cast is where the world says everyone is. */
const agrees = (toy: Toy) => {
  for (const r of toy.world.riders) {
    const seen = life(toy, r.kind)
    expect(seen, r.kind).toBeDefined()
    expect(seen.seat.in, `${r.kind} is ${r.at}`).toBe(r.at === 'train' ? 'wagon' : r.at === 'home' || r.at === 'before' ? 'home' : 'stop')
  }
  expect(toy.company.cast.riders.size).toBe(toy.world.riders.length)
}

describe('the first showing', () => {
  it('saves its outcome when it starts, plays for four to six seconds, and leaves the rider aboard and a gap for the child', () => {
    const toy = new Toy(freshWorld(null, 4), 4, true)
    const rider = toy.world.riders[0].kind
    for (let t = 0; t < FIRST_SHOWING_AFTER + DT; t += DT) toy.step(DT)
    expect(toy.company.playing).toBe(true)
    // What it saves: the line, the rider aboard, the train at the end of the line, and that it has been shown.
    expect(toy.world.shown).toBe(true)
    expect(toy.world.marks.length).toBe(2)
    expect(toy.world.riders.find((r) => r.kind === rider)!.at).toBe('train')
    expect(toy.unsaved && toy.saveNow).toBe(true)
    const saved = stored(toy)
    // The line is not on the tar yet: the rider is still scraping it.
    expect(toy.company.hidden).toBe(toy.world.marks[1])
    expect(life(toy, rider).settledIn).toBe(-1)
    let seconds = 0
    for (; toy.company.playing && seconds < 20; seconds += DT) toy.step(DT)
    expect(seconds).toBeGreaterThan(4)
    expect(seconds).toBeLessThan(6.5)
    settle(toy)
    expect(toy.company.hidden).toBe(null)
    expect(life(toy, rider).settledIn).toBe(0)
    expect(distance(at(toy), toy.world.train)).toBeLessThan(3)
    // Nothing the scene did changed what was saved when it started.
    expect(stored(toy)).toEqual(saved)
    agrees(toy)
  })

  it('gives way to a touch: everyone is at once where it was taking them, and the touch is an ordinary touch', () => {
    const toy = new Toy(freshWorld(null, 4), 4, true)
    const rider = toy.world.riders[0].kind
    for (let t = 0; t < FIRST_SHOWING_AFTER + 0.8; t += DT) toy.step(DT)
    const marks = toy.world.marks.length
    toy.press({ x: 900, y: 600 })
    expect(toy.company.playing).toBe(false)
    expect(toy.company.hidden).toBe(null)
    expect(toy.company.showing).toBe(null)
    expect(life(toy, rider).seat.in).toBe('wagon')
    toy.lift()
    expect(toy.world.marks.length).toBe(marks + 1)
    settle(toy)
    expect(distance(at(toy), toy.world.train)).toBeLessThan(3)
  })

  it('plays once: not for a child who touches first, and never again on load', () => {
    const touched = new Toy(freshWorld(null, 4), 4, true)
    tap(touched, { x: touched.world.train.x + 20, y: touched.world.train.y + 4 })
    expect(touched.world.shown).toBe(true)
    const marks = touched.world.marks.length
    for (let t = 0; t < 3; t += DT) {
      touched.step(DT)
      expect(touched.company.showing).toBe(null)
    }
    expect(touched.world.marks.length).toBe(marks)

    const shown = new Toy(freshWorld(null, 4), 4, true)
    for (let t = 0; t < FIRST_SHOWING_AFTER + 1; t += DT) shown.step(DT)
    // Put away in the middle of the showing, and opened again.
    const back = new Toy(deserialize(stored(shown), null, 9), 9, true)
    for (let t = 0; t < 4; t += DT) back.step(DT)
    expect(back.company.playing).toBe(false)
    expect(back.world.marks.length).toBe(2)
    expect(heard(back)).toEqual([])
    agrees(back)
  })
})

describe('taking a rider home', () => {
  it('lets the rider feel the ride in its own way, with its own voice', () => {
    const toy = begun()
    draw(toy, zigzag({ x: 780, y: 730 }))
    const sounds = settle(toy)
    // The frog likes corners: it squeaks at each, in its own voice. And once more for the splash on the way
    // there, across the edge of the puddle, which it likes too.
    expect(sounds.filter((s) => s === 'frog-squeak').length).toBe(5)
    expect(sounds).not.toContain('frog-grumble')
    const cat = begun([seat('cat', 'mid-2', 'mid-4', 'train'), seat('chick', 'top-1', 'low-1', 'next')])
    draw(cat, zigzag({ x: 780, y: 730 }))
    const catSounds = settle(cat)
    // The cat likes neither the corners nor the splash on the way.
    expect(catSounds.filter((s) => s === 'cat-grumble').length).toBe(5)
    expect(catSounds).not.toContain('cat-squeak')
  })

  it('saves the ending when the mark is made, plays getting home for five to eight seconds, and leaves the rider at home', () => {
    const toy = begun()
    toy.unsaved = toy.saveNow = false
    const raw = line({ x: 540, y: 462 }, railAt('mid-4'))
    toy.press(raw[0])
    for (const p of raw.slice(1)) toy.move(p)
    toy.lift()
    // What it saves, before the train has even set off: the frog home, the cycle over, the position moved.
    expect(toy.world.riders.find((r) => r.kind === 'frog')!.at).toBe('home')
    expect(toy.world.finished).toBe(true)
    expect(toy.world.position).toBe('up-and-down')
    expect(toy.unsaved && toy.saveNow).toBe(true)
    const saved = stored(toy)
    // The frog is still seen aboard until the train gets there.
    expect(life(toy, 'frog').seat.in).toBe('wagon')
    for (let t = 0; t < 20 && !toy.company.playing; t += DT) toy.step(DT)
    expect(toy.company.playing).toBe(true)
    let seconds = 0
    const did = new Set<string>()
    for (; toy.company.playing && seconds < 20; seconds += DT) { toy.step(DT); did.add(life(toy, 'frog').doing) }
    expect(seconds).toBeGreaterThan(5)
    expect(seconds).toBeLessThan(8)
    expect(did.has('out-plain') || did.has('out-fast')).toBe(true)
    expect(did).toContain('to-home')
    expect(did).toContain('home-act')
    settle(toy)
    expect(life(toy, 'frog').seat.in).toBe('home')
    expect(life(toy, 'frog').doing).toBe('at-home')
    expect(stored(toy)).toEqual(saved)
    agrees(toy)
  })

  it('takes five to eight seconds over getting home for every rider, the quickest and the slowest', () => {
    for (const kind of ['frog', 'chick', 'snail', 'cat'] as const) {
      const toy = begun([seat(kind, 'mid-2', 'mid-4', 'train'), seat(kind === 'frog' ? 'cat' : 'frog', 'top-1', 'low-1', 'next')])
      draw(toy, ring({ x: 700, y: 640 }, 100))
      settle(toy)
      draw(toy, line(at(toy), railAt('mid-4')))
      for (let t = 0; t < 30 && !toy.company.playing; t += DT) toy.step(DT)
      let seconds = 0
      for (; toy.company.playing && seconds < 20; seconds += DT) toy.step(DT)
      expect(seconds, kind).toBeGreaterThan(5)
      expect(seconds, kind).toBeLessThan(8)
    }
  })

  it('gets the rider out the way the ride left it', () => {
    const toy = begun()
    draw(toy, zigzag({ x: 780, y: 730 }))
    settle(toy)
    draw(toy, line(at(toy), railAt('mid-4')))
    const did = new Set<string>()
    for (let t = 0; t < 30 && !idle(toy); t += DT) { toy.step(DT); did.add(life(toy, 'frog').doing) }
    expect(did).toContain('out-corner')
  })

  it('gives way to a touch in the middle of getting home, and nothing replays on load', () => {
    const toy = begun()
    draw(toy, line({ x: 540, y: 462 }, railAt('mid-4')))
    for (let t = 0; t < 20 && !toy.company.playing; t += DT) toy.step(DT)
    for (let t = 0; t < 1; t += DT) toy.step(DT)
    const back = new Toy(deserialize(stored(toy), null, 9), 9, true)
    toy.press({ x: 300, y: 650 })
    expect(toy.company.playing).toBe(false)
    expect(life(toy, 'frog').seat.in).toBe('home')
    toy.lift()
    // Opened again from a save made in the middle of the scene: the frog is home, and no scene plays.
    for (let t = 0; t < 3; t += DT) back.step(DT)
    expect(back.company.playing).toBe(false)
    expect(life(back, 'frog').seat.in).toBe('home')
    expect(heard(back)).toEqual([])
    agrees(back)
  })
})

describe('how a cycle restarts', () => {
  it('leaves the ending standing for as long as the child likes: nothing new starts by itself', () => {
    const toy = begun()
    draw(toy, line({ x: 540, y: 462 }, railAt('mid-4')))
    settle(toy)
    const world = toy.world, riders = [...toy.company.cast.riders.keys()]
    for (let t = 0; t < 40; t += DT) toy.step(DT)
    expect(toy.world).toBe(world)
    expect([...toy.company.cast.riders.keys()]).toEqual(riders)
    expect(toy.world.finished).toBe(true)
    // The next rider is on the tar, waiting.
    expect(life(toy, 'chick').seat.in).toBe('stop')
  })

  it('begins the next cycle on the child next mark: the rider after next is drawn in, and the old home is rubbed away', () => {
    const toy = begun([seat('snail', 'low-3', 'low-4', 'before'), seat('frog', 'mid-2', 'mid-4', 'train'), seat('chick', 'top-1', 'low-1', 'next')])
    draw(toy, line({ x: 540, y: 462 }, railAt('mid-4')))
    settle(toy)
    const old = life(toy, 'snail')
    expect(old.seat.in).toBe('home')
    toy.press({ x: 700, y: 300 })
    // On the touch itself: the snail's home goes with a wave, and someone new is drawn in to wait.
    toy.step(DT)
    expect(toy.company.cast.gone).toEqual([old])
    expect(old.doing).toBe('wave')
    expect(toy.company.cast.riders.size).toBe(3)
    const drawnIn = [...toy.company.cast.riders.values()].filter((seen) => seen.shown < 1)
    expect(drawnIn.length).toBe(1)
    expect(drawnIn[0].seat.in).toBe('stop')
    toy.lift()
    expect(toy.world.finished).toBe(false)
    settle(toy)
    agrees(toy)
  })
})

describe('chalk on a rider and on a home', () => {
  it('answers a tap, a zigzag, a ring and a scribble on a rider, each in its own way and its own voice', () => {
    const chick = PLACES['top-1']
    const cases: [Pt[], string, string][] = [
      [[chick], 'trick', 'chick-call'],
      [zigzag({ x: chick.x - 90, y: chick.y + 40 }, 4, 45, 80), 'tickled', 'chick-squeak'],
      [ring(chick, 80), 'hoop', 'chick-hum'],
      [scribble(chick), 'dusted', 'chick-sneeze'],
    ]
    for (const [raw, clip, sound] of cases) {
      const toy = begun()
      draw(toy, raw)
      expect(heard(toy), clip).toContain(sound)
      expect(life(toy, 'chick').doing).toBe(clip)
    }
  })

  it('lets a home answer a touch with its own small move and sound, and the chalk lies on the tar', () => {
    const toy = begun()
    const marks = toy.world.marks.length
    tap(toy, PLACES['mid-4'])
    expect(heard(toy)).toContain('blip')
    expect(toy.company.stage().homes.find((h) => h.kind === 'frog')!.pulse).toBeGreaterThan(0.5)
    expect(toy.world.marks.length).toBe(marks + 1)
    for (let t = 0; t < 1; t += DT) toy.step(DT)
    expect(toy.company.stage().homes.find((h) => h.kind === 'frog')!.pulse).toBe(0)
  })

  it('shows a waiting rider looking into full wagons and staying where it is', () => {
    const toy = begun([seat('frog', 'mid-2', 'low-4', 'train'), seat('cat', 'mid-3', 'low-1', 'train'), seat('snail', 'top-3', 'top-1', 'next')])
    draw(toy, line(at(toy), railAt('top-3')))
    const did = new Set<string>()
    for (let t = 0; t < 30 && !idle(toy); t += DT) { toy.step(DT); did.add(life(toy, 'snail').doing) }
    expect(did).toContain('full')
    expect(life(toy, 'snail').seat.in).toBe('stop')
    expect(heard(toy)).toContain('coupling-clunk')
  })
})

describe('the roundabout', () => {
  // The frog's home is far from the ring: a train that comes beside a home lets its rider out there.
  const aboard = [seat('frog', 'mid-2', 'top-4', 'train'), seat('chick', 'top-1', 'low-1', 'next')]
  it('goes round three times in all, for five to seven seconds, and stops where it began, giddy', () => {
    const toy = begun(aboard)
    const c = { x: 800, y: 620 }
    toy.press(ring(c, 110)[0])
    for (const p of ring(c, 110).slice(1)) toy.move(p)
    toy.lift()
    // What it saves when it starts is what the mark saved: the train back where the ring begins.
    const end = { x: toy.world.train.x, y: toy.world.train.y }
    const saved = stored(toy)
    // Across the bare tar to where the ring begins, and then onto it.
    for (let t = 0; t < 30 && toy.journey.pose.on !== 'tar'; t += DT) toy.step(DT)
    for (let t = 0; t < 30 && toy.journey.pose.on !== 'chalk'; t += DT) toy.step(DT)
    let seconds = 0, turned = 0, last = Math.atan2(toy.journey.pose.y - c.y, toy.journey.pose.x - c.x)
    for (; !idle(toy) && seconds < 30; seconds += DT) {
      toy.step(DT)
      const now = Math.atan2(toy.journey.pose.y - c.y, toy.journey.pose.x - c.x)
      let d = now - last
      while (d > Math.PI) d -= Math.PI * 2
      while (d < -Math.PI) d += Math.PI * 2
      turned += Math.abs(d)
      last = now
    }
    expect(turned / (Math.PI * 2)).toBeGreaterThan(2.8)
    expect(turned / (Math.PI * 2)).toBeLessThan(3.1)
    expect(seconds).toBeGreaterThan(5)
    expect(seconds).toBeLessThan(7)
    expect(distance(at(toy), end)).toBeLessThan(4)
    expect(toy.life.bearing.dizzy).toBeGreaterThan(0)
    expect(stored(toy)).toEqual(saved)
    // The frog, who was aboard, felt it once, as a loop.
    expect(toy.world.riders.find((r) => r.kind === 'frog')!.felt.loop).toBe(1)
  })

  it('gives way to a touch: the engine is at once where it began', () => {
    const toy = begun(aboard)
    draw(toy, ring({ x: 800, y: 620 }, 110))
    for (let t = 0; t < 30 && !toy.company.carrying; t += DT) toy.step(DT)
    for (let t = 0; t < 0.6; t += DT) toy.step(DT)
    expect(toy.company.carrying).toBe(true)
    toy.press({ x: 300, y: 650 })
    expect(toy.company.playing).toBe(false)
    expect(distance(at(toy), toy.world.train)).toBeLessThan(4)
  })
})

describe('any play at all, with riders', () => {
  it('keeps the cast and the world together through random marks, taps and waits, and through a save at any moment', () => {
    for (const seed of [1, 2]) {
      const rng = makeRng(seed)
      const toy = new Toy(freshWorld(seed === 1 ? null : 4, seed), seed, true)
      let cycles = 0, finished = false
      for (let i = 0; i < 140; i++) {
        const c = { x: between(rng, 0, TAR.w), y: between(rng, 0, TAR.h) }
        const aim = toy.world.riders.find((r) => r.at === 'train') ?? toy.world.riders.find((r) => r.at === 'stop')
        const shape = Math.floor(rng.next() * 8)
        const raw = shape === 0 ? [c] : shape === 1 ? line(at(toy), c, 20) : shape === 2 ? zigzag(c) : shape === 3 ? ring(c, between(rng, 50, 140)) : shape === 4 ? scribble(c)
          : aim ? line(at(toy), aim.at === 'train' ? railAt(aim.home) : railAt(aim.stop), 30) : [c]
        toy.press(raw[0])
        expect(toy.asked.length).toBeGreaterThan(0)
        for (const p of raw.slice(1)) { toy.move(p); if (rng.next() < 0.5) toy.step(DT) }
        if (rng.next() < 0.85) toy.lift()
        for (let f = Math.floor(between(rng, 0, 120)); f > 0; f--) toy.step(DT)
        toy.asked = []
        if (toy.world.finished && !finished) cycles++
        finished = toy.world.finished
        expect(LADDER).toContain(toy.world.position)
        expect(toy.company.cast.riders.size).toBeLessThanOrEqual(4)
        for (const seen of toy.company.cast.riders.values()) for (const value of [seen.x, seen.y, seen.shown]) expect(Number.isFinite(value)).toBe(true)
        // A save at this moment reads back as this world.
        expect(deserialize(stored(toy), null, 1)).toEqual(toy.world)
      }
      toy.lift()
      settle(toy, 120)
      expect(idle(toy)).toBe(true)
      expect(distance(at(toy), toy.world.train)).toBeLessThan(3)
      agrees(toy)
      expect(cycles).toBeGreaterThan(3)
    }
  }, 30000)
})

describe('what a reader who had not seen the game found unkept', () => {
  const far = [seat('frog', 'mid-2', 'top-4', 'train'), seat('chick', 'top-1', 'low-1', 'next')]

  it('goes three times round a ring every time, with another line waiting behind it too, and then rides that line', () => {
    const toy = begun(far)
    const c = { x: 800, y: 620 }
    draw(toy, ring(c, 110))
    // Another mark at once, before the engine has got to the ring.
    const to = { x: 500, y: 300 }
    draw(toy, line({ x: 700, y: 300 }, to))
    for (let t = 0; t < 30 && toy.journey.pose.on !== 'tar'; t += DT) toy.step(DT)
    for (let t = 0; t < 30 && toy.journey.pose.on !== 'chalk'; t += DT) toy.step(DT)
    let turned = 0, last = Math.atan2(toy.journey.pose.y - c.y, toy.journey.pose.x - c.x), giddy = false
    for (let t = 0; t < 40 && !idle(toy); t += DT) {
      toy.step(DT)
      if (distance(at(toy), c) < 140) {
        const now = Math.atan2(toy.journey.pose.y - c.y, toy.journey.pose.x - c.x)
        let d = now - last
        while (d > Math.PI) d -= Math.PI * 2
        while (d < -Math.PI) d += Math.PI * 2
        turned += Math.abs(d)
        last = now
      }
      giddy = giddy || toy.life.bearing.dizzy > 0
    }
    expect(turned / (Math.PI * 2)).toBeGreaterThan(2.8)
    // Coming to the ring and leaving it add a little to the turning seen from its middle.
    expect(turned / (Math.PI * 2)).toBeLessThan(3.6)
    expect(giddy).toBe(true)
    expect(distance(at(toy), to)).toBeLessThan(14)
    expect(distance(at(toy), toy.world.train)).toBeLessThan(4)
  })

  it('drops the cap and swoops the whistle on a loop whose two ends meet', () => {
    const toy = begun(far)
    draw(toy, ring({ x: 800, y: 620 }, 110))
    let cap = 0
    const sounds: string[] = []
    for (let t = 0; t < 30 && !idle(toy); t += DT) { toy.step(DT); cap = Math.max(cap, toy.life.bearing.capOff); sounds.push(...heard(toy)) }
    expect(cap).toBeGreaterThan(20)
    expect(sounds).toContain('swoop-whistle')
  })

  it('whistles along a line on bare tar that has no straight run in it, and whistles up as it runs away downhill', () => {
    const bendy = begun(far)
    draw(bendy, Array.from({ length: 31 }, (_, i) => ({ x: 660 + i * 9, y: 330 + Math.sin(i / 2.2) * 45 })))
    expect(settle(bendy)).toContain('long-whistle')
    const fall = begun(far)
    draw(fall, line({ x: 520, y: 200 }, { x: 900, y: 640 }))
    expect(settle(fall)).toContain('rising-whistle')
  })

  it('brakes with a squeal and a squash at a home, however slowly it came', () => {
    const toy = begun()
    heard(toy)
    // By taps, over bare tar: a trundle.
    tap(toy, railAt('mid-4'))
    let squash = 0
    const sounds: string[] = []
    for (let t = 0; t < 40 && !idle(toy); t += DT) { toy.step(DT); squash = Math.max(squash, Math.abs(toy.life.bearing.squash)); sounds.push(...heard(toy)) }
    expect(toy.world.riders.find((r) => r.kind === 'frog')!.at).toBe('home')
    expect(sounds).toContain('brake')
    // At rest it only breathes, by about 0.012.
    expect(squash).toBeGreaterThan(0.03)
  })

  it('sounds a like in the rider own way: the cat purrs, the snail hums and sighs, the others squeak', () => {
    const toy = begun([seat('cat', 'mid-2', 'top-4', 'train'), seat('snail', 'mid-1', 'top-3', 'train'), seat('chick', 'top-1', 'low-1', 'next')])
    heard(toy)
    const liked = (rider: RiderKind, feel: 'fast' | 'bump' | 'scribble' | 'corner'): string[] => { toy.company.hear({ what: 'reaction', at: 0, rider, feel, taste: 'like' }); return heard(toy) }
    expect(liked('cat', 'fast')).toEqual(['cat-hum'])
    expect(liked('snail', 'bump')).toEqual(['snail-hum'])
    expect(liked('snail', 'scribble')).toEqual(['sigh'])
    expect(liked('cat', 'scribble')).toEqual(['cat-squeak'])
  })

  it('sends the chick feathers flying round a loop, and the cat up onto the funnel at a splash', () => {
    const toy = begun([seat('chick', 'mid-2', 'top-4', 'train'), seat('cat', 'mid-1', 'top-3', 'train'), seat('frog', 'top-1', 'low-1', 'next')])
    toy.company.hear({ what: 'reaction', at: 0, rider: 'chick', feel: 'loop', taste: 'like' })
    expect(toy.bits.list.filter((bit) => bit.kind === 'feather').length).toBeGreaterThan(4)
    toy.company.hear({ what: 'reaction', at: 0, rider: 'cat', feel: 'splash', taste: 'dislike' })
    let perched = 0
    for (let t = 0; t < 2.2; t += DT) { toy.step(DT); perched = Math.max(perched, life(toy, 'cat').bearing(t).perch) }
    expect(perched).toBe(1)
    // And it is back in its seat afterwards.
    expect(life(toy, 'cat').bearing(0).perch).toBe(0)
  })

  it('has the snail peer out of its shell with spiral eyes at the end of a loop', () => {
    const toy = begun([seat('snail', 'mid-2', 'top-4', 'train'), seat('chick', 'top-1', 'low-1', 'next')])
    toy.company.hear({ what: 'reaction', at: 0, rider: 'snail', feel: 'loop', taste: 'dislike' })
    let hidden = false, peered = false
    for (let t = 0; t < 2.1; t += DT) {
      toy.step(DT)
      const bearing = life(toy, 'snail').bearing(t)
      hidden = hidden || bearing.hide > 0.9
      peered = peered || (hidden && bearing.hide < 0.1 && bearing.eyes === 'spiral')
    }
    expect(hidden).toBe(true)
    expect(peered).toBe(true)
  })

  it('gets a rider out as its like or its dislike: springy with a squeak, or low with a grumble', () => {
    const out = (taste: 'like' | 'dislike'): { sounds: string[]; moods: number[] } => {
      const toy = begun()
      heard(toy)
      toy.company.hear({ what: 'home', at: 0, rider: 'frog', how: 'corner', taste })
      const sounds: string[] = [], moods = new Set<number>()
      for (let t = 0; t < 9 && toy.company.playing; t += DT) { toy.step(DT); sounds.push(...heard(toy)); moods.add(life(toy, 'frog').mood) }
      return { sounds, moods: [...moods] }
    }
    const pleased = out('like'), put = out('dislike')
    expect(pleased.sounds).toContain('frog-squeak')
    expect(pleased.moods).toContain(1)
    expect(put.sounds).toContain('frog-grumble')
    expect(put.moods).toContain(-1)
  })

  it('lets a rider aboard be tapped, tickled, ringed and dusted where it sits, and the train stays', () => {
    const toy = begun(far)
    for (let t = 0; t < 0.5; t += DT) toy.step(DT)
    const frog = life(toy, 'frog'), middle = { x: frog.x, y: frog.y - 40 }, stood = at(toy)
    heard(toy)
    tap(toy, middle)
    expect(frog.doing).toBe('trick')
    expect(settle(toy)).toContain('frog-call')
    draw(toy, zigzag({ x: middle.x - 60, y: middle.y + 25 }, 4, 30, 50))
    expect(frog.doing).toBe('tickled')
    settle(toy)
    draw(toy, ring(middle, 62))
    expect(frog.doing).toBe('hoop')
    settle(toy)
    draw(toy, scribble(middle))
    expect(frog.doing).toBe('dusted')
    settle(toy)
    expect(distance(at(toy), stood)).toBeLessThan(3)
    // The ring stays on the tar, and nothing else was left there.
    expect(toy.world.marks.length).toBe(2)
  })

  it('trills the chick trick, lays the cat ears back on a fast run, and bounces a tickled rider from side to side', () => {
    const toy = begun([seat('cat', 'mid-2', 'top-4', 'train'), seat('chick', 'top-1', 'low-1', 'stop'), seat('frog', 'mid-4', 'low-4', 'next')])
    heard(toy)
    toy.company.chalked('chick', 'tap')
    expect(heard(toy)).toEqual(['chick-call', 'chick-squeak'])
    toy.company.hear({ what: 'reaction', at: 0, rider: 'cat', feel: 'fast', taste: 'like' })
    let ears = 0
    for (let t = 0; t < 0.5; t += DT) { toy.step(DT); ears = Math.max(ears, life(toy, 'cat').bearing(t).ears) }
    expect(ears).toBe(1)
    toy.company.chalked('chick', 'zigzag')
    let left = 0, right = 0
    for (let t = 0; t < 1; t += DT) { toy.step(DT); const stride = life(toy, 'chick').bearing(t).stride; left = Math.min(left, stride); right = Math.max(right, stride) }
    expect(left).toBeLessThan(-10)
    expect(right).toBeGreaterThan(10)
  })

  it('rattles the wagons over bare tar, leaps as it is pulled away, creaks in a knot and pops out of it, and wears a beard out of the tuft on any ride', () => {
    const tar = begun(far)
    heard(tar)
    tap(tar, { x: 800, y: 300 })
    expect(settle(tar)).toContain('rattle')

    const knot = begun(far)
    draw(knot, line({ x: 520, y: 460 }, { x: 900, y: 460 }))
    settle(knot)
    draw(knot, scribble({ x: 700, y: 460 }))
    const sounds: string[] = []
    for (let t = 0; t < 30 && !idle(knot); t += DT) { knot.step(DT); sounds.push(...heard(knot)) }
    expect(sounds).toContain('creak-cork')
    expect(sounds).toContain('cork')
    expect(sounds.indexOf('creak-cork')).toBeLessThan(sounds.indexOf('cork'))

    const tuft = begun(far)
    draw(tuft, scribble({ x: 600, y: 160 }))
    settle(tuft)
    expect(tuft.weed.tuft).toBe(true)
    // A later line past the dandelion: the beard again, and the toot as it is blown off.
    draw(tuft, line({ x: 700, y: 215 }, { x: 480, y: 215 }))
    let beard = false
    const tooted: string[] = []
    for (let t = 0; t < 30 && !idle(tuft); t += DT) { tuft.step(DT); beard = beard || tuft.beard; tooted.push(...heard(tuft)) }
    expect(beard).toBe(true)
    expect(tooted).toContain('muffled-toot')
  })

  it('times the roundabout from the ring: inside five to seven seconds for a small ring and a big one, and each time round quicker than the first', () => {
    for (const r of [60, 110, 200]) {
      // The frog's home is well away from the ring: a train that comes beside a home lets its rider out there.
      const toy = begun([seat('frog', 'mid-2', 'top-1', 'train'), seat('chick', 'low-4', 'low-1', 'next')])
      // Clear of the engine, which a ring round it would lasso, and of every home.
      const c = { x: 700, y: 430 }
      draw(toy, ring(c, r))
      for (let t = 0; t < 30 && toy.journey.pose.on !== 'tar'; t += DT) toy.step(DT)
      for (let t = 0; t < 30 && toy.journey.pose.on !== 'chalk'; t += DT) toy.step(DT)
      // The time each lap takes, by the turning seen from the middle of the ring.
      const laps: number[] = []
      let seconds = 0, turned = 0, lapStart = 0, last = Math.atan2(toy.journey.pose.y - c.y, toy.journey.pose.x - c.x)
      for (; !idle(toy) && seconds < 30; seconds += DT) {
        toy.step(DT)
        const now = Math.atan2(toy.journey.pose.y - c.y, toy.journey.pose.x - c.x)
        let d = now - last
        while (d > Math.PI) d -= Math.PI * 2
        while (d < -Math.PI) d += Math.PI * 2
        turned += Math.abs(d)
        last = now
        if (turned >= (laps.length + 1) * Math.PI * 2 * 0.985 && laps.length < 3) { laps.push(seconds - lapStart); lapStart = seconds }
      }
      expect(laps.length, `ring of ${r}`).toBe(3)
      expect(laps[1], `ring of ${r}`).toBeLessThan(laps[0])
      expect(seconds, `ring of ${r}`).toBeGreaterThan(5)
      expect(seconds, `ring of ${r}`).toBeLessThan(7)
    }
  })

  it('splashes through the puddle on bare tar too, and hisses and twangs whatever the mark was', () => {
    // Striped, then sent across the water by a tap: the stripes wash off and the water hisses.
    const toy = begun(far)
    toy.world = { ...toy.world, train: { ...toy.world.train, x: 300, y: 600, stripes: 2 } }
    const again = new Toy(toy.world, 3, true)
    heard(again)
    tap(again, { x: 900, y: 600 })
    expect(settle(again)).toContain('hiss')
    expect(again.world.train.stripes).toBe(-1)
    // A line begun on the engine, past the dandelion's stalk: its own screech, and the twang as well.
    const pulled = begun(far)
    heard(pulled)
    draw(pulled, line({ x: pulled.body.x + 30, y: pulled.body.y }, { x: 650, y: 140 }))
    const sounds = settle(pulled)
    expect(sounds).toContain('screech')
    expect(sounds).toContain('twang')
  })

  it('has a rider hop out in a zigzag after corners', () => {
    const toy = begun()
    toy.company.hear({ what: 'home', at: 0, rider: 'frog', how: 'corner', taste: 'like' })
    let left = 0, right = 0
    for (let t = 0; t < 3; t += DT) { toy.step(DT); const stride = life(toy, 'frog').bearing(t).stride; left = Math.min(left, stride); right = Math.max(right, stride) }
    expect(left).toBeLessThan(-10)
    expect(right).toBeGreaterThan(10)
  })

  it('gives a waiting rider its trick for a tap that also begins the cycle, where it would have walked over', () => {
    // The ending stands; the chick waits within a walk of the train.
    const toy = new Toy({ ...freshWorld(null, 3), position: 'long-way', ahead: 'long-way', shown: true, finished: true, riders: [seat('frog', 'top-4', 'mid-4', 'home'), seat('chick', 'mid-1', 'low-4', 'next')] }, 3, true)
    heard(toy)
    tap(toy, PLACES['mid-1'])
    expect(toy.world.finished).toBe(false)
    expect(toy.world.riders.find((r) => r.kind === 'chick')!.at).toBe('stop')
    expect(life(toy, 'chick').doing).toBe('trick')
    // The same tap anywhere else would have had it walk over to the train.
    const other = new Toy({ ...freshWorld(null, 3), position: 'long-way', ahead: 'long-way', shown: true, finished: true, riders: [seat('frog', 'top-4', 'mid-4', 'home'), seat('chick', 'mid-1', 'low-4', 'next')] }, 3, true)
    tap(other, { x: 600, y: 330 })
    expect(other.world.riders.find((r) => r.kind === 'chick')!.at).toBe('train')
  })

  it('answers a touch anywhere on a home as it is drawn, twangs for a line at the foot of the dandelion, and rubs an earlier home away', () => {
    const toy = begun([seat('cat', 'mid-2', 'top-4', 'train'), seat('frog', 'low-1', 'low-3', 'next')])
    heard(toy)
    // The far edge of the cat's cushion, in its patch of sun.
    tap(toy, { x: PLACES['top-4'].x - 85, y: PLACES['top-4'].y + 40 })
    expect(heard(toy)).toContain('sigh')
    settle(toy)
    const weed = begun(far)
    heard(weed)
    draw(weed, line({ x: 700, y: 236 }, { x: 520, y: 236 }))
    expect(settle(weed)).toContain('twang')
    // An ending, then the next cycle: the home of the rider before last is still there, fading, a moment later.
    const turn = new Toy({ ...freshWorld(null, 3), position: 'long-way', ahead: 'long-way', shown: true, finished: true, riders: [seat('snail', 'top-1', 'top-2', 'before'), seat('frog', 'top-4', 'mid-4', 'home'), seat('chick', 'low-1', 'low-4', 'next')] }, 3, true)
    tap(turn, { x: 600, y: 330 })
    for (let t = 0; t < 0.3; t += DT) turn.step(DT)
    const old = () => turn.company.stage().homes.find((home) => home.kind === 'snail' && home.at.x === PLACES['top-2'].x && home.at.y > PLACES['top-2'].y)
    expect(old()).toBeDefined()
    expect(old()!.shown).toBeGreaterThan(0)
    expect(old()!.shown).toBeLessThan(1)
    for (let t = 0; t < 1.5; t += DT) turn.step(DT)
    expect(old()).toBeUndefined()
  })

  it('lays nobody out during the first showing: the next rider is drawn in with the child first mark', () => {
    const toy = new Toy(freshWorld(null, 7), 7, true)
    for (let t = 0; t < FIRST_SHOWING_AFTER + 0.2; t += DT) toy.step(DT)
    expect(toy.world.shown).toBe(true)
    expect(toy.world.riders.length).toBe(1)
    settle(toy)
    tap(toy, { x: 300, y: 300 })
    expect(toy.world.riders.length).toBe(2)
  })

  it('jumps the engine to the end of the shown line when a touch ends the first showing', () => {
    for (const seed of [3, 7, 11]) {
      const toy = new Toy(freshWorld(null, seed), seed, true)
      for (let t = 0; t < FIRST_SHOWING_AFTER + 1; t += DT) toy.step(DT)
      expect(toy.company.playing).toBe(true)
      // A touch far from everything, in the middle of the showing.
      toy.press({ x: 200, y: 700 })
      expect(distance(at(toy), toy.world.train)).toBeLessThan(3)
      toy.lift()
    }
  })

  it('scrapes about a third of the way to the first home at every first visit, and leaves the rest', () => {
    for (const age of [null, 2, 3, 4, 9]) for (let seed = 1; seed <= 40; seed++) {
      const fresh = freshWorld(age, seed), first = fresh.riders[0]
      const shown = showFirst(fresh).world, mark = shown.marks[shown.marks.length - 1]
      const from = { x: fresh.train.x + 60, y: fresh.train.y }, way = distance(from, railAt(first.home))
      const scraped = distance(mark.p[0], mark.p[mark.p.length - 1])
      expect(scraped / way, `age ${age} seed ${seed} home ${first.home}`).toBeGreaterThan(0.28)
      expect(scraped / way, `age ${age} seed ${seed} home ${first.home}`).toBeLessThan(0.45)
      expect(shown.riders[0].at).toBe('train')
    }
  })

  it('grumbles at each bump on bare tar, and keeps one long stroke in one chalk', () => {
    const toy = begun(far)
    heard(toy)
    tap(toy, { x: 800, y: 300 })
    expect(settle(toy)).toContain('grumble')
    // A stroke far longer than one mark holds: several marks, one colour.
    const long = begun(far), before = long.world.marks.length
    const wander: Pt[] = []
    for (let i = 0; i <= 420; i++) wander.push({ x: 200 + (i % 140 < 70 ? i % 70 : 70 - (i % 70)) * 11, y: 250 + i * 0.9 })
    draw(long, wander)
    const made = long.world.marks.slice(before)
    expect(made.length).toBeGreaterThan(1)
    expect(new Set(made.map((mark) => mark.c)).size).toBe(1)
  })

  it('loops the loop at a child pace too: where a slow loop closes behind the engine it goes right over, whistles, and the rider reacts', () => {
    const toy = begun(far)
    const pts: Pt[] = [...line({ x: 520, y: 330 }, { x: 700, y: 330 }, 15)]
    for (let i = 1; i <= 40; i++) pts.push({ x: 700 + Math.sin((i / 40) * Math.PI * 2) * 70, y: 260 + Math.cos((i / 40) * Math.PI * 2) * 70 })
    pts.push(...line({ x: 700, y: 330 }, { x: 880, y: 330 }, 15).slice(1))
    heard(toy)
    toy.press(pts[0])
    const sounds: string[] = []
    let spun = 0, cap = 0, reacted = false
    const look = () => { spun = Math.max(spun, toy.life.bearing.spin); cap = Math.max(cap, toy.life.bearing.capOff); reacted = reacted || life(toy, 'frog').doing === 'loop'; sounds.push(...heard(toy)) }
    // About 240 units a second: slower than the engine, which rides right behind the chalk.
    for (const q of pts.slice(1)) { toy.move(q); for (let i = 0; i < 3; i++) { toy.step(DT); look() } }
    toy.lift()
    for (let t = 0; t < 30 && !idle(toy); t += DT) { toy.step(DT); look() }
    expect(sounds).toContain('swoop-whistle')
    expect(sounds.filter((s) => s === 'swoop-whistle').length).toBe(1)
    expect(spun).toBeGreaterThan(Math.PI)
    expect(cap).toBeGreaterThan(20)
    expect(reacted).toBe(true)
  })

  it('shows the reflection on the two more times round a ring round the water', () => {
    const toy = begun([seat('frog', 'mid-2', 'top-1', 'train'), seat('chick', 'top-4', 'top-3', 'next')])
    draw(toy, ring({ x: 600, y: 560 }, 175))
    let carried = 0, reflected = 0
    for (let t = 0; t < 40 && !idle(toy); t += DT) { toy.step(DT); if (toy.company.carrying) { carried++; if (toy.reflect) reflected++ } }
    expect(carried).toBeGreaterThan(60)
    expect(reflected).toBe(carried)
  })

  it('gives its trick to a rider tapped where it is still seen at its stop, though the train has it aboard already', () => {
    const toy = begun(far)
    draw(toy, line(at(toy), railAt('top-1')))
    expect(toy.world.riders.find((r) => r.kind === 'chick')!.at).toBe('train')
    expect(life(toy, 'chick').seat.in).toBe('stop')
    tap(toy, PLACES['top-1'])
    expect(life(toy, 'chick').doing).toBe('trick')
  })

  it('ticks a sleeper only where one is seen, and puffs at the open end', () => {
    const short = begun(far)
    heard(short)
    draw(short, line({ x: 700, y: 300 }, { x: 780, y: 300 }, 8))
    const quiet = [...heard(short), ...settle(short)]
    expect(quiet).not.toContain('sleeper')
    expect(quiet).toContain('puff')
    const long = begun(far)
    heard(long)
    draw(long, line({ x: 600, y: 300 }, { x: 900, y: 300 }, 25))
    expect([...heard(long), ...settle(long)]).toContain('sleeper')
  })

  it('draws a new rider in once, at one place, however the line under the finger wanders, and never shows more than three stops', () => {
    for (const seed of [1, 2, 3, 4]) {
      const toy = new Toy(freshWorld(null, seed), seed, true)
      for (let t = 0; t < 8; t += DT) toy.step(DT)
      // The first mark: someone is laid out to wait for the cycle to come.
      tap(toy, { x: 300, y: 300 })
      settle(toy)
      const next = toy.world.riders.find((r) => r.at === 'next')!
      // One slow stroke that fetches the waiting rider and wanders on: whoever is laid out in its place is the
      // same rider at the same place for every move of the finger.
      const seenIds = new Set<string>()
      let mostStops = 0
      const look = () => {
        for (const id of toy.company.cast.riders.keys()) seenIds.add(id)
        mostStops = Math.max(mostStops, toy.company.stage().stops.length)
      }
      const before = new Set(toy.company.cast.riders.keys())
      const to = railAt(next.stop), wander = [...line(at(toy), to, 30), ...line(to, { x: 600, y: 330 }, 30).slice(1), ...line({ x: 600, y: 330 }, { x: 320, y: 520 }, 30).slice(1)]
      toy.press(wander[0])
      for (const q of wander.slice(1)) { toy.move(q); toy.step(DT); toy.step(DT); look() }
      // One rider at the most is new while the finger is down: the one laid out when the waiting rider was fetched.
      expect([...seenIds].filter((id) => !before.has(id)).length, `seed ${seed}`).toBeLessThanOrEqual(1)
      toy.lift()
      for (let t = 0; t < 30 && !idle(toy); t += DT) { toy.step(DT); look() }
      expect([...seenIds].filter((id) => !before.has(id)).length, `seed ${seed}`).toBeLessThanOrEqual(1)
      expect(mostStops, `seed ${seed}`).toBeLessThanOrEqual(3)
    }
  })

  it('streams the snail eye stalks out behind it on a fast run, and shakes drops off a rider that gets out after splashes', () => {
    const toy = begun([seat('snail', 'mid-2', 'top-4', 'train'), seat('frog', 'mid-1', 'mid-4', 'train'), seat('chick', 'top-1', 'low-1', 'next')])
    toy.company.hear({ what: 'reaction', at: 0, rider: 'snail', feel: 'fast', taste: 'dislike' })
    let part = 0
    for (let t = 0; t < 0.5; t += DT) { toy.step(DT); part = Math.max(part, life(toy, 'snail').bearing(t).part) }
    // A part above nothing draws the stalks' tips toward the back of the rider.
    expect(part).toBe(1)
    const drops = () => toy.bits.list.filter((bit) => bit.kind === 'drop').length
    const dry = drops()
    toy.company.hear({ what: 'home', at: 0, rider: 'frog', how: 'splash', taste: 'like' })
    let most = 0
    for (let t = 0; t < 1.5; t += DT) { toy.step(DT); most = Math.max(most, drops()) }
    expect(most).toBeGreaterThan(dry + 8)
  })

  it('brakes with its squeal at a home though another line waits, and still peers and puffs at the open end after it', () => {
    const toy = begun()
    heard(toy)
    draw(toy, line({ x: 540, y: 462 }, railAt('mid-4')))
    // A second line at once, before the first has been ridden.
    draw(toy, line({ x: 700, y: 300 }, { x: 420, y: 300 }))
    const sounds: string[] = []
    let peered = false
    for (let t = 0; t < 40 && !idle(toy); t += DT) { toy.step(DT); sounds.push(...heard(toy)); peered = peered || toy.life.bearing.lean > 0.12 }
    // The frog is home; the second mark has already begun the cycle after.
    expect(toy.world.riders.find((r) => r.kind === 'frog')!.at).toBe('before')
    expect(sounds).toContain('brake')
    expect(sounds.indexOf('brake')).toBeLessThan(sounds.lastIndexOf('puff'))
    expect(peered).toBe(true)
  })

  it('has a home answer a touch with its rider in it too', () => {
    const toy = begun([seat('frog', 'top-4', 'mid-4', 'home'), seat('chick', 'top-1', 'low-1', 'stop')])
    heard(toy)
    // On the pond beside the frog, and on the frog itself.
    tap(toy, { x: PLACES['mid-4'].x + 80, y: PLACES['mid-4'].y + 40 })
    expect(heard(toy)).toContain('blip')
    settle(toy)
    tap(toy, PLACES['mid-4'])
    const both = heard(toy)
    expect(both).toContain('blip')
    expect(both).toContain('frog-call')
  })

  it('rides a line drawn toward the train from the train, all of its chalk, and toots when the finger lands on the engine', () => {
    // Drawn slowly from far off back to the train: the engine sets off for where the finger landed, and at the
    // lift it turns to the near end and rides the chalk.
    const toy = begun(far)
    const farEnd = { x: 900, y: 600 }, nearEnd = { x: 560, y: 470 }
    draw(toy, line(farEnd, nearEnd, 30))
    settle(toy)
    expect(distance(at(toy), farEnd)).toBeLessThan(14)
    const frog = toy.world.riders.find((r) => r.kind === 'frog')!
    expect(frog.chalk).toBeGreaterThan(300)
    expect(frog.chalk).toBeGreaterThan(frog.tar * 2)
    const poked = begun(far)
    heard(poked)
    poked.press(poked.body)
    expect(heard(poked)).toContain('toot')
    poked.lift()
  })

  it('walks a rider that waits near the train over to it, a step at a time, and has the cat bat at the dust of a scribble', () => {
    const toy = new Toy({ ...freshWorld(null, 3), position: 'long-way', ahead: 'long-way', shown: true, finished: true, riders: [seat('frog', 'top-4', 'mid-4', 'home'), seat('chick', 'mid-1', 'low-4', 'next')] }, 3, true)
    const chick = life(toy, 'chick'), from = { x: chick.x, y: chick.y }
    tap(toy, { x: 700, y: 300 })
    expect(toy.world.riders.find((r) => r.kind === 'chick')!.at).toBe('train')
    // Well under way after a third of a second, and not there yet; then it climbs in.
    let walked = false, climbed = false, seconds = 0
    for (; seconds < 4 && chick.settledIn < 0; seconds += DT) { toy.step(DT); walked = walked || chick.doing === 'walk' }
    for (let t = 0; t < 0.2; t += DT) { toy.step(DT); climbed = climbed || chick.doing === 'board' }
    expect(walked).toBe(true)
    expect(seconds).toBeGreaterThan(0.6)
    expect(climbed).toBe(true)
    expect(distance(from, { x: chick.x, y: chick.y })).toBeGreaterThan(100)
    const cat = begun([seat('cat', 'mid-2', 'top-4', 'train'), seat('chick', 'top-1', 'low-1', 'next')])
    const dust = () => cat.bits.list.filter((bit) => bit.kind === 'dust').length
    const none = dust()
    cat.company.hear({ what: 'reaction', at: 0, rider: 'cat', feel: 'scribble', taste: 'like' })
    expect(dust()).toBeGreaterThan(none + 8)
    expect(life(cat, 'cat').doing).toBe('scribble')
  })

  it('goes on ticking sleepers along a stroke longer than one mark, and spins right about in a scribble', () => {
    const toy = begun(far)
    heard(toy)
    const wander: Pt[] = []
    for (let i = 0; i <= 420; i++) wander.push({ x: 200 + (i % 140 < 70 ? i % 70 : 70 - (i % 70)) * 11, y: 250 + i * 0.9 })
    toy.press(wander[0])
    let marksThen = toy.world.marks.length, late = 0
    for (const q of wander.slice(1)) {
      toy.move(q)
      toy.step(DT)
      const sounds = heard(toy)
      // Ticks heard once the stroke has gone on into a second mark.
      if (toy.world.marks.length > marksThen + 0 && toy.world.marks.length >= 3) late += sounds.filter((s) => s === 'sleeper').length
    }
    toy.lift()
    expect(toy.world.marks.length).toBeGreaterThan(marksThen + 1)
    expect(late).toBeGreaterThan(10)

    const scribbled = begun(far)
    draw(scribbled, scribble({ x: 760, y: 320 }))
    let spun = 0
    for (let t = 0; t < 30 && !idle(scribbled); t += DT) { scribbled.step(DT); spun = Math.max(spun, scribbled.life.bearing.spin) }
    expect(spun).toBeGreaterThan(Math.PI * 1.5)
  })

  it('thumps when a rider lands in its wagon and not before, blows one ring for a poke whatever the frames, and squeezes slowly through a scribble', () => {
    const toy = new Toy({ ...freshWorld(null, 3), position: 'long-way', ahead: 'long-way', shown: true, finished: true, riders: [seat('frog', 'top-4', 'mid-4', 'home'), seat('chick', 'mid-1', 'low-4', 'next')] }, 3, true)
    const chick = life(toy, 'chick')
    heard(toy)
    tap(toy, { x: 700, y: 300 })
    let before = 0, after = 0
    for (let t = 0; t < 5; t += DT) {
      toy.step(DT)
      const thumps = heard(toy).filter((s) => s === 'thump').length
      if (chick.settledIn < 0) before += thumps
      else after += thumps
    }
    expect(before).toBe(0)
    expect(after).toBe(1)

    const poked = begun(far)
    poked.press(poked.body)
    poked.lift()
    // A short frame and then a long one.
    poked.step(0.004)
    poked.step(0.05)
    poked.step(DT)
    expect(poked.bits.list.filter((bit) => bit.kind === 'ring').length).toBe(1)

    const knot = begun(far)
    draw(knot, scribble({ x: 760, y: 320 }))
    let fastest = 0
    for (let t = 0; t < 40 && !idle(knot); t += DT) { knot.step(DT); if (knot.journey.pose.on === 'chalk') fastest = Math.max(fastest, knot.journey.pose.speed) }
    expect(fastest).toBeGreaterThan(100)
    expect(fastest).toBeLessThanOrEqual(260)
  })

  it('finds a rider in the wagon it was in after a put-away: one left alone in the second wagon has moved up', () => {
    const toy = begun([seat('frog', 'mid-2', 'mid-4', 'train'), seat('chick', 'top-1', 'top-4', 'train'), seat('snail', 'low-1', 'low-2', 'next')])
    expect(life(toy, 'frog').seat).toEqual({ in: 'wagon', index: 0 })
    expect(life(toy, 'chick').seat).toEqual({ in: 'wagon', index: 1 })
    // The frog gets home; the chick, alone now, moves up to the first wagon.
    draw(toy, line({ x: 540, y: 462 }, railAt('mid-4')))
    settle(toy)
    for (let t = 0; t < 2; t += DT) toy.step(DT)
    expect(toy.world.riders.find((r) => r.kind === 'frog')!.at).toBe('home')
    expect(life(toy, 'chick').seat).toEqual({ in: 'wagon', index: 0 })
    const again = new Toy(deserialize(stored(toy), null, 3), 3, true)
    expect(life(again, 'chick').seat).toEqual({ in: 'wagon', index: 0 })
  })

  it('twangs for a line begun at the dandelion, whistles each line of a quick run of strokes, and leaps onto a line begun on a riding engine', () => {
    const weed = begun(far)
    heard(weed)
    draw(weed, line({ x: 600, y: 222 }, { x: 860, y: 300 }))
    expect(settle(weed)).toContain('twang')

    // Two bendy lines, the second drawn while the first is still being ridden: a whistle for each.
    const quick = begun(far)
    heard(quick)
    const bow = (cx: number, cy: number, r: number): Pt[] => Array.from({ length: 31 }, (_, i) => ({ x: cx - Math.cos((i / 30) * Math.PI) * r, y: cy - Math.sin((i / 30) * Math.PI) * r }))
    draw(quick, bow(760, 330, 110))
    draw(quick, bow(330, 640, 80))
    expect(settle(quick).filter((s) => s === 'long-whistle').length).toBe(2)

    // A long line, and while the engine rides it, another begun on the engine itself.
    const riding = begun(far)
    const long = line({ x: 520, y: 460 }, { x: 1050, y: 640 })
    riding.press(long[0])
    for (const q of long.slice(1)) riding.move(q)
    riding.lift()
    for (let t = 0; t < 0.5; t += DT) riding.step(DT)
    expect(riding.journey.pose.speed).toBeGreaterThan(100)
    heard(riding)
    const body = riding.body
    riding.press(body)
    for (const q of line(body, { x: body.x - 60, y: body.y + 240 }, 20).slice(1)) riding.move(q)
    riding.lift()
    let leapt = false
    const sounds: string[] = []
    for (let t = 0; t < 30 && !idle(riding); t += DT) { riding.step(DT); sounds.push(...heard(riding)); leapt = leapt || riding.life.bearing.rear > 0.05 }
    expect(sounds.filter((s) => s === 'screech').length).toBe(1)
    expect(leapt).toBe(true)
  })

  it('never shows more than four riders, though some are fading as others are drawn in, and pushes a wave through the water', () => {
    for (const seed of [1, 2, 3]) {
      const rng = makeRng(seed)
      const toy = new Toy(freshWorld(null, seed), seed, true)
      let most = 0
      const look = () => { most = Math.max(most, toy.company.cast.riders.size + toy.company.cast.gone.length) }
      for (let t = 0; t < 7; t += DT) { toy.step(DT); look() }
      for (let i = 0; i < 40; i++) {
        const aim = toy.world.riders.find((r) => r.at === 'train') ?? toy.world.riders.find((r) => r.at === 'stop')
        const to = aim ? (aim.at === 'train' ? railAt(aim.home) : railAt(aim.stop)) : { x: between(rng, 150, 1050), y: between(rng, 200, 650) }
        draw(toy, line(at(toy), to, 20))
        for (let t = 0; t < 12 && !idle(toy); t += DT) { toy.step(DT); look() }
        for (let t = 0; t < 0.4; t += DT) { toy.step(DT); look() }
      }
      expect(most, `seed ${seed}`).toBeLessThanOrEqual(4)
    }
    const wet = begun(far)
    draw(wet, line({ x: 520, y: 470 }, { x: 760, y: 640 }))
    let ripples = 0
    for (let t = 0; t < 20 && !idle(wet); t += DT) { wet.step(DT); ripples = Math.max(ripples, wet.bits.list.filter((bit) => bit.kind === 'ripple').length) }
    expect(ripples).toBeGreaterThan(3)
  })

  it('still shows a rider getting home when the ride that brought it there is left out, and the engine at rest as the world has it', () => {
    const toy = begun()
    heard(toy)
    // Six taps in quick succession, the third beside the frog's home: more rides than the engine will show.
    const home = railAt('mid-4')
    const taps: Pt[] = [{ x: 600, y: 300 }, { x: 760, y: 330 }, { x: home.x - 150, y: home.y }, { x: 700, y: 600 }, { x: 420, y: 300 }, { x: 300, y: 560 }]
    for (const q of taps) { tap(toy, q); for (let i = 0; i < 6; i++) toy.step(DT) }
    expect(toy.world.riders.find((r) => r.kind === 'frog')!.at).not.toBe('train')
    let played = false
    const sounds: string[] = []
    for (let t = 0; t < 60 && !idle(toy); t += DT) { toy.step(DT); played = played || toy.company.playing; sounds.push(...heard(toy)) }
    expect(played).toBe(true)
    expect(sounds).toContain('home-frog')
    expect(toy.tint).toBe(toy.world.train.tint)
    expect(toy.stripes).toBe(toy.world.train.stripes)
  })

  it('waits for a rider that walks over, which is then aboard for the whole ride, however fast the finger moves', () => {
    const fresh = () => new Toy({ ...freshWorld(null, 3), position: 'long-way', ahead: 'long-way', shown: true, finished: true, riders: [seat('cat', 'top-4', 'mid-4', 'home'), seat('frog', 'mid-1', 'low-4', 'next')] }, 3, true)
    // A zigzag drawn at once, with no frame between the landing and the first move.
    const toy = fresh()
    const frog = life(toy, 'frog'), zz = zigzag({ x: 600, y: 330 })
    heard(toy)
    toy.press(zz[0])
    for (const q of zz.slice(1)) toy.move(q)
    toy.lift()
    const stood = at(toy)
    let walked = false, movedEarly = false, squeaks = 0
    for (let t = 0; t < 30 && !idle(toy); t += DT) {
      toy.step(DT)
      walked = walked || frog.doing === 'walk'
      if (frog.settledIn < 0 && distance(at(toy), stood) > 2) movedEarly = true
      squeaks += heard(toy).filter((s) => s === 'frog-squeak').length
    }
    expect(walked).toBe(true)
    expect(movedEarly).toBe(false)
    // The frog likes corners, and is aboard to squeak at every one the world tallied.
    expect(squeaks).toBe(toy.world.riders.find((r) => r.kind === 'frog')!.felt.corner)
    expect(squeaks).toBeGreaterThan(2)
  })

  it('waits for a rider it picks up in passing, and shows two that get out at one stop one after the other', () => {
    // The snail climbs in slowly; the line runs on past its stop into a zigzag, which it is aboard to feel.
    const toy = begun([seat('snail', 'mid-3', 'low-1', 'stop'), seat('chick', 'top-1', 'top-2', 'next')])
    const snail = life(toy, 'snail'), stop = railAt('mid-3')
    const on = [...line({ x: 540, y: 462 }, { x: stop.x - 190, y: stop.y }, 12), ...zigzag({ x: stop.x - 180, y: stop.y + 150 }, 4, 60, 90).map((q) => ({ x: q.x, y: q.y }))]
    toy.press(on[0])
    for (const q of on.slice(1)) toy.move(q)
    toy.lift()
    let rodeWhileClimbing = 0, last = at(toy)
    for (let t = 0; t < 40 && !idle(toy); t += DT) {
      toy.step(DT)
      if (snail.onItsWay) rodeWhileClimbing += distance(at(toy), last)
      last = at(toy)
    }
    expect(toy.world.riders.find((r) => r.kind === 'snail')!.at).not.toBe('stop')
    // No further than the one frame in which it was told to climb in.
    expect(rodeWhileClimbing).toBeLessThan(12)

    const fresh = freshWorld(null, 3)
    const two = new Toy({ ...fresh, position: 'two-at-once', ahead: 'two-at-once', shown: true, train: { ...fresh.train, x: 940, y: 300 }, riders: [{ ...seat('frog', 'mid-2', 'low-3', 'train'), chalk: 200 }, { ...seat('cat', 'mid-1', 'low-4', 'train'), chalk: 200 }, seat('snail', 'top-1', 'top-2', 'next')] }, 3, true)
    heard(two)
    draw(two, line(at(two), { x: 940, y: 690 }))
    const homes: string[] = []
    let both = false
    for (let t = 0; t < 60 && !idle(two); t += DT) {
      two.step(DT)
      homes.push(...heard(two).filter((s) => s === 'home-frog' || s === 'home-cat'))
      both = both || (life(two, 'frog').moving && life(two, 'cat').moving)
    }
    expect(homes.sort()).toEqual(['home-cat', 'home-frog'])
    expect(both).toBe(false)
  })

  it('lays the next rider out once when a drawn line begins a cycle, however the line then grows', () => {
    for (const seed of [1, 2, 3, 4, 5, 6]) {
      const toy = new Toy(freshWorld(null, seed), seed, true)
      for (let t = 0; t < 8; t += DT) toy.step(DT)
      const first = toy.world.riders[0]
      // The first mark of the child, which begins the cycle: a line up or down to the first home and on across the tar.
      const stroke = [...line(at(toy), railAt(first.home), 40), ...line(railAt(first.home), { x: 200, y: 200 }, 40).slice(1), ...line({ x: 200, y: 200 }, { x: 900, y: 650 }, 40).slice(1)]
      const seen: string[] = []
      let hopped = false
      toy.press(stroke[0])
      for (const q of stroke.slice(1)) {
        toy.move(q)
        toy.step(DT)
        const riders = toy.ahead?.riders ?? [], ahead = riders.find((r) => r.at === 'next')
        if (!ahead) continue
        const id = `${ahead.kind}:${ahead.stop}>${ahead.home}`
        if (seen[seen.length - 1] === id) continue
        // Someone new waits only once the one who waited before has been fetched by the line; nobody comes back.
        const before = seen[seen.length - 1]
        if (before && !riders.some((r) => `${r.kind}:${r.stop}>${r.home}` === before && r.at !== 'next')) hopped = true
        if (seen.includes(id)) hopped = true
        seen.push(id)
      }
      toy.lift()
      const made = toy.world.riders.map((r) => `${r.kind}:${r.stop}>${r.home}`)
      // Each rider is laid out once: the same all the way through the stroke, and still there when the finger lifts.
      expect(hopped, `seed ${seed}: ${seen.join(' ')}`).toBe(false)
      for (const id of seen) expect(made, `seed ${seed}`).toContain(id)
    }
  })

  it('has the rider lean out toward its home where the line stops short', () => {
    const toy = begun(far)
    draw(toy, line({ x: 520, y: 460 }, { x: 760, y: 560 }))
    let reached = false
    for (let t = 0; t < 30 && !idle(toy); t += DT) toy.step(DT)
    for (let t = 0; t < 0.5; t += DT) { toy.step(DT); reached = reached || life(toy, 'frog').doing === 'reach' }
    expect(toy.world.riders.find((r) => r.kind === 'frog')!.at).toBe('train')
    expect(reached).toBe(true)
  })
})
