import { describe, expect, it } from 'vitest'
import { CAST, WHO } from './cast'
import { BODY_Y, DOOR, HEAD, MAGPIE, MICE, NECK, STRIP, TRAY, WINDOW, centre, inside, trayPoint, type Box } from './layout'
import { Play } from './play'
import { KINDS, LENGTH, type Kind, type Piece } from './row'
import { deserialize, freshSave, type Save } from './save'

// Every touch here goes the way the Mount sends it.

const ALL = { shown: ['touching', 'long', 'duck', 'shoe', 'mix', 'two'] as Save['shown'], open: { sausage: true, shoe: true, duck: true } }
const make = (more: Partial<Save> = {}): Play => new Play({ ...freshSave(null), ...ALL, ...more }).settled()
let clock = 0
const run = (p: Play, s: number): void => { for (let t = 0; t < s; t += 1 / 60) { clock += 1000 / 60; p.advance(1 / 60, clock) } }
const tap = (p: Play, x: number, y: number): void => { p.down(1, { x, y }, clock); clock += 40; p.up(1, { x, y }, clock) }
const drag = (p: Play, x: number, y: number, tx: number, ty: number, end = true): void => {
  p.down(1, { x, y }, clock)
  for (let i = 1; i <= 12; i++) { clock += 16; p.move(1, { x: x + ((tx - x) * i) / 12, y: y + ((ty - y) * i) / 12 }) }
  if (end) { p.up(1, { x: tx, y: ty }, clock); run(p, 0.4) }
}
const heard = (p: Play): string => { const s = JSON.stringify(p.heard); p.heard = []; return s }
const x = (r: Piece[]): number[] => r.map((q) => q.x)
const lay = (k: Kind, n: number): Piece[] => Array.from({ length: n }, (_, i) => ({ k, x: i * LENGTH[k] }))

describe('laying', () => {
  it('a drag from a tray lays a piece where it is let go, with its ring at once', () => {
    const p = make()
    const at = trayPoint('sausage')
    drag(p, at.x, at.y, NECK + 80, STRIP.mid)
    expect(p.save.row).toEqual([{ k: 'sausage', x: 0 }])
    expect(p.fit?.short).toBe(true)
    expect(p.look(p.save.row[0]).born).toBeGreaterThanOrEqual(0)
    expect(p.changed).toBe(true)
  })
  it('taps alone can dress the crocodile closely', () => {
    const p = make()
    const at = trayPoint('sausage')
    for (let i = 0; i < 5; i++) {
      tap(p, at.x, at.y); run(p, 0.6)
      const q = p.save.row[i]
      expect(p.fit?.holes.length).toBeGreaterThan(0)
      tap(p, NECK + q.x + 60, STRIP.mid); run(p, 1)
    }
    expect(p.fit?.close).toBe(true)
    expect(p.outcome()).toBe('well')
  })
  it('a slide shoves the train and its rings, and a cancel puts everything back', () => {
    const p = make({ row: lay('duck', 3) })
    const before = x(p.save.row)
    drag(p, NECK + 20, STRIP.mid, NECK + 220, STRIP.mid + 8, false)
    expect(p.save.row[0].x).toBeGreaterThan(150)
    expect(x(p.saved().row)).toEqual(before)
    p.cancel(1)
    expect(x(p.save.row)).toEqual(before)
  })
  it('a piece lifted off and let go on another lies on it; in its tray it is home', () => {
    const p = make({ row: lay('duck', 2) })
    drag(p, NECK + 100, STRIP.mid, NECK + 100, STRIP.mid - 160, false)
    expect(p.hand?.what).toBe('piece')
    expect(p.saved().row.length).toBe(2)
    p.move(1, { x: NECK + 66, y: STRIP.mid - 10 }); p.up(1, { x: NECK + 66, y: STRIP.mid - 10 }, clock); run(p, 0.5)
    expect(p.fit?.bulges.length).toBe(1)
    const home = trayPoint('duck')
    drag(p, NECK + 40, STRIP.mid, home.x, home.y)
    expect(p.save.row.length).toBe(1)
  })
  it('a put-away at any instant of a carry loses nothing', () => {
    const p = make({ row: lay('shoe', 3) })
    drag(p, NECK + 160, STRIP.mid, 600, 200, false)
    expect(p.saved().row.length).toBe(3)
    p.clear()
    expect(p.save.row.length).toBe(3)
    const q = make()
    drag(q, trayPoint('duck').x, trayPoint('duck').y, 500, 300, false)
    q.clear()
    expect(q.save.row).toEqual([])
  })
  it('a lifted drag is given 0.3 s to go on', () => {
    const p = make()
    drag(p, trayPoint('duck').x, trayPoint('duck').y, 600, 300, false)
    p.up(1, { x: 600, y: 300 }, clock)
    clock += 200
    p.down(2, { x: 610, y: 320 }, clock)
    p.move(2, { x: NECK + 40, y: STRIP.mid }); p.up(2, { x: NECK + 40, y: STRIP.mid }, clock); run(p, 0.5)
    expect(p.save.row).toEqual([{ k: 'duck', x: 0 }])
  })
  it('a full strip sends a piece back, seen and heard', () => {
    const p = make({ row: Array.from({ length: 14 }, (_, i) => ({ k: 'duck' as Kind, x: i * 60 })) })
    tap(p, trayPoint('duck').x, trayPoint('duck').y)
    expect(p.save.row.length).toBe(14)
    expect(p.flights.length).toBe(1)
    expect(p.heard.length).toBeGreaterThan(0)
  })
  it('a resting finger hands over; a second finger on a carry takes nothing', () => {
    const p = make()
    p.down(1, { x: 600, y: 300 }, clock)
    run(p, 1.2)
    p.down(2, trayPoint('sausage'), clock); clock += 30; p.up(2, trayPoint('sausage'), clock)
    expect(p.save.row.length).toBe(1)
    const q = make()
    drag(q, trayPoint('duck').x, trayPoint('duck').y, 600, 300, false)
    heard(q)
    q.down(2, { x: 1000, y: 100 }, clock)
    expect(q.hand).not.toBeNull()
    expect(q.heard.length).toBeGreaterThan(0)
  })
  it('a covered tray tears open on a tap and lays nothing', () => {
    const p = make({ open: { sausage: true, shoe: false, duck: false } })
    tap(p, trayPoint('shoe').x, trayPoint('shoe').y)
    expect(p.save.open.shoe).toBe(true)
    expect(p.save.row).toEqual([])
    expect(p.urgent).toBe(true)
  })
})

