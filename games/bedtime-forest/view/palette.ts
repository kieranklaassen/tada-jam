// Picture-book gouache at dusk: opaque, slightly chalky pigments, warm
// animals against cool blue-green woods, an apricot horizon under a violet
// sky, and a warm brown ink line. Colours are display sRGB: the shaders
// paint in display space and nothing converts them.

export const PALETTE = {
  ink: '#3d2a1f',
  paper: '#f4ead6',

  skyTop: '#46558f',
  skyMid: '#a784a6',
  skyHorizon: '#f3b27c',
  skyTopNight: '#121838',
  skyMidNight: '#232d5e',
  skyHorizonNight: '#3a4a7e',
  skyTopMorning: '#7fa9d6',
  skyHorizonMorning: '#fde6b4',
  farTrees: '#2f4a4e',
  farTreesNight: '#141c33',
  moon: '#fff0c2',
  sun: '#ffcb6b',
  star: '#fff6dc',

  grass: '#93ab58',
  grassEdge: '#5d7a44',
  moss: '#3b5a3c',
  path: '#d6bc84',
  leaf: '#4b7a4a',
  leafDark: '#335c44',
  leafLight: '#79a257',
  fir: '#2f5a4d',
  firDark: '#244438',
  trunk: '#7a5236',
  bark: '#5e3d29',
  rock: '#8e879b',
  rockDark: '#6b6479',
  earth: '#95693f',
  earthDark: '#6e4a2e',
  water: '#467fa6',
  waterLight: '#a9d5e2',
  reed: '#6f9146',
  lily: '#5c9a4d',
  mushroom: '#d4402d',
  dot: '#faf1e2',
  stem: '#efe1c4',
  flowerA: '#f2cf4a',
  flowerB: '#e9869d',
  flowerC: '#f7f1e4',
  hole: '#24160f',
  glow: '#ffc75e',
  nest: '#a47a44',
  nestDark: '#7a5530',
  straw: '#d1a861',

  owl: '#a8703b',
  owlDark: '#7b4f2a',
  owlFace: '#f0dcb4',
  amber: '#f2b02c',
  fox: '#e2682a',
  foxDark: '#3a2a22',
  white: '#fbf4e6',
  rabbit: '#c7b39c',
  rabbitDark: '#a18a73',
  pink: '#ee9aa2',
  bear: '#7a4b2a',
  bearLight: '#c89d6e',
  fish: '#f05a36',
  fishFin: '#f7b12f',
  fishBelly: '#fbd9a0',
  bird: '#3f7fcf',
  birdDark: '#2d5e9e',
  birdBreast: '#f5a431',
  beak: '#f09a2a',
  eye: '#1d1612',
  mouth: '#6e2a2a',

  shadow: '#2b2350',
  ring: '#fff3cf',
} as const

/** A display-sRGB hex colour as three 0..1 floats (no linearisation). */
export function rgb(hex: string): [number, number, number] {
  const n = Number.parseInt(hex.slice(1), 16)
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
}
