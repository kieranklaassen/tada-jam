import { describe, expect, it } from 'vitest'
import { moveFor } from './guide'
import { BED, KNOB, MOON, WARDROBE, bedX, pegOf, touchedAt } from './layout'
import { freshNight, type NightRecord } from './night'
import { below, makeRng } from './rng'
import { Show } from './show'
import { GARMENTS, SETS, SLEEPERS, type Garment, type Sleeper } from './things'

const night = (more: Partial<NightRecord> = {}): NightRecord => ({ ...freshNight(true), lit: false, ...more })
const run = (show: Show, seconds: number) => { for (let i = 0; i < seconds * 60; i++) show.step(1 / 60) }
const tap = (show: Show, at: { x: number; y: number }) => { show.press(at); show.tap() }
const drag = (show: Show, from: { x: number; y: number }, to: { x: number; y: number }, end: 'drop' | 'back' = 'drop') => {
  show.press(from)
  for (let i = 1; i <= 8; i++) { show.dragMove(from, { x: from.x + (to.x - from.x) * i / 8, y: from.y + (to.y - from.y) * i / 8 }); run(show, 0.03) }
  show[end]()
}
const onBed = (bed: number) => ({ x: bedX(bed), y: BED.top + 80 })
const worn = (more: Partial<Record<Sleeper, Garment[]>>) => ({ ...freshNight(true).worn, ...more })

describe('the toy', () => {
  it('answers the finger when it lands, everywhere', () => {
    for (const at of [pegOf('bell'), onBed(2), KNOB, MOON, { x: 60, y: 200 }, { x: 590, y: 360 }, { x: 590, y: 810 }]) for (const lit of [true, false]) {
      const show = new Show(night({ lit }))
      show.press(at)
      expect(show.takeSounds().length).toBeGreaterThan(0)
    }
  })
  it('carries a garment to a bed, and it is on and heard there', () => {
    const show = new Show(night())
    drag(show, pegOf('bell'), onBed(0))
    show.takeSounds()
    run(show, 0.5)
    const sounds = show.takeSounds()
    expect(show.night.worn.goat).toEqual(['bell'])
    expect(show.pieces.bell.at).toBe('worn')
    expect(Math.max(...sounds.map((note) => note.pan ?? 0))).toBeLessThan(0)
  })
  it('does the same with two taps', () => {
    const show = new Show(night())
    tap(show, pegOf('pan'))
    expect(show.pieces.pan.at).toBe('lifted')
    tap(show, onBed(2))
    run(show, 0.5)
    expect(show.night.worn.hen).toEqual(['pan'])
  })
  it('lifts another instead, and hangs the same one back', () => {
    const show = new Show(night())
    tap(show, pegOf('pan'))
    tap(show, pegOf('gown'))
    expect([show.pieces.pan.at, show.pieces.gown.at]).toEqual(['peg', 'lifted'])
    tap(show, pegOf('gown'))
    expect(show.lifted).toBeNull()
    expect(show.pieces.gown.at).toBe('peg')
  })
  it('AE2: a drag out from a bed brings what went on last', () => {
    const show = new Show(night({ worn: worn({ hen: ['pan', 'boots'] }) }))
    show.press(onBed(2))
    show.dragMove(onBed(2), { x: bedX(2), y: 300 })
    expect(show.hand?.garment).toBe('boots')
    show.dragMove(onBed(2), { x: bedX(2), y: 180 })
    show.drop()
    expect(show.night.worn.hen).toEqual(['pan'])
  })
  it('puts a cancelled drag back where it came from', () => {
    const show = new Show(night({ worn: worn({ hen: ['pan'] }) }))
    const before = JSON.stringify(show.night.record())
    drag(show, onBed(2), onBed(4), 'back')
    drag(show, pegOf('bell'), onBed(4), 'back')
    expect(JSON.stringify(show.night.record())).toBe(before)
    expect([show.pieces.pan.at, show.pieces.bell.at]).toEqual(['worn', 'peg'])
  })
  it('does not take off and put on again what barely moved', () => {
    const show = new Show(night({ worn: worn({ hen: ['slippers'] }) }))
    show.press(onBed(2))
    show.dragMove(onBed(2), { x: bedX(2) + 30, y: BED.top + 80 })
    show.drop()
    expect(show.night.beds[2]).toBe('hen')
  })
  it('brings a garment home from its wearer by a tap on its peg', () => {
    const show = new Show(night({ worn: worn({ pig: ['skates'] }) }))
    tap(show, pegOf('skates'))
    expect(show.night.worn.pig).toEqual([])
    expect(show.pieces.skates.at).toBe('peg')
  })
  it('opens the wardrobe for good', () => {
    const show = new Show(night({ open: false }))
    expect(show.pieces.skates.at).toBe('away')
    show.press({ x: WARDROBE.x + 60, y: 200 })
    expect(show.night.open).toBe(true)
    expect(show.changed).toBe(2)
    expect(show.pieces.skates.at).toBe('peg')
  })
})

