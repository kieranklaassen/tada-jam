import { beginNext, finishIfReady, markShown, waitingLead, withWorld } from './cycle'
import type { Game } from './game'
import { waits } from './game'
import { PERSONALITY } from './motion'
import { applyChange, type World } from './rules'
import { worldOf, type Saved } from './save'
import type { Beat } from './scene'
import {
  BEHIND_ARCH, IN_ARCH, LOOSE_Z, OFF_RIGHT, PARADE_SPEED, PARADE_STAGGER_S, ROW_Z, TILE_Z,
  paradeWay, spotX, wayFromArch, wayLength, wayOffLeft, wayOutByArch, wayToArch, wayToTile,
} from './stage'
import { ACTS as TASTE_ACTS, moodFor, tasteFor } from './tastes'
import { bap, creak, pip, plop, pok, scuttle } from './voices'

// The short scenes (ART.md, "The scenes"), each a list of timed beats on the
// template's scene.ts. A scene's outcome is its `save`: the game puts it into
// the save at once when the scene starts, so a put-away in the middle loses
// nothing and nothing replays. Any touch ends a scene: its beats that have
// not played all play, in order, and the theatre settles, which leaves the
// stage exactly as the save has it. Every beat here is a cue that happens
// once; the walking and the flying between cues are the theatre's.

export type Show = {
  /** The scene's name, as the sheet has it. */
  name: string
  beats: Beat[]
  /** What the scene saves when it starts. */
  save: (saved: Saved) => Saved
}

const WALK = 6.5
/** How long one who leaves stands in the arch looking back. */
const LOOKS_BACK_S = 0.9
/** How far apart creatures walk in a line: wide enough that the two widest never brush at a turn. */
const LINE_GAP = 4
/** How far the tile slides to be out of sight, towards the child. */
const TILE_AWAY = 9.5
const cue = (at: number, play: () => void): Beat => ({ at, lasts: 0, play })
const counter = (): (() => number) => { let n = 0; return () => n++ }

/** The scene ends when everything in it has come to rest: its last beat settles the theatre. */
function ending(game: Game, at: number): Beat {
  return cue(at, () => { game.play.settle(); game.dress() })
}

/**
 * The first showing, once ever: the first creature of the first crew walks to
 * the tile, stamps beside a hat, the hat pops out and lands on its own head,
 * and it walks back. The save already holds the hat on that head.
 */
export function firstShowing(game: Game): Show {
  const play = game.play, lead = game.saved.crew[0], hat = lead.hats[0] ?? 0, kind = game.saved.tile[hat], next = counter()
  const way = wayToTile(lead.spot, hat, game.saved.tile.length), walk = wayLength(way) / 5
  return {
    name: 'the-first-showing',
    save: markShown,
    beats: [
      cue(0, () => {
        play.place(hat, { at: 'tile' })
        play.look(lead.kind, 0, TILE_Z, 1.2)
        game.says(lead.kind, 'ask', 0.2)
      }),
      cue(0.8, () => play.walk(lead.kind, way, 5, 0, () => {
        play.act(lead.kind, 'stamps')
        play.after(0.45, () => {
          play.cue('creak', creak(next()))
          play.cue('pok', pok(kind, next()), 0.05)
          play.moveHat(hat, { at: 'head', who: lead.kind, level: 0 }, 'pop', () => {
            play.cue('bap', bap(kind, next()))
            play.bounce(lead.kind, 1 - PERSONALITY[lead.kind].bounce)
            play.act(lead.kind, TASTE_ACTS[lead.kind][kind])
            game.says(lead.kind, moodFor(tasteFor(lead.kind, kind)), 0.1)
            play.everyoneLooks(way[way.length - 1].x, TILE_Z - 2, 1.5, lead.kind)
            play.after(1.3, () => play.walk(lead.kind, [...way].reverse(), 5, 0, () => play.look(lead.kind, 0, TILE_Z, 1.5)))
          })
        })
      })),
      ending(game, 0.8 + walk + 0.45 + 0.6 + 1.3 + walk + 0.4),
    ],
  }
}

