import type { Note } from './audio'
import type { Direction } from './cat'
import { CAT, HELD, HOLD_PAWS, PAPER, POOL, TOOL, TRAY, hungRect, type Rect, type ToolId } from './layout'
import type { Beat } from './scene'
import { blehVoice, dabVoice, dripVoice, lickVoice, paperVoice, pegVoice, purrVoice, slideVoice } from './voices'

// The four short scenes, as lists of beats for scene.ts. A scene's outcome is
// in the saved state from its first moment; what is written here is only how
// the screen gets there. Every beat leaves its part at its end when it is
// played at 1, and makes no sound when a touch is ending the scene.

/** What a scene shows that the saved state does not hold. All of it is at rest, as below, when no scene plays. */
export type Show = {
  /** The water as it lay, shown until the sheet covers it. */
  under: Uint8Array | null
  /** The sheet of paper on its way: floating down, soaking, peeled up, turned over. */
  sheet: { phase: 'none' | 'down' | 'soak' | 'peel' | 'turn'; t: number }
  /** The newest print is in the cat's paws. False while its sheet is still on its way there. */
  holding: boolean
  /** 0 to 1: the held print pushed out at arm's length, or brought to the cheek. */
  away: number
  cheek: number
  /** Drips on their way down: from `y` to `to`, `t` of the way. */
  drips: { x: number; y: number; to: number; t: number }[]
  /** The oldest print, pulled off the line: `t` of the way down behind the cat. */
  leaving: { cells: string; peg: number; t: number } | null
  /** A print on its way to where it belongs: which one, from where, and `t` of the way. */
  fly: { print: number; from: Rect; t: number } | null
  /** A tool on its way over the table: where it is and how it is turned. */
  tool: { id: ToolId; x: number; y: number; turn: number } | null
  /** A tool that has not come out from behind the cat yet. */
  hidden: ToolId | null
  /** What the scene has the cat do. */
  direction: Direction | null
}

export const restingShow = (): Show => ({ under: null, sheet: { phase: 'none', t: 0 }, holding: true, away: 0, cheek: 0, drips: [], leaving: null, fly: null, tool: null, hidden: null, direction: null })

/** What a scene may ask of the toy besides changing what is shown. */
export type Stagehand = {
  show: Show
  /** A sound, heard in this frame. */
  say(notes: Note[]): void
  /** A ring of ripples on the water at this place of the stage, carrying no colour. */
  ripple(x: number, y: number, size: number): void
  hop(): void
  shake(): void
  /** A hung print is set swinging. */
  swing(peg: number): void
}

export type Taste = 'fond' | 'sour' | 'plain'

const ease = (t: number): number => t * t * (3 - 2 * t)
const mix = (a: number, b: number, t: number): number => a + (b - a) * t
const cue = (at: number, play: (finishing: boolean) => void): Beat => ({ at, lasts: 0, play: (_, finishing) => play(finishing) })
const heard = (at: number, hand: Stagehand, notes: () => Note[]): Beat => cue(at, (finishing) => { if (!finishing) hand.say(notes()) })

/** Where the paws hold a print: one at each side of it. */
export const HOLD: Direction = { pawL: HOLD_PAWS[0], pawR: HOLD_PAWS[1] }
const HELD_MID = { x: HELD.x + HELD.w / 2, y: HELD.y + HELD.h / 2 }
/** How far down the held print is pushed, at arm's length, when the cat cannot stand it. toy.ts places the print by it. */
export const AWAY = 46
/** A print it cannot stand is held away by two claws: the paws come to its top edge, a claw out on each, hooked over it. `out` is 0 to 1. */
const pinched = (out: number): Direction => {
  const top = HELD.y + AWAY * out
  return { pawL: { x: mix(HOLD_PAWS[0].x, HELD.x + 24, out), y: mix(HOLD_PAWS[0].y, top - 3, out) }, pawR: { x: mix(HOLD_PAWS[1].x, HELD.x + HELD.w - 24, out), y: mix(HOLD_PAWS[1].y, top - 3, out) }, claws: out }
}