describe('the next one', () => {
  const door = centre(DOOR)
  it('comes only once the tail is covered, and never by itself', () => {
    const p = make({ row: lay('sausage', 4) })
    tap(p, door.x, door.y - 80); run(p, 1)
    expect(p.save.on).toEqual(['croc'])
    expect(p.acts.get('on0')?.kind).toBe('cold')
    p.save.row.push({ k: 'sausage', x: 576 })
    run(p, 60)
    expect(p.save.on).toEqual(['croc'])
    tap(p, door.x, door.y - 80)
    expect(p.save.on).toEqual(['dog'])
    expect(p.save.position).toBe('dog-shorter')
    expect(p.save.row).toEqual([])
    expect(p.scene?.is).toBe('next')
    expect(p.urgent).toBe(true)
  })
  it('is saved as it begins and does not replay', () => {
    const p = make({ row: lay('sausage', 5) })
    tap(p, door.x, door.y - 80)
    const again = new Play(deserialize(JSON.parse(JSON.stringify(p.saved())))).settled()
    expect(again.scene).toBeNull()
    expect(again.save).toEqual(p.save)
    run(again, 10)
    expect(again.save.on).toEqual(['dog'])
  })
  it('gives way to a touch, which is then an ordinary touch', () => {
    const p = make({ row: lay('sausage', 5) })
    tap(p, door.x, door.y - 80); run(p, 1)
    tap(p, trayPoint('sausage').x, trayPoint('sausage').y)
    expect(p.scene).toBeNull()
    expect(p.save.row.length).toBe(1)
  })
  it('a fit judges: close, one fault, three', () => {
    expect(make({ row: lay('sausage', 5) }).outcome()).toBe('well')
    expect(make({ row: [...lay('sausage', 5), { k: 'duck', x: 720 }] }).outcome()).toBe('mixed')
    expect(make({ row: [{ k: 'duck', x: 40 }, { k: 'duck', x: 200 }, { k: 'sausage', x: 620 }] }).outcome()).toBe('badly')
  })
  it('two share a jumper when the one at the door is carried to the table', () => {
    const p = make({ on: ['dog'], wait: ['snail'], row: lay('duck', 6) })
    drag(p, door.x, 150, 760, BODY_Y)
    expect(p.save.on).toEqual(['dog', 'snail'])
    expect(p.fit?.short).toBe(true)
    const q = make({ on: ['croc'], wait: ['seal'] })
    heard(q)
    drag(q, door.x, 150, 760, BODY_Y)
    expect(q.save.on).toEqual(['croc'])
    expect(q.heard.length).toBeGreaterThan(0)
  })
})

