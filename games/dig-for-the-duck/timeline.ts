import type { Beat } from './scene'

// One timeline for every scene and every short answer of a resident. The
// model plays it, the figures read their poses from it and the notes are
// named in it, so a sound and the move that makes it cannot drift apart: a
// cue is a part of a figure's pose, when it moves, and the voice it makes
// while it does. Pure data; a test walks every cue.

/** A part of a scene: `part` is the name the pose reads its progress by, and `note` the voice in voices.ts that sounds as it starts. */
export type Cue = { part: string; at: number; lasts: number; note?: string }

export const SCENES = {
  /** The water in the sitting room reaches the seat of the armchair. */
  moleAfloat: [
    { part: 'slippers', at: 0, lasts: 1.4, note: 'bloop' },
    { part: 'feet', at: 0.9, lasts: 0.7 },
    { part: 'chair', at: 1.7, lasts: 2, note: 'chairCreak' },
    { part: 'shade', at: 2.9, lasts: 2.3, note: 'bob' },
    { part: 'wetPage', at: 5.1, lasts: 0.9, note: 'page' },
  ],
  /** The water in the room falls below the seat. */
  moleDown: [
    { part: 'lower', at: 0, lasts: 0.4 },
    { part: 'bump', at: 0.4, lasts: 0.35, note: 'bump' },
    { part: 'wring', at: 1, lasts: 1.9, note: 'wring' },
    { part: 'readOn', at: 3.1, lasts: 1, note: 'page' },
  ],
  /** Water reaches the first boot. */
  wormBoots: [
    { part: 'glug0', at: 0, lasts: 0.45, note: 'glug0' },
    { part: 'glug1', at: 0.5, lasts: 0.45, note: 'glug1' },
    { part: 'glug2', at: 1, lasts: 0.45, note: 'glug2' },
    { part: 'glug3', at: 1.5, lasts: 0.45, note: 'glug3' },
    { part: 'glug4', at: 2, lasts: 0.45, note: 'glug4' },
    { part: 'glug5', at: 2.5, lasts: 0.45, note: 'glug5' },
    { part: 'pull0', at: 3.1, lasts: 0.6, note: 'pullOn' },
    { part: 'pull1', at: 3.8, lasts: 0.6, note: 'pullOn' },
    { part: 'pull2', at: 4.5, lasts: 0.6, note: 'pullOn' },
    { part: 'squelch', at: 5.1, lasts: 0.9, note: 'squelch' },
  ],
  /** Rain from a cloud, or a spout of water, lands on the line. The pieces are numbered in the order they sag: she trots to each and wrings it, then trots home and opens the umbrella. */
  badgerRain: [
    { part: 'sag0', at: 0, lasts: 0.4, note: 'sag' },
    { part: 'sag1', at: 0.4, lasts: 0.4, note: 'sag' },
    { part: 'sag2', at: 0.8, lasts: 0.4, note: 'sag' },
    { part: 'sag3', at: 1.2, lasts: 0.4, note: 'sag' },
    { part: 'to0', at: 1.65, lasts: 0.25 },
    { part: 'wring0', at: 1.9, lasts: 0.4, note: 'wringOut' },
    { part: 'to1', at: 2.3, lasts: 0.2 },
    { part: 'wring1', at: 2.5, lasts: 0.4, note: 'wringOut' },
    { part: 'to2', at: 2.9, lasts: 0.2 },
    { part: 'wring2', at: 3.1, lasts: 0.4, note: 'wringOut' },
    { part: 'to3', at: 3.5, lasts: 0.2 },
    { part: 'wring3', at: 3.7, lasts: 0.4, note: 'wringOut' },
    { part: 'home', at: 4.15, lasts: 0.35 },
    { part: 'umbrella', at: 4.5, lasts: 0.6, note: 'fwop' },
    { part: 'lookUp', at: 5.2, lasts: 0.8 },
  ],
  /** The first showing of clay: the mole tips his teacup onto it and the tea stands as a pool. */
  showClay: [
    { part: 'tip', at: 0, lasts: 0.7, note: 'pour' },
    { part: 'peerAt', at: 1.2, lasts: 2.8 },
  ],
  /** The first showing of rock: the worm knocks a boot on it and nothing gives. */
  showRock: [
    { part: 'bootBack0', at: 0, lasts: 0.25 },
    { part: 'bootKnock0', at: 0.25, lasts: 0.3, note: 'knock' },
    { part: 'bootBack1', at: 0.8, lasts: 0.25 },
    { part: 'bootKnock1', at: 1.05, lasts: 0.3, note: 'knock' },
    { part: 'shrug', at: 1.9, lasts: 2.2 },
  ],
  /** The first showing of moss: the worm wrings a sock over it and it swells. */
  showMoss: [
    { part: 'sock', at: 0, lasts: 0.8, note: 'wring' },
    { part: 'watchMoss', at: 1, lasts: 3 },
  ],
  /** The first showing of a hot stone: the badger drops a wet sock on it and a puff of steam rises and rains on her head. */
  showHot: [
    { part: 'toss', at: 0, lasts: 0.6, note: 'flap' },
    { part: 'duckHead', at: 1.6, lasts: 2.4 },
  ],
  /** The first showing of seed earth: the mole waters a seed and its root shoots across his doorway. */
  showEarth: [
    { part: 'can', at: 0, lasts: 0.8, note: 'pour' },
    { part: 'peerAt', at: 1.2, lasts: 2.8 },
  ],
  /** The bath is three fifths full: the duck floats. */
  ending: [
    { part: 'tailUp', at: 0, lasts: 0.7 },
    { part: 'bobFree', at: 0.7, lasts: 0.8, note: 'slosh' },
    { part: 'squeaks', at: 1.6, lasts: 0.5, note: 'squeakWet' },
    { part: 'circle', at: 2.2, lasts: 2.3, note: 'swirl' },
    { part: 'jet', at: 4.6, lasts: 1.4, note: 'squirt' },
    { part: 'allLook', at: 5.2, lasts: 2.8 },
  ],
  /** The plug is pulled on a finished hill: the next hill comes. */
  plug: [
    { part: 'whirl', at: 0, lasts: 2, note: 'gurgle' },
    { part: 'spinDown', at: 0.4, lasts: 1.6 },
    { part: 'slide', at: 2.1, lasts: 2.6, note: 'rumble' },
    { part: 'settle', at: 4.8, lasts: 1.2, note: 'squeakDry' },
  ],
} as const satisfies Record<string, readonly Cue[]>

