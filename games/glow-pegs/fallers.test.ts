import { describe, expect, it } from 'vitest'
import { BLUE, COLOURS, GREEN, RED, WHITE, YELLOW, centreOf, holeAt, type Colour } from './board'
import { BEZEL_BOTTOM, CATCH, NOSE, WHITE_WAIT, fallBeats, fallLength, fallerAt, knockCue, type FallKind, type Faller, type FallerPlace } from './fallers'
import { RIM_Y, wellMouth } from './layout'

const place = (): FallerPlace => ({ x: 0, y: 0, x2: 0, y2: 0, halves: false, first: false, second: false, shine: 1 })
const from = centreOf(holeAt(8, 2))
const faller = (colour: Colour, knocked: boolean | FallKind, t = 0): Faller => ({ colour, kind: typeof knocked === 'string' ? knocked : knocked ? 'knocked' : 'pulled', t, x: from.x, y: from.y })
const at = (colour: Colour, knocked: boolean | FallKind, t: number) => fallerAt(faller(colour, knocked, t), place())

describe('a peg on its way back to its well', () => {
  it('leaves from its hole and ends in the mouth of its own colour\'s well, pulled or knocked', () => {
    for (const colour of COLOURS) for (const knocked of [false, true]) {
      const start = at(colour, knocked, 0), mouth = wellMouth(colour)
      expect({ x: start.x, y: start.y }, `colour ${colour}`).toEqual(from)
      const end = at(colour, knocked, fallLength(faller(colour, knocked)))
      const last = colour === YELLOW && knocked ? { x: end.x2 - 20, y: end.y2 } : { x: end.x, y: end.y }
      expect(last.x).toBeCloseTo(mouth.x, 5)
      expect(last.y).toBeCloseTo(mouth.y, 5)
      // It is gone from the air when it has landed.
      expect(end.first || end.second).toBe(false)
    }
  })

  it('never jumps: from one frame to the next it moves less than two holes, however it left', () => {
    for (const colour of COLOURS) for (const knocked of [false, true, 'dropped', 'caught'] as const) {
      let last = at(colour, knocked, 0)
      for (let t = 1 / 60; t < fallLength(faller(colour, knocked)); t += 1 / 60) {
        const now = at(colour, knocked, t)
        expect(Math.hypot(now.x - last.x, now.y - last.y), `colour ${colour} at ${t.toFixed(2)}`).toBeLessThan(128)
        if (now.halves) expect(Math.hypot(now.x2 - last.x2, now.y2 - last.y2)).toBeLessThan(128)
        last = now
      }
    }
  })

  it('ends every fall with the landing in its own colour, heard as it reaches the well', () => {
    for (const colour of COLOURS) for (const knocked of [false, true]) {
      const beats = fallBeats(faller(colour, knocked))
      expect(beats[beats.length - 1]).toEqual({ at: fallLength(faller(colour, knocked)), cue: { name: 'land', colour } })
      for (let i = 1; i < beats.length; i++) expect(beats[i].at).toBeGreaterThan(beats[i - 1].at)
    }
  })

  it('drops a pulled peg in one short arc, with no beat but its landing', () => {
    for (const colour of COLOURS) {
      expect(fallBeats(faller(colour, false))).toHaveLength(1)
      expect(fallLength(faller(colour, false))).toBeLessThan(0.8)
    }
    // Each colour comes out in its own time, and a pulled peg is never as long in the air as a knocked one.
    expect(new Set(COLOURS.map((colour) => fallLength(faller(colour, false)))).size).toBe(5)
    for (const colour of COLOURS) expect(fallLength(faller(colour, false))).toBeLessThan(fallLength(faller(colour, true)))
  })
})

describe('a peg the tray handle drops', () => {
  it('falls from its hole into its own well, in its colour\'s own time, and is heard when it lands there', () => {
    const lengths = COLOURS.map((colour) => fallLength(faller(colour, 'dropped')))
    expect(new Set(lengths).size).toBe(5)
    // Red is the quickest and blue the last to land.
    expect(Math.min(...lengths)).toBe(lengths[RED - 1])
    expect(Math.max(...lengths)).toBe(lengths[BLUE - 1])
    for (const colour of COLOURS) {
      const start = at(colour, 'dropped', 0), end = at(colour, 'dropped', fallLength(faller(colour, 'dropped')))
      expect({ x: start.x, y: start.y }).toEqual(from)
      expect(end.first || end.second, `colour ${colour}`).toBe(false)
      const beats = fallBeats(faller(colour, 'dropped'))
      expect(beats[beats.length - 1]).toEqual({ at: fallLength(faller(colour, 'dropped')), cue: { name: 'drop', colour, scene: true } })
    }
  })

  it('stays in its hole until its turn comes: a peg whose fall has not begun is drawn where it stood', () => {
    for (const colour of COLOURS) {
      const waiting = at(colour, 'dropped', -0.12)
      expect({ x: waiting.x, y: waiting.y, there: waiting.first }).toEqual({ ...from, there: true })
    }
  })

  it('white waits a beat and then falls; yellow falls as two halves that land apart; green touches the rim with a boing', () => {
    const waited = at(WHITE, 'dropped', WHITE_WAIT - 0.02)
    expect({ x: waited.x, y: waited.y }).toEqual(from)
    expect(at(WHITE, 'dropped', WHITE_WAIT + 0.2).y).toBeGreaterThan(from.y + 20)
    const yellow = fallBeats(faller(YELLOW, 'dropped'))
    expect(yellow).toHaveLength(2)
    expect(at(YELLOW, 'dropped', yellow[0].at - 0.02)).toMatchObject({ halves: true, first: true, second: true })
    expect(at(YELLOW, 'dropped', yellow[0].at)).toMatchObject({ first: false, second: true })
    const green = fallBeats(faller(GREEN, 'dropped'))
    expect(green[0].cue.name).toBe('hop')
    expect(at(GREEN, 'dropped', green[0].at).y).toBeCloseTo(RIM_Y, 5)
  })

  it('the one the gecko catches flies to its nose, sits there, and is flicked into its well, each heard as it is seen', () => {
    const [caught, flick, land] = fallBeats(faller(GREEN, 'caught'))
    expect([caught.cue.name, flick.cue.name, land.cue.name]).toEqual(['catch', 'flick', 'drop'])
    expect(caught.at).toBe(CATCH.fly)
    const sitting = at(GREEN, 'caught', caught.at)
    expect(Math.hypot(sitting.x - NOSE.x, sitting.y - NOSE.y)).toBeLessThan(1)
    const stillThere = at(GREEN, 'caught', flick.at - 0.01)
    expect(Math.hypot(stillThere.x - NOSE.x, stillThere.y - NOSE.y)).toBeLessThan(8)
    const end = at(GREEN, 'caught', land.at)
    expect(end.first).toBe(false)
  })
})

