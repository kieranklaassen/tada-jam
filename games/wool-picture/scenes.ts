import { bowHang, bowStrands, combPluck, daylight, dryCracks, eveningLight, eveningWays, feltThump, fireHiss, rainFirst, rainGather, rainSteady, settleOnPeg, steamHiss, sunReach, swingUp, tuck, turnRound, unhook } from './calls'
import { hopFrom, refreshActs } from './folk'
import { CELL, COMB_HAND, FELT } from './layout'
import { Scene, followedBy, type Beat } from './scene'
import type { Toy } from './toy'
import { pluck } from './voices'
import { WALL_HOLDS, veilsOf, type Picture } from './wall'
import { weatherKeys, weatherOf } from './weather'
import { makeSheet } from './wool'

// The five short scenes, on scene.ts and on the toy's own clock. Each is a
// view of something that is already so: the save holds a scene's end from its
// first moment, and what the scene shows is how the screen gets there. `Show`
// holds how far each part has come, 0 to 1, and stands at 1 everywhere when no
// scene runs: that is what a load finds, so nothing replays.

export type Show = {
  kind: 'none' | 'rain' | 'sun' | 'evening' | 'fresh'
  /** The cloud and the sun a weather scene is about, by shape id, and whether a bow follows. */
  cloud: number
  sun: number
  bow: boolean
  /** Rain: the cloud gathers and darkens, the drops fall, what lies under answers. */
  gather: number; fall: number; answer: number
  /** The sun dries: the rays reach out, drops turn to steam, the cloud looks thinner on the sun's side, what was wet dries. */
  rays: number; steam: number; thin: number; dry: number
  /** The bow: its strands rise, arch across, and it hangs. */
  rise: number; arch: number; hang: number
  /** Evening: the peg, the picture taken down when the wall was full, and how far each part has come. */
  peg: number
  old: Picture | null
  down: number; swing: number; dusk: number; ways: number
  /** A fresh felt: it turns round, daylight comes back, the tuft springs up. The figures' turn to look is a mood of theirs. */
  turn: number; dawn: number; spring: number
}

export function steady(): Show {
  return { kind: 'none', cloud: 0, sun: 0, bow: false, gather: 1, fall: 1, answer: 1, rays: 1, steam: 1, thin: 1, dry: 1, rise: 1, arch: 1, hang: 1, peg: 0, old: null, down: 1, swing: 1, dusk: 1, ways: 1, turn: 1, dawn: 1, spring: 1 }
}

/** How dark the room is: 0 by day, 1 in the evening, and in between while a scene takes it there. */
export function lightOf(toy: Toy): number {
  if (toy.finished) return toy.show.kind === 'evening' ? toy.show.dusk : 1
  return toy.show.kind === 'fresh' ? 1 - toy.show.dawn : 0
}

/** The scene lengths, in seconds, as the sheet has them. */
export const SECONDS = { rain: 5, sun: 5, bow: 5, evening: 8, fresh: 4 } as const

/**
 * One beat. `set` takes its progress on every call. `start` runs once when the beat begins and `land` once when
 * it arrives, and neither runs when a touch is ending the scene: what a beat sounds belongs to the scene being
 * watched, and a landing is heard in the tick it lands.
 */
function beat(at: number, lasts: number, set: (progress: number) => void, start?: () => void, land?: () => void): Beat {
  let begun = false, landed = false
  return {
    at, lasts,
    play(progress, finishing) {
      set(progress)
      if (finishing) return
      if (!begun) { begun = true; start?.() }
      if (progress >= 1 && !landed) { landed = true; land?.() }
    },
  }
}

function rainBeats(toy: Toy): Beat[] {
  const show = toy.show
  return [
    beat(0, 1.3, (p) => { show.gather = p }, () => toy.cue(rainGather, 0, true)),
    beat(1.1, 1.2, (p) => { show.fall = 0.4 * p }, () => toy.cue(rainFirst, 0, true)),
    // What lies under answers as itself: it gives under the first drops, and its figures do what rain makes them do.
    // A fire the rain falls on hisses as its embers go dull.
    beat(2.2, 1.8, (p) => { show.answer = p }, () => { const under = toy.weather.rains.find((rain) => rain.cloud.id === show.cloud)?.under; if (under) { toy.clungAt.set(under.id, toy.t); if (under.kind === 'fire') toy.cue(fireHiss, 0, true) } }),
    beat(3.8, 1.2, (p) => { show.fall = 0.4 + 0.6 * p }, () => toy.cue(rainSteady, 0, true)),
  ]
}