/** The cycle's change, when the crew is as paired as it can be and has been left alone: one more creature walks in, or one walks out. */
export function changeShow(game: Game): Show {
  const play = game.play, before = worldOf(game.saved), outcome = applyChange(before), next = counter()
  const save = (saved: Saved): Saved => withWorld(saved, outcome.world)
  const came = outcome.happened.find((event) => event.type === 'came'), left = outcome.happened.find((event) => event.type === 'left')
  if (came?.type === 'came') {
    const way = [OFF_RIGHT, BEHIND_ARCH, ...wayFromArch(came.spot)]
    return {
      name: 'one-comes',
      save,
      beats: [
        cue(0, () => {
          play.enter(came.kind, came.kind, OFF_RIGHT)
          play.everyoneLooks(IN_ARCH.x, IN_ARCH.z, 2.5, came.kind)
          play.walk(came.kind, way, WALK, 0, () => {
            // It sees the hats on the others, pats its own bare head and looks at the tile.
            play.look(came.kind, spotX(came.spot) - 4, ROW_Z, 0.7, 0.5)
            play.after(0.7, () => {
              play.act(came.kind, 'pats-its-bare-head')
              game.says(came.kind, 'ask', 0.1)
              play.after(1.2, () => play.look(came.kind, 0, TILE_Z, 1.5))
            })
          })
        }),
        cue(wayLength([OFF_RIGHT, BEHIND_ARCH, IN_ARCH]) / WALK, () => game.says(came.kind, 'plain')),
        ending(game, wayLength(way) / WALK + 0.7 + 1.2 + 0.3),
      ],
    }
  }
  if (left?.type !== 'left') return { name: 'nothing-changes', save, beats: [ending(game, 0)] }
  // The world has already let it go; on the stage it still stands on its spot, with its hat on if it had one.
  const who = left.kind, tossed = outcome.happened.find((event) => event.type === 'hatMoved'), way = wayOutByArch(left.spot)
  // The way out has the arch in the middle of it: as far as the arch, and on from there.
  const inArch = way.indexOf(IN_ARCH), toArch = way.slice(0, inArch + 1), away = way.slice(inArch)
  return {
    name: 'one-leaves',
    save,
    beats: [
      cue(0, () => {
        play.act(who, tossed ? 'bows-and-tosses' : 'shrugs')
        game.says(who, 'plain', 0.1)
      }),
      cue(0.5, () => {
        if (tossed?.type !== 'hatMoved') return
        const kind = game.saved.tile[tossed.hat]
        play.cue('pip', pip(kind, next()))
        play.moveHat(tossed.hat, { at: 'loose', spot: left.spot }, 'pop', () => {
          play.cue('plop', plop(kind, next()))
          play.cue('scuttle', scuttle(next()), 0.3)
          play.everyoneLooks(spotX(left.spot), LOOSE_Z, 2, who)
        })
      }),
      // It walks behind the row to the arch, stops in it, looks back at the row with a hop and a word of its own, and goes.
      cue(1.1, () => play.walk(who, toArch, WALK, 0, () => {
        play.look(who, 0, ROW_Z, LOOKS_BACK_S)
        play.bounce(who, 0.9, 0.5)
        game.says(who, 'plain')
        play.after(LOOKS_BACK_S, () => play.walk(who, away, WALK, 0, () => play.leave(who)))
      })),
      ending(game, 1.1 + wayLength(way) / WALK + LOOKS_BACK_S + 0.2),
    ],
  }
}

/** How long each creature takes to show its hat before the march, and the gap after the last. */
const SHOWS_FOR = 0.4

/**
 * The parade, the ending: the creatures look at one another's hats, each
 * shows its own feeling about the hat it wears, in row order, then they march
 * once round the row, each in its own walk, to a tune of their own voices,
 * and come to rest on their spots, facing the arch, where the next crew's
 * first creature has come to wait.
 */