describe('showing', () => {
  it('is owed until the first touch, shown once, and the touch is answered all the same', () => {
    const p = new Play(freshSave(null)).settled()
    tap(p, trayPoint('sausage').x, trayPoint('sausage').y)
    expect(p.scene?.is).toBe('show')
    expect(p.save.row.length).toBe(1)
    expect(p.saved().shown).toEqual(['touching'])
    tap(p, trayPoint('sausage').x, trayPoint('sausage').y)
    expect(p.scene).toBeNull()
    run(p, 10)
    expect(p.scene).toBeNull()
  })
})

describe('no silent cell', () => {
  it('every piece let go on every customer has its own act and its own voice', () => {
    const voices = new Set<string>(), acts = new Set<string>()
    for (const w of WHO) for (const k of KINDS) {
      const p = make({ on: [w] })
      drag(p, trayPoint(k).x, trayPoint(k).y, HEAD.x + 100, HEAD.y + 80, false)
      heard(p)
      p.up(1, { x: HEAD.x + 100, y: HEAD.y + 80 }, clock)
      for (let t = 0; t < 0.33; t += 1 / 60) { clock += 1000 / 60; p.advance(1 / 60, clock) }
      voices.add(heard(p)); acts.add(p.acts.get('on0')!.kind)
      expect(p.save.row).toEqual([])
      expect(CAST[w].turn[k]).toBe(p.acts.get('on0')!.kind)
    }
    expect(voices.size).toBe(15)
    expect(acts.size).toBe(15)
  })
  it('a touch anywhere sounds when it lands and changes nothing it should not', () => {
    for (let y = 20; y < 820; y += 40) for (let px = 20; px < 1180; px += 40) {
      const p = make({ row: lay('duck', 2) })
      p.down(1, { x: px, y }, clock)
      expect(p.heard.length, `${px},${y}`).toBeGreaterThan(0)
      expect(p.sparks.length).toBe(1)
      p.cancel(1)
      expect(x(p.save.row)).toEqual([0, 72])
    }
  })
  it('taps on each thing sound different', () => {
    const said = new Set<string>()
    const at: [number, number][] = [[NECK + 150, 300], [MAGPIE.x + 100, 700], [MICE.x + 20, 420], [WINDOW.x + 60, 120], [DOOR.x + 120, 120], [NECK + 40, STRIP.mid], [600, 170], [NECK + 30, 400]]
    for (const [px, y] of at) { const p = make({ row: lay('duck', 2) }); tap(p, px, y); said.add(heard(p)) }
    expect(said.size).toBe(at.length)
  })
  it('a pull upward on the jumper sends every piece home', () => {
    const p = make({ row: lay('sausage', 2) })
    drag(p, NECK + 100, 400, NECK + 110, 260)
    expect(p.save.row).toEqual([])
  })
  it('the magpie plays the rings from neck to end', () => {
    const p = make({ row: [{ k: 'duck', x: 144 }, { k: 'sausage', x: 0 }] })
    tap(p, MAGPIE.x + 100, 700)
    expect(p.scene?.is).toBe('tune')
    heard(p); run(p, 0.35)
    expect(p.acts.get('ring')?.kind).toBe('1')
    run(p, 3)
    expect(p.scene).toBeNull()
  })
})

describe('targets', () => {
  it('stand clear of each other, above the bottom strip, and are big enough', () => {
    const boxes: [string, Box][] = [['sausage', TRAY.sausage], ['shoe', TRAY.shoe], ['duck', TRAY.duck], ['magpie', MAGPIE], ['window', WINDOW], ['door', DOOR], ['strip', { x: NECK, y: STRIP.y, w: 900, h: STRIP.h }]]
    for (const [n, a] of boxes) {
      expect(a.y + a.h, n).toBeLessThanOrEqual(790)
      expect(Math.min(a.w, a.h), n).toBeGreaterThanOrEqual(100)
      for (const [m, b] of boxes) if (n < m) expect(a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y, `${n} ${m}`).toBe(true)
    }
  })
  it('the middle of each is that thing, and whoever lies there covers none of them', () => {
    for (const w of WHO) {
      const p = make({ on: [w] })
      for (const k of KINDS) expect(p.under(trayPoint(k))).toEqual({ is: 'tray', k })
      expect(p.under(centre(MAGPIE)).is).toBe('magpie')
      expect(p.under(centre(WINDOW)).is).toBe('window')
      expect(p.under({ x: DOOR.x + 130, y: DOOR.y + 130 }).is).toBe('wait')
      expect(p.under({ x: NECK + 60, y: 400 }).is).toBe('customer')
      expect(inside(HEAD, { x: NECK - 70, y: 340 })).toBe(true)
    }
  })
})