function sunBeats(toy: Toy): Beat[] {
  const show = toy.show
  return [
    beat(0, 1.5, (p) => { show.rays = p }, () => toy.cue(sunReach, 0, true)),
    beat(1.2, 1.8, (p) => { show.steam = p }, () => toy.cue(steamHiss, 0, true)),
    beat(2.2, 1.3, (p) => { show.thin = p }),
    // What was wet dries as itself. A figure the sun has dried stands up as this begins (`shownOf` in folk.ts), and looks about.
    beat(3.2, 1.8, (p) => { show.dry = p }, () => { if (wetUnder(toy)) toy.cue(dryCracks, 0, true); for (const figure of toy.folk) if (figure.dried) { figure.mood = 'look'; figure.moodSince = toy.t; figure.lookAt = null } }),
  ]
}

/** Whether the sun's scene has anything to dry: a thing all of whose rain the sun reaches, or a figure that rain had wet. The cracking is heard only then. */
export function wetUnder(toy: Toy): boolean {
  const rain = toy.weather.rains.find((one) => one.cloud.id === toy.show.cloud)
  return (rain !== undefined && rain.under !== null && !rain.dry.includes(false)) || toy.folk.some((figure) => figure.dried && figure.driedBy === toy.show.cloud)
}

function bowBeats(toy: Toy): Beat[] {
  const show = toy.show
  return [
    beat(0, 1.5, (p) => { show.rise = p }, () => toy.cue(bowStrands, 0, true)),
    beat(1.3, 1.7, (p) => { show.arch = p }),
    beat(3, 2, (p) => { show.hang = p }, () => { toy.cue(bowHang, 0, true); toy.mothThroughBow() }),
  ]
}

/** Starts a scene: its parts go to 0, and it runs from the toy's clock. Nothing is saved here: the touch that caused it saved the wool or the figure. */
function begin(toy: Toy, kind: Show['kind'], beats: Beat[], zero: (keyof Show)[]): void {
  const show = toy.show
  show.kind = kind
  for (const part of zero) (show[part] as number) = 0
  toy.scene = new Scene(beats)
  toy.scene.start(toy.t, () => undefined)
}

type Keys = ReturnType<typeof weatherKeys>

/** After a touch: a key the weather did not have before is a cause. A sun that newly dries rain plays scene 2, and the bow after it where one stands; a cloud that newly rains on something plays scene 1. */
export function causeScene(toy: Toy, before: Keys, after: Keys): void {
  const added = (was: string[], now: string[]): string | undefined => now.find((key) => !was.includes(key))
  // A figure set down under rain that already falls is no cause: the rain goes on falling, and the figure answers it when a drop reaches it (folk.ts).
  const fell = (key: string): boolean => key.includes('>f') && before.raining.includes(Number(key.split('>')[0]))
  const sun = added(before.sun, after.sun), bow = added(before.bow, after.bow), rain = after.rain.find((key) => !before.rain.includes(key) && !fell(key))
  if (sun) {
    const [sunId, cloudId] = sun.split('*').map(Number)
    toy.show.sun = sunId; toy.show.cloud = cloudId
    toy.show.bow = after.bow.includes(`${sunId}~${cloudId}`)
    if (toy.show.bow) begin(toy, 'sun', followedBy(sunBeats(toy), bowBeats(toy)), ['rays', 'steam', 'thin', 'dry', 'rise', 'arch', 'hang'])
    else begin(toy, 'sun', sunBeats(toy), ['rays', 'steam', 'thin', 'dry'])
  } else if (bow) {
    const [sunId, cloudId] = bow.split('~').map(Number)
    toy.show.sun = sunId; toy.show.cloud = cloudId; toy.show.bow = true
    begin(toy, 'sun', bowBeats(toy), ['rise', 'arch', 'hang'])
  } else if (rain) {
    toy.show.cloud = Number(rain.split('>')[0])
    begin(toy, 'rain', rainBeats(toy), ['gather', 'fall', 'answer'])
  }
}

