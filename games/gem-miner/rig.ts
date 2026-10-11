import { TIERS } from './config'
import type { Event } from './game'
import { Play } from './play'
import { recordingCanvas, recordingCanvases, type Recording, type Stamped } from './recording'
import type { Sprite } from './pigment'
import { HillView } from './view'
import type { World } from './world'

// What the tests that draw share: the real view on a recording surface, and
// a visit whose events can be read as they happen. Only tests use it.

export const W = 1180, H = 820
export const FRAME = 1 / 60

export type Rig = {
  view: HillView
  surface: Recording
  /** How many canvases have been made so far: the sprites and the cached layers. */
  made: () => number
  /** Draws the visit as it stands and gives back what was stamped on the surface. */
  frame: (play: Play, step?: number) => Stamped[]
}

/** The real view on a surface of 1180 by 820 at the given pixel ratio. At a ratio of 1 a pixel is a stage unit. */
export function rig(ratio = 1): Rig {
  const canvases = recordingCanvases()
  const { canvas, recording } = recordingCanvas(W * ratio, H * ratio)
  const view = new HillView(canvas, canvases.make)
  view.resize(W, H, ratio)
  return {
    view, surface: recording, made: canvases.made,
    frame: (play, step = 0) => {
      recording.reset()
      view.draw({ game: play.game, cast: play.cast, effects: play.effects, guidance: play.guidance, step })
      return recording.stamps
    },
  }
}

/** The stamps of one picture in a frame. */
export const stampsOf = (stamps: readonly Stamped[], sprite: Sprite): Stamped[] => stamps.filter((one) => one.image === sprite.image)

/** A visit whose events are kept as they happen, each with the second of the visit it came at. */
export function watched(world: World, seed = 7): { play: Play; log: { t: number; event: Event }[] } {
  const play = new Play(world, seed, TIERS[0])
  const log: { t: number; event: Event }[] = []
  watch(play, log)
  return { play, log }
}

/** Keeps the events of a visit's game as it gives them out. Asked again after `park`, which makes a new game. */
export function watch(play: Play, log: { t: number; event: Event }[]): void {
  const game = play.game
  const drain = game.drain.bind(game)
  game.drain = () => {
    const events = drain()
    for (const event of events) log.push({ t: play.time, event })
    return events
  }
}

/** Plays a visit for some seconds with no finger down, or with one. */
export function run(play: Play, seconds: number, touching = false): void {
  for (let t = FRAME; t <= seconds + 1e-9; t += FRAME) play.step(FRAME, touching)
}
