// The short scenes of the game, as lists of timed beats on scene.ts (ART.md,
// "The scenes"). No renderer and no DOM. A beat does one of two things: it
// moves a channel, which is a number from 0 to 1 that the motion and the view
// read, or it marks a moment (a sound, the arrival in the next yard).
//
// Every scene is the consequence of what the child just did, and each saves
// its outcome when it starts (game.ts), so a put-away at any moment of it
// loses nothing and nothing replays on load. A touch ends a scene: every
// channel lands at 1, where the beat was taking it, and stays there. An
// ending therefore stays as it ended for as long as the child likes.

import { GATE, SPOTS, TRUCK, YARD_PITCH, type Place } from './layout'
import type { Beat } from './scene'
import type { Kind } from './things'

/** What a scene can move. Each is 0 before its beat, climbs to 1 during it, and stays at 1. */
export const CHANNELS = [
  // The fire is out.
  'steam', 'lookers', 'settle',
  // The duck floats.
  'liftOff', 'lap', 'dunk', 'shake',
  // The flower opens.
  'petals', 'beeLands', 'leafDrop',
  // The snail comes out.
  'snailOut', 'glide',
  // The worm.
  'wormUp', 'wormLooks', 'wormDown',
  // Driving on.
  'gate', 'turnOut', 'roll', 'slide', 'turnIn',
] as const
export type Channel = (typeof CHANNELS)[number]

export type Channels = Record<Channel, number>

export function restChannels(): Channels {
  return Object.fromEntries(CHANNELS.map((channel) => [channel, 0])) as Channels
}

/** A moment a scene marks. The game turns each into a sound, or into the arrival in the next yard. */
export type Mark =
  | 'hiss-falls' | 'drip' | 'steam-fades'
  | 'quack' | 'duck-shakes'
  | 'petal' | 'bee-lands' | 'leaf-drip'
  | 'snail-glides'
  | 'worm-pops' | 'worm-gone'
  | 'gate-swings' | 'putt' | 'arrived'

export type Directions = {
  /** Sets a channel. */
  set(channel: Channel, value: number): void
  /** A moment, with a number where it has one (which petal, which putt). */
  mark(mark: Mark, n?: number): void
}

/** Eases in and out: a move that starts gently and lands gently. */
export function ease(t: number): number {
  const x = Math.min(1, Math.max(0, t))
  return x * x * (3 - 2 * x)
}

function move(d: Directions, channel: Channel, at: number, lasts: number, eased = true): Beat {
  return { at, lasts, play: (progress) => d.set(channel, eased ? ease(progress) : progress) }
}

function moment(d: Directions, mark: Mark, at: number, n?: number): Beat {
  return { at, lasts: 0, play: () => d.mark(mark, n) }
}

/** The ending of a yard whose want was the fire: the hiss falls, the steam drifts off, the logs drip twice, whoever is there comes to look, and the truck settles. */
function fireOut(d: Directions): Beat[] {
  return [moment(d, 'hiss-falls', 0), move(d, 'steam', 0, 3.2), moment(d, 'drip', 1.4, 0), moment(d, 'drip', 2.3, 1), move(d, 'lookers', 1.6, 3.4), moment(d, 'steam-fades', 3.0), move(d, 'settle', 4.6, 1.2)]
}

/** The duck floats: it lifts off the floor, paddles a lap, puts its head under with its tail up, and shakes. */
function duckFloats(d: Directions): Beat[] {
  return [move(d, 'liftOff', 0, 0.7), moment(d, 'quack', 0.5, 0), move(d, 'lap', 0.7, 3.6), moment(d, 'quack', 2.4, 1), move(d, 'dunk', 4.4, 1.5), move(d, 'shake', 6.0, 1.0), moment(d, 'duck-shakes', 6.0)]
}

/** The flower opens petal by petal, the bee lands and the flower dips, and a drop slides off a leaf. */
function flowerOpens(d: Directions): Beat[] {
  const beats: Beat[] = [move(d, 'petals', 0, 2.5, false)]
  for (let petal = 0; petal < 5; petal++) beats.push(moment(d, 'petal', petal * 0.5, petal))
  return [...beats, move(d, 'beeLands', 2.8, 1.6), moment(d, 'bee-lands', 4.2), move(d, 'leafDrop', 4.8, 1.2), moment(d, 'leaf-drip', 5.9)]
}