/**
 * The ending. The outcome is the toy's from this moment, and the save is asked for at once: the picture is on
 * the wall on its peg, the oldest has left when there were three, the sheet is bare, every figure is in the
 * dish, and the cycle is finished. The scene then shows the way there.
 */
export function hang(toy: Toy, peg: number): void {
  const show = toy.show, old = toy.wall.length >= WALL_HOLDS ? toy.wall[0] : null
  if (old) toy.wall.shift()
  toy.wall = toy.wall.filter((picture) => picture.peg !== peg)
  toy.wall.push({ peg, veils: veilsOf(toy.sheet) })
  const going: number[] = []
  toy.folk.forEach((figure, who) => { if (figure.at) { hopFrom(toy, who, true); figure.at = null; going.push(who) } })
  toy.leaving = toy.sheet
  toy.sheet = makeSheet()
  toy.finished = true
  toy.weather = weatherOf(toy.sheet)
  toy.keys = weatherKeys(toy.weather, toy.folk.map((figure) => figure.at))
  refreshActs(toy, false)
  toy.changed = true; toy.urgent = true
  show.peg = peg; show.old = old
  const from = old ? 1.2 : 0, homes = old ? 5 : 4.6, gap = old ? 0.45 : 0.55
  const beats: Beat[] = [
    beat(from, 2, (p) => { show.swing = p }, () => toy.cue(swingUp, 0, true), () => toy.play(settleOnPeg, true)),
    beat(from + 1.5, 2.6, (p) => { show.dusk = p }, () => toy.cue(eveningLight, 0, true)),
    beat(from + 2.8, 2.2, (p) => { show.ways = p }, () => toy.cue(eveningWays, 0, true)),
    ...going.map((who, i) => beat(homes + i * gap, 0, () => undefined, () => { const hop = toy.folk[who].hop; if (hop) hop.at = toy.t })),
    beat(6.8, 1.2, () => undefined, () => toy.mothTo(3 + peg, true)),
  ]
  if (old) beats.unshift(beat(0, 1.4, (p) => { show.down = p }, () => toy.play(unhook, true), () => toy.play(tuck, true)))
  begin(toy, 'evening', beats, old ? ['down', 'swing', 'dusk', 'ways'] : ['swing', 'dusk', 'ways'])
}

/** The child touched the felt that waits with its back to the room: the next cycle begins, and that is saved at once. */
export function turnFresh(toy: Toy): void {
  const show = toy.show
  toy.finished = false
  toy.changed = true; toy.urgent = true
  begin(toy, 'fresh', [
    beat(0, 1.2, (p) => { show.turn = p }, () => toy.cue(turnRound, 0, true), () => toy.play(feltThump, true)),
    beat(0.8, 2.2, (p) => { show.dawn = p }, () => toy.cue(daylight, 0, true)),
    beat(1.2, 0.8, (p) => { show.spring = p }, () => {
      // The tuft springs up with its pluck. With the comb chosen it is the comb that hops where it lies, and plucks.
      if (toy.hand === COMB_HAND) { toy.comb.vel = 9; toy.cue(combPluck, 0, true) } else toy.play(pluck(toy.hand, toy.size), true)
    }),
    beat(2, 2, () => undefined, () => { for (const figure of toy.folk) { figure.mood = 'look'; figure.moodSince = toy.t; figure.lookAt = { x: FELT.x + FELT.w / 2, y: FELT.y + FELT.h / 2 - CELL } } }),
  ], ['turn', 'dawn', 'spring'])
}

/** A scene is over, by itself or by a touch: every part stands at its end, and what belonged to the scene alone is let go. */
export function endScene(toy: Toy): void {
  const show = toy.show, kind = show.kind, peg = show.peg
  Object.assign(show, steady())
  show.peg = peg
  toy.scene = null
  toy.leaving = null
  if (kind === 'evening') {
    for (const figure of toy.folk) figure.hop = null
    toy.moth.perch = 3 + peg; toy.moth.flying = null; toy.moth.via = null; toy.moth.wish = null
  }
}
