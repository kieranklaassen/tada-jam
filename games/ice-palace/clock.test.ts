import { describe, expect, it } from 'vitest'
import { ICICLE, ON_BANK_Y, restOf } from './blocks'
import { FOOT_LANDS, WHO, reactionOf } from './cast'
import { BERRY, firstWorld } from './first'
import { BLOCK_H, BOUGH, DRIFT, SUN } from './ground'
import { bare, frame, letGo, moveTo, press, pullSun } from './testing'
import { STEP, Toy } from './toy'
import type { SoundName } from './voices'

// Sight and sound run on one clock. The toy is stepped a sixtieth of a second
// at a time through a long play that reaches every kind of thing, both scenes
// and the night, and every step is held two ways:
// - whatever is heard in a step comes with something seen to happen in that
//   same step, so no sound runs ahead of or behind its motion;
// - a landing, a character's reaction, a lamp being lit and the king sitting
//   down are each heard in the very step they are seen in.
// No voice carries a delay of its own (voices.test.ts), so there is nowhere
// else for a wait to hide.

/** Everything that is seen to happen at an instant: states, and never a quantity that moves smoothly. */
function look(toy: Toy): string {
  return JSON.stringify({
    pieces: toy.pieces.map((p) => [p.id, p.kind, p.len, p.mode, p.rest.place, p.dent.length, p.cap, p.heat > 0, p.path.length]),
    holes: [toy.holes.length, toy.holes.filter((h) => h.closing > 0).length, toy.holes.filter((h) => h.shut).length],
    cast: WHO.map((who) => [toy.cast[who].what, toy.cast[who].what !== null && toy.cast[who].age === 0]),
    lamps: toy.lampsLit, lit: [...toy.lit], flood: toy.flood === 0 ? 0 : toy.flood === 1 ? 1 : 0.5, sunRests: toy.sunV === 0,
    kids: [Math.round(toy.kids.lamp.x), Math.round(toy.kids.peeper.x)], snowing: toy.snowing > 0,
    king: [toy.king.where, toy.king.sat === 1, toy.king.wait > 0, toy.king.path.length, toy.king.fall > 0, toy.king.behind], bird: [toy.bird.toX, toy.bird.toY],
    // His foot has landed on the block he tries, and the lamp child's mitten on the snow it raps: each is seen to land.
    foot: toy.cast.king.what === 'foot' && toy.cast.king.age >= reactionOf('king', 'foot').lasts * FOOT_LANDS, rapped: toy.knocked,
    hare: toy.hareBolt >= 0, scene: toy.sceneRunning, drift: toy.driftShown, icicles: toy.iciclesShown.length,
  })
}

type Was = { modes: Map<number, string>; cast: Record<string, string | null>; lamps: number; sat: boolean }
const was = (toy: Toy): Was => ({
  modes: new Map(toy.pieces.map((p) => [p.id, p.mode])),
  cast: Object.fromEntries(WHO.map((who) => [who, toy.cast[who].what !== null && toy.cast[who].age === 0 ? null : toy.cast[who].what])),
  lamps: toy.nightNow.lamps.length,
  sat: toy.king.sat === 1,
})