/** The snail comes out: its eyes unroll, and it glides along the wet to the wettest place. */
function snailOut(d: Directions): Beat[] {
  return [move(d, 'snailOut', 0, 1.6), moment(d, 'snail-glides', 1.6), move(d, 'glide', 1.6, 5.2), moment(d, 'snail-glides', 4.2)]
}

/** The ending for the kind of thing that held the want. A kind that holds no want has no ending. */
export function endingOf(kind: Kind, d: Directions): Beat[] {
  if (kind === 'fire') return fireOut(d)
  if (kind === 'pool') return duckFloats(d)
  if (kind === 'seed') return flowerOpens(d)
  if (kind === 'patch') return snailOut(d)
  return []
}

/** The channels an ending moves, for a yard that is found already ended: they are set to 1 and nothing plays. */
export function endedChannels(kind: Kind): Channel[] {
  const moved: Channel[] = []
  endingOf(kind, { set: (channel) => { if (!moved.includes(channel)) moved.push(channel) }, mark: () => {} }).forEach((beat) => beat.play(1))
  return moved
}

/** The worm: mud sends one up, it looks about, and it goes back down. */
export function wormScene(d: Directions): Beat[] {
  return [moment(d, 'worm-pops', 0), move(d, 'wormUp', 0, 0.7), move(d, 'wormLooks', 0.8, 2.2, false), move(d, 'wormDown', 3.2, 0.8), moment(d, 'worm-gone', 3.8)]
}

/**
 * Driving on: the gate swings, the truck turns to it and rolls up to it, the
 * yard slides away under it while the next one slides in, and the truck turns
 * back to face the new yard. About four and a half seconds.
 */
export function driveScene(d: Directions): Beat[] {
  const beats: Beat[] = [moment(d, 'gate-swings', 0), move(d, 'gate', 0, 0.7), move(d, 'turnOut', 0.1, 0.6), move(d, 'roll', 0.6, 1.0), move(d, 'slide', 1.4, 2.3), move(d, 'turnIn', 3.7, 0.7)]
  for (let putt = 0; putt < 8; putt++) beats.push(moment(d, 'putt', 0.6 + putt * 0.38, putt))
  return [...beats, moment(d, 'arrived', 4.4)]
}

/** How far up the yard the truck stops in front of the gate before the yard slides. */
export const GATE_FRONT_Z = 1.6

/** How the truck faces when it looks up the yard at the gate: a quarter turn to the left of facing along +x. */
export const FACING_GATE = Math.PI / 2

export type OnTheWay = {
  /** Where the truck is. */
  at: Place
  /** How far it has turned from its place in the yard toward the gate, 0 to 1. */
  turned: number
  /** How far the yard it is leaving has slid toward the child, in yard units. The next yard is one pitch behind it. */
  slid: number
  /** How far its wheels have rolled, in yard units, for the wheels and the putts. */
  rolled: number
}

/**
 * Where the truck is on the way to the next yard, from the scene's channels.
 * It drives straight up its own lane to the gate, which crosses no spot. Then
 * the world slides: the old yard and its gate pass it, and when the slide is
 * over it stands in its place in the new yard.
 */
export function onTheWay(channels: Channels): OnTheWay {
  const rollTo = TRUCK.z - GATE_FRONT_Z
  const z = TRUCK.z - rollTo * channels.roll + rollTo * channels.slide
  return {
    at: { x: GATE.x, z },
    turned: channels.turnOut * (1 - channels.turnIn),
    slid: channels.slide * YARD_PITCH,
    rolled: rollTo * channels.roll + (YARD_PITCH + rollTo) * channels.slide,
  }
}

/** The nearest the truck's lane comes to any spot: the way on must not cross a thing. */
export function laneClearance(): number {
  return Math.min(...SPOTS.map((spot) => Math.abs(spot.x - GATE.x)))
}
