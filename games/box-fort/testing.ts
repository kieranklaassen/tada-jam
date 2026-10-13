import { cut, poke } from './face'
import { loadFort } from './fort'
import { ON_RUG, freshFort, serializeFort, type FortState } from './fortState'
import { project, type Vec } from './layout'
import { goesWith } from './movers'
import { babyDraw, catDraw, granDraw } from './people'
import { Play } from './play'
import { onSurface, spots, type Spot } from './targets'
import { Toy, type Cue, type Target } from './toy'

// What the tests share: a game with no browser, fingers that land where a
// thing is drawn, and the picture of the game as plain numbers. Nothing here
// is part of the game a child plays, and no game module reads it.

/** Kid-land is landscape: the two surfaces the stills are taken at. */
export const SURFACES = [[1180, 820], [1024, 768]] as const
export const FRAME = 1 / 60

export function playOf(state: FortState, seed = 1, surface: readonly [number, number] = SURFACES[0]): Play {
  const play = new Play(new Toy(state, seed))
  play.size(surface[0], surface[1])
  return play
}

/** A first visit, for a child of that age. */
export const first = (age: number | null = null, seed = 1): Play => playOf(freshFort(age), seed)

/** What storage hands back on the next visit. */
export const stored = (state: FortState): unknown => JSON.parse(JSON.stringify(serializeFort(state)))
/** The game as the next visit finds it. */
export const reopened = (play: Play, seed = 1): Play => playOf(loadFort(stored(play.toy.state)), seed, [play.width, play.height])

/** A place of the room on the play's surface, in its pixels. */
export function px(play: Play, at: Vec): [number, number] {
  const seen = project(at, play.width, play.height)
  return [seen.x, seen.y]
}

/** The spot of that kind as it lies on the surface, or null. */
export function spot(play: Play, kind: Target['kind'], which: (target: Target) => boolean = () => true): Spot | null {
  return spots(play.toy).find((entry) => entry.target.kind === kind && which(entry.target)) ?? null
}

/** The middle of a spot on the surface. */
export function middle(play: Play, kind: Target['kind'], which?: (target: Target) => boolean): [number, number] {
  const found = spot(play, kind, which)
  if (!found) throw new Error(`nothing to touch: ${kind}`)
  const seen = onSurface(found, play.width, play.height)
  return [seen.x, seen.y]
}

/**
 * Takes the sounds queued since the last call. Each must have been queued now, on the game's one clock, with a
 * motion that started at that same time and that may go with it: whoever takes sounds this way holds the rule
 * that there is no sound without a motion that is seen.
 */
export function heard(play: Play): Cue[] {
  const toy = play.toy, cues = toy.cues.splice(0)
  for (const cue of cues) {
    if (cue.at !== toy.time) throw new Error(`${cue.sound} was queued at ${cue.at} and taken at ${toy.time}`)
    if (toy.kicks.get(cue.mover) !== cue.at) throw new Error(`${cue.sound} started without its motion ${cue.mover}`)
    if (!goesWith(cue.sound, cue.mover)) throw new Error(`${cue.sound} does not go with ${cue.mover}`)
  }
  return cues
}

/** Plays for `seconds`, frame by frame, and returns every sound queued on the way. */
export function run(play: Play, seconds: number, dt = FRAME): Cue[] {
  const all: Cue[] = [...heard(play)]
  for (let t = 0; t < seconds - 1e-9; t += dt) { play.step(dt); all.push(...heard(play)) }
  return all
}

/** A tap: down, a few frames, up. Returns the sounds of the landing itself. */
export function tap(play: Play, at: readonly [number, number], id = 1, held = 0.08): Cue[] {
  play.down(id, at[0], at[1])
  const landed = heard(play)
  run(play, held)
  play.up(id, at[0], at[1])
  return landed
}

/** A drag from one place of the surface through others, a frame for each step; the finger stays down. */
export function drag(play: Play, points: readonly (readonly [number, number])[], id = 1, steps = 8): Cue[] {
  const all: Cue[] = []
  play.down(id, points[0][0], points[0][1])
  all.push(...heard(play))
  for (let i = 1; i < points.length; i++) {
    const [ax, ay] = points[i - 1], [bx, by] = points[i]
    for (let step = 1; step <= steps; step++) {
      play.move(id, ax + ((bx - ax) * step) / steps, ay + ((by - ay) * step) / steps)
      all.push(...heard(play), ...run(play, FRAME))
    }
  }
  return all
}

