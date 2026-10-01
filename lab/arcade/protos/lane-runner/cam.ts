// The fake-3D camera and the one record type every thing on the track shares.
//
// World units are logical pixels at the fox's depth. `z` is distance ahead of
// the fox, `x` is in lanes (-1, 0, 1), `h` is height above the ground.

import { W } from '../../kit/types.ts'

// Screen row of the horizon, and of the ground under the fox.
export const HY = 262
export const PY = 704
export const CAMH = PY - HY
// Focal depth: bigger is flatter, so things are readable earlier.
export const D = 900
export const LANE = 232
// Static things appear this far ahead.
export const FAR = 7000
// Nothing is drawn closer than this (it is past the bottom of the screen).
export const ZNEAR = -D * 0.34

export interface Cam {
  // Lane units; follows the fox a little so near things slide more than far ones.
  x: number
}

// How far the camera has risen above its usual height (it climbs with the
// jetpack so the road drops away). One game runs at a time, so one value.
export const view = { lift: 0 }

export function scaleAt(z: number): number {
  return D / (D + Math.max(z, -D * 0.62))
}

export function sx(cam: Cam, x: number, s: number): number {
  return W / 2 + (x - cam.x) * LANE * s
}

export function sy(h: number, s: number): number {
  return HY + (CAMH + view.lift - h) * s
}

export type Kind = 'coin' | 'barrier' | 'beam' | 'cart' | 'train' | 'pickup' | 'critter' | 'prop' | 'arch'
export type Power = 'magnet' | 'jet' | 'star'

export interface Thing {
  kind: Kind
  // Absolute distance down the track of its near face.
  d: number
  x: number
  h: number
  // Depth, for the boxes (cart, train).
  len: number
  zone: number
  seed: number
  gone: boolean
  // Obstacles: still collides, times the fox has crashed into it, already scored.
  solid: boolean
  hits: number
  passed: boolean
  // Seconds since it was knocked flying, or -1.
  fly: number
  fvx: number
  fvh: number
  // Coins: being pulled in by the magnet.
  pull: boolean
  // Trains: the horn has sounded.
  warned: boolean
  power: Power | null
  // Props and critters.
  char: string
  size: number
}

export function thing(kind: Kind, d: number, x: number, extra: Partial<Thing> = {}): Thing {
  return {
    kind,
    d,
    x,
    h: 0,
    len: 0,
    zone: 0,
    seed: 0,
    gone: false,
    solid: kind === 'barrier' || kind === 'beam' || kind === 'cart' || kind === 'train',
    hits: 0,
    passed: false,
    fly: -1,
    fvx: 0,
    fvh: 0,
    pull: false,
    warned: false,
    power: null,
    char: '',
    size: 0,
    ...extra,
  }
}

export const CART_LEN = 420
export const TRAIN_LEN = 1500
// How much faster than the ground a train comes at the fox.
export const TRAIN_V = 850
// Height the jetpack cruises at, and how high the coins up there sit.
export const JET_H = 330

// An emoji drawn big once and reused. The kit's sprite cache is 160 px, which
// goes soft on a palm tree four hundred pixels tall.
const bigCache = new Map<string, HTMLCanvasElement>()
const BIG_PX = 288

function bigFor(char: string): HTMLCanvasElement {
  let img = bigCache.get(char)
  if (!img) {
    img = document.createElement('canvas')
    img.width = Math.round(BIG_PX * 1.3)
    img.height = Math.round(BIG_PX * 1.3)
    const c = img.getContext('2d')
    if (c) {
      c.font = `${BIG_PX}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", system-ui, sans-serif`
      c.textAlign = 'center'
      c.textBaseline = 'middle'
      c.fillText(char, img.width / 2, img.height / 2 + BIG_PX * 0.06)
    }
    bigCache.set(char, img)
  }
  return img
}

// Draw each emoji to its cache now, so none is rasterised mid-run.
export function warmBig(chars: readonly string[]): void {
  for (const char of chars) bigFor(char)
}

export function bigSprite(g: CanvasRenderingContext2D, char: string, x: number, baseY: number, size: number, alpha = 1): void {
  const img = bigFor(char)
  const s = size * 1.3
  if (alpha < 1) g.globalAlpha = alpha
  // The glyph sits in the middle of its box with about 15% air under it.
  g.drawImage(img, x - s / 2, baseY - s * 0.86, s, s)
  if (alpha < 1) g.globalAlpha = 1
}
