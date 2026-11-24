import { describe, expect, it } from 'vitest'
import { CAST, type Id } from './cast'
import { Game, PAINTING } from './game'
import { KEY, MAESTRO, SPOTS, STEPS, type P3 } from './layout'
import { LIFT_GRACE_S, Play, REST_S } from './play'
import { freshTable, loadTable, placeOf, saveTable, seated, type Place, type Table } from './table'

// Everything here goes in by fingers on pixels, as the Mount sends them.

const W = 1180, H = 820
function open(raw: unknown = null, w = W, h = H): Play {
  const play = new Play(new Game(raw === null ? freshTable(null) : loadTable(raw, null)))
  play.size(w, h)
  return play
}
const full = (more: Partial<Table> = {}): object => ({ ...saveTable(freshTable(null)), spots: ['elephant', 'hen', 'hippo', 'giraffe'], homes: ['pig', 'crocodile', 'board', null, null, null], ...more })
const run = (play: Play, seconds: number): void => { for (let t = 0; t < seconds - 1e-9; t += 1 / 60) play.step(1 / 60) }
const px = (play: Play, p: P3): [number, number] => { const s = play.aim.px(p); return [s.x, s.y] }
const body = (play: Play, id: Id): [number, number] => { const p = play.game.poses[id]; return px(play, { x: p.x, y: p.y + 1.5, z: p.z }) }
const spot = (play: Play, n: number): [number, number] => px(play, { ...SPOTS[n], y: 0.75 })
const step = (play: Play, n: number): [number, number] => px(play, { ...STEPS[n], y: STEPS[n].y + 0.75 })
const tap = (play: Play, at: [number, number], id = 1): void => { play.down(id, ...at); play.step(1 / 60); play.up(id, ...at) }
const maestro = (play: Play): [number, number] => px(play, { x: MAESTRO.x + 0.2, y: 4.2, z: MAESTRO.z })
const snap = (play: Play): string => JSON.stringify(saveTable(play.game.table))
function drag(play: Play, from: [number, number], to: [number, number], id = 1): void {
  play.down(id, ...from)
  for (let i = 1; i <= 10; i++) { play.move(id, from[0] + (to[0] - from[0]) * i / 10, from[1] + (to[1] - from[1]) * i / 10); play.step(1 / 60) }
}
const place = (play: Play, id: Id): Place => placeOf(play.game.table, id)

describe('turning', () => {
  it('answers when the finger lands and turns when it lifts', () => {
    const play = open(), before = snap(play)
    play.down(1, ...body(play, 'elephant'))
    expect(play.game.cues.length).toBeGreaterThan(0)
    expect(snap(play)).toBe(before)
    run(play, 0.1)
    expect(play.game.poses.elephant.squash).toBeLessThan(0.97)
    play.up(1, ...body(play, 'elephant'))
    expect(play.game.table.turns.elephant).toBe(1)
    run(play, 1.5)
    expect(play.game.poses.elephant.yaw).toBeCloseTo(Math.PI / 2, 2)
  })
  it('goes all the way round in four taps, however fast they come, and always the same way', () => {
    const play = open()
    let last = -1
    for (let i = 0; i < 4; i++) tap(play, body(play, 'elephant'))
    for (let i = 0; i < 90; i++) { play.step(1 / 60); expect(play.game.poses.elephant.yaw).toBeGreaterThanOrEqual(last - 0.02); last = play.game.poses.elephant.yaw }
    expect(play.game.table.turns.elephant).toBe(0)
    expect(last).toBeCloseTo(Math.PI * 2, 1)
  })
  it('lets a tap slip a little', () => {
    const play = open(), [x, y] = body(play, 'elephant')
    play.down(1, x, y); play.move(1, x + 9, y + 9); play.up(1, x + 9, y + 9)
    expect(play.game.table.turns.elephant).toBe(1)
    expect(play.game.hand).toBeNull()
  })
  it('changes the painter\'s face to what has come round to him', () => {
    const play = open()
    tap(play, body(play, 'elephant')); run(play, 1)
    expect(play.game.maestro.arm).toBeGreaterThan(0.7)
    tap(play, body(play, 'elephant')); run(play, 1)
    expect(play.game.maestro.moustache).toBeGreaterThan(0.7)
    tap(play, body(play, 'elephant')); tap(play, body(play, 'elephant')); run(play, 1.2)
    expect(play.game.maestro.monocle).toBeGreaterThan(0.6)
    run(play, 4)
    expect(play.game.maestro.monocle).toBeLessThan(0.05)
  })
})