/** A drag that ends with the finger lifting where it got to. */
export function dragAndLift(play: Play, points: readonly (readonly [number, number])[], id = 1, steps = 8): Cue[] {
  const all = drag(play, points, id, steps), last = points[points.length - 1]
  play.up(id, last[0], last[1])
  return [...all, ...heard(play)]
}

/** A point of a face, given in cells, on the surface. */
export function onFace(play: Play, id: number, cx: number, cy: number): [number, number] {
  const rect = play.toy.rect(id)
  if (!rect) throw new Error(`box ${id} does not stand`)
  return px(play, { x: rect.x - rect.w / 2 + cx * 0.0125, y: rect.foot + cy * 0.0125, z: 0.6 })
}

/** Cuts a four-cornered hole in a face of the state, in cells. */
export function hole(state: FortState, id: number, x0: number, y0: number, x1: number, y1: number): void {
  cut(state.boxes[id].face, [{ x: x0, y: y0 }, { x: x1, y: y0 }, { x: x1, y: y1 }, { x: x0, y: y1 }])
}

export const peep = (state: FortState, id: number, x: number, y: number): void => { poke(state.boxes[id].face, { x, y }) }

/**
 * A fort with every material in use: two storeys on the big box and on a small one, both seams taped, a roof,
 * cushions in a box, the lights draped, and holes of every size. The second middling box lies on the heap.
 */
export function builtFort(): FortState {
  const state = freshFort(null)
  const put = (id: number, x: number, on: number): void => { Object.assign(state.boxes[id], { x, on, side: false }) }
  put(0, -35, ON_RUG); put(3, 130, ON_RUG); put(1, -35, 0); put(4, 130, 3)
  // An eye, a paw, a head, a body, and a door for the grandmother.
  peep(state, 4, 20, 30)
  hole(state, 3, 20, 20, 50, 50)
  hole(state, 1, 30, 20, 80, 70)
  hole(state, 0, 10, 40, 74, 104)
  hole(state, 0, 90, 2, 160, 104)
  state.tapes = [[0, 3], [1, 0]]
  state.blanket = [1, 4]
  state.cushions = [0, 0, -1]
  state.lights = [2, 3, 8, 9]
  const built = loadFort(stored(state))
  if (JSON.stringify(stored(built)) !== JSON.stringify(stored(state))) throw new Error('the built fort is not one the game could have built')
  return built
}

const round = (value: number): number => Math.round(value * 1000) / 1000
const place = (at: Vec): number[] => [round(at.x), round(at.y), round(at.z)]

/** Everything that is drawn, as plain numbers: two games with the same picture show the same frame, apart from where each idle motion stands. */
export function picture(toy: Toy): unknown {
  const cat = catDraw(toy), baby = babyDraw(toy), gran = granDraw(toy), cloth = toy.cloth()
  return {
    boxes: toy.state.boxes.map((box) => { const pose = toy.poseOf(`box:${box.id}`); return [...place(pose), round(pose.flat), round(pose.side)] }),
    cushions: toy.state.cushions.map((_, i) => place(toy.poseOf(`cushion:${i}`))),
    toys: toy.state.toys.map((_, i) => place(toy.poseOf(`toy:${i}`))),
    held: [...toy.withBaby],
    cloth: [cloth.xs.map(round), cloth.ys.map(round), round(cloth.front), round(cloth.back), round(cloth.hang)],
    bulbs: toy.bulbs().map(place),
    scissors: [toy.scissors.mode, ...place(toy.scissors.at), round(toy.scissors.turn)],
    stroke: toy.stroke, line: toy.state.line, piece: toy.piece, olds: toy.olds, hand: toy.hand, strip: toy.strip,
    // Where each of the three is, and which of their parts show; not how far each idle motion has got.
    cat: [toy.shows.cat.stage, toy.shows.cat.fit, ...place(toy.shows.cat.to), cat.body.show, cat.head.show, cat.legs.show, cat.strip, cat.reach.show, cat.shine],
    baby: [toy.shows.baby.stage, ...place(toy.shows.baby.to), baby.body, baby.arms, baby.legs],
    gran: [toy.shows.gran.stage, ...place(toy.shows.gran.to), round(gran.seated), round(gran.sunk), round(gran.scale), gran.hat.show, gran.headShow],
    dusk: round(toy.dusk()), lit: toy.lit, scene: toy.sceneRunning, watching: round(toy.watching), wary: toy.wary,
  }
}