describe('the dark', () => {
  it('AE1: slippers walk the goat to the next bed and the other back, heard going left', () => {
    const show = new Show(night({ beds: ['pig', 'hippo', 'hen', 'goat', 'croc'] }))
    drag(show, pegOf('slippers'), onBed(3))
    expect(show.night.beds).toEqual(['pig', 'hippo', 'goat', 'hen', 'croc'])
    let least = 2000
    for (let i = 0; i < 5.5 * 60; i++) { show.step(1 / 60); least = Math.min(least, ...show.prints.map((print) => print.x)) }
    expect(least).toBeLessThan(bedX(3) - 100)
    expect([show.people.goat.bed, show.people.hen.bed]).toEqual([2, 3])
    expect(show.busy).toBe(false)
  })
  it('keeps every walk to five seconds', () => {
    for (const garment of ['slippers', 'skates'] as const) for (let bed = 0; bed < 5; bed++) {
      const show = new Show(night())
      drag(show, pegOf(garment), onBed(bed))
      run(show, 5.4)
      expect(show.busy, `${garment} ${bed}`).toBe(false)
      for (const sleeper of SLEEPERS) expect(show.people[sleeper].bed).toBe(show.night.bedOf(sleeper))
    }
  })
  it('dresses whoever is seen in a bed while a walk is heard', () => {
    const show = new Show(night())
    drag(show, pegOf('skates'), onBed(0))
    run(show, 1.0)
    // The goat is on its way to the last bed, where the pig still lies.
    expect(show.people.goat.bed).toBeNull()
    expect(show.whoAt(4)).toBe('pig')
    drag(show, pegOf('bell'), onBed(4))
    expect(show.night.worn.pig).toEqual(['bell'])
    expect(show.whoAt(0)).toBe('pig')
  })
  it('queues a second walk', () => {
    const show = new Show(night())
    drag(show, pegOf('skates'), onBed(0))
    drag(show, pegOf('slippers'), onBed(2))
    run(show, 11)
    for (const sleeper of SLEEPERS) expect(show.people[sleeper].bed).toBe(show.night.bedOf(sleeper))
  })
  it('sinks to silence when nobody touches it', () => {
    const show = new Show(night({ worn: worn({ goat: ['bell'] }) }))
    run(show, 5)
    expect(show.takeSounds().length).toBeGreaterThan(0)
    run(show, 22)
    show.takeSounds()
    run(show, 10)
    expect(show.takeSounds()).toEqual([])
  })
  it('moves and changes nothing by itself', () => {
    const show = new Show(night({ worn: worn({ goat: ['slippers'], pig: ['pan'] }) }))
    const before = JSON.stringify(show.night.record())
    run(show, 60)
    expect(JSON.stringify(show.night.record())).toBe(before)
    expect(show.changed).toBe(0)
  })
  it('has one that shivers, and none when all are dressed', () => {
    expect(new Show(night()).cold).toBe('hen')
    expect(new Show(night({ worn: worn({ hen: ['bell'] }) })).cold).toBe('hippo')
    const all = new Show(night({ worn: { goat: ['bell'], hippo: ['pan'], hen: ['tutu'], croc: ['gown'], pig: ['boots'] } }))
    expect([all.cold, all.allDressed]).toEqual([null, true])
  })
})

describe('the lamp', () => {
  const dressings: Record<string, Partial<Record<Sleeper, Garment[]>>> = {
    nobody: {}, one: { hippo: ['tutu'] }, all: { goat: ['bell'], hippo: ['slippers'], hen: ['boots', 'pan'], croc: ['armour'], pig: ['tutu'] },
    sets: { goat: [...SETS.knight], hen: [...SETS.lady], pig: [...SETS.rider] }, everything: { hen: [...GARMENTS] },
  }
  for (const [name, dressed] of Object.entries(dressings)) {
    it(`plays four to ten seconds on ${name}, and a touch ends it as itself`, () => {
      const show = new Show(night({ worn: worn(dressed) }))
      show.press(KNOB)
      expect(show.sceneLasts).toBeGreaterThanOrEqual(3.9)
      expect(show.sceneLasts).toBeLessThanOrEqual(10)
      const other = new Show(night({ worn: worn(dressed) }))
      other.press(KNOB)
      run(other, 0.4)
      run(show, 10.2)
      expect(show.scene).toBeNull()
      other.takeSounds()
      other.press(MOON)
      expect(other.scene).toBeNull()
      expect(other.takeSounds().length).toBeLessThan(12)
      for (const sleeper of SLEEPERS) {
        expect(other.people[sleeper].rest).toBe(show.people[sleeper].rest)
        expect(other.people[sleeper].act).toBe(show.people[sleeper].rest)
        expect([other.people[sleeper].up, other.light]).toEqual([1, 1])
      }
    })
    it(`goes out in four to six seconds on ${name}`, () => {
      const show = new Show(night({ lit: true, worn: worn(dressed) }))
      show.press(KNOB)
      expect(show.sceneLasts).toBeGreaterThanOrEqual(3.9)
      expect(show.sceneLasts).toBeLessThanOrEqual(6)
      show.press(MOON)
      run(show, 0.1)
      expect(show.light).toBe(0)
      for (const sleeper of SLEEPERS) expect(show.people[sleeper].up).toBe(0)
      for (const garment of GARMENTS) expect(show.pieces[garment].at).toBe(show.night.wearerOf(garment) ? 'worn' : 'peg')
    })
  }
  it('AE3: catches a walker on the floor, and it scuttles to its bed', () => {
    const show = new Show(night())
    drag(show, pegOf('skates'), onBed(0))
    run(show, 1.3)
    const x = show.people.goat.x
    show.press(KNOB)
    run(show, 0.5)
    expect(show.people.goat.act).toBe('caught')
    expect(show.people.goat.bed).toBeNull()
    expect(show.people.goat.x).toBe(x)
    run(show, 1.6)
    expect(show.people.goat.bed).toBe(4)
    expect(show.people.goat.x).toBe(bedX(4))
    expect(show.people.pig.bed).toBe(0)
  })
  it('AE4: keeps what is loved and throws the rest to the line', () => {
    const show = new Show(night({ lit: true, worn: worn({ goat: ['pan', 'gown'] }) }))
    show.press(KNOB)
    run(show, 7)
    expect(show.night.worn.goat).toEqual(['pan'])
    expect([show.pieces.pan.at, show.pieces.gown.at]).toEqual(['worn', 'peg'])
  })
  it('puts the lamp out with a touch on the cord while it plays', () => {
    const show = new Show(night({ worn: worn({ hippo: ['bell'] }) }))
    show.press(KNOB)
    run(show, 1)
    show.press(KNOB)
    expect(show.lit).toBe(false)
  })
  it('walks nobody by lamp light', () => {
    const show = new Show(night({ lit: true }))
    drag(show, pegOf('slippers'), onBed(3))
    run(show, 2)
    expect(show.night.beds[3]).toBe('croc')
    expect(show.walking).toBeNull()
  })
})

