import type { Tone } from '../world'

// The hue split (KTD6). The geometric style's weakness is that everything is
// one warm pastel family, so nothing says "touch me". Here the architecture
// stays coral, rose and lilac; everything the child can use has its own hue:
// walkable paths are cool mint pavers, handles and rails are sunflower with
// indigo hubs, the wanderer is deep indigo with an amber lantern, and the
// door is warm white light in an indigo arch.

export type RGB = readonly [number, number, number]

export function hex(value: string): RGB {
  const n = parseInt(value.slice(1), 16)
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
}

export const PALETTE = {
  skyTop: '#f7c9a9',
  skyMid: '#ecb4bd',
  skyBottom: '#b7a3d9',
  shade: '#8e76b8',
  backdrop: '#e9b9b6',
  stone: '#f0a08c',
  rose: '#e7877c',
  lilac: '#b3a0cf',
  trim: '#f6e6d2',
  rail: '#f3dcc4',
  handle: '#ffc53d',
  hub: '#40357a',
  path: '#9fe0d4',
  pathEdge: '#5fb9ae',
  window: '#9a5d78',
  windowLit: '#ffd89a',
  indigo: '#3b3470',
  indigoLight: '#5a4f9a',
  cream: '#fbeedb',
  blush: '#f59a9a',
  lantern: '#ffb547',
  lanternCore: '#fff0c4',
  doorLight: '#fff4d6',
  doorLeaf: '#ffd98f',
  birdBody: '#ffcb52',
  birdBack: '#6fcfc2',
  birdWing: '#f2a33a',
  beak: '#f08a5d',
  shadow: '#6d4f86',
  ring: '#fff3e6',
} as const

export const TONES: Record<Tone, RGB> = {
  stone: hex(PALETTE.stone),
  rose: hex(PALETTE.rose),
  lilac: hex(PALETTE.lilac),
  trim: hex(PALETTE.trim),
  rail: hex(PALETTE.rail),
  handle: hex(PALETTE.handle),
}
