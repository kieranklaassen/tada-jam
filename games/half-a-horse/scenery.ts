// Where the things that stand still in the yard are, beyond layout.ts.

/** The post beside the farmer. */
export const LINE_POST = { farm: 952 }

/** Small sewn things that wobble when they are poked: in the page, and stamped only while they move. */
export type BitKey = 'sun' | 'cloud' | 'cloudlet' | 'flowerRed' | 'flowerWhite' | 'flowerYellow' | 'stone'
export const BITS: readonly { key: BitKey; x: number; y: number; r: number }[] = [
  { key: 'sun', x: 1092, y: 70, r: 60 },
  { key: 'cloud', x: 470, y: 330, r: 56 },
  { key: 'cloudlet', x: 890, y: 296, r: 46 },
  { key: 'flowerRed', x: 292, y: 628, r: 34 },
  { key: 'flowerWhite', x: 420, y: 612, r: 34 },
  { key: 'flowerYellow', x: 690, y: 620, r: 34 },
  { key: 'stone', x: 620, y: 770, r: 40 },
]