describe('painting', () => {
  it('saves its whole outcome at once and keeps it whenever it is put away', () => {
    const times = [0, 0.3, 1, 2.5, 3, 3.6, 5]
    let outcome = ''
    for (const t of times) {
      const play = open()
      tap(play, maestro(play))
      expect(play.game.urgent).toBe(true)
      const saved = snap(play)
      outcome ||= saved
      expect(saved).toBe(outcome)
      run(play, t)
      play.park()
      expect(snap(play)).toBe(outcome)
      const back = open(JSON.parse(saved))
      for (const key of ['x', 'y', 'z', 'yaw', 'size', 'tile'] as const) expect(back.game.easel[key], `${key} at ${t}`).toBeCloseTo(play.game.easel[key], 5)
      expect(back.game.nails).toEqual(play.game.nails)
      for (const id of CAST) expect(back.game.poses[id].yaw).toBeCloseTo(play.game.poses[id].yaw, 5)
      expect(back.game.scene).toBeNull()
      expect(back.game.cues).toHaveLength(0)
    }
  })
  it('shows the picture and asks the view for it once', () => {
    const play = open()
    tap(play, maestro(play)); run(play, PAINTING.answer + 0.1)
    expect(play.game.easel.tile).toBe(0)
    expect(play.game.wanted).toHaveLength(1)
    run(play, 6)
    expect(play.game.scene?.running).toBe(false)
    expect(play.game.wanted).toHaveLength(1)
    expect(play.game.table.finished).toBe(true)
  })
  it('is landed by any touch, which is answered and does nothing else; the next touch is ordinary', () => {
    for (const t of [0.2, 1.4, 2.6, 3.1]) {
      const play = open()
      tap(play, maestro(play)); run(play, t)
      const before = snap(play)
      play.game.cues.length = 0
      tap(play, body(play, 'elephant'))
      expect(play.game.hushed).toBe(true)
      expect(play.game.cues.filter((cue) => cue.scene)).toHaveLength(0)
      expect(play.game.cues.length).toBeGreaterThan(0)
      expect(snap(play)).toBe(before)
      expect(play.game.easel.tile).toBe(0)
      expect(play.game.scene!.running).toBe(false)
      run(play, 0.5)
      tap(play, body(play, 'elephant'))
      expect(play.game.table.turns.elephant).toBe(1)
      expect(play.game.table.finished).toBe(false)
    }
  })
  it('once it has been seen, is ended by a touch that is only a touch', () => {
    const play = open()
    tap(play, maestro(play)); run(play, 4.4)
    play.game.cues.length = 0
    tap(play, body(play, 'elephant'))
    expect(play.game.hushed).toBe(true)
    expect(play.game.table.turns.elephant).toBe(1)
    expect(play.game.table.finished).toBe(false)
  })
  it('is never made twice running: asked again while he shows it, he shows it off, and whoever is in it looks again', () => {
    const play = open(full())
    tap(play, maestro(play)); run(play, 12)
    const before = snap(play)
    for (let i = 0; i < 5; i++) { tap(play, maestro(play)); run(play, 0.3) }
    expect(snap(play)).toBe(before)
    expect(CAST.some((id) => play.game.bodies[id].act !== null)).toBe(true)
    run(play, 5)
    expect(CAST.every((id) => play.game.bodies[id].act === null)).toBe(true)
  })
  it('asked for by a drag that starts in it, also changes nothing', () => {
    const play = open(full())
    tap(play, maestro(play)); run(play, 1)
    const before = snap(play)
    drag(play, body(play, 'elephant'), step(play, 4)); play.up(1, ...step(play, 4)); run(play, 2)
    expect(snap(play)).toBe(before)
  })
  it('hangs the last picture before it begins the next, and gives the seventh the oldest\'s nail', () => {
    const play = open()
    for (let n = 0; n < 7; n++) {
      tap(play, maestro(play)); run(play, 9)
      tap(play, body(play, 'elephant')); run(play, 1.5)
      expect(play.game.nails.filter((nail) => nail.hung)).toHaveLength(Math.min(6, n + 1))
    }
    expect(play.game.table.last).toBe(0)
    tap(play, maestro(play)); run(play, 9)
    // Asked again at once after a change, the old one reaches its nail first.
    tap(play, body(play, 'elephant')); tap(play, maestro(play)); run(play, 0.4)
    expect(play.game.easel.tile).toBe(1)
    run(play, 9)
    expect(play.game.table.last).toBe(2)
    expect(play.game.easel.tile).toBe(2)
    expect(play.game.nails[1].hung).toBe(true)
    expect(play.game.nails[2].hung).toBe(false)
  })
  it('does not hang it for a poke that changes nothing', () => {
    const play = open()
    tap(play, maestro(play)); run(play, 9)
    tap(play, px(play, play.game.easel)); run(play, 1)
    tap(play, [W / 2, H - 30]); run(play, 1)
    expect(play.game.table.finished).toBe(true)
    expect(play.game.easel.tile).toBe(0)
  })
  it('turns him round when every one of two or more is painted from behind', () => {
    const play = open(full())
    tap(play, maestro(play))
    let most = 0, flap = 0
    for (let t = 0; t < 12; t += 1 / 60) { play.step(1 / 60); most = Math.max(most, play.game.maestro.yaw); flap = Math.max(flap, play.game.maestro.flap) }
    expect(most).toBeGreaterThan(3)
    expect(flap).toBeGreaterThan(0.8)
    expect(Math.abs(play.game.maestro.yaw)).toBeLessThan(0.05)
  })
})

