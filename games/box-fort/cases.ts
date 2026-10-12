import { seams } from './fort'
import { FIRED, ON_FLOOR, ON_HEAP, ON_RUG, freshFort, type FortState } from './fortState'
import { FRONT_Z } from './layout'
import type { Play } from './play'
import { FRAME, builtFort, heard, hole, middle, onFace, peep, playOf, px } from './testing'
import type { Cue } from './toy'
import type { SoundId } from './voices'

// Every act of the sheet's grid and scenes, played through the Mount's path:
// a state to start from, the fingers of a child, and the sounds the sheet
// says are heard. The tests run each of them and hold the rules that are true
// of every act: one clock for sight and sound, found as left at any instant,
// a scene that a touch ends at once. Nothing here is part of the game.

type Point = readonly [number, number]
type Steps = Generator<void, void, void>

/** The frame length the acts are played at; a test may play them at another. */
export const clock = { dt: FRAME }

function* frames(play: Play, seconds: number): Steps {
  for (let t = 0; t < seconds - 1e-9; t += clock.dt) { play.step(clock.dt); yield }
}
function* press(play: Play, at: Point, id = 1): Steps { play.down(id, at[0], at[1]); yield }
function* slide(play: Play, from: Point, to: Point, id = 1, steps = 8): Steps {
  for (let step = 1; step <= steps; step++) {
    play.move(id, from[0] + ((to[0] - from[0]) * step) / steps, from[1] + ((to[1] - from[1]) * step) / steps)
    yield
    play.step(FRAME)
    yield
  }
}
function* release(play: Play, at: Point, id = 1): Steps { play.up(id, at[0], at[1]); yield }
function* tapAt(play: Play, at: Point): Steps { yield* press(play, at); yield* frames(play, 0.08); yield* release(play, at) }
/** Takes what lies at `from` and lets it go at each of `to` in turn's last place. */
function* carry(play: Play, from: Point, ...to: Point[]): Steps {
  yield* press(play, from)
  let here = from
  for (const next of to) { yield* slide(play, here, next); here = next }
  yield* release(play, here)
}

const room = (play: Play, x: number, y: number): Point => px(play, { x, y, z: FRONT_Z })
const flap = (play: Play, id: number): Point => middle(play, 'flap', (target) => target.kind === 'flap' && target.id === id)
const cushion = (play: Play, index: number): Point => middle(play, 'cushion', (target) => target.kind === 'cushion' && target.index === index)

export type Case = {
  name: string
  from: () => FortState
  act: (play: Play) => Steps
  /** Seconds played after the last touch. */
  lasts: number
  /** Sounds the sheet says this act makes; each is heard at least once. */
  sounds: readonly SoundId[]
  /** What the save holds when it is over. */
  then: (state: FortState) => unknown
  holds: unknown
}

const young = (): FortState => freshFort(null)
const flush = (): FortState => { const state = young(); state.boxes[3].x = 130; return state }
const withHole = (x0: number, y0: number, x1: number, y1: number, more: (state: FortState) => void = () => {}) => (): FortState => { const state = young(); hole(state, 0, x0, y0, x1, y1); more(state); return state }
const dark = (from: () => FortState) => (): FortState => ({ ...from(), dark: true })
const SQUARE = [[30, 30], [70, 30], [70, 70], [30, 70], [31, 32]] as const

