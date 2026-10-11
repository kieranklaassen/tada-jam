import type { ActId } from './acts'
import type { Channel, Game, Heard } from './game'

// What is drawn when a sound is heard. The game queues every sound with the name of a channel; this table says,
// for each channel, what must be true of the game at that moment for the maker to be drawn making the sound, and
// which of the game's values the view reads to draw it. One test walks the whole grid and every scene and fails
// when a sound is heard while its channel is not on, and another reads the view's source and fails when the
// view does not read a channel's value. So nothing is only heard.

type Row = {
  /** Whether the maker is drawn doing it now. */
  on(game: Game): boolean
  /** What the view reads to draw it: a name that must appear in view.ts. */
  reads: string
}

const moving = (game: Game): boolean => (['soap', 'jug', 'towel', 'pyjamas', 'blanket'] as const).some((id) => game.things[id].mode !== 'home')
const lively = (spring: { v: number; d: number }): boolean => Math.abs(spring.v) > 0.004 || Math.abs(spring.d) > 0.2
const acting = (act: { id: ActId } | null, heard: ActId | undefined): boolean => act !== null && act.id === heard

export const SHOWN: Record<Exclude<Channel, `act:${string}`>, Row> = {
  // A thing in the hand or in the air is drawn there, squashed as it lands in the hand or comes to rest.
  held: { on: (game) => game.held !== null && game.things[game.held].mode === 'held', reads: 'squash' },
  landed: { on: (game) => (['soap', 'jug', 'towel', 'pyjamas', 'blanket'] as const).some((id) => lively(game.things[id].squash)), reads: 'squash' },
  flutter: { on: (game) => moving(game), reads: 'things' },
  stroke: { on: (game) => moving(game), reads: 'things' },
  water: { on: (game) => game.stream !== null, reads: 'stream' },
  towelDrip: { on: (game) => game.things.towel.soaked > 0 && game.things.towel.mode === 'returning', reads: 'soaked' },
  bits: { on: (game) => game.bits.length > 0, reads: 'bits' },
  // Teddy.
  tickle: { on: (game) => game.teddy.tickle > 0.3, reads: 'tickle' },
  cross: { on: (game) => game.teddy.cross > 0.4, reads: 'cross' },
  sneeze: { on: (game) => game.teddy.sneeze > 0, reads: 'sneeze' },
  squirm: { on: (game) => game.teddy.squirm > 0.4, reads: 'squirm' },
  shake: { on: (game) => game.teddy.shake > 0, reads: 'shake' },
  bliss: { on: (game) => game.teddy.bliss > 0.45, reads: 'bliss' },
  bounce: { on: (game) => lively(game.teddy.bounce), reads: 'bounce' },
  thump: { on: (game) => game.teddy.stamp > 0.3, reads: 'stamp' },
  shiver: { on: (game) => game.teddy.shiver > 0.5, reads: 'shiver' },
  walk: { on: (game) => game.teddy.walk > 0, reads: 'hop' },
  stretch: { on: (game) => game.teddy.stretch > 0, reads: 'stretch' },
  puddle: { on: (game) => game.teddy.puddle > 0 && game.teddy.outside > 0, reads: 'puddle' },
  // The duck, the cat, the lamp and the bath.
  duckSquash: { on: (game) => lively(game.duck.squash), reads: 'squash' },
  duckSpin: { on: (game) => game.duck.sinceWater < 0.2, reads: 'spin' },
  duckGleam: { on: (game) => game.duck.gleam > 0.3, reads: 'gleam' },
  catArch: { on: (game) => game.cat.arch > 0.35, reads: 'arch' },
  catSwat: { on: (game) => game.cat.swat > 0, reads: 'swat' },
  catJump: { on: (game) => lively(game.cat.jump), reads: 'jump' },
  catRub: { on: (game) => game.cat.rubbed > 0.3, reads: 'rubbed' },
  catStiff: { on: (game) => game.cat.stiff > 0, reads: 'stiff' },
  lampSwing: { on: (game) => lively(game.lampFx.swing), reads: 'swing' },
  lampRub: { on: (game) => game.lampFx.rubbed > 0, reads: 'rubbed' },
  tubPour: { on: (game) => game.stream !== null && game.stream.on === 'tub', reads: 'stream' },
  // The room.
  curtain: { on: (game) => Math.abs(game.env.curtainAt - game.env.curtainGoal) > 0.02 || lively(game.env.sway), reads: 'curtainAt' },
  night: { on: (game) => game.env.nightGoal === 1, reads: 'night' },
  door: { on: (game) => Math.abs(game.env.doorAt - game.env.doorGoal) > 0.02, reads: 'doorAt' },
}

const ACTORS = { 'act:teddy': (game: Game) => game.teddy.act, 'act:duck': (game: Game) => game.duck.act, 'act:cat': (game: Game) => game.cat.act, 'act:lamp': (game: Game) => game.lampFx.act, 'act:tub': (game: Game) => game.tub.act } as const

/** Whether what makes a sound is drawn making it, at the moment the sound is taken from the game. */
export function isShown(game: Game, heard: Heard): boolean {
  if (heard.by in ACTORS) return acting(ACTORS[heard.by as keyof typeof ACTORS](game), heard.act)
  return SHOWN[heard.by as keyof typeof SHOWN].on(game)
}