/** How the cat looks at a print, by its taste: the look only, never a word to the child. */
function lookAt(taste: Taste, at: { x: number; y: number }, base: Direction): Direction {
  if (taste === 'fond') return { ...base, look: at, tilt: 0.8, lean: 0.9, pupil: 0.95 }
  if (taste === 'sour') return { ...base, look: at, lean: -0.9, wrinkle: 1, lick: 1, pupil: 0.55 }
  return { ...base, look: at, pupil: 0.8 }
}

/** Scene 1, the print: 6 seconds. `earlier` is the index of a print the cat still held, now on its way to its peg, or -1. */
export function printBeats(hand: Stagehand, taste: Taste, earlier: number): Beat[] {
  const show = hand.show
  const drip = (at: number, x: number, variant: number): Beat[] => {
    const one = { x, y: HELD.y + HELD.h, to: HELD.y + HELD.h + 60 + 14 * variant, t: 0 }
    return [
      { at, lasts: 0.32, play: (t) => {
        if (t >= 1) show.drips = show.drips.filter((d) => d !== one)
        else {
          if (!show.drips.includes(one)) show.drips.push(one)
          one.t = t * t
        }
      } },
      cue(at + 0.32, (finishing) => {
        if (finishing) return
        hand.say(dripVoice(variant))
        hand.ripple(one.x, one.to, 0.3)
      }),
    ]
  }
  return [
    // The cat hops as the sheet is pulled from under it, and lands. The oldest print, when a fifth is taken, comes
    // off its peg with a click and a flutter and goes down behind the cat, which lands on it.
    cue(0, (finishing) => {
      if (finishing) return
      hand.hop()
      if (show.leaving) hand.say([...pegVoice(), ...paperVoice(3)])
    }),
    { at: 0, lasts: 0.6, play: (t) => {
      if (show.leaving) show.leaving.t = ease(t)
      if (show.fly) show.fly.t = ease(t)
      if (t >= 1) {
        show.leaving = null
        show.fly = null
      }
    } },
    cue(0.6, (finishing) => { if (!finishing && earlier >= 0) hand.say(pegVoice()) }),
    // The sheet floats down onto the water and lies flat.
    { at: 0.3, lasts: 0.9, play: (t) => {
      show.sheet = { phase: 'down', t: ease(t) }
      show.direction = { look: { x: mix(PAPER.x, POOL.x + POOL.w / 2, t), y: mix(PAPER.y, POOL.y + POOL.h / 2, t) } }
      if (t >= 1) show.under = null
    } },
    heard(1.2, hand, () => paperVoice(1)),
    // The colour soaks through its back.
    { at: 1.2, lasts: 1.2, play: (t) => { show.sheet = { phase: 'soak', t } } },
    // The cat pinches a corner and peels it up.
    heard(2.4, hand, () => paperVoice(2)),
    { at: 2.4, lasts: 1, play: (t) => {
      show.sheet = { phase: 'peel', t: ease(t) }
      show.direction = { pawR: { x: mix(CAT.paws[1].x, CAT.paws[1].x + 40, t), y: mix(CAT.paws[1].y, POOL.y + 14, t) }, look: { x: CAT.paws[1].x + 40, y: POOL.y + 40 } }
    } },
    // The sheet turns over and shows the water's pattern, in the cat's paws.
    { at: 3.4, lasts: 0.8, play: (t) => {
      show.sheet = t >= 1 ? { phase: 'none', t: 0 } : { phase: 'turn', t: ease(t) }
      show.holding = t >= 1
      show.direction = { ...HOLD, look: HELD_MID }
    } },
    ...drip(4.0, HELD.x + 30, 0),
    ...drip(4.4, HELD.x + 74, 1),
    // The cat looks at the print as its tastes say.
    { at: 4.2, lasts: 1.8, play: (t) => {
      const strength = t >= 1 ? 0 : Math.sin(Math.min(1, t * 1.2) * Math.PI)
      show.cheek = taste === 'fond' ? strength : 0
      show.away = taste === 'sour' ? strength : 0
      show.direction = t >= 1 ? null : lookAt(taste, HELD_MID, taste === 'sour' ? pinched(strength) : HOLD)
    } },
    cue(4.5, (finishing) => {
      if (finishing || taste === 'plain') return
      hand.say(taste === 'fond' ? purrVoice(0) : blehVoice())
    }),
    cue(4.95, (finishing) => { if (!finishing && taste === 'fond') hand.say(purrVoice(1)) }),
  ]
}

