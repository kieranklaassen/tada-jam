import type { Part } from './kit'
import type { Run } from './run'
import { fold, give, splash, type VoiceSpec } from './voices'

// The error as a consequence (ART.md): a wrong design is run exactly as built
// and the world shows where and why. Pure. Nothing here gives a verdict, takes
// a part away or changes the bridge: the state stays, and the child changes
// one thing and sends the vehicle again.

/** What is seen to happen, each a different thing in the world. */
export type What =
  | 'crosses'
  | 'cracks-where-it-bends-most'
  | 'bows-and-snaps-in-the-middle'
  | 'crushes'
  | 'thread-parts'
  | 'end-pops-from-its-pin'
  | 'pulls-apart'
  | 'snaps-under-the-wheel'
  | 'folds-under-the-load'
  | 'rolls-off-the-end-of-the-road'
  | 'rolls-off-the-bank-past-what-folded'
  | 'log-rolls-off-the-tube'
  | 'dips-into-the-water-on-the-thread'

export type Consequence = {
  what: What
  /** Where it happens, in grid cells: the place the child looks next. */
  where: readonly [number, number]
  /** The part it happens to, when it happens to one. */
  part: number | null
  /** The parts that had already folded when the vehicle set off: the reason a road ends at the bank. */
  folded: number[]
  /** The pale pencil ring left on the spot afterwards, on the part that gave first. */
  ring: { part: number; spot: readonly [number, number] } | null
  /** True for every failed run: the vehicle drops, floats on its crates, paddles to the near bank and drives back up. */
  splashes: boolean
  voice: VoiceSpec
}

/** What a run did, as the world shows it. `crates` is the vehicle's load, which sizes the splash. */
export function consequence(run: Run, parts: readonly Part[], crates: number): Consequence {
  const ending = run.ending, lastX = run.steps[run.steps.length - 1].x
  const folded = run.frame.firm.flatMap((firm, i) => (firm ? [] : [i]))
  const failed = (what: What, where: readonly [number, number], part: number | null, voice: VoiceSpec, ring = part !== null): Consequence =>
    ({ what, where, part, folded, ring: ring && part !== null ? { part, spot: where } : null, splashes: true, voice: [...voice, ...splash(crates).map((s) => ({ ...s, after: (s.after ?? 0) + 0.35 }))] })
  switch (ending.kind) {
    case 'crossed':
      return { what: 'crosses', where: [lastX, 0], part: null, folded, ring: null, splashes: false, voice: [] }
    case 'gives': {
      const kind = parts[ending.part].kind
      const how = ending.strain === 'pull' || ending.strain === 'bow' || ending.strain === 'squeeze' ? ending.strain : 'bend'
      const what: What =
        how === 'bend' ? (kind === 'plank' ? 'cracks-where-it-bends-most' : 'snaps-under-the-wheel')
        : how === 'bow' ? 'bows-and-snaps-in-the-middle'
        : how === 'squeeze' ? 'crushes'
        : kind === 'thread' ? 'thread-parts' : kind === 'tube' ? 'end-pops-from-its-pin' : 'pulls-apart'
      return failed(what, ending.spot, ending.part, give(how, kind))
    }
    case 'folds':
      return failed('folds-under-the-load', [lastX, 0], null, fold(parts.length))
    case 'road-ends':
      return failed(folded.length ? 'rolls-off-the-bank-past-what-folded' : 'rolls-off-the-end-of-the-road', ending.at, null, [])
    case 'rolls-off':
      return failed('log-rolls-off-the-tube', ending.at, ending.part, [], false)
    case 'dunks':
      return failed('dips-into-the-water-on-the-thread', ending.at, ending.part, [], false)
  }
}

/** Strain shows before a part gives: a pulled part draws thin, a squeezed one bulges, each by the share of its strength in use. */
export function strainLook(strain: string, use: number): { thin: number; bulge: number } {
  const share = Math.max(0, Math.min(1, use))
  return { thin: strain === 'pull' ? share : 0, bulge: strain === 'squeeze' || strain === 'bow' ? share : 0 }
}

/**
 * Feedback is fullest while a sheet is new and thins once the child can do it:
 * until the sheet's job vehicle has crossed, every working part shows its
 * strain; after that only a part within a fifth of its limit does.
 */
export const showsStrain = (use: number, jobHasCrossed: boolean): boolean => use >= (jobHasCrossed ? 0.8 : 0.05)