export type SceneName = keyof typeof SCENES
export const SCENE_NAMES = Object.keys(SCENES) as SceneName[]

/** Who a scene belongs to: one scene of each owner can play at a time, and two owners' scenes side by side. */
export const OWNER: Record<SceneName, 'mole' | 'worm' | 'badger' | 'duck' | 'show'> = {
  moleAfloat: 'mole', moleDown: 'mole', wormBoots: 'worm', badgerRain: 'badger',
  showClay: 'show', showRock: 'show', showMoss: 'show', showHot: 'show', showEarth: 'show',
  ending: 'duck', plug: 'duck',
}

/** Who plays each first showing. */
export const SHOWN_BY = { clay: 'mole', rock: 'worm', moss: 'worm', hot: 'badger', earth: 'mole' } as const
export const SHOWING = { clay: 'showClay', rock: 'showRock', moss: 'showMoss', hot: 'showHot', earth: 'showEarth' } as const satisfies Record<string, SceneName>

/** How far each part of a scene has played, 0 to 1, by part name. */
export type Parts = Record<string, number>

/** Every part of a scene at one value: 0 before it, 1 after it. */
export function partsAt(scene: SceneName, value: number): Parts {
  const parts: Parts = {}
  for (const cue of SCENES[scene]) parts[cue.part] = value
  return parts
}

/** A scene's parts at a moment of it, in seconds from its start. */
export function partsOf(scene: SceneName, seconds: number): Parts {
  const parts: Parts = {}
  for (const cue of SCENES[scene] as readonly Cue[]) parts[cue.part] = cue.lasts > 0 ? Math.min(1, Math.max(0, (seconds - cue.at) / cue.lasts)) : seconds >= cue.at ? 1 : 0
  return parts
}

/**
 * A scene as beats for scene.ts. Each beat writes its part's progress into `parts`, and tells `sound` its
 * note once each time the scene plays, as the part starts, unless a touch is ending the scene.
 */
export function beatsOf(scene: SceneName, parts: Parts, sound: (note: string) => void): Beat[] {
  return (SCENES[scene] as readonly Cue[]).map((cue) => {
    // Where the beat stood after its last call: at 1 it is over, and the next call begins it again.
    let last = 1
    return {
      at: cue.at,
      lasts: cue.lasts,
      play(progress: number, finishing: boolean): void {
        parts[cue.part] = progress
        if (cue.note && last >= 1 && !finishing) sound(cue.note)
        last = progress
      },
    }
  })
}

/**
 * A resident's short answer to something that happens in the hill: who makes it, how long the move lasts
 * and the voice that goes with it. The model starts the move and queues the voice in one call.
 */
export const ANSWERS = {
  /** Tapped. */
  duckSqueak: { who: 'duck', lasts: 0.7 },
  moleHide: { who: 'mole', lasts: 2.1, note: 'harrumph' },
  wormPop: { who: 'worm', lasts: 2.4, note: 'pop' },
  badgerSnap: { who: 'badger', lasts: 1.1, note: 'flap' },
  /** Loose sand lands in the bath: the duck shakes it off its cap with a sneeze. */
  duckSneeze: { who: 'duck', lasts: 0.9, note: 'sneeze' },
  /** The bath is boiled: the duck sinks to the beak and sighs. */
  duckSigh: { who: 'duck', lasts: 2.2, note: 'sigh' },
  /** A rock is scraped: the mole puts his fingers in his ears. */
  moleEars: { who: 'mole', lasts: 1.2 },
  /** A stone drops: his book jumps. */
  moleJump: { who: 'mole', lasts: 0.8, note: 'flump' },
  /** Steam in the room fogs his glasses: he wipes them on a slipper. */
  moleWipe: { who: 'mole', lasts: 2.4, note: 'wipe' },
  /** Steam shrinks a boot until it will not go on. */
  wormShrink: { who: 'worm', lasts: 2.6, note: 'shrink' },
  /** Loose sand in a boot: the worm tips it out. */
  wormTip: { who: 'worm', lasts: 1.8, note: 'tipOut' },
  /** Steam on the hillside: the badger holds a shirt in it to press it. */
  badgerPress: { who: 'badger', lasts: 2.2, note: 'press' },
  /** A stone lands: every resident hops. */
  hop: { who: 'all', lasts: 0.5 },
  /** A rock is knocked: something inside the hill knocks back twice. */
  knockBack: { who: 'hill', lasts: 0.9 },
} as const satisfies Record<string, { who: string; lasts: number; note?: string }>

export type AnswerName = keyof typeof ANSWERS
export const ANSWER_NAMES = Object.keys(ANSWERS) as AnswerName[]
