import { BOAT, SEABED } from './sea'

// What is drawn as a sprite: each one's box round its pivot, in stage units,
// and where the parts of a character hang on its body. A sprite is painted
// once (art.ts) and stamped; frame.ts says where. The numbers here are shared
// by the painter and the frame, so a part is painted where it is hung.

export type Box = { x0: number; y0: number; x1: number; y1: number }
const box = (x0: number, y0: number, x1: number, y1: number): Box => ({ x0, y0, x1, y1 })

export const SPRITES = {
  /** The whole cloth: sky, sea and everything on them that never moves. Its pivot is the stage's top left. */
  cloth: box(0, 0, 1180, 820),
  waves: box(0, -18, 1298, 18),
  kelp: box(-46, -330, 46, 6),
  boat: box(-226, -124, 276, 36),
  /** The landing net off the stern, hung from the point of the stern it swings about. */
  net: box(-132, -8, 12, 120),
  tub: box(-106, -32, 106, 34),
  tubWater: box(-90, -9, 90, 9),
  catBody: box(-74, -74, 46, 6),
  catHead: box(-40, -62, 40, 12),
  catTail: box(-10, -60, 44, 10),
  gull: box(-34, -34, 34, 30),
  hook: box(-24, -10, 30, 64),
  fish: box(-25, -14, 25, 14),
  puffer: box(-40, -40, 44, 40),
  pufferSpikes: box(-52, -52, 52, 52),
  pufferTail: box(-26, -18, 6, 18),
  turtle: box(-112, -64, 124, 46),
  turtleFlipper: box(-10, -16, 78, 22),
  squid: box(-58, -112, 58, 46),
  squidArms: box(-46, -6, 46, 84),
  jelly: box(-72, -64, 72, 30),
  jellyArms: box(-66, -6, 66, 160),
  shark: box(-128, -82, 172, 62),
  sharkTail: box(-74, -66, 10, 66),
  sharkJaw: box(-16, -14, 74, 34),
  angler: box(-118, -74, 100, 78),
  anglerLamp: box(-10, -44, 60, 12),
  octopus: box(-56, -92, 56, 34),
  octopusArm: box(-12, -20, 112, 26),
  pot: box(-86, -66, 86, 62),
  blobfish: box(-112, -58, 112, 46),
  halo: box(-84, -84, 84, 84),
  ink: box(-84, -84, 84, 84),
  hand: box(-34, -8, 44, 86),
  /** The five baits, each hung from its top. */
  worm: box(-12, -2, 12, 46),
  wormSpring: box(-12, -2, 12, 30),
  spoon: box(-13, -2, 13, 50),
  glow: box(-9, -2, 9, 54),
  cheese: box(-22, -2, 22, 40),
  boot: box(-24, -2, 50, 66),
  tooth: box(-6, -8, 6, 8),
  /** The light of the stick inside the pot, showing through its cracks. */
  potGlow: box(-64, -50, 64, 62),
  /** The turtle drawn into its shell. */
  turtleShell: box(-96, -64, 80, 46),
  /** The bands of light on the squid's skin. */
  squidBands: box(-34, -112, 34, 16),
  /** What shows through the shark when the stick lights it from inside: its bones and an old boot. */
  sharkBones: box(-110, -34, 96, 44),
  /** The sand the blobfish pulls over itself. */
  sand: box(-118, -30, 118, 50),
  /** The cat with every hair on end. */
  catFrizz: box(-56, -90, 56, 12),
} as const satisfies Record<string, Box>
export type SpriteId = keyof typeof SPRITES

/** One period of the wave band, in stage units: the band slides by this much and is the same again. */
export const WAVE_PERIOD = 118

/** Where a part hangs on its body, from the body's pivot, drawn facing right. */
export const PARTS = {
  pufferTail: { x: -30, y: 0 },
  pufferMouth: { x: 36, y: 9 },
  turtleFront: { x: 44, y: 20 },
  turtleBack: { x: -64, y: 18 },
  turtleMouth: { x: 118, y: 4 },
  squidArms: { x: 0, y: 40 },
  jellyArms: { x: 0, y: 18 },
  sharkTail: { x: -122, y: -2 },
  sharkJaw: { x: 92, y: 14 },
  anglerLamp: { x: 26, y: -50 },
  /** The lamp's bulb, from where the lamp is hung. */
  anglerBulb: { x: 42, y: -24 },
  octopusArms: [{ x: 40, y: -6 }, { x: -40, y: -5 }],
  pot: { x: -8, y: 34 },
  blobfishMouth: { x: 70, y: 22 },
  catHead: { x: -14, y: -52 },
  catTail: { x: 30, y: -8 },
  catMouth: { x: 0, y: -8 },
  /** The cat's eyes, from where its head is hung. */
  catEyes: [{ x: -14, y: -24, r: 8 }, { x: 13, y: -24, r: 8 }],
  /** The shoulder the cat's free paw reaches out from, from its seat. */
  catShoulder: { x: -14, y: -44 },
  /** Where the net hangs on the boat, from the boat's pivot. */
  net: { x: -172, y: -26 },
} as const

/** The kelp that sways: one tall frond beside the turtle's stretch, where it rubs its shell. The other fronds are dyed into the cloth. */
export const KELP = { x: 338, y: SEABED + 8, tall: 1.5 } as const
/** The fronds dyed into the cloth, which do not move. */
export const STILL_KELP: readonly { x: number; y: number; tall: number }[] = [
  { x: 44, y: SEABED + 6, tall: 1 },
  { x: 744, y: SEABED + 8, tall: 0.66 },
  { x: 1140, y: SEABED + 6, tall: 1.06 },
]

/** The points of light in the deep water, dyed into the cloth. */
export const SPARKS: readonly { x: number; y: number }[] = [{ x: 372, y: 646 }, { x: 806, y: 618 }, { x: 468, y: 752 }, { x: 1076, y: 668 }]

/**
 * How each catch stands in the tub: on its tail, its face up over the rim and its lower end down behind the staves,
 * at a size that tells it from the others at arm's length (sea.ts, `TUB_SLOTS`). `y` is where its pivot lies from its place.
 */
export const IN_TUB: Record<'puffer' | 'jelly' | 'angler' | 'octopus' | 'blobfish' | 'squid', { scale: number; rot: number; y: number }> = {
  puffer: { scale: 0.75, rot: -0.5, y: -10 },
  // The jellyfish sits high, so that the boot it came up on shows over the rim under its bell.
  jelly: { scale: 0.46, rot: 0, y: -16 },
  angler: { scale: 0.42, rot: -Math.PI / 2, y: -14 },
  octopus: { scale: 0.58, rot: 0, y: 0 },
  blobfish: { scale: 0.45, rot: -Math.PI / 2, y: -10 },
  squid: { scale: 0.55, rot: 0, y: 2 },
}

/** The boat's pivot, for what stands on its deck and rocks with it. */
export const BOAT_PIVOT = BOAT
