// Where the child lives and what time it is there, kept free of three.js.
//
// Earth's axis points straight up (+y); it spins counter-clockwise seen from
// above the north pole, the same way the moon orbits. Longitude grows
// eastward in that same direction. The sun sits along −x, so a place has
// local noon when it faces −x and midnight when it faces +x.

import { TAU } from './phase'

export type Vec = { x: number; y: number; z: number }
/** A place on Earth in radians: latitude north-positive, longitude east-positive. */
export type Home = { lat: number; lon: number }

const deg = Math.PI / 180

// Capitals, so a profile's country puts the child somewhere they recognise.
const CAPITALS: Record<string, [number, number]> = {
  nl: [52.37, 4.9], be: [50.85, 4.35], de: [52.52, 13.4], fr: [48.86, 2.35], gb: [51.51, -0.13], uk: [51.51, -0.13],
  ie: [53.35, -6.26], es: [40.42, -3.7], pt: [38.72, -9.14], it: [41.9, 12.5], ch: [46.95, 7.45], at: [48.21, 16.37],
  dk: [55.68, 12.57], se: [59.33, 18.07], no: [59.91, 10.75], fi: [60.17, 24.94], pl: [52.23, 21.01], us: [40.71, -74.01],
  ca: [45.42, -75.7], mx: [19.43, -99.13], br: [-23.55, -46.63], ar: [-34.6, -58.38], cl: [-33.45, -70.67],
  za: [-33.92, 18.42], ng: [6.52, 3.38], ke: [-1.29, 36.82], eg: [30.04, 31.24], in: [28.61, 77.21], cn: [39.9, 116.4],
  jp: [35.68, 139.69], kr: [37.57, 126.98], sg: [1.35, 103.82], id: [-6.21, 106.85], au: [-33.87, 151.21], nz: [-41.29, 174.78],
}

export const DEFAULT_HOME: Home = { lat: 52 * deg, lon: 5 * deg }

export function homeForCountry(country: string | null | undefined): Home {
  const place = country ? CAPITALS[country.toLowerCase()] : undefined
  return place ? { lat: place[0] * deg, lon: place[1] * deg } : DEFAULT_HOME
}

/** Earth's spin angle about +y at a given local solar time (hours) for a home longitude. */
export function earthAngle(hours: number, lon: number) {
  return (Math.PI * hours) / 12 - lon
}

/** Unit vector (world space) straight up from a place, given Earth's spin angle. */
export function zenith(home: Home, spin: number): Vec {
  const a = home.lon + spin, c = Math.cos(home.lat)
  return { x: c * Math.cos(a), y: Math.sin(home.lat), z: -c * Math.sin(a) }
}

/** Inverse of `zenith`: the place under a world-space direction from Earth's centre. */
export function homeAt(direction: Vec, spin: number): Home {
  const len = Math.hypot(direction.x, direction.y, direction.z) || 1
  const lat = Math.asin(Math.max(-1, Math.min(1, direction.y / len)))
  const lon = Math.atan2(-direction.z, direction.x) - spin
  return { lat, lon: ((lon % TAU) + TAU + Math.PI) % TAU - Math.PI }
}

const dot = (a: Vec, b: Vec) => a.x * b.x + a.y * b.y + a.z * b.z
const sub = (a: Vec, b: Vec): Vec => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z })
const norm = (a: Vec): Vec => { const l = Math.hypot(a.x, a.y, a.z) || 1; return { x: a.x / l, y: a.y / l, z: a.z / l } }
const cross = (a: Vec, b: Vec): Vec => ({ x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x })

/** Height of a point above the observer's horizon, in radians (negative: it has set). */
export function altitude(eye: Vec, up: Vec, target: Vec) {
  return Math.asin(Math.max(-1, Math.min(1, dot(norm(sub(target, eye)), up))))
}

/** Whether the sun is up (with a little civil-twilight margin). */
export function isDaytime(sunAltitude: number) {
  return sunAltitude > -0.05
}

/**
 * Which side of the moon's disc is lit for an observer looking at it with
 * their own zenith as "up": +1 means the right side, −1 the left.
 */
export function litSide(eye: Vec, up: Vec, moon: Vec, sunDirection: Vec) {
  const forward = norm(sub(moon, eye))
  const right = norm(cross(forward, up))
  return Math.sign(dot(right, sunDirection))
}

/**
 * How far to tip the view up (radians) so the moon is framed and, when it is
 * low or has set, a strip of ground stays in the bottom of the picture.
 * `horizon` is where the ground meets the sky: below eye level on a small
 * globe, since the surface curves away (see `horizonDip`).
 */
export function viewPitch(moonAltitude: number, fov: number, horizon = 0) {
  return Math.max(moonAltitude, horizon + fov / 2 - 4 * deg)
}

/** How far below eye level the horizon sits for an eye `height` above a globe of `radius`. */
export function horizonDip(radius: number, height: number) {
  return -Math.acos(radius / (radius + height))
}
