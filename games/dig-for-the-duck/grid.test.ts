import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  CLAY_WET, COLS, GROUNDS, HOT_WET, MOSS, MOSS_FULL, OPEN, ROCK_WET, ROOT, ROWS, SEED, WATER, WET, isClay, isEarth, isHot, isMoss, isRock, isSand, isWet, type GroundKind,
} from './cells'
import { ACTIONS, type Action, type Game } from './game'
import { badgerPose, duckPose, molePose, wormPose, type Now } from './residents'
import { ANSWERS, ANSWER_NAMES, SCENES, SCENE_NAMES, beatsOf, partsAt, type AnswerName, type Parts, type SceneName } from './timeline'
import { find, gameOn, play, spot } from './testing'
import * as voices from './voices'

// One timeline: every cell of the object-by-action grid and every part of
// every scene is walked, and the test fails where a sound has no maker that is
// drawn doing it at that moment.

const HILL: Record<GroundKind, string> = { sand: 'dune', clay: 'claypit', rock: 'scree', moss: 'fen', hot: 'hot-spring', earth: 'orchard' }
const IS: Record<GroundKind, (code: number) => boolean> = { sand: (code) => isSand(code) && !isWet(code), clay: isClay, rock: isRock, moss: isMoss, hot: isHot, earth: isEarth }
const WET_FORM: Record<GroundKind, number> = { sand: -1, clay: CLAY_WET, rock: ROCK_WET, moss: MOSS_FULL, hot: HOT_WET, earth: ROOT }

/** A cell of a ground with the same ground on both sides of it and open space, water or sand over it: a place a finger can land. */
const place = (game: Game, kind: GroundKind): { col: number; row: number } => find(game, (code, col, row, cells) => row > 30 && col > 4 && col < COLS - 5 && IS[kind](code) && IS[kind](cells[row * COLS + col - 2]) && IS[kind](cells[row * COLS + col + 2]))!

/** The top cell of a ground with something other than that ground over it. */
const top = (game: Game, kind: GroundKind): { col: number; row: number } => find(game, (code, col, row, cells) => row > 30 && col > 4 && col < COLS - 5 && IS[kind](code) && !IS[kind](cells[(row - 1) * COLS + col]) && IS[kind](cells[row * COLS + col + 1]) && IS[kind](cells[row * COLS + col - 1]))!

/** What can be seen of the hill and the air: it changes when anything is drawn differently. */
const seen = (game: Game): string => `${game.marks.length}.${game.crumbs.length}.${game.ripples.length}.${Array.from(game.on.ground.cells).join('')}`

/** Does one action of the grid to one ground and plays on until the game says it answered that cell, or two seconds are up. */
function act(game: Game, kind: GroundKind, action: Action): void {
  const ground = game.on.ground
  const rub = (from: { col: number; row: number }, to: { col: number; row: number }): void => {
    game.press(spot(from.col, from.row))
    for (let i = 1; i <= 8; i++) { game.rubTo(spot(from.col + ((to.col - from.col) * i) / 8, from.row + ((to.row - from.row) * i) / 8)); game.step(1 / 60) }
    game.release()
  }
  if (action === 'dry') { const at = place(game, kind); rub(at, { col: at.col + 3, row: at.row }) }
  if (action === 'tap') { const at = place(game, kind); game.press(spot(at.col, at.row)); game.release() }
  if (action === 'wet') {
    const at = place(game, kind)
    // The ground in its wet form under the finger: wet sand, shining clay, glistening rock, drunk moss, a steaming stone, a root.
    for (let row = at.row - 2; row <= at.row + 2; row++) for (let col = at.col - 3; col <= at.col + 5; col++) {
      const index = row * COLS + col, code = ground.cells[index]
      if (IS[kind](code)) ground.put(index, kind === 'sand' ? code | WET : WET_FORM[kind])
    }
    rub(at, { col: at.col + 3, row: at.row })
  }
  if (action === 'water') {
    const at = kind === 'earth' ? find(game, (code) => code === SEED)! : top(game, kind)
    // A little water let fall onto it from just above.
    for (let row = at.row - 4; row < at.row; row++) for (let col = at.col - 1; col <= at.col + 1; col++) ground.put(row * COLS + col, row === at.row - 4 ? WATER : OPEN)
  }
  if (action === 'under') {
    // Dug out from under: a wide rub below the ground, clear of it, so that what was on it or was it has nothing left to rest on.
    let at = find(game, (code, col, row, cells) => row > 30 && row < ROWS - 14 && col > 12 && col < COLS - 13 && IS[kind](code) && isSand(cells[(row + 1) * COLS + col]) && IS[kind](cells[row * COLS + col - 1]))!
    if (kind === 'moss') {
      // Moss that has drunk drips once there is nothing under it.
      for (let col = at.col - 2; col <= at.col + 2; col++) if (ground.cells[at.row * COLS + col] === MOSS) ground.put(at.row * COLS + col, MOSS_FULL)
    }
    if (kind === 'rock' || kind === 'hot') {
      // The whole stone: find its lowest row and rub under all of it.
      const same = kind === 'rock' ? isRock : isHot
      let low = at.row, left = at.col, right = at.col
      for (let row = at.row; row < ROWS; row++) for (let col = 0; col < COLS; col++) if (same(ground.cells[row * COLS + col]) && Math.abs(col - at.col) < 14 && row - at.row < 12) { low = Math.max(low, row); left = Math.min(left, col); right = Math.max(right, col) }
      at = { col: left, row: low }
      rub({ col: left - 4, row: low + 5 }, { col: right + 4, row: low + 5 })
      rub({ col: right + 4, row: low + 9 }, { col: left - 4, row: low + 9 })
    } else rub({ col: at.col - 7, row: at.row + 5 }, { col: at.col + 7, row: at.row + 5 })
  }
}