export function paradeShow(game: Game): Show {
  const play = game.play, world: World = worldOf(game.saved), crew = [...world.crew].sort((a, b) => a.spot - b.spot)
  const feels = crew.map((creature) => tasteFor(creature.kind, world.tile[creature.hats[0]]))
  const march = 0.5 + crew.length * SHOWS_FOR + 0.3, marches = wayLength(paradeWay(0)) / PARADE_SPEED + crew.length * PARADE_STAGGER_S
  const beats: Beat[] = [cue(0, () => crew.forEach((creature, i) => play.look(creature.kind, spotX(crew[(i + 1) % crew.length].spot), ROW_Z, 0.6, 0.5)))]
  crew.forEach((creature, i) => beats.push(cue(0.5 + i * SHOWS_FOR, () => {
    play.act(creature.kind, feels[i] === 'loves' ? 'shows-its-hat-gladly' : feels[i] === 'cannot-stand' ? 'shows-its-hat-grumpily' : 'shows-its-hat-plainly')
    game.says(creature.kind, moodFor(feels[i]))
  })))
  beats.push(cue(march, () => crew.forEach((creature, i) => play.walk(creature.kind, paradeWay(creature.spot), PARADE_SPEED, i * PARADE_STAGGER_S, () => play.look(creature.kind, IN_ARCH.x, IN_ARCH.z, 3)))))
  // The marching tune: each creature's own voice in turn, on the beat.
  for (let beat = 0; march + 0.3 + beat * 0.45 < march + marches - 0.3; beat++) beats.push(cue(march + 0.3 + beat * 0.45, () => game.says(crew[beat % crew.length].kind, moodFor(feels[beat % crew.length]))))
  beats.push(cue(Math.max(0, march + marches - wayLength(wayToArch()) / WALK - 0.2), () => {
    // The first of the next crew comes to wait in the arch, calm and in plain view.
    const kind = waitingLead(game.saved)
    if (play.has(waits(kind))) return
    play.enter(waits(kind), kind, OFF_RIGHT)
    play.walk(waits(kind), wayToArch(), WALK)
  }))
  beats.push(ending(game, march + marches + 0.2))
  return { name: 'the-parade', save: (saved) => finishIfReady(saved), beats }
}

/**
 * A crew walks in, on the child's touch: the finished crew's hats hop home,
 * it walks off, its tile slides away, and the new crew walks in one by one
 * with its own tile.
 */
export function nextCrewShow(game: Game): Show {
  const play = game.play, old = [...game.saved.crew], next = counter()
  const laid = worldOf(beginNext(game.saved)), lead = waitingLead(game.saved)
  // The one who waited in the arch comes first; the others follow in the order of their spots, furthest spot first, so nobody has to pass anybody.
  const crew = [...laid.crew].sort((a, b) => (a.kind === lead ? -1 : b.kind === lead ? 1 : a.spot - b.spot))
  // The first comes from the arch. The others come in a line from off the mat, each starting further off, so the line has its gaps from the first step.
  const ways = crew.map((creature, i) => (i === 0 ? wayFromArch(creature.spot) : [{ x: OFF_RIGHT.x + (i - 1) * LINE_GAP, z: OFF_RIGHT.z }, BEHIND_ARCH, ...wayFromArch(creature.spot)]))
  const slowest = Math.max(...ways.map((way) => wayLength(way) / WALK))
  return {
    name: 'a-crew-walks-in',
    save: beginNext,
    beats: [
      cue(0, () => {
        for (const creature of old) play.rename(creature.kind, `${creature.kind}~`)
        let any = false
        for (let hat = 0; hat < play.hatCount; hat++) {
          if (play.seen(hat).at === 'tile') continue
          play.moveHat(hat, { at: 'tile' }, 'hop')
          any = true
        }
        if (any) play.cue('pip', pip(play.hatKind(0), next()))
      }),
      cue(0.5, () => {
        old.forEach((creature, i) => play.walk(`${creature.kind}~`, wayOffLeft(creature.spot), WALK, i * 0.15, () => play.leave(`${creature.kind}~`)))
        play.slideTile(TILE_Z, TILE_Z + TILE_AWAY, 0.8)
      }),
      cue(1.4, () => {
        play.layTile(laid.tile)
        game.tileLaid++
        play.slideTile(TILE_Z + TILE_AWAY, TILE_Z, 0.8)
        play.cue('creak', creak(next()), 0.7)
        crew.forEach((creature, i) => {
          if (i === 0 && play.has(waits(creature.kind))) play.rename(waits(creature.kind), creature.kind)
          else play.enter(creature.kind, creature.kind, ways[i][0])
          play.walk(creature.kind, ways[i], WALK, 0, () => {
            play.look(creature.kind, 0, TILE_Z, 1.5)
            play.act(creature.kind, 'pats-its-bare-head')
            game.says(creature.kind, 'ask', 0.1)
          })
        })
      }),
      ending(game, 1.4 + slowest + 0.8),
    ],
  }
}
