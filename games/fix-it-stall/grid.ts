import { type OddKind } from './circuit'
import { type VoiceId } from './voices'

// The object-by-action grid of the design sheet, as data: seven objects by
// five actions, and for each pair the motion the view plays and the voice it
// sounds. What a pair does to the circuit is not here. That is the model's
// business (circuit.ts, solve.ts, settle.ts), and solve.test.ts holds the
// model to the sheet. This table only says that every pair is answered, and
// answered differently from every other.

export type Thing = 'cell' | 'lead' | 'switch' | 'lamp' | 'motor' | 'buzzer' | 'odd'
export const THINGS: readonly Thing[] = ['cell', 'lead', 'switch', 'lamp', 'motor', 'buzzer', 'odd']

/** Clip it into a loop; turn it round; add a second; clip a lead straight across it; flick it. */
export type Action = 'clip' | 'turn' | 'second' | 'across' | 'flick'
export const ACTIONS: readonly Action[] = ['clip', 'turn', 'second', 'across', 'flick']

/** One answer: `look` names the motion the view plays, `voice` the sound. */
export type Answer = { look: string; voice: VoiceId }

export const GRID: Record<Thing, Record<Action, Answer>> = {
  cell: {
    clip: { look: 'beads-set-off-from-the-cap', voice: 'cell-clip' },
    turn: { look: 'tumble-end-over-end', voice: 'cell-turn' },
    second: { look: 'beads-quicken', voice: 'cell-second' },
    across: { look: 'puff-and-flag-up', voice: 'cell-across' },
    flick: { look: 'hop-on-the-mat', voice: 'cell-flick' },
  },
  lead: {
    clip: { look: 'jaws-bite-and-lead-swings', voice: 'lead-clip' },
    turn: { look: 'clips-swap-with-a-flourish', voice: 'lead-turn' },
    second: { look: 'longer-way-round', voice: 'lead-second' },
    across: { look: 'two-leads-bow-apart-with-a-zip', voice: 'lead-across' },
    flick: { look: 'swing-like-a-slack-string', voice: 'lead-flick' },
  },
  switch: {
    clip: { look: 'seat-and-open-contact-ticks', voice: 'switch-clip' },
    turn: { look: 'spin-on-its-base', voice: 'switch-turn' },
    second: { look: 'idle-lever-clacks-to-no-effect', voice: 'switch-second' },
    across: { look: 'lever-clicks-to-no-effect', voice: 'switch-across' },
    flick: { look: 'lever-throws', voice: 'switch-flick' },
  },
  lamp: {
    clip: { look: 'filament-comes-up', voice: 'lamp-clip' },
    turn: { look: 'unscrew-and-screw-back', voice: 'lamp-turn' },
    second: { look: 'glow-shared-or-doubled', voice: 'lamp-second' },
    across: { look: 'filament-out-and-glass-tinks', voice: 'lamp-across' },
    flick: { look: 'quivers-in-its-collar', voice: 'lamp-flick' },
  },
  motor: {
    clip: { look: 'blade-spins-up', voice: 'motor-clip' },
    turn: { look: 'blade-turns-back-and-draws-air-in', voice: 'motor-turn' },
    second: { look: 'two-blades-lazy-or-full', voice: 'motor-second' },
    across: { look: 'blade-stops-short-braked', voice: 'motor-across' },
    flick: { look: 'blade-freewheels', voice: 'motor-flick' },
  },
  buzzer: {
    clip: { look: 'rings-go-out-from-it', voice: 'buzzer-clip' },
    turn: { look: 'hop-round-on-its-feet', voice: 'buzzer-turn' },
    second: { look: 'two-rasps-throb', voice: 'buzzer-second' },
    across: { look: 'rings-stop-mid-beat', voice: 'buzzer-across' },
    flick: { look: 'tin-cap-dents-and-springs', voice: 'buzzer-flick' },
  },
  odd: {
    // The voice of a clip on an odd is its material's own: see `ODD_CLIP`.
    clip: { look: 'laid-in-the-gap', voice: 'odd-clip' },
    turn: { look: 'end-for-end-clatter', voice: 'odd-turn' },
    second: { look: 'hum-cuts-off-or-comes-back', voice: 'odd-second' },
    across: { look: 'lead-settles-over-it-with-a-slap', voice: 'odd-across' },
    // The look and the voice of a flicked odd are its material's own: see `oddFlick`.
    flick: { look: 'rings-as-its-material', voice: 'odd-flick-spoon' },
  },
}