describe('calling over and carrying', () => {
  it('sends one from the steps to the first empty place, and it arrives', () => {
    const play = open()
    tap(play, body(play, 'hen'))
    expect(place(play, 'hen')).toEqual({ kind: 'spot', n: 1 })
    run(play, 3)
    expect(play.game.poses.hen.x).toBeCloseTo(SPOTS[1].x, 3)
    expect(play.game.poses.hen.y).toBeCloseTo(0, 3)
  })
  it('changes places with the near left one when all are taken, they pass each other in the air; and back again', () => {
    const play = open(full())
    tap(play, body(play, 'pig')); run(play, 0.4)
    expect(play.game.poses.elephant.y).toBeGreaterThan(0.5)
    for (let t = 0; t < 1.2; t += 1 / 60) {
      play.step(1 / 60)
      const a = play.game.poses.pig, b = play.game.poses.elephant
      expect(Math.hypot(a.x - b.x, a.z - b.z)).toBeGreaterThan(2.2)
    }
    run(play, 3)
    expect(place(play, 'elephant')).toEqual({ kind: 'step', n: 0 })
    tap(play, body(play, 'elephant')); run(play, 4)
    expect(place(play, 'elephant')).toEqual({ kind: 'spot', n: 0 })
  })
  it('carries to an empty place, to a taken one, and back to the steps', () => {
    const play = open()
    drag(play, body(play, 'hen'), spot(play, 3)); play.up(1, ...spot(play, 3)); run(play, 2.5)
    expect(place(play, 'hen')).toEqual({ kind: 'spot', n: 3 })
    drag(play, body(play, 'hen'), spot(play, 0)); play.up(1, ...spot(play, 0)); run(play, 3)
    expect(place(play, 'hen')).toEqual({ kind: 'spot', n: 0 })
    expect(place(play, 'elephant')).toEqual({ kind: 'spot', n: 3 })
    drag(play, body(play, 'hen'), step(play, 0)); play.up(1, ...step(play, 0)); run(play, 3)
    expect(place(play, 'hen')).toEqual({ kind: 'step', n: 0 })
  })
  it('sends the last one back to the table in sight and heard', () => {
    const play = open()
    drag(play, body(play, 'elephant'), [W * 0.5, H * 0.95]); play.up(1, W * 0.5, H * 0.95)
    run(play, LIFT_GRACE_S + 0.1)
    expect(seated(play.game.table)).toEqual(['elephant'])
    expect(play.game.hand).toBeNull()
    expect(play.game.bodies.elephant.flight).not.toBeNull()
    run(play, 3)
    expect(play.game.poses.elephant.y).toBeCloseTo(0, 3)
  })
  it('let go over nothing, goes to the nearest free place and is never lost', () => {
    for (const at of [[20, 20], [W - 20, H - 20], [W / 2, 300], [5, H - 5], [W - 5, 200]] as [number, number][]) {
      const play = open(full())
      drag(play, body(play, 'hen'), at); play.up(1, ...at); run(play, 4)
      const p = play.game.poses.hen, to = play.game.where(place(play, 'hen'))
      expect(Math.hypot(p.x - to.x, p.y - to.y, p.z - to.z)).toBeLessThan(0.01)
      const back = loadTable(JSON.parse(snap(play)), null)
      expect([...back.spots, ...back.homes].filter(Boolean)).toHaveLength(7)
    }
  })
})