describe('the object-by-action grid', () => {
  it('has six grounds and five actions', () => {
    expect(GROUNDS.length * ACTIONS.length).toBe(30)
  })

  for (const kind of GROUNDS) for (const action of ACTIONS) {
    it(`${kind}, ${action}: the game answers with its own sound and something to see, in the same stretch`, () => {
      const game = gameOn(HILL[kind])
      play(game, 0.1)
      game.answeredCells(); game.sounds()
      const before = seen(game)
      act(game, kind, action)
      let answered = false, heard = 0, shown = false
      for (let frame = 0; frame < 150 && !(answered && heard > 0 && shown); frame++) {
        if (game.answeredCells().includes(`${kind}.${action}`)) answered = true
        const notes = game.sounds()
        // The sound and the sight belong to the same moment: both are looked for from the answer on.
        if (answered) { heard += notes?.length ?? 0; shown = shown || seen(game) !== before }
        game.step(1 / 60)
      }
      expect(answered, 'the cell is answered').toBe(true)
      expect(heard, 'with a sound').toBeGreaterThan(0)
      expect(shown, 'and something drawn').toBe(true)
    })
  }

  it('each of the thirty cells has a sound of its own in voices.ts', () => {
    const cells: Record<GroundKind, readonly unknown[]> = {
      sand: [voices.hiss(0, 0.5), voices.mud(1), voices.bite(0), voices.fizz, voices.hush(0.5)],
      clay: [voices.creak, voices.rubber, voices.dull, voices.glug, voices.groan],
      rock: [voices.clack, voices.plate, voices.knockBack, voices.roof(0), voices.thud(20)],
      moss: [voices.rip, voices.squelch, voices.boing, voices.slurp, voices.drip],
      hot: [voices.sizzle, voices.kettle(0.5), voices.ting, voices.steam, voices.clonk],
      earth: [voices.puff, voices.twang, voices.maraca, voices.sprout, voices.tumble],
    }
    const all = Object.values(cells).flat().map((notes) => JSON.stringify(notes))
    expect(all.length).toBe(30)
    expect(new Set(all).size).toBe(30)
    for (const notes of Object.values(cells).flat()) expect((notes as unknown[]).length).toBeGreaterThan(0)
  })
})

// --- The scenes and the short answers: every sound has a maker that moves ----

const view = readFileSync(new URL('./view.ts', import.meta.url), 'utf8')
const never = Object.fromEntries(ANSWER_NAMES.map((name) => [name, Infinity])) as Record<AnswerName, number>
const rest = (): Record<SceneName, Parts> => Object.fromEntries(SCENE_NAMES.map((name) => [name, partsAt(name, 0)])) as Record<SceneName, Parts>
const TIME = 12.345
const POSES = {
  duck: (now: Now) => duckPose(now, true, true),
  mole: (now: Now) => molePose(now, 0),
  worm: (now: Now) => wormPose(now, 0, true),
  badger: (now: Now) => badgerPose(now),
}
type Who = keyof typeof POSES
const still = { time: TIME, since: never, scenes: rest() }
/** The keys of a resident's pose that differ from the pose with nothing happening. */
const moved = (who: Who, now: Now, from: Now = still): string[] => {
  const a = POSES[who](from) as Record<string, unknown>, b = POSES[who](now) as Record<string, unknown>
  return Object.keys(a).filter((key) => JSON.stringify(a[key]) !== JSON.stringify(b[key]))
}

