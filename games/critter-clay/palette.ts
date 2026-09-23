import type { Hue } from './parts'

// Critter Clay's colours (sRGB). Cool daylight on a slate-blue board in a
// pale workshop, with three plasticines that pop against it and each
// other. Deliberately far from Pebble Table's terracotta on sage.

export const HUE_HEX: Record<Hue, string> = {
  0: '#2f5bd3',
  1: '#f7d84a',
  2: '#f38fbf',
}

export const PALETTE = {
  backdrop: '#dde5ee',
  wall: '#e6ebf1',
  wallShade: '#c9d3df',
  bench: '#cdd5dc',
  benchEdge: '#a7b2bd',
  board: '#7a93ad',
  boardEdge: '#61798f',
  turntable: '#eef0f2',
  turntableRim: '#9aa6b4',
  turntableFoot: '#56606d',
  tray: '#f4f2ee',
  trayRim: '#c0c8d2',
  slot: '#e3e1dc',
  toolWood: '#c79a62',
  toolWire: '#8d97a3',
  jar: '#b8cad8',
  eyeWhite: '#fbfbf7',
  pupil: '#15161c',
  glint: '#ffffff',
  mark: '#1e2130',
  shadow: '#1c2a44',
  glow: '#f4fbff',
  glowEdge: '#8fc4ff',
  hand: '#ffffff',
  handEdge: '#5b8fd9',
} as const