/** A flicked bench odd sounds and moves as what it is made of. */
export const ODD_FLICK: Record<OddKind, Answer> = {
  spoon: { look: 'spoon-sings-and-rocks', voice: 'odd-flick-spoon' },
  key: { look: 'key-jingles-and-skates', voice: 'odd-flick-key' },
  foil: { look: 'foil-crackles-and-rolls', voice: 'odd-flick-foil' },
  pencil: { look: 'pencil-tocks-and-rolls-to-its-flat', voice: 'odd-flick-pencil' },
  rubber: { look: 'rubber-wobbles', voice: 'odd-flick-rubber' },
  stick: { look: 'stick-clacks-and-spins', voice: 'odd-flick-stick' },
  string: { look: 'string-flops', voice: 'odd-flick-string' },
}

/** A clip biting a bench odd sounds as what the odd is made of. The motion is the same for all. */
export const ODD_CLIP: Record<OddKind, Answer> = {
  spoon: { look: 'laid-in-the-gap', voice: 'odd-clip-spoon' },
  key: { look: 'laid-in-the-gap', voice: 'odd-clip-key' },
  foil: { look: 'laid-in-the-gap', voice: 'odd-clip-foil' },
  pencil: { look: 'laid-in-the-gap', voice: 'odd-clip-pencil' },
  rubber: { look: 'laid-in-the-gap', voice: 'odd-clip-rubber' },
  stick: { look: 'laid-in-the-gap', voice: 'odd-clip-stick' },
  string: { look: 'laid-in-the-gap', voice: 'odd-clip-string' },
}

/** Two odds side by side, one of which passes: the hum comes back. The other half of the grid's `odd` by `second`. */
export const ODD_PASSES: Answer = { look: 'hum-cuts-off-or-comes-back', voice: 'odd-hum-back' }

/** How the hum comes back: at full pitch through the spoon, the key or the foil, and low through the pencil, which passes only a little. */
export function humBackPitch(what: OddKind): number {
  return what === 'pencil' ? 0.6 : 1
}

/**
 * The wrong uses the sheet marks: each works, and each has an answer of its
 * own, as large as the right use. `when` says, in the model's terms, what the
 * view looks for after a change.
 */
export const WRONG: Record<string, Answer & { thing: Thing; action: Action; when: string }> = {
  noseToNose: { thing: 'cell', action: 'second', when: 'two cells in one loop whose pushes cancel, so no current runs', look: 'two-cells-arm-wrestle', voice: 'cell-nose-to-nose' },
  short: { thing: 'cell', action: 'across', when: 'a pop consequence from settle', look: 'lead-glows-orange', voice: 'cell-across' },
  loopOfNothing: { thing: 'lead', action: 'second', when: 'a lead with both clips on one pad', look: 'loop-sags-and-twangs', voice: 'lead-loop-of-nothing' },
  alwaysOn: { thing: 'switch', action: 'across', when: 'a switch whose lever changes no current', look: 'lever-no-longer-puts-anything-out', voice: 'switch-across' },
  blown: { thing: 'lamp', action: 'second', when: 'a blow consequence from settle', look: 'flare-and-smoky-glass', voice: 'lamp-blow' },
  onlyLoadBridged: { thing: 'lamp', action: 'across', when: 'a pop consequence whose hot way holds no lamp, motor or buzzer', look: 'lead-glows-orange-over-the-lamp', voice: 'cell-across' },
  sucks: { thing: 'motor', action: 'turn', when: 'a motor whose current runs from b to a', look: 'fringe-and-whiskers-lean-in', voice: 'motor-turn' },
  wild: { thing: 'motor', action: 'second', when: 'a motor at level 3', look: 'motor-shakes-where-it-sits', voice: 'motor-wild' },
  shriek: { thing: 'buzzer', action: 'second', when: 'a buzzer at level 3', look: 'buzzer-shakes-where-it-sits', voice: 'buzzer-shriek' },
  rubberWorks: { thing: 'odd', action: 'across', when: 'an odd that lets nothing through, with a lead across it and the loop running', look: 'rubber-sits-there-doing-nothing', voice: 'odd-across' },
}

/** The answer to an action on a thing. A flicked odd, and a clip on an odd, answer as its material. */
export function answer(thing: Thing, action: Action, odd?: OddKind): Answer {
  if (thing === 'odd' && action === 'flick' && odd) return ODD_FLICK[odd]
  if (thing === 'odd' && action === 'clip' && odd) return ODD_CLIP[odd]
  return GRID[thing][action]
}
