// The printed cards of the toy theatre, as sizes in stage units: how large
// each is, and the point of it that is put on the stage (the feet of a figure,
// the peg of a piece of washing, the fingertip of the hand). art.ts paints
// them; the frame only needs these numbers, so it can be counted in a test.

export type Card = { w: number; h: number; ax: number; ay: number }

export const CARDS = {
  backdrop: { w: 1180, h: 820, ax: 0, ay: 0 },
  pelmet: { w: 1180, h: 92, ax: 0, ay: 0 },
  apron: { w: 1180, h: 60, ax: 0, ay: 0 },
  curtain: { w: 132, h: 740, ax: 0, ay: 0 },
  sun: { w: 124, h: 124, ax: 62, ay: 62 },
  cloud: { w: 210, h: 96, ax: 105, ay: 52 },
  longjohns: { w: 96, h: 136, ax: 48, ay: 8 },
  sheet: { w: 126, h: 112, ax: 63, ay: 8 },
  sock: { w: 44, h: 74, ax: 22, ay: 8 },
  farmer: { w: 140, h: 124, ax: 70, ay: 120 },
  farmerUp: { w: 140, h: 150, ax: 70, ay: 146 },
  farmerPeek: { w: 140, h: 124, ax: 70, ay: 120 },
  scarecrow: { w: 250, h: 336, ax: 125, ay: 330 },
  crow: { w: 70, h: 62, ax: 35, ay: 58 },
  nest: { w: 150, h: 76, ax: 75, ay: 68 },
  bush: { w: 196, h: 92, ax: 98, ay: 84 },
  kennel: { w: 176, h: 176, ax: 88, ay: 170 },
  bowl: { w: 84, h: 40, ax: 42, ay: 37 },
  dog: { w: 160, h: 170, ax: 80, ay: 164 },
  dogTail: { w: 56, h: 76, ax: 10, ay: 68 },
  lily: { w: 116, h: 34, ax: 58, ay: 20 },
  frog: { w: 84, h: 70, ax: 42, ay: 66 },
  reeds: { w: 120, h: 120, ax: 60, ay: 114 },
  raccoon: { w: 140, h: 142, ax: 66, ay: 136 },
  raccoonCarry: { w: 140, h: 160, ax: 66, ay: 154 },
  raccoonShock: { w: 160, h: 160, ax: 80, ay: 80 },
  goose: { w: 180, h: 226, ax: 84, ay: 220 },
  gooseAlert: { w: 180, h: 262, ax: 84, ay: 256 },
  gooseHonk: { w: 220, h: 250, ax: 104, ay: 244 },
  gooseKick: { w: 220, h: 236, ax: 96, ay: 230 },
  gooseStrut: { w: 180, h: 240, ax: 84, ay: 234 },
  ball: { w: 60, h: 60, ax: 30, ay: 57 },
  potato: { w: 68, h: 50, ax: 34, ay: 47 },
  clock: { w: 64, h: 72, ax: 32, ay: 69 },
  boot: { w: 72, h: 76, ax: 34, ay: 73 },
  cabbage: { w: 72, h: 64, ax: 36, ay: 61 },
  egg: { w: 50, h: 62, ax: 25, ay: 59 },
  peg: { w: 30, h: 50, ax: 15, ay: 46 },
  hand: { w: 92, h: 112, ax: 14, ay: 10 },
  feather: { w: 34, h: 16, ax: 17, ay: 8 },
  leaf: { w: 24, h: 16, ax: 12, ay: 8 },
  // What the pairings leave, and the small props that are there only while something happens.
  frogEars: { w: 84, h: 70, ax: 42, ay: 66 },
  cabbageHeart: { w: 46, h: 44, ax: 23, ay: 41 },
  cabbagePad: { w: 88, h: 34, ax: 44, ay: 26 },
  collar: { w: 112, h: 44, ax: 56, ay: 22 },
  potatoFace: { w: 68, h: 50, ax: 34, ay: 47 },
  mound: { w: 136, h: 44, ax: 68, ay: 40 },
  sparrow: { w: 36, h: 32, ax: 18, ay: 29 },
  bubble: { w: 22, h: 22, ax: 11, ay: 11 },
  drop: { w: 12, h: 18, ax: 6, ay: 9 },
  splash: { w: 124, h: 72, ax: 62, ay: 66 },
  clod: { w: 18, h: 14, ax: 9, ay: 7 },
  apple: { w: 20, h: 22, ax: 10, ay: 12 },
  sockEgg: { w: 52, h: 92, ax: 26, ay: 8 },
  pole: { w: 26, h: 216, ax: 13, ay: 212 },
  halfDoor: { w: 112, h: 86, ax: 0, ay: 0 },
} as const satisfies Record<string, Card>

export type CardId = keyof typeof CARDS

/** Where the eye holes of a card are, from its top left: the pupils slide behind them on a tab. */
export const EYES: Partial<Record<CardId, readonly { x: number; y: number; r: number }[]>> = {
  raccoon: [{ x: 84, y: 50, r: 8 }, { x: 105, y: 48, r: 8 }],
  raccoonCarry: [{ x: 84, y: 68, r: 8 }, { x: 105, y: 66, r: 8 }],
  raccoonShock: [{ x: 68, y: 66, r: 10 }, { x: 94, y: 66, r: 10 }],
  goose: [{ x: 134, y: 46, r: 6.5 }],
  gooseAlert: [{ x: 134, y: 40, r: 7.5 }],
  gooseHonk: [{ x: 152, y: 52, r: 8 }],
  gooseKick: [{ x: 122, y: 50, r: 7 }],
  dog: [{ x: 56, y: 56, r: 7.5 }],
  scarecrow: [{ x: 108, y: 96, r: 9.5 }, { x: 142, y: 96, r: 9.5 }],
  frog: [{ x: 27, y: 22, r: 7.5 }, { x: 57, y: 22, r: 7.5 }],
  frogEars: [{ x: 27, y: 22, r: 7.5 }, { x: 57, y: 22, r: 7.5 }],
  gooseStrut: [],
  crow: [{ x: 47, y: 18, r: 4.5 }],
}

/** The raccoon is the child's own piece: its cards are printed finer and stood larger than their sheet size. */
export const RACCOON_SIZE = 1.25
/** Cards painted at a finer density than the rest, because they are stamped larger than they are printed. */
export const FINE: Partial<Record<CardId, number>> = { raccoon: RACCOON_SIZE, raccoonCarry: RACCOON_SIZE, raccoonShock: RACCOON_SIZE }