export const CASES: readonly Case[] = [
  // --- Box ---------------------------------------------------------------------
  { name: 'box: taken by its flap and set down flush against the big box', from: young, lasts: 1, sounds: ['scrape', 'thump'],
    act: function* (play) { const from = flap(play, 3); yield* carry(play, from, [from[0] - 10, from[1] - 30]) }, then: (state) => [state.boxes[3].x, seams(state).length], holds: [130, 1] },
  { name: 'box: off the heap and squarely onto the big box', from: () => freshFort(8), lasts: 3, sounds: ['unfold', 'thump'],
    act: function* (play) { yield* carry(play, middle(play, 'heap'), room(play, -0.35, 2.6)) }, then: (state) => state.boxes[3].on, holds: 0 },
  { name: 'box, used wrongly: let go half off, it tips and lies on its side as a tunnel', from: () => freshFort(8), lasts: 1.6, sounds: ['unfold', 'knock', 'knock', 'knock'],
    act: function* (play) { yield* carry(play, middle(play, 'heap'), room(play, 1.05, 2.4)) }, then: (state) => [state.boxes[3].on, state.boxes[3].side], holds: [ON_RUG, true] },
  { name: 'box and the cat: onto the highest box', from: () => ({ ...young(), cat: { at: 'rug' as const, box: 0, cell: 0 } }), lasts: 3, sounds: ['mew', 'hop', 'drum', 'purr'],
    act: function* (play) { yield* tapAt(play, middle(play, 'cat')) }, then: (state) => state.cat.at, holds: 'top' },
  { name: 'box and the baby: into the lowest box', from: young, lasts: 5, sounds: ['rattle', 'palms', 'giggle'],
    act: function* (play) { yield* tapAt(play, middle(play, 'baby')) }, then: (state) => state.baby, holds: 0 },
  { name: 'box and the grandmother: sits into one and wears it', from: young, lasts: 6, sounds: ['click', 'cluck', 'creak'],
    act: function* (play) { yield* tapAt(play, middle(play, 'gran')) }, then: (state) => state.gran, holds: { at: 'skirt', box: 3 } },
  { name: 'box in the dark: a box with no hole comes down as a black block', from: dark(young), lasts: 1, sounds: ['scrape', 'boom'],
    act: function* (play) { const from = flap(play, 3); yield* carry(play, from, [from[0] - 10, from[1] - 30]) }, then: (state) => state.boxes[3].x, holds: 130 },
  { name: 'box and the grandmother: the box she comes to wear sheds its roof, its cushion and its tape, and is hers alone', from: () => { const state = flush(); peep(state, 3, 14, 12); return { ...state, tapes: [[0, 3] as [number, number]], blanket: [0, 3] } }, lasts: 6, sounds: ['click', 'cluck', 'creak', 'flump', 'puff'],
    act: function* (play) { yield* carry(play, cushion(play, 0), onFace(play, 3, 14, 12)); yield* frames(play, 1); yield* tapAt(play, middle(play, 'gran')) }, then: (state) => [state.gran, state.tapes, state.cushions, state.blanket.includes(3)], holds: [{ at: 'skirt', box: 3 }, [], [-1, -1, -1], false] },
  { name: 'box and the grandmother: a cushion let go on the box she wears is let go on her, and goes back', from: () => ({ ...young(), gran: { at: 'skirt' as const, box: 3 } }), lasts: 2, sounds: ['puff', 'click'],
    act: function* (play) { yield* carry(play, cushion(play, 1), onFace(play, 3, 44, 12)) }, then: (state) => state.cushions, holds: [-1, -1, -1] },
  { name: 'box and the grandmother: a hole poked in the box she wears brings no cat to it', from: () => ({ ...young(), gran: { at: 'skirt' as const, box: 3 } }), lasts: 3, sounds: ['bite', 'pop', 'roll'],
    act: function* (play) { yield* tapAt(play, onFace(play, 3, 14, 12)) }, then: (state) => [state.cat.at, state.gran.at], holds: ['top', 'skirt'] },
  // --- Hole --------------------------------------------------------------------
  { name: 'hole: cut by the finger, and the cat looks out with a paw', from: young, lasts: 6, sounds: ['bite', 'snip', 'slap', 'mrrp', 'thud', 'oh', 'pat', 'squeal'],
    act: function* (play) {
      yield* press(play, onFace(play, 0, SQUARE[0][0], SQUARE[0][1]))
      for (let i = 1; i < SQUARE.length; i++) yield* slide(play, onFace(play, 0, SQUARE[i - 1][0], SQUARE[i - 1][1]), onFace(play, 0, SQUARE[i][0], SQUARE[i][1]))
      yield* release(play, onFace(play, 0, 31, 32))
    }, then: (state) => [state.cat.at, state.cat.box], holds: ['look', 0] },
  { name: 'hole, used wrongly: a tap pokes a peep-hole, and the cat presses an eye to it', from: young, lasts: 6, sounds: ['bite', 'pop', 'roll', 'mrrp', 'thud', 'peep', 'squeal'],
    act: function* (play) { yield* tapAt(play, onFace(play, 3, 40, 30)) }, then: (state) => [state.cat.at, state.cat.box], holds: ['look', 3] },
  { name: 'hole and the cat: walks through a big one', from: withHole(10, 40, 74, 104), lasts: 5, sounds: ['mew', 'hop', 'thud', 'mrrp', 'claws'],
    act: function* (play) { yield* tapAt(play, middle(play, 'cat')) }, then: (state) => state.cat.at, holds: 'in' },
  { name: 'hole and the cat: sticks in a small one with its back legs pedalling', from: withHole(20, 40, 70, 90), lasts: 6, sounds: ['mew', 'hop', 'thud', 'mrrp', 'claws', 'oh', 'squeal'],
    act: function* (play) { yield* tapAt(play, middle(play, 'cat')) }, then: (state) => state.cat.at, holds: 'stuck' },
  { name: 'hole and the cat: a tap pops a stuck cat out backwards', from: withHole(20, 40, 70, 90, (state) => { state.cat = { at: 'stuck', box: 0, cell: 60 * 176 + 40 } }), lasts: 3, sounds: ['mew', 'pop', 'thud'],
    act: function* (play) { yield* tapAt(play, middle(play, 'cat')) }, then: (state) => state.cat.at, holds: 'rug' },
  { name: 'hole and the cat: touched at a hole, it goes back up on top', from: withHole(20, 40, 70, 90, (state) => { state.cat = { at: 'look', box: 0, cell: 60 * 176 + 40 } }), lasts: 2, sounds: ['mew', 'hop', 'drum'],
    act: function* (play) { yield* tapAt(play, middle(play, 'cat')) }, then: (state) => state.cat.at, holds: 'top' },
  { name: 'hole and the baby: posts its toys through a slot, and one too big springs back', from: withHole(20, 10, 36, 26), lasts: 8, sounds: ['rattle', 'palms', 'sproing', 'tumble'],
    act: function* (play) { yield* tapAt(play, middle(play, 'baby')) }, then: (state) => [state.toys, state.baby], holds: [[-1, 0, 0], ON_RUG] },
  { name: 'hole and the baby: crawls in after its toys where the opening lets it', from: withHole(10, 4, 80, 70), lasts: 9, sounds: ['rattle', 'palms', 'tumble', 'giggle'],
    act: function* (play) { yield* tapAt(play, middle(play, 'baby')) }, then: (state) => [state.toys, state.baby], holds: [[0, 0, 0], 0] },
  { name: 'hole and the baby: touched in a box, it crawls back out', from: () => ({ ...young(), baby: 0 }), lasts: 4, sounds: ['rattle', 'palms', 'giggle'],
    act: function* (play) { yield* tapAt(play, middle(play, 'baby')) }, then: (state) => state.baby, holds: ON_RUG },
  { name: 'hole and the grandmother: a door she fits, she ducks in and sits', from: withHole(90, 2, 160, 104), lasts: 6, sounds: ['click', 'ooh', 'creak'],
    act: function* (play) { yield* tapAt(play, middle(play, 'gran')) }, then: (state) => state.gran, holds: { at: 'in', box: 0 } },
  { name: 'hole and the grandmother: a door too small, her head goes in, her hat stays out, and she wears the box', from: withHole(60, 2, 120, 40), lasts: 8, sounds: ['click', 'ooh', 'bonk', 'creak'],
    act: function* (play) { yield* tapAt(play, middle(play, 'gran')) }, then: (state) => state.gran, holds: { at: 'skirt', box: 0 } },
  { name: 'hole and the grandmother: touched in the fort, she stands up and goes back to her chair', from: withHole(90, 2, 160, 104, (state) => { state.gran = { at: 'in', box: 0 } }), lasts: 6, sounds: ['click', 'creak', 'cluck'],
    act: function* (play) { yield* tapAt(play, middle(play, 'gran')) }, then: (state) => state.gran.at, holds: 'chair' },
  { name: 'the room dark: every hole lights in turn, the tape, the roof, the cushions and the bulbs', from: builtFort, lasts: 9, sounds: ['flick', 'bell', 'mff', 'crackle', 'warm', 'plink'],
    act: function* (play) { yield* tapAt(play, middle(play, 'switch')) }, then: (state) => state.dark, holds: true },
  { name: 'the room dark: flicked again, the afternoon is back at once', from: dark(builtFort), lasts: 1, sounds: ['flick'],
    act: function* (play) { yield* tapAt(play, middle(play, 'switch')) }, then: (state) => state.dark, holds: false },
  { name: 'hole in the dark: light comes out of a new hole with a bell', from: dark(young), lasts: 5, sounds: ['bite', 'pop', 'bell'],
    act: function* (play) { yield* tapAt(play, onFace(play, 3, 40, 30)) }, then: (state) => state.cat.at, holds: 'look' },
  // --- Tape --------------------------------------------------------------------
  { name: 'tape: pulled off the roll to a seam and patted down', from: flush, lasts: 1, sounds: ['rip', 'press'],
    act: function* (play) { yield* carry(play, middle(play, 'roll'), room(play, 0.75, 0.44)) }, then: (state) => state.tapes, holds: [[0, 3]] },
  { name: 'tape, used wrongly: pulled to nothing, it springs back and the roll spins', from: young, lasts: 1, sounds: ['rip', 'zip', 'whirr'],
    act: function* (play) { yield* carry(play, middle(play, 'roll'), room(play, -0.9, 2.9)) }, then: (state) => state.tapes, holds: [] },
  { name: 'tape, used wrongly: on one box with no seam under it, it sticks by its end, curls up and springs back', from: young, lasts: 1.6, sounds: ['rip', 'press', 'zip', 'whirr'],
    act: function* (play) { yield* carry(play, middle(play, 'roll'), room(play, -0.6, 1)) }, then: (state) => state.tapes, holds: [] },
  { name: 'tape and the cat: stuck to a paw, which it shakes', from: young, lasts: 4, sounds: ['rip', 'flap'],
    act: function* (play) { yield* carry(play, middle(play, 'roll'), middle(play, 'cat')) }, then: (state) => state.tapes, holds: [] },
  { name: 'tape and the baby: bowls the roll over the rug', from: young, lasts: 5, sounds: ['rip', 'trundle'],
    act: function* (play) { yield* carry(play, middle(play, 'roll'), middle(play, 'baby')) }, then: (state) => state.tapes, holds: [] },
  { name: 'tape and the grandmother: presses every strip flat with her thumb', from: () => ({ ...flush(), tapes: [[0, 3] as [number, number]] }), lasts: 9, sounds: ['rip', 'squeak', 'press'],
    act: function* (play) { yield* carry(play, middle(play, 'roll'), middle(play, 'gran')) }, then: (state) => state.gran.at, holds: 'chair' },
  // --- Blanket -----------------------------------------------------------------
  { name: 'blanket: thrown over two boxes, it sags between them as a roof', from: young, lasts: 2, sounds: ['whoomp', 'settle'],
    act: function* (play) { yield* carry(play, middle(play, 'blanket'), room(play, 0.2, 2)) }, then: (state) => [...state.blanket].sort(), holds: [0, 3] },
  { name: 'blanket, used wrongly: over a single box it slides off and heaps on the rug', from: () => freshFort(8), lasts: 2.5, sounds: ['whoomp', 'hiss', 'flump'],
    act: function* (play) { yield* carry(play, middle(play, 'blanket'), room(play, -0.3, 2)) }, then: (state) => state.blanket, holds: [0] },
  { name: 'blanket and the cat: burrows under, and a tail comes out', from: young, lasts: 5, sounds: ['whoomp', 'hush', 'flump'],
    act: function* (play) { yield* carry(play, middle(play, 'blanket'), middle(play, 'cat')) }, then: (state) => state.blanket, holds: [] },
  { name: 'blanket and the baby: over its own head, and off again', from: young, lasts: 4, sounds: ['whoomp', 'squeal', 'flump'],
    act: function* (play) { yield* carry(play, middle(play, 'blanket'), middle(play, 'baby')) }, then: (state) => state.blanket, holds: [] },
  { name: 'blanket and the grandmother: she knits on under it', from: young, lasts: 5, sounds: ['whoomp', 'muffle', 'flump'],
    act: function* (play) { yield* carry(play, middle(play, 'blanket'), middle(play, 'gran')) }, then: (state) => state.blanket, holds: [] },
  // --- Cushion -----------------------------------------------------------------
  { name: 'cushion: pushed into a box', from: withHole(120, 20, 160, 60), lasts: 1, sounds: ['puff', 'whumpf'],
    act: function* (play) { yield* carry(play, cushion(play, 0), onFace(play, 0, 140, 40)) }, then: (state) => state.cushions, holds: [0, -1, -1] },
  { name: 'cushion, used wrongly: a box with no hole has no way in, and it flops onto the rug in front of it', from: young, lasts: 1, sounds: ['puff', 'knock'],
    act: function* (play) { yield* carry(play, cushion(play, 0), onFace(play, 0, 60, 60)) }, then: (state) => state.cushions, holds: [ON_FLOOR, -1, -1] },
  { name: 'cushion: let go on bare rug, it lies there', from: young, lasts: 1, sounds: ['puff'],
    act: function* (play) { yield* carry(play, cushion(play, 0), room(play, 0.9, 0.05)) }, then: (state) => [state.cushions, state.cushionAt[0]], holds: [[ON_FLOOR, -1, -1], 90] },
  // Each is let go on the opening: the first two go in, and the third, let go where a cushion already shows, is one too many.
  { name: 'cushion, used wrongly: a third one is fired back out across the rug', from: withHole(120, 20, 160, 60), lasts: 2, sounds: ['puff', 'whumpf', 'stretch', 'poomf'],
    act: function* (play) { for (const index of [0, 1, 2]) { yield* carry(play, cushion(play, index), onFace(play, 0, 140, 40)); if (index < 2) yield* frames(play, 1) } }, then: (state) => state.cushions, holds: [0, 0, FIRED] },
  { name: 'cushion and the cat: kneads it, turns round twice and curls up', from: young, lasts: 6, sounds: ['puff', 'tread', 'purr'],
    act: function* (play) { yield* carry(play, cushion(play, 1), middle(play, 'cat')) }, then: (state) => state.cushions, holds: [-1, -1, -1] },
  { name: 'cushion and the baby: flops face down on it', from: young, lasts: 4, sounds: ['puff', 'raspberry'],
    act: function* (play) { yield* carry(play, cushion(play, 1), middle(play, 'baby')) }, then: (state) => state.cushions, holds: [-1, -1, -1] },
  { name: 'cushion and the grandmother: sits on it and it lets its air go', from: young, lasts: 5, sounds: ['puff', 'wheeze'],
    act: function* (play) { yield* carry(play, cushion(play, 1), middle(play, 'gran')) }, then: (state) => state.cushions, holds: [-1, -1, -1] },
  { name: 'cushion in the dark: pushed behind a hole, it blocks the light', from: dark(withHole(20, 40, 70, 90)), lasts: 1, sounds: ['puff', 'whumpf', 'mff'],
    act: function* (play) { yield* carry(play, cushion(play, 0), onFace(play, 0, 120, 60)) }, then: (state) => state.cushions, holds: [0, -1, -1] },
  // --- String of lights ----------------------------------------------------------
  { name: 'lights: pulled off the hook and draped over the corners they pass', from: flush, lasts: 2, sounds: ['tink'],
    act: function* (play) { yield* carry(play, middle(play, 'lights'), room(play, 1.85, 0.85), room(play, 0.75, 1.62), room(play, -1.4, 1.62)) }, then: (state) => state.lights, holds: [7, 1, 0] },
  { name: 'lights, used wrongly: dropped on the rug, they fall in a tangle', from: young, lasts: 1, sounds: ['tink', 'glass'],
    act: function* (play) { yield* carry(play, middle(play, 'lights'), room(play, 2.6, 2.4), room(play, 2.5, 0.3)) }, then: (state) => state.tangled, holds: true },
  { name: 'lights, used wrongly: the next pull straightens the tangle, and it hangs on its hook again', from: () => ({ ...young(), tangled: true }), lasts: 1, sounds: ['slither', 'tink'],
    act: function* (play) { yield* carry(play, middle(play, 'lights'), room(play, 2.6, 0.6), room(play, 2.6, 2.6)) }, then: (state) => state.tangled, holds: false },
  { name: 'lights and the cat: swats a hanging bulb', from: young, lasts: 4, sounds: ['tink'],
    act: function* (play) { yield* carry(play, middle(play, 'lights'), room(play, 2.4, 2.9), room(play, 0, 2.9), middle(play, 'cat')) }, then: (state) => state.lights, holds: [] },
  { name: 'lights and the baby: shakes the end so every bulb jumps', from: young, lasts: 4, sounds: ['tink', 'jingle'],
    act: function* (play) { yield* carry(play, middle(play, 'lights'), room(play, 2.4, 2.9), room(play, -1.6, 2.9), middle(play, 'baby')) }, then: (state) => state.lights, holds: [] },
  { name: 'lights and the grandmother: a loop round her neck', from: young, lasts: 5, sounds: ['tink', 'hum'],
    act: function* (play) { yield* carry(play, middle(play, 'lights'), middle(play, 'gran')) }, then: (state) => state.lights, holds: [] },
  // --- Taking apart, and the rest --------------------------------------------------
  { name: 'taking apart: one pull of the loose tape end takes a strip and the highest box', from: builtFort, lasts: 3, sounds: ['press', 'tear', 'fold'],
    act: function* (play) { const tab = middle(play, 'tab'); yield* carry(play, tab, [tab[0] + 70, tab[1] - 10]) }, then: (state) => [state.boxes[1].on, state.tapes.length], holds: [ON_HEAP, 1] },
  { name: 'taking apart: a box dragged back onto the heap is folded flat', from: young, lasts: 1.5, sounds: ['scrape', 'fold'],
    act: function* (play) { yield* carry(play, flap(play, 3), middle(play, 'heap')) }, then: (state) => state.boxes[3].on, holds: ON_HEAP },
  { name: 'box and the cat: the box the cat sits on is carried, and the cat rides on it', from: young, lasts: 3, sounds: ['scrape', 'thump'],
    act: function* (play) { const from = flap(play, 0); yield* carry(play, from, [from[0], from[1] - 60], [from[0], from[1] - 10]) }, then: (state) => [state.cat.at, state.boxes[0].x], holds: ['top', -35] },
  { name: 'taking apart, used wrongly: a tap on the loose tape end pinches it, and nothing comes apart', from: builtFort, lasts: 1, sounds: ['press'],
    act: function* (play) { yield* tapAt(play, middle(play, 'tab')) }, then: (state) => [state.boxes[1].on, state.tapes.length], holds: [0, 2] },
  { name: 'anywhere else: the scissors snip the air and go back to the rug', from: young, lasts: 3, sounds: ['air', 'clack'],
    act: function* (play) { yield* tapAt(play, room(play, -0.9, 2.9)) }, then: (state) => state.cat.at, holds: 'top' },
]

export type Played = { play: Play; cues: Cue[]; /** How many steps the act took, the frames after it included. */ steps: number; /** The sounds of the very first landing. */ landing: Cue[] }

/** Plays a case through, or only its first `stop` steps: a step is one touch event or one frame. */
export function perform(entry: Case, stop = Infinity, each: (play: Play, now: readonly Cue[]) => void = () => {}, surface?: readonly [number, number]): Played {
  const play = playOf(entry.from(), 1, surface), cues: Cue[] = []
  let steps = 0, landing: Cue[] | null = null
  const whole = function* (): Steps { yield* entry.act(play); yield* frames(play, entry.lasts) }
  for (const _ of whole()) {
    const now = heard(play)
    landing ??= now
    cues.push(...now)
    each(play, now)
    if (++steps >= stop) break
  }
  return { play, cues, steps, landing: landing ?? [] }
}
