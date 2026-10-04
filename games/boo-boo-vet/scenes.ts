// The short scenes (ART.md, "The scenes"), as lists of timed beats for
// scene.ts. Each is the consequence of what the child just did, is filled in
// from the state of play, and gives way to any touch: `finish()` leaves every
// beat at its end, with the animal as the scene was taking it.
//
// What a scene saves, it has saved before it starts: the rules made the
// change in the call that caused the scene (the give, the pair, the coming
// in), and the model asked for a save at once. So a put-away in the middle
// loses nothing and nothing replays on load. The beats below only move what
// is seen and queue what is heard.
//
// Pure: no renderer, no DOM. Time comes from the caller.

import type { Species, Taste } from './cast'
import { cellLasts, type CellTrack } from './cells'
import type { Secret } from './grid'
import type { Care, Need } from './needs'
import type { Beat } from './scene'
import type { Notes } from './voices'

/** What the scene that is playing shows at this moment. Every part is null when it is not on. */
export type Act = {
  /** A held breath while the animal checks itself, before it does the thing it could not do: progress 0 to 1. */
  check: { need: Need; p: number } | null
  /** The animal does the thing it could not do before: progress 0 to 1. */
  feat: { need: Need; p: number } | null
  /** It plays with the thing that helped, in the manner of its taste. */
  flourish: { care: Care; taste: Taste; p: number } | null
  /** One look at a thing that was tried and did not fit, where it lies. */
  glance: { care: Care; p: number } | null
  /** Two things make something together. */
  secret: { kind: Secret; one: Care; other: Care; p: number } | null
  /** The mouse uses a thing on itself, once, to show what it is for. */
  showing: { care: Care; p: number } | null
  /** It sits down, well, and looks about: progress 0 to 1. */
  sits: { p: number } | null
  /** The one that hid was helped and has not come out yet: it is still in its hiding place, in the basket. */
  under: boolean
}

export const NO_ACT: Readonly<Act> = { check: null, feat: null, flourish: null, glance: null, secret: null, showing: null, sits: null, under: false }

/** What a scene's beats move: the cell that is playing, the act, and the sounds queued. The model's own record has these fields. */
export type Stage = {
  cell: { track: CellTrack; since: number } | null
  act: Act
  sounds: Notes[]
  /** True while a touch is ending the scene: beats land where they were going and say nothing. */
  ending: boolean
}

/** The length of the well scene's parts, in seconds. The whole lasts six to nine. */
export const WELL = { cellAtMost: 4.2, hold: 0.5, feat: 1.3, comesOut: 1.9, flourish: 1.4, glance: 0.55, glancesIn: 1.7, sits: 0.7, least: 6, most: 9 } as const

/** How long each glance lasts when `count` things were tried: one for each thing, quicker when there are many. */
export function glanceSeconds(count: number): number {
  return count <= 0 ? 0 : Math.min(WELL.glance, WELL.glancesIn / count)
}

export type WellPlan = {
  species: Species
  need: Need
  care: Care
  taste: Taste
  /** The cell that helps, or null where its track is not there. */
  track: CellTrack | null
  /** The things that did not fit, in the order first tried. */
  tried: readonly Care[]
  voices: { feat: Notes; flourish: Notes; glance: Notes }
}

/** A sound at the start of a beat, unless the scene is being ended by a touch. */
function says(stage: Stage, notes: Notes): Beat {
  return { at: 0, lasts: 0, play: () => { if (!stage.ending && notes.length > 0) stage.sounds.push(notes) } }
}

/** One beat after another: each starts when the one before it ends. */
function inTurn(parts: readonly { lasts: number; play: (progress: number) => void; says?: Notes }[], stage: Stage): Beat[] {
  const beats: Beat[] = []
  let at = 0
  for (const part of parts) {
    if (part.says) beats.push({ ...says(stage, part.says), at })
    beats.push({ at, lasts: part.lasts, play: part.play })
    at += part.lasts
  }
  return beats
}

/**
 * The well scene: the cell that helps plays and the movement of the need
 * stops; a held breath while the animal checks itself; it does the thing it
 * could not do before; it plays with the thing that helped, in the manner of
 * its taste; one glance for each thing that was tried and did not fit; it
 * sits down, well.
 */
export function wellBeats(stage: Stage, plan: WellPlan): Beat[] {
  const { track, need, care, taste } = plan
  const whole = track ? cellLasts(track, plan.species) : 0
  // One glance for each thing that was tried and did not fit, in the order it was first tried.
  const glances = plan.tried, glance = glanceSeconds(glances.length)
  const feat = need === 'scared' ? WELL.comesOut : WELL.feat
  const after = feat + WELL.flourish + glances.length * glance + WELL.sits
  // The cell is played in the time it has: a slow animal's long cell is played a little faster so the scene ends by nine seconds.
  const cellFor = track ? Math.min(whole, WELL.cellAtMost, WELL.most - WELL.hold - after) : 0
  const hold = Math.max(WELL.hold, WELL.least - cellFor - after)
  return inTurn([
    {
      lasts: cellFor,
      play: (p) => {
        // The one that hid stays where it hid until it comes out.
        if (p < 1) stage.act = { ...stage.act, under: need === 'scared' }
        if (track) stage.cell = p < 1 ? { track, since: p * whole } : null
      },
    },
    // The held breath: it is still, a little taller, eyes wide, and the one that hid stays where it hid.
    { lasts: hold, play: (p) => { stage.act = { ...stage.act, check: p < 1 ? { need, p } : null, under: need === 'scared' } } },
    { lasts: feat, says: plan.voices.feat, play: (p) => { stage.act = { ...stage.act, feat: p < 1 ? { need, p } : null, under: p < 1 && need === 'scared' } } },
    { lasts: WELL.flourish, says: plan.voices.flourish, play: (p) => { stage.act = { ...stage.act, flourish: p < 1 ? { care, taste, p } : null } } },
    ...glances.map((tried, index) => ({
      lasts: glance,
      ...(index === 0 ? { says: plan.voices.glance } : {}),
      play: (p: number) => { stage.act = { ...stage.act, glance: p < 1 ? { care: tried, p } : null } },
    })),
    { lasts: WELL.sits, play: (p) => { stage.act = { ...stage.act, sits: p < 1 ? { p } : null } } },
  ], stage)
}

export const SECRET_SECONDS = 4.2
export const SHOWING_SECONDS = 3

/** A secret: two things make something together, and the animal on the table takes it in the manner of its taste. */
export function secretBeats(stage: Stage, kind: Secret, one: Care, other: Care, voices: { made: Notes; animal: Notes }): Beat[] {
  return [
    says(stage, voices.made),
    { at: 0, lasts: SECRET_SECONDS, play: (p) => { stage.act = { ...stage.act, secret: p < 1 ? { kind, one, other, p } : null } } },
    { ...says(stage, voices.animal), at: 1.1 },
  ]
}

/** The mouse's showing: once for each thing, about three seconds. */
export function showingBeats(stage: Stage, care: Care, voice: Notes): Beat[] {
  return [
    { ...says(stage, voice), at: 0.5 },
    { at: 0, lasts: SHOWING_SECONDS, play: (p) => { stage.act = { ...stage.act, showing: p < 1 ? { care, p } : null } } },
  ]
}