/** The corner of the water a tool is drawn through, and the way through it. */
const CORNER = { x: POOL.x + POOL.w - 52, y: POOL.y + 34 }
const THROUGH = { x: POOL.x + POOL.w - 128, y: POOL.y + 118 }
const BEHIND = { x: CAT.body.x + CAT.body.rx + 26, y: TRAY.y - 14 }

/**
 * Scene 2, a new tool comes to the table: 5 seconds. The cat fetches it from behind itself and bats it; it slides
 * across the table toward the pots, through a corner of the water, which ripples and holds no colour, and onto
 * the cloth. With `owed`, the tool already lies on the cloth and the child has just taken it up: it goes from the
 * cloth through the same corner and back, 3.5 seconds.
 */
export function toolBeats(hand: Stagehand, tool: ToolId, owed: boolean): Beat[] {
  const show = hand.show, spot = { x: TOOL[tool].x + TOOL[tool].w / 2, y: TOOL[tool].y + TOOL[tool].h / 2 }
  const from = owed ? spot : BEHIND, t0 = owed ? 0 : 0.8
  const through: Beat[] = [
    heard(t0, hand, () => slideVoice(0)),
    { at: t0, lasts: 1.2, play: (t) => {
      const e = ease(t)
      show.tool = { id: tool, x: mix(from.x, CORNER.x, e), y: mix(from.y, CORNER.y, e) - 26 * Math.sin(e * Math.PI) * (owed ? 1 : 0), turn: mix(owed ? 0 : -0.5, 0.7, e) }
      const look = { x: show.tool.x, y: show.tool.y }
      // The cat bats it on its way with the paw that fetched it, and the paw goes home.
      const bat = Math.sin(Math.min(1, t * 4) * Math.PI), home = Math.min(1, Math.max(0, t * 4 - 1))
      show.direction = owed ? { look } : { pawL: HOLD.pawL, look, pawR: { x: mix(BEHIND.x - 8 + 44 * bat, CAT.paws[1].x, home), y: mix(BEHIND.y - 6, CAT.paws[1].y, home) } }
    } },
    heard(t0 + 1.2, hand, () => slideVoice(1)),
    // Drawn once through a corner of the water, which ripples and holds no colour.
    { at: t0 + 1.2, lasts: 1.2, play: (t) => {
      const e = ease(t)
      show.tool = { id: tool, x: mix(CORNER.x, THROUGH.x, e), y: mix(CORNER.y, THROUGH.y, e), turn: 0.7 }
      show.direction = { look: { x: show.tool.x, y: show.tool.y } }
    } },
    cue(t0 + 1.5, (finishing) => { if (!finishing) hand.ripple(mix(CORNER.x, THROUGH.x, 0.2), mix(CORNER.y, THROUGH.y, 0.2), 0.5) }),
    cue(t0 + 2.0, (finishing) => { if (!finishing) hand.ripple(mix(CORNER.x, THROUGH.x, 0.7), mix(CORNER.y, THROUGH.y, 0.7), 0.5) }),
    { at: t0 + 2.4, lasts: 1.1, play: (t) => {
      const e = ease(t)
      show.tool = t >= 1 ? null : { id: tool, x: mix(THROUGH.x, spot.x, e), y: mix(THROUGH.y, spot.y, e) - 40 * Math.sin(e * Math.PI), turn: mix(0.7, 0, e) }
      show.direction = t >= 1 ? null : { look: { x: mix(THROUGH.x, spot.x, e), y: mix(THROUGH.y, spot.y, e) } }
    } },
    heard(t0 + 3.5, hand, () => slideVoice(2)),
  ]
  if (owed) return through
  return [
    // The cat reaches behind itself with its free paw, and the tool comes out.
    { at: 0, lasts: 0.8, play: (t) => {
      const e = ease(t)
      show.hidden = t >= 1 ? null : tool
      if (t >= 1) show.tool = { id: tool, x: BEHIND.x, y: BEHIND.y, turn: -0.5 }
      show.direction = { pawL: HOLD.pawL, pawR: { x: mix(CAT.paws[1].x, BEHIND.x - 8, e), y: mix(CAT.paws[1].y, BEHIND.y - 6, e) }, look: BEHIND }
    } },
    ...through,
    cue(4.6, () => {
      show.hidden = null
      show.tool = null
      show.direction = null
    }),
    { at: 4.6, lasts: 0.4, play: () => {} },
  ]
}