describe('one clock for sight and sound', () => {
  it('hears nothing in a step in which nothing is seen to happen, and hears every landing, reaction, lamp and sitting-down in its own step, through a whole day and night', { timeout: 120_000 }, () => {
    const toy = new Toy(firstWorld(null), 3)
    const heard = new Set<string>()
    let steps = 0
    const run = (seconds: number): void => {
      for (let i = 0; i < Math.round(seconds / STEP); i++) {
        const before = look(toy), then = was(toy)
        frame(toy)
        steps++
        const motions = toy.takeMotions().length
        const sounds = toy.takeSounds().map((s) => s.name)
        for (const sound of sounds) heard.add(sound)
        if (sounds.length > 0) expect(look(toy) !== before || motions > 0, `step ${steps}: ${sounds.join(', ')} with nothing seen to happen`).toBe(true)
        // A landing is heard in the step the thing comes to rest.
        for (const piece of toy.pieces) {
          const mode = then.modes.get(piece.id)
          if (piece.mode === 'rest' && (mode === 'hop' || mode === 'fall' || mode === 'roll')) expect(sounds.length, `step ${steps}: a ${piece.kind} thing landed unheard`).toBeGreaterThan(0)
        }
        // A character that has a voice for what it starts to do is heard in the step it starts.
        for (const who of WHO) {
          const actor = toy.cast[who]
          if (actor.what === null || actor.age !== 0 || then.cast[who] === actor.what) continue
          const sound = reactionOf(who, actor.what).sound
          if (sound) expect(sounds, `step ${steps}: ${who} started ${actor.what}`).toContain(sound)
        }
        if (toy.sceneRunning && toy.nightNow.lamps.length > then.lamps) expect(sounds, `step ${steps}: a lamp was lit`).toContain('lampLit')
        if (toy.night && toy.king.sat === 1 && !then.sat) expect(sounds.some((s) => s === 'oomph' || s === 'squawk' || s === 'grumble'), `step ${steps}: the king sat down unheard`).toBe(true)
      }
    }
    /** A touch is answered inside the call that brings it. */
    const land = (x: number, y: number): void => {
      press(toy, x, y)
      const sounds = toy.takeSounds().map((s) => s.name)
      expect(sounds.length, `a press at ${x},${y} was not answered in its call`).toBeGreaterThan(0)
      for (const sound of sounds) heard.add(sound)
      toy.takeMotions()
    }
    /** What a touch sets off is heard in its own call, and is not a step's. */
    const touched = (): void => {
      for (const sound of toy.takeSounds()) heard.add(sound.name)
      toy.takeMotions()
    }
    const move = (x0: number, y0: number, x1: number, y1: number, after = 2.5): void => {
      land(x0, y0)
      for (let i = 1; i <= 10; i++) {
        moveTo(toy, x0 + ((x1 - x0) * i) / 10, y0 + ((y1 - y0) * i) / 10)
        touched()
        run(STEP)
      }
      letGo(toy)
      touched()
      run(after)
    }
    const tap = (x: number, y: number, held = 0.1): void => {
      land(x, y)
      run(held)
      letGo(toy)
      touched()
      run(1.5)
    }
    const find = (kind: string, place: string) => toy.pieces.find((p) => p.kind === kind && p.rest.place === place && p.mode === 'rest')!

    run(1)
    move(380, 720, 520, 706)
    move(260, 650, 340, 690)
    // A snow block and a snowball from the drift, an icicle from the bough.
    move(DRIFT.cx, DRIFT.cy, DRIFT.cx - 220, DRIFT.cy + 30)
    move(DRIFT.cx, DRIFT.cy, DRIFT.cx - 10, DRIFT.cy + 34)
    move(BOUGH[0].x, BOUGH[0].y + 20, 330, 300)
    // Onto the bank: clear on snow, cloudy on it, a ball that rolls off, the berry block, the snow block.
    move(560, 606, 400, 300)
    const cloudy = find('cloudy', 'lying')
    move(cloudy.x, cloudy.y, 400, 200)
    const ball = find('ball', 'lying')
    move(ball.x, ball.y, 410, 150, 3.5)
    const berry = toy.pieces.find((p) => p.kind === 'berry')!
    move(berry.x, berry.y, 600, 300)
    const snow = find('snow', 'lying')
    move(snow.x, snow.y, 560, 300)
    // Into open water: the berry block floats, a clear block and a snowball go in, the icicle freezes in.
    move(berry.x, berry.y, toy.holes[0].x, toy.holes[0].y)
    move(berry.x, berry.y, 620, 250)
    const cutOut = find('clear', 'lying')
    move(cutOut.x, cutOut.y, toy.holes[0].x, toy.holes[0].y)
    const icicle = toy.pieces.find((p) => p.kind === 'icicle')!
    move(icicle.x, icicle.y, toy.holes[0].x, toy.holes[0].y)
    // A hat for the king, which he nods off; a warm thumb on a snow block.
    move(snow.x, snow.y, 1034, 200, 12)
    tap(snow.x, snow.y, 2)
    // Everyone a finger can reach, then a whole night and the morning after it.
    for (const [x, y] of [[1034, 330], [90, 400], [80, 740], [176, 108], [toy.bird.x, toy.bird.y], [520, 380], [590, 40]]) tap(x, y)
    run(17)
    move(SUN.x, SUN.day, SUN.x, SUN.night + 10, 14)
    move(700, 720, 820, 700)
    move(SUN.x, SUN.night - 20, SUN.x, SUN.day - 10, 8)

    for (const sound of ['crack', 'ring', 'tock', 'crunch', 'thunk', 'flump', 'rumble', 'roundKnock', 'bloop', 'plop', 'crackle', 'plip', 'hatOn', 'hatOff', 'squelch', 'pack', 'snap', 'yawn', 'skate', 'lampLit', 'stretch', 'snowfall'] as const satisfies readonly SoundName[]) {
      expect(heard.has(sound), `${sound} was never heard`).toBe(true)
    }
  })

  it('hears the lamp child’s rap in the step its mitten lands on the snow, and King Winter’s foot in the step it lands on the block', () => {
    // The two answers that come in the middle of a reaction and not at its start.
    const walled = [restOf('snow', 64, 400, ON_BANK_Y, 'built'), restOf('snow', 64, 560, ON_BANK_Y, 'built'), restOf('snow', 224, 480, ON_BANK_Y - BLOCK_H, 'built'), restOf('icicle', ICICLE, 480, ON_BANK_Y - 2 * BLOCK_H, 'built')]
    const toy = new Toy({ ...bare(), blocks: [{ ...BERRY }, ...walled] }, 1)
    pullSun(toy, true)
    toy.takeSounds()
    let rapped = -1, landed = -1, stepped = -1, thup = -1
    for (let step = 1; step <= 1800; step++) {
      const before = toy.knocked
      frame(toy)
      const sounds = toy.takeSounds().map((s) => s.name)
      if (landed < 0 && toy.knocked !== before) landed = step
      if (rapped < 0 && sounds.includes('rap')) rapped = step
      const king = toy.cast.king
      if (stepped < 0 && king.what === 'foot' && king.age >= reactionOf('king', 'foot').lasts * FOOT_LANDS) stepped = step
      if (thup < 0 && king.what === 'foot' && (sounds.includes('thup') || sounds.includes('ting'))) thup = step
    }
    expect(landed).toBeGreaterThan(0)
    expect(rapped).toBe(landed)
    expect(stepped).toBeGreaterThan(0)
    expect(thup).toBe(stepped)
  })

  it('lands a block hopping out of the pond on one known step, and that step is the one it rings in', () => {
    const toy = new Toy(bare(), 1)
    press(toy, 480, 668)
    moveTo(toy, 620, 668)
    letGo(toy)
    expect(toy.takeSounds().map((s) => s.name)).toEqual(['bite', 'scrape', 'scrape', 'scrape', 'scrape', 'scrape', 'crack'])
    const block = toy.pieces.find((p) => p.kind === 'clear')!
    let landed = -1, rang = -1
    for (let step = 1; step <= 60; step++) {
      frame(toy)
      if (landed < 0 && block.mode === 'rest') landed = step
      if (rang < 0 && toy.takeSounds().some((s) => s.name === 'ring')) rang = step
    }
    expect(landed).toBeGreaterThan(20)
    expect(rang).toBe(landed)
  })

  it('makes no sound and starts nothing on load: no timer is full, and the first second of a visit is silent', () => {
    for (const world of [firstWorld(null), firstWorld(9), bare(true)]) {
      const toy = new Toy(world, 1)
      expect(toy.takeSounds()).toEqual([])
      expect(toy.takeMotions()).toEqual([])
      expect(toy.takeChanged()).toBe('no')
      expect(toy).toMatchObject({ time: 0, sceneRunning: false, hareBolt: -1, snowing: 0, fishStare: 0, lampWalk: [], rap: null })
      expect(toy.hareAt).toBeGreaterThan(10)
      expect(WHO.every((who) => toy.cast[who].what === null && toy.cast[who].next.length === 0)).toBe(true)
      for (let i = 0; i < 60; i++) frame(toy)
      expect(toy.takeSounds()).toEqual([])
      expect(toy.takeChanged()).toBe('no')
    }
  })
})
