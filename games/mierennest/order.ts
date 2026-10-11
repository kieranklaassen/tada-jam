import { LADDER, type Place } from './config'
import type { InvaderKind } from './habits'

// The designed order: which party waits at the log at each place, how a raid is judged, and how the position
// moves. The place ids are in config.ts; nothing on screen shows the position but the party itself.

export type Party = readonly InvaderKind[]

/** The party at the log at each place before the kingdom is open, in marching order. */
export const PARTY: Record<Exclude<Place, 'open-kingdom'>, Party> = {
  'first-chamber': ['ant'],
  'ant-file': ['ant', 'ant', 'ant'],
  'first-beetle': ['beetle'],
  'beetle-pair': ['beetle', 'beetle'],
  'ants-and-beetles': ['ant', 'beetle', 'ant', 'beetle'],
  'first-fly': ['fly'],
  'the-catapult': ['fly', 'ant', 'fly', 'ant'],
  'mixed-party': ['ant', 'beetle', 'fly'],
  'the-cannon': ['beetle', 'fly', 'beetle', 'fly'],
  'full-camp': ['ant', 'ant', 'ant', 'beetle', 'beetle', 'beetle', 'fly', 'fly'],
  'dung-scout': ['dungBeetle'],
  'great-raid': ['dungFly', 'dungBeetle', 'dungBeetle', 'dungBeetle', 'dungBeetle', 'dungBeetle'],
}

/** The mixed parties of the open kingdom, from the lightest to the heaviest, in a fixed round. */
export const ROUND: readonly Party[] = [
  ['ant', 'ant', 'fly'],
  ['beetle', 'ant', 'ant', 'fly'],
  ['beetle', 'beetle', 'fly', 'fly'],
  ['ant', 'ant', 'ant', 'beetle', 'beetle', 'fly'],
  ['dungBeetle', 'beetle', 'fly', 'ant', 'ant'],
  ['dungFly', 'dungBeetle', 'dungBeetle', 'dungBeetle', 'beetle', 'beetle'],
]

const WEIGHT: Record<InvaderKind, number> = { ant: 1, beetle: 2, fly: 2, dungFly: 3, dungBeetle: 4 }
/** How heavy a party is: it looks as heavy as this, sitting at the log. */
export const weight = (party: Party): number => party.reduce((sum, kind) => sum + WEIGHT[kind], 0)

const isPlace = (position: string): position is Place => (LADDER as readonly string[]).includes(position)

/** The party that waits at the log. A position the game does not know has the first party. */
export function partyAt(position: string, muster: number): Party {
  if (position === 'open-kingdom') return ROUND[((Math.trunc(muster) % ROUND.length) + ROUND.length) % ROUND.length]
  return isPlace(position) && position !== 'open-kingdom' ? PARTY[position] : PARTY[LADDER[0]]
}

export type Verdict = 'well' | 'not-well' | 'not-judged'

/** How a raid ended, as the raid itself knows it. */
export type RaidEnd = {
  /** The chambers of the kingdom as the raid was called. */
  chambersWhenCalled: number
  /** The invaders that finished their own act in a chamber. One that was sent out before its act was over is not counted. */
  actsFinished: number
  /** The game was put away while the raid ran. */
  putAway: boolean
}

/**
 * A raid went well when no invader finished its act in a chamber. It is not judged when the kingdom had no chamber
 * as it was called, or when the game was put away while it ran.
 */
export function judge(end: RaidEnd): Verdict {
  if (end.putAway || end.chambersWhenCalled <= 0) return 'not-judged'
  return end.actsFinished === 0 ? 'well' : 'not-well'
}

/** The three fields a judged raid can change. */
export type Progress = { position: string; muster: number; ended: boolean }

/**
 * The position after a raid: one place forward after one that went well, and never back. Turning back the great
 * raid opens the kingdom and is the ending; in the open kingdom the next party of the round steps up.
 */
export function after(progress: Progress, verdict: Verdict): Progress {
  if (verdict !== 'well') return progress
  const at = (LADDER as readonly string[]).indexOf(progress.position)
  if (progress.position === 'open-kingdom') return { ...progress, muster: (progress.muster + 1) % ROUND.length, ended: true }
  const next = LADDER[Math.min(LADDER.length - 1, Math.max(0, at) + 1)]
  return next === 'open-kingdom' ? { position: next, muster: 0, ended: true } : { ...progress, position: next }
}

export type MachineKind = 'catapult' | 'cannon'
const ARRIVES_AT: Record<MachineKind, Place> = { catapult: 'the-catapult', cannon: 'the-cannon' }

/** The machines that have arrived by this place. */
export function arrived(position: string): MachineKind[] {
  const at = (LADDER as readonly string[]).indexOf(position)
  return (['catapult', 'cannon'] as const).filter((kind) => at >= LADDER.indexOf(ARRIVES_AT[kind]))
}

/** The ids a first showing can have: each invader kind and each machine. */
export const SHOWINGS: readonly string[] = ['ant', 'beetle', 'fly', 'dungBeetle', 'dungFly', 'catapult', 'cannon']

/** The first showings still owed for the party at the log, in the order they are shown: its new kinds, then a machine. */
export function owed(position: string, muster: number, shown: readonly string[]): string[] {
  const kinds = [...new Set(partyAt(position, muster))] as string[]
  return [...kinds, ...arrived(position)].filter((id) => !shown.includes(id))
}