/** Scene 3, the cat dips a paw: 4 seconds. `colour` is where the nearest colour lies, `at` where the paw dabs, both on the stage. */
export function dabBeats(hand: Stagehand, taste: Taste, colour: { x: number; y: number }, at: { x: number; y: number }): Beat[] {
  const show = hand.show, home = CAT.paws[1], mouth = { x: CAT.head.x + 26, y: CAT.head.y + 62 }
  return [
    // It looks at the colour nearest it, as its tastes say, and then at its paw.
    { at: 0, lasts: 0.9, play: () => { show.direction = lookAt(taste, colour, {}) } },
    { at: 0.9, lasts: 0.6, play: () => { show.direction = { look: { x: home.x, y: home.y } } } },
    { at: 1.5, lasts: 0.6, play: (t) => {
      const e = ease(t)
      show.direction = { look: at, pawR: { x: mix(home.x, at.x, e), y: mix(home.y, at.y, e) } }
    } },
    // One dab: a ring of ripples, and no colour.
    cue(2.1, (finishing) => {
      if (finishing) return
      hand.say(dabVoice())
      hand.ripple(at.x, at.y, 0.7)
    }),
    { at: 2.1, lasts: 0.3, play: (t) => { show.direction = { look: at, pawR: { x: mix(at.x, home.x, t), y: mix(at.y, home.y - 24, t) } } } },
    cue(2.4, (finishing) => { if (!finishing) hand.shake() }),
    { at: 2.4, lasts: 0.6, play: () => { show.direction = { look: { x: home.x, y: home.y - 24 } } } },
    // And it licks the paw.
    { at: 3.0, lasts: 1, play: (t) => { show.direction = t >= 1 ? null : { look: mouth, pawR: mouth, lick: 1 } } },
    heard(3.15, hand, () => lickVoice(0)),
    heard(3.55, hand, () => lickVoice(1)),
  ]
}

/** Scene 4, the print is hung: 5 seconds. The print flies from `from` to its peg, swings and settles, one last drip falls, and the cat looks up at it once. It said what it thought of the print when it held it up, and says nothing here. */
export function hungBeats(hand: Stagehand, taste: Taste, print: number, peg: number, from: Rect): Beat[] {
  const show = hand.show, place = hungRect(peg), middle = { x: place.x + place.w / 2, y: place.y + place.h / 2 }
  const drip = { x: middle.x + 8, y: place.y + place.h, to: place.y + place.h + 78, t: 0 }
  return [
    { at: 0, lasts: 0.5, play: (t) => { show.fly = t >= 1 ? null : { print, from, t: ease(t) } } },
    cue(0.5, (finishing) => {
      if (finishing) return
      hand.say([...pegVoice(), ...paperVoice(3)])
      hand.swing(peg)
    }),
    { at: 2.6, lasts: 0.4, play: (t) => {
      if (t >= 1) show.drips = show.drips.filter((d) => d !== drip)
      else {
        if (!show.drips.includes(drip)) show.drips.push(drip)
        drip.t = t * t
      }
    } },
    heard(3.0, hand, () => dripVoice(2)),
    // The cat looks up at it once, as its tastes say, and turns back to the water.
    { at: 3.0, lasts: 1.4, play: (t) => { show.direction = t >= 1 ? null : lookAt(taste, middle, {}) } },
    { at: 4.4, lasts: 0.6, play: () => {} },
  ]
}