describe('the finger', () => {
  it('may lift for a moment in a carry and go on', () => {
    const play = open(), mid: [number, number] = [W * 0.4, H * 0.7]
    drag(play, body(play, 'hen'), mid); play.up(1, ...mid)
    run(play, LIFT_GRACE_S - 0.05)
    expect(play.game.hand?.id).toBe('hen')
    play.down(2, mid[0] + 10, mid[1]); play.move(2, ...spot(play, 1)); play.up(2, ...spot(play, 1)); run(play, 2.5)
    expect(place(play, 'hen')).toEqual({ kind: 'spot', n: 1 })
  })
  it('taken away, acts for nobody: a tap does not turn, a carry goes back', () => {
    const play = open(), before = snap(play)
    play.down(1, ...body(play, 'elephant')); play.cancel(1); run(play, 1)
    play.down(1, ...maestro(play)); play.cancel(1); run(play, 1)
    drag(play, body(play, 'hen'), spot(play, 1)); play.cancel(1); run(play, 3)
    expect(snap(play)).toBe(before)
    expect(play.game.poses.hen.x).toBeCloseTo(STEPS[0].x, 3)
  })
  it('put away in a carry, is as if never taken; put away in the grace, what was let go lands', () => {
    const play = open(), before = snap(play)
    drag(play, body(play, 'hen'), spot(play, 1)); play.park()
    expect(snap(play)).toBe(before)
    drag(play, body(play, 'hen'), spot(play, 1)); play.up(1, ...spot(play, 1)); play.park()
    expect(place(play, 'hen')).toEqual({ kind: 'spot', n: 1 })
    expect(play.game.poses.hen.x).toBeCloseTo(SPOTS[1].x, 5)
    expect(play.game.cues).toHaveLength(0)
  })
  it('resting gives the work to the next one; carrying keeps it, and the second is answered', () => {
    const play = open()
    play.down(1, W / 2, H - 20)
    tap(play, body(play, 'elephant'), 2)
    expect(play.game.table.turns.elephant).toBe(1)
    play.down(3, ...body(play, 'hen')); run(play, REST_S + 0.1)
    tap(play, body(play, 'elephant'), 4)
    expect(play.game.table.turns.elephant).toBe(2)
    play.up(3, ...body(play, 'hen'))
    expect(place(play, 'hen').kind).toBe('step')
    run(play, 1)
    drag(play, body(play, 'hen'), [W / 2, H * 0.8], 5)
    const before = snap(play)
    play.game.cues.length = 0
    tap(play, body(play, 'elephant'), 6)
    expect(play.game.cues.length).toBeGreaterThan(0)
    expect(snap(play)).toBe(before)
    expect(play.game.hand?.id).toBe('hen')
  })
  it('in the grown-up\'s corner or on the home control meets nothing', () => {
    const play = open()
    for (const at of [[W - 10, 10], [W / 2, 34]] as [number, number][]) expect(play.down(1, ...at)).toBe(false)
    expect(play.game.cues).toHaveLength(0)
  })
  it('is answered wherever it lands', () => {
    for (const [w, h] of [[1180, 820], [1024, 768], [820, 1180], [844, 390]]) {
      const play = open(full({ wall: [[['hen', 0], null, null, null], null, null, null, null, null] as never, last: 0, painted: true }), w, h)
      for (let x = 12; x < w; x += 37) for (let y = 12; y < h; y += 37) {
        if ((x > w - 72 && y < 72) || Math.hypot(x - w / 2, y - 34) < 46) continue
        play.game.cues.length = 0
        play.down(1, x, y)
        expect(play.game.cues.length, `${x},${y} of ${w}`).toBeGreaterThan(0)
        play.cancel(1)
      }
    }
  })
})

describe('the table\'s rim', () => {
  it('pushed along, goes round that way, and answers in paint when it is only touched', () => {
    const play = open(full()), rim: [number, number] = [W / 2, px(play, { x: 0, y: -0.3, z: 2.7 })[1]]
    play.down(1, ...rim); play.up(1, ...rim)
    expect(play.game.paintDots.length).toBeGreaterThan(0)
    const before = snap(play)
    drag(play, [W / 2 - 90, rim[1]], [W / 2 + 60, rim[1]]); play.up(1, W / 2 + 60, rim[1])
    expect(play.game.table.spots[1]).toBe('elephant')
    run(play, 3)
    drag(play, [W / 2 + 90, rim[1]], [W / 2 - 60, rim[1]]); play.up(1, W / 2 - 60, rim[1])
    expect(snap(play)).toBe(before)
    run(play, 3)
    expect(play.game.poses.elephant.yaw).toBeCloseTo(0, 2)
    expect(play.game.poses.elephant.x).toBeCloseTo(SPOTS[0].x, 2)
  })
})