/** Who is drawn doing each part of each scene. The plug's first three parts are drawn by the view from the part itself. */
const MAKER: Record<SceneName, Who | 'view'> = {
  moleAfloat: 'mole', moleDown: 'mole', wormBoots: 'worm', badgerRain: 'badger', showClay: 'mole', showRock: 'worm', showMoss: 'worm', showHot: 'badger', showEarth: 'mole', ending: 'duck', plug: 'view',
}

describe('one timeline', () => {
  it('every part of every scene moves its maker while it plays, and every note it names is a voice', () => {
    for (const scene of SCENE_NAMES) {
      for (const cue of SCENES[scene] as readonly { part: string; note?: string }[]) {
        if (cue.note) expect(voices.NAMED[cue.note]?.length, `${scene}.${cue.part}: the note ${cue.note}`).toBeGreaterThan(0)
        // The mole is set down from afloat: that scene plays with the one before it at its end.
        const before = rest()
        if (scene === 'moleDown') before.moleAfloat = partsAt('moleAfloat', 1)
        // The parts of the scene that are over by the time this one starts stand at their end.
        const cues = SCENES[scene] as readonly { part: string; at: number; lasts: number }[], self = cues.find((other) => other.part === cue.part)!
        before[scene] = Object.fromEntries(cues.map((other) => [other.part, other.at + other.lasts <= self.at ? 1 : 0]))
        const from = { time: TIME, since: never, scenes: before }
        const now = { time: TIME, since: never, scenes: { ...before, [scene]: { ...before[scene], [cue.part]: 0.5 } } }
        if (scene === 'ending' && cue.part === 'allLook') {
          for (const who of ['mole', 'worm', 'badger'] as const) expect(moved(who, now), `${who} looks`).toContain('look')
        } else if (scene === 'plug' && cue.part !== 'settle') {
          expect(view, `the view draws plug.${cue.part}`).toContain(`part('plug', '${cue.part}')`)
        } else {
          const who = scene === 'plug' ? 'duck' : (MAKER[scene] as Who)
          expect(moved(who, now, from).length, `${scene}.${cue.part} moves the ${who}`).toBeGreaterThan(0)
        }
      }
    }
  })

  it('a part sets its progress and sounds its note in one call: once each time the scene plays, and never when a touch ends it', () => {
    for (const scene of SCENE_NAMES) {
      const parts = partsAt(scene, 0), heard: string[] = []
      const beats = beatsOf(scene, parts, (note) => heard.push(note))
      const cues = SCENES[scene] as readonly { part: string; note?: string }[]
      beats.forEach((beat, i) => {
        heard.length = 0
        beat.play(0.2, false); beat.play(0.6, false)
        expect(parts[cues[i].part]).toBe(0.6)
        expect(heard).toEqual(cues[i].note ? [cues[i].note] : [])
        beat.play(1, true)
        expect(parts[cues[i].part]).toBe(1)
        expect(heard.length).toBe(cues[i].note ? 1 : 0)
        // Played again later, it sounds again; ended by a touch before it began, it stays quiet.
        beat.play(0.1, false)
        expect(heard.length).toBe(cues[i].note ? 2 : 0)
        beat.play(1, false); beat.play(1, true)
        expect(heard.length).toBe(cues[i].note ? 2 : 0)
      })
    }
  })

  it('every short answer moves whoever makes it for as long as it lasts, and is still again after', () => {
    for (const name of ANSWER_NAMES) {
      const answer = ANSWERS[name] as { who: string; lasts: number; note?: string }
      if (answer.note) expect(voices.NAMED[answer.note]?.length, `${name}: the note ${answer.note}`).toBeGreaterThan(0)
      if (answer.who === 'hill') { expect(view).toContain("case 'knock'"); continue }
      const during = { ...still, since: { ...never, [name]: answer.lasts * 0.3 } }, after = { ...still, since: { ...never, [name]: answer.lasts + 0.01 } }
      for (const who of answer.who === 'all' ? (Object.keys(POSES) as Who[]) : [answer.who as Who]) {
        expect(moved(who, during).length, `${name} moves the ${who}`).toBeGreaterThan(0)
        expect(moved(who, after), `${name} is over`).toEqual([])
      }
    }
  })

  it('the view reads every number of every pose', () => {
    for (const who of Object.keys(POSES) as Who[]) for (const key of Object.keys(POSES[who](still))) expect(view, `${who}.${key}`).toMatch(new RegExp(`pose\\.${key}\\b`))
  })

  it('the view draws every kind of mark the game leaves', () => {
    const game = readFileSync(new URL('./game.ts', import.meta.url), 'utf8')
    const kinds = [...game.matchAll(/this\.mark\('([a-z]+)'/g)].map((match) => match[1])
    expect(new Set(kinds).size).toBeGreaterThanOrEqual(12)
    for (const kind of kinds) expect(view, kind).toContain(`case '${kind}'`)
  })
})
