import { describe, expect, it } from 'vitest'
import { Cast, KNOCK, LICK, MUMF, OON, PEEP, PIB, POSED_AFTER, lampAt, type CastCue } from './cast'
import { BREAD, CHEESE, CHILLI, ICE, JELLY } from './kinds'
import { LAMP } from './layout'
import { makeRng } from './rng'

const run = (cast: Cast, seconds: number, frame = 1 / 60): void => {
  for (let t = 0; t < seconds; t += frame) cast.step(frame)
}

const numbers = (cast: Cast): number[] => [cast.seat, cast.seat.twitch, cast.seat.level, cast.win, cast.win.twitch, cast.mouse, cast.lamp, cast.bag].flatMap((part) => Object.values(part).filter((v): v is number => typeof v === 'number'))

describe('those in the shop', () => {
  it('are alive with nobody touching anything: each moves in its own time', () => {
    const cast = new Cast(makeRng(1))
    const seen = { jaw: new Set<string>(), tilt: new Set<string>(), fog: new Set<string>(), tail: new Set<string>(), lamp: new Set<string>(), blinks: 0, winks: 0, sniffs: 0, wipes: 0 }
    for (let t = 0; t < 12; t += 1 / 60) {
      cast.step(1 / 60)
      seen.jaw.add(cast.seat.jaw.toFixed(2))
      seen.tilt.add(cast.win.twitch.tiltTo.toFixed(3))
      seen.fog.add(cast.win.fog.toFixed(1))
      seen.tail.add(cast.mouse.tail.toFixed(1))
      seen.lamp.add(cast.lamp.ang.toFixed(3))
      if (cast.seat.lid > 0.8) seen.blinks += 1
      if (cast.win.twitch.wink > 0.8) seen.winks += 1
      if (cast.mouse.sniffFor > 0) seen.sniffs += 1
      if (cast.win.wipe >= 0) seen.wipes += 1
    }
    expect(seen.jaw.size).toBeGreaterThan(3)
    expect(seen.tilt.size).toBeGreaterThan(4)
    expect(seen.fog.size).toBeGreaterThan(5)
    expect(seen.tail.size).toBeGreaterThan(10)
    expect(seen.lamp.size).toBeGreaterThan(5)
    for (const count of [seen.blinks, seen.winks, seen.sniffs, seen.wipes]) expect(count).toBeGreaterThan(0)
  })

  it('stands still while no time passes', () => {
    const cast = new Cast(makeRng(1))
    run(cast, 2)
    const before = JSON.stringify(numbers(cast))
    cast.step(0)
    cast.step(-1)
    cast.step(NaN)
    expect(JSON.stringify(numbers(cast))).toBe(before)
  })

  it('watches what it is told to watch', () => {
    const cast = new Cast(makeRng(1))
    cast.look = { x: 0, y: 0 }
    run(cast, 2)
    const left = cast.seat.eyeX
    cast.look = { x: 1180, y: 820 }
    run(cast, 2)
    expect(cast.seat.eyeX).toBeGreaterThan(left)
    expect(cast.win.eyeX).toBeGreaterThan(0.5)
    expect(cast.mouse.turn).toBeGreaterThan(0.9)
  })

  it('answers a let-go, a join, a burp and each poke, each in its own way', () => {
    const fresh = () => {
      const cast = new Cast(makeRng(1))
      run(cast, 1)
      return cast
    }
    let cast = fresh()
    cast.on({ what: 'drop' })
    run(cast, 0.4)
    expect(cast.seat.jaw).toBeGreaterThan(0.75)

    cast = fresh()
    cast.on({ what: 'join' })
    expect(cast.seat.lick).toBe(LICK)
    run(cast, 0.4)
    expect(cast.seat.jaw).toBeLessThan(0.4)
    run(cast, 1)
    expect(cast.seat.lick).toBe(0)

    cast = fresh()
    cast.on({ what: 'burp' })
    run(cast, 0.6)
    expect(cast.seat.lean).toBeGreaterThan(0.6)
    expect(cast.mouse.hide).toBeGreaterThan(0.8)
    run(cast, 6)
    expect(Math.abs(cast.seat.lean)).toBeLessThan(0.05)
    expect(cast.mouse.hide).toBeLessThan(0.05)

    cast = fresh()
    cast.on({ what: 'poke-seat' })
    run(cast, 0.1)
    expect(Math.abs(cast.seat.poke)).toBeGreaterThan(0.1)

    cast = fresh()
    cast.on({ what: 'poke-window' })
    expect(cast.win.knock).toBe(KNOCK)

    cast = fresh()
    cast.on({ what: 'poke-mouse' })
    run(cast, 0.3)
    expect(cast.mouse.hide).toBeGreaterThan(0.8)
    run(cast, 0.9)
    // It looks out of the bag before it comes back.
    expect(cast.mouse.hide).toBeGreaterThan(0.3)
    expect(cast.mouse.hide).toBeLessThan(0.8)

    cast = fresh()
    const before = Math.abs(cast.lamp.angv)
    cast.on({ what: 'poke-lamp' })
    expect(Math.abs(cast.lamp.angv)).toBeGreaterThan(before + 1)

    cast = fresh()
    cast.on({ what: 'rustle' })
    run(cast, 0.05)
    expect(Math.abs(cast.bag.shake)).toBeGreaterThan(0.05)
  })

  it('keeps every number finite through long frames and many pokes', () => {
    const cast = new Cast(makeRng(5))
    const cues: CastCue[] = [{ what: 'drop' }, { what: 'join' }, { what: 'burp' }, { what: 'poke-seat' }, { what: 'poke-window' }, { what: 'poke-mouse' }, { what: 'poke-lamp' }, { what: 'rustle' }, { what: 'peek' }, { what: 'pat' }, { what: 'eat', k: BREAD | ICE }, { what: 'swallow' }, { what: 'sit', seat: PIB, pose: 0 }, { what: 'sit', seat: OON, pose: CHILLI }]
    for (let i = 0; i < 400; i++) {
      cast.on(cues[i % cues.length])
      cast.step(i % 3 === 0 ? 0.1 : 1 / 60)
      for (const value of numbers(cast)) expect(Number.isFinite(value)).toBe(true)
    }
    expect(Math.abs(cast.lamp.ang)).toBeLessThan(Math.PI)
  })

  it('answers a poke as the one who sits there: a belly that wobbles on, a neck that snaps back, one eye that opens', () => {
    const poked = (who: number) => {
      const cast = new Cast(makeRng(1))
      cast.sit(who, 0)
      run(cast, 1)
      cast.on({ what: 'poke-seat' })
      run(cast, 0.05)
      const soon = Math.abs(cast.seat.poke)
      run(cast, 0.9)
      return { soon, later: Math.abs(cast.seat.poke), peep: cast.seat.peep, cast }
    }
    const mumf = poked(MUMF), pib = poked(PIB), oon = poked(OON)
    expect(mumf.soon).toBeGreaterThan(0.2)
    expect(mumf.later).toBeGreaterThan(0.01)
    expect(pib.soon).toBeGreaterThan(0.3)
    expect(pib.later).toBeLessThan(0.01)
    expect(oon.soon).toBe(0)
    const again = new Cast(makeRng(1))
    again.sit(OON, 0)
    again.on({ what: 'poke-seat' })
    expect(again.seat.peep).toBe(PEEP)
    run(again, PEEP + 0.1)
    expect(again.seat.peep).toBe(0)
  })

  it('answers a mouthful with the things in it, all at once, and keeps the pose once it has swallowed', () => {
    const cast = new Cast(makeRng(1))
    cast.on({ what: 'eat', k: CHEESE | JELLY | ICE })
    expect(cast.seat.clock).toBe(0)
    run(cast, 1.5)
    expect(cast.seat.level.map((level) => Math.round(level))).toEqual([0, 1, 0, 0, 1, 1])
    expect(cast.seat.calm).toBeLessThan(0.01)
    // The next mouthful takes the place of this one.
    cast.on({ what: 'eat', k: BREAD })
    run(cast, 1.5)
    expect(cast.seat.level.map((level) => Math.round(level))).toEqual([1, 0, 0, 0, 0, 0])
    cast.on({ what: 'swallow' })
    run(cast, 3)
    expect(cast.seat.posed).toBe(true)
    expect(cast.seat.calm).toBeGreaterThan(0.99)
    run(cast, 30)
    expect(cast.seat.level.map((level) => Math.round(level))).toEqual([1, 0, 0, 0, 0, 0])
  })

  it('is found in the pose it kept: the pose of a mouthful watched and of the same one found are the same', () => {
    const watched = new Cast(makeRng(1))
    watched.sit(OON, 0)
    watched.on({ what: 'eat', k: CHILLI | ICE })
    run(watched, 2)
    watched.on({ what: 'swallow' })
    run(watched, 4)
    const found = new Cast(makeRng(1))
    found.sit(OON, CHILLI | ICE)
    expect(found.seat.clock).toBe(POSED_AFTER)
    expect(found.seat.posed).toBe(true)
    expect(found.seat.calm).toBe(1)
    expect(found.seat.level).toEqual(watched.seat.level.map((level) => Math.round(level)))
    expect(watched.seat.level.every((level, i) => Math.abs(level - found.seat.level[i]) < 0.001)).toBe(true)
    expect(watched.seat.calm).toBeGreaterThan(0.999)
  })

  it('seats the next one with nothing of the last one left on it', () => {
    const cast = new Cast(makeRng(1))
    cast.on({ what: 'eat', k: ICE })
    cast.on({ what: 'swallow' })
    cast.on({ what: 'pat' })
    run(cast, 1)
    cast.on({ what: 'sit', seat: PIB, pose: 0 })
    expect(cast.seat.who).toBe(PIB)
    expect(cast.seat.posed).toBe(false)
    expect(cast.seat.level).toEqual([0, 0, 0, 0, 0, 0])
    expect(cast.seat.pat).toBe(0)
  })

  it('hangs the lamp on its cord', () => {
    expect(lampAt(0)).toEqual({ x: LAMP.x, y: LAMP.y })
    const swung = lampAt(0.3)
    expect(Math.hypot(swung.x - LAMP.x, swung.y)).toBeCloseTo(LAMP.y)
    expect(swung.x).toBeGreaterThan(LAMP.x)
  })
})