describe('found as left', () => {
  it('opens at any instant of a thousand acts as the record says, with nothing replayed', () => {
    const rng = makeRng(3), show = new Show(freshNight(false))
    const spots = [...GARMENTS.map(pegOf), ...[0, 1, 2, 3, 4].map(onBed), KNOB, MOON, { x: 60, y: 200 }, { x: 590, y: 360 }]
    for (let i = 0; i < 1000; i++) {
      const from = spots[below(rng, spots.length)], to = spots[below(rng, spots.length)]
      if (below(rng, 2) === 0) tap(show, from); else drag(show, from, to, below(rng, 6) === 0 ? 'back' : 'drop')
      run(show, rng.next() * 1.5)
      const again = new Show(JSON.parse(JSON.stringify(show.night.record())))
      expect(again.scene).toBeNull()
      expect(again.busy).toBe(false)
      for (const sleeper of SLEEPERS) {
        expect(again.people[sleeper].bed).toBe(show.night.bedOf(sleeper))
        expect(again.seenOn(sleeper)).toEqual(show.night.worn[sleeper])
      }
      for (const garment of GARMENTS) for (const value of [show.pieces[garment].x, show.pieces[garment].y]) expect(Number.isFinite(value) && Math.abs(value) < 3000).toBe(true)
      show.takeSounds()
    }
    run(show, 20)
    for (const sleeper of SLEEPERS) {
      expect(show.people[sleeper].bed).toBe(show.night.bedOf(sleeper))
      expect(show.seenOn(sleeper)).toEqual(show.night.worn[sleeper])
    }
  })
})

describe('the ghost hand', () => {
  it('shows a move that can be made, in every state', () => {
    for (const lit of [true, false]) for (const open of [true, false]) for (const dressed of [{}, { hen: ['bell'] }, { goat: ['bell'], hippo: ['pan'], hen: ['tutu'], croc: ['armour'], pig: ['boots'] }] as Partial<Record<Sleeper, Garment[]>>[]) {
      const show = new Show(night({ lit, open, worn: worn(dressed) }))
      for (let index = 0; index < 4; index++) {
        const move = moveFor(show, index)
        const before = JSON.stringify(show.night.record())
        const other = new Show(JSON.parse(before))
        if (move.to) drag(other, move.from, move.to); else tap(other, move.from)
        expect(JSON.stringify(other.night.record())).not.toBe(before)
      }
    }
  })
})

describe('the layout', () => {
  it('gives every target room of its own', () => {
    for (const garment of GARMENTS) {
      expect(touchedAt(pegOf(garment), () => true, () => false)).toEqual({ what: 'garment', garment })
      for (const other of GARMENTS) if (other !== garment) expect(Math.abs(pegOf(garment).x - pegOf(other).x)).toBeGreaterThanOrEqual(90)
      expect(touchedAt(pegOf(garment), () => false, () => true)).toEqual({ what: 'peg', garment })
    }
    for (let bed = 0; bed < 5; bed++) expect(touchedAt(onBed(bed), () => true, () => false)).toEqual({ what: 'bed', bed })
    expect(touchedAt(KNOB, () => true, () => false).what).toBe('cord')
    expect(touchedAt({ x: MOON.x, y: MOON.y }, () => true, () => false).what).toBe('moon')
  })
})