describe('a peg knocked out leaves in its colour\'s own way', () => {
  it('takes a different time for each colour, blue the longest', () => {
    const lengths = COLOURS.map((colour) => fallLength(faller(colour, true)))
    expect(new Set(lengths).size).toBe(5)
    expect(Math.max(...lengths)).toBe(fallLength(faller(BLUE, true)))
  })

  it('is heard to let go at once, except red, which is silent until it strikes', () => {
    expect(knockCue(RED)).toBeNull()
    for (const colour of [BLUE, YELLOW, GREEN, WHITE] as const) expect(knockCue(colour)).toEqual({ name: 'knock', colour })
  })

  it('red: is shot at the bezel\'s lower edge, and its drum sounds when it strikes', () => {
    const [strike] = fallBeats(faller(RED, true))
    expect(strike.cue).toEqual({ name: 'knock', colour: RED })
    expect(at(RED, true, strike.at).y).toBeCloseTo(BEZEL_BOTTOM, 5)
    expect(at(RED, true, strike.at - 0.03).y).toBeLessThan(BEZEL_BOTTOM - 20)
    // It rebounds: just after the strike it is above the edge again.
    expect(at(RED, true, strike.at + 0.08).y).toBeLessThan(BEZEL_BOTTOM)
  })

  it('blue: floats down in a slow curve that swings wide of the straight line', () => {
    let widest = 0
    for (let t = 0; t < 1.5; t += 0.05) widest = Math.max(widest, Math.abs(at(BLUE, true, t).x - (from.x + (wellMouth(BLUE).x - from.x) * (t / 1.5))))
    expect(widest).toBeGreaterThan(25)
    expect(fallBeats(faller(BLUE, true))).toHaveLength(1)
  })

  it('yellow: breaks in two halves that fly apart and land one after the other, each with its own clack', () => {
    const mid = at(YELLOW, true, 0.3)
    expect(mid.halves).toBe(true)
    expect(mid.x2 - mid.x).toBeGreaterThan(40)
    const [first, second] = fallBeats(faller(YELLOW, true))
    expect(at(YELLOW, true, first.at - 0.02).first).toBe(true)
    expect(at(YELLOW, true, first.at).first).toBe(false)
    expect(at(YELLOW, true, first.at).second).toBe(true)
    expect(at(YELLOW, true, second.at).second).toBe(false)
  })

  it('green: hops three times along the tray\'s rim, each hop lower, with a boing as it touches the rim', () => {
    const beats = fallBeats(faller(GREEN, true))
    const hops = beats.filter((beat) => beat.cue.name === 'hop')
    expect(hops.map((beat) => beat.cue.n)).toEqual([0, 1, 2])
    for (const hop of hops) expect(at(GREEN, true, hop.at).y).toBeCloseTo(RIM_Y, 5)
    const tops = hops.map((hop) => RIM_Y - at(GREEN, true, hop.at + 0.12).y)
    expect(tops[0]).toBeGreaterThan(tops[1])
    expect(tops[1]).toBeGreaterThan(tops[2])
    expect(tops[2]).toBeGreaterThan(10)
    // It travels along the rim towards its well.
    const xs = hops.map((hop) => at(GREEN, true, hop.at).x)
    expect(Math.abs(xs[2] - wellMouth(GREEN).x)).toBeLessThan(Math.abs(xs[0] - wellMouth(GREEN).x))
  })

  it('white: hangs shining a little above its hole for a beat, then drops straight', () => {
    for (const t of [0.2, 0.35, 0.49]) {
      const hung = at(WHITE, true, t)
      expect(hung.x).toBe(from.x)
      expect(from.y - hung.y).toBeGreaterThan(10)
      expect(hung.shine).toBe(1)
    }
    expect(at(WHITE, true, 0.7).y).toBeGreaterThan(from.y)
  })

  it('gives no two colours the same path', () => {
    const path = (colour: Colour) => [0.1, 0.2, 0.3, 0.4].map((t) => { const p = at(colour, true, t); return [p.x, p.y] })
    for (const a of COLOURS) for (const b of COLOURS) if (a < b) {
      const pa = path(a), pb = path(b)
      expect(Math.max(...pa.map((p, i) => Math.abs(p[1] - pb[i][1]))), `${a} and ${b}`).toBeGreaterThan(20)
    }
  })
})