describe('the key', () => {
  const key = (play: Play): [number, number] => px(play, { ...KEY, y: KEY.y + 0.6 })
  it('stands up with two on the table and takes everyone a quarter round with it', () => {
    const play = open()
    expect(play.game.keyUp).toBe(0)
    tap(play, body(play, 'hen')); run(play, 3)
    expect(play.game.keyUp).toBe(1)
    tap(play, key(play))
    expect(play.game.table.spots).toEqual([null, 'elephant', null, 'hen'])
    const at = { ...play.game.poses.elephant }
    play.step(1 / 60)
    expect(Math.hypot(play.game.poses.elephant.x - at.x, play.game.poses.elephant.z - at.z)).toBeLessThan(0.3)
    run(play, 3)
    expect(play.game.poses.elephant.yaw % (Math.PI * 2)).toBeCloseTo(Math.PI / 2, 2)
    expect(play.game.poses.elephant.x).toBeCloseTo(SPOTS[1].x, 2)
  })
  it('turned while one is in the air, brings it down on its place', () => {
    const play = open(full())
    tap(play, body(play, 'pig')); run(play, 0.5)
    tap(play, key(play)); tap(play, key(play)); run(play, 5)
    for (const id of CAST) { const p = play.game.poses[id], to = play.game.where(place(play, id)); expect(Math.hypot(p.x - to.x, p.y - to.y, p.z - to.z), id).toBeLessThan(0.01) }
  })
})

describe('left alone', () => {
  it('changes nothing, plays no sound, and goes quiet', () => {
    const play = open(full()), before = snap(play)
    run(play, 3)
    play.game.cues.length = 0
    let demos = 0, last = false
    for (let t = 0; t < 240; t += 1 / 20) { const g = play.step(1 / 20); if (g.demo !== null && !last) demos++; last = g.demo !== null }
    expect(demos).toBe(4)
    expect(play.game.cues).toHaveLength(0)
    expect(snap(play)).toBe(before)
    expect(play.game.dirty).toBe(false)
  })
  it('shows the painter first, and the key only once something has been painted', () => {
    const play = open()
    for (let t = 0; t < 6; t += 1 / 60) play.step(1 / 60)
    expect(play.demo).toBe('paint')
    const seen = new Set<string>(), two = open(full())
    for (let t = 0; t < 120; t += 1 / 20) { two.step(1 / 20); if (two.demo) seen.add(two.demo) }
    expect(seen.has('key')).toBe(false)
  })
})

describe('anything at all', () => {
  it('thrown at it keeps everyone in their place and every number a number', () => {
    let s = 7
    const rnd = (): number => { s = (s * 1103515245 + 12345) % 2147483648; return s / 2147483648 }
    const play = open(full())
    for (let i = 0; i < 1500; i++) {
      const x = rnd() * W, y = rnd() * H, id = 1 + Math.floor(rnd() * 3), what = rnd()
      if (what < 0.3) play.down(id, x, y)
      else if (what < 0.55) play.move(id, x, y)
      else if (what < 0.8) play.up(id, x, y)
      else if (what < 0.84) play.cancel(id)
      else if (what < 0.86) play.park()
      else run(play, rnd() * 0.8)
      play.game.wanted.length = 0
      play.game.cues.length = 0
      const t = play.game.table
      expect(new Set([...t.spots, ...t.homes].filter(Boolean)).size).toBe(7)
      expect(seated(t).length).toBeGreaterThan(0)
      for (const cast of CAST) for (const v of Object.values(play.game.poses[cast])) expect(Number.isFinite(v)).toBe(true)
    }
    play.park()
    const back = open(JSON.parse(snap(play)))
    expect(back.game.nails).toEqual(play.game.nails)
    for (const id of CAST) for (const key of ['x', 'y', 'z', 'yaw'] as const) expect(Math.cos(back.game.poses[id][key])).toBeCloseTo(Math.cos(play.game.poses[id][key]), 5)
  })
})
