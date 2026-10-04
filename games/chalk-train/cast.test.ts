import { describe, expect, it } from 'vitest'
import { Cast, RiderLife, type Seat } from './cast'
import { makeRng } from './rng'

const DT = 1 / 60
const stop: Seat = { in: 'stop', at: { x: 100, y: 400 } }, home: Seat = { in: 'home', at: { x: 900, y: 300 } }
const wagonAt = (index: number) => ({ x: 400 + index * 100, y: 460 })
const play = (life: RiderLife, seconds: number, each?: () => void) => { for (let t = 0; t < seconds; t += DT) { life.step(DT, wagonAt); each?.() } }

describe('a rider as it is seen', () => {
  it('stands where it is put and does its own waiting, reaching for its home now and then', () => {
    const life = new RiderLife('frog', stop, makeRng(1), false)
    life.gaze = { x: 900, y: 300 }
    const did = new Set<string>()
    play(life, 12, () => did.add(life.doing))
    expect([life.x, life.y]).toEqual([100, 400])
    expect(did).toEqual(new Set(['wait', 'reach']))
    expect(life.shown).toBe(1)
  })

  it('is drawn in when it is new, and is all there in half a second', () => {
    const life = new RiderLife('chick', stop, makeRng(1), true)
    expect(life.shown).toBe(0)
    expect(life.doing).toBe('drawn-in')
    play(life, 0.6)
    expect(life.shown).toBe(1)
  })

  it('climbs aboard without a jump and then rides with its wagon', () => {
    const life = new RiderLife('cat', stop, makeRng(1), false)
    life.go({ in: 'wagon', index: 1 }, 'board')
    expect(life.settledIn).toBe(-1)
    let last = { x: life.x, y: life.y }, jumps = 0
    play(life, 1.2, () => { if (Math.hypot(life.x - last.x, life.y - last.y) > 40) jumps++; last = { x: life.x, y: life.y } })
    expect(jumps).toBe(0)
    expect(life.settledIn).toBe(1)
    expect([life.x, life.y]).toEqual([500, 460])
    expect(life.doing).toBe('ride')
  })

  it('acts one piece and goes back to what it was doing', () => {
    const life = new RiderLife('snail', home, makeRng(1), false)
    life.act('greet')
    expect(life.doing).toBe('greet')
    play(life, 4)
    expect(life.doing).toBe('at-home')
  })

  it('is rubbed away with a wave and is gone in a second', () => {
    const life = new RiderLife('frog', home, makeRng(1), false)
    life.leave()
    expect(life.doing).toBe('wave')
    play(life, 1)
    expect(life.shown).toBe(0)
  })
})

describe('everyone on the tar', () => {
  const frogAt = (seat: Seat) => ({ id: 'frog', kind: 'frog' as const, seat, gaze: null })

  it('draws in who is new, leaves alone who is on the way somewhere, and rubs away who should not be there', () => {
    const cast = new Cast(makeRng(2))
    expect(cast.agree([frogAt(stop)])).toEqual(['frog'])
    const frog = cast.riders.get('frog')!
    frog.go({ in: 'wagon', index: 0 }, 'board')
    // The world already says home; the frog is still climbing aboard, and is left to finish.
    expect(cast.agree([frogAt(home)])).toEqual([])
    expect(frog.seat.in).toBe('wagon')
    for (let t = 0; t < 1.5; t += DT) cast.step(DT, wagonAt)
    cast.agree([frogAt(home)])
    expect(frog.seat.in).toBe('home')
    cast.agree([])
    expect(cast.riders.size).toBe(0)
    expect(cast.gone.length).toBe(1)
    for (let t = 0; t < 1.2; t += DT) cast.step(DT, wagonAt)
    expect(cast.gone).toEqual([])
  })

  it('puts everyone in place with nothing acted when the world is found as it was left', () => {
    const cast = new Cast(makeRng(2))
    expect(cast.agree([frogAt(home), { id: 'cat', kind: 'cat', seat: { in: 'wagon', index: 0 }, gaze: null }], true)).toEqual([])
    cast.step(DT, wagonAt)
    expect(cast.riders.get('frog')!.shown).toBe(1)
    expect(cast.riders.get('frog')!.doing).toBe('at-home')
    expect(cast.of('cat')!.settledIn).toBe(0)
    cast.agree([frogAt(home)], true)
    expect(cast.gone).toEqual([])
  })

  it('starts two riders somewhere else in their waiting, so they never wait in step', () => {
    const cast = new Cast(makeRng(3))
    cast.agree([frogAt(stop), { id: 'chick', kind: 'chick', seat: home, gaze: null }], true)
    const a = cast.riders.get('frog')!.bearing(0), b = cast.riders.get('chick')!.bearing(0)
    expect(a).not.toEqual(b)
  })

  it('takes the same kind of rider laid out again as a new rider: the old one is rubbed away and the new one drawn in', () => {
    const cast = new Cast(makeRng(4))
    cast.agree([{ id: 'snail:low-3>low-4', kind: 'snail', seat: home, gaze: null }], true)
    const old = cast.of('snail')!
    expect(cast.agree([{ id: 'snail:top-4>mid-1', kind: 'snail', seat: stop, gaze: null }])).toEqual(['snail'])
    expect(cast.gone).toEqual([old])
    expect(cast.of('snail')).not.toBe(old)
    expect(cast.of('snail')!.doing).toBe('drawn-in')
    expect(cast.riders.size).toBe(1)
  })
})
