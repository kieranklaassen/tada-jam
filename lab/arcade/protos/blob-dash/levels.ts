// Blob Dash course data. Everything is in cells (x right, y up, the floor's
// top at y = 0) and the blob moves 4 cells a beat, so an obstacle "at beat
// 2.5" sits under the top of a jump taken on beat 2. A section is 16 beats.
// Pure data: no DOM, importable in Node (the verifier in the builder's
// scratch space runs every section's `jumps` through the sim).

export const CEIL = 6
export const SECTION_BEATS = 16
export const SECTION_CELLS = 64
export const CELLS_PER_BEAT = 4

export interface Rect {
  x0: number
  x1: number
  y0: number
  y1: number
}

export interface Spike {
  // Centre of the base, and which way the tip points (1 up, -1 down).
  x: number
  y: number
  dir: 1 | -1
}

export interface Pad {
  x: number
  y: number
  dir: 1 | -1
}

export interface Ring {
  x: number
  y: number
}

export interface Portal {
  x: number
  // Gravity after passing: -1 falls down (normal), 1 falls up.
  to: 1 | -1
}

export interface Star {
  x: number
  y: number
  big: boolean
}

export interface Layout {
  name: string
  // Backdrop hue, and the hue of the neon lines drawn over it.
  hue: number
  accent: number
  // Everything the blob can stand on or crash into (floor, ceiling, blocks).
  solids: Rect[]
  // The same, split for drawing. Floor pieces are clipped to the section.
  floor: Rect[]
  ceiling: Rect[]
  blocks: Rect[]
  spikes: Spike[]
  pads: Pad[]
  rings: Ring[]
  portals: Portal[]
  stars: Star[]
  // Local beats at which a press clears the section: the robot plays these,
  // and the hint markers sit on them.
  jumps: number[]
}

const JUMP_V = 8.8
const PAD_V = 13.2
const GRAV = 17.6
// Low enough that a jump underneath hits the spike, high enough to run under.
const HANG_Y = 2.9

interface Builder {
  spikes(beat: number, count?: number, y?: number): void
  cspikes(beat: number, count?: number): void
  // A floating bar with spikes underneath: run under it, do not jump.
  hang(beat: number, count?: number): void
  // The same for a blob running on the ceiling.
  chang(beat: number): void
  block(b0: number, b1: number, h: number, y0?: number): void
  pit(b0: number, b1: number): void
  ceiling(b0: number, b1: number): void
  pad(beat: number, y?: number): void
  ring(beat: number, y?: number): void
  portal(beat: number, to: 1 | -1): void
  star(beat: number, y: number): void
  gem(beat: number, y: number): void
  // Three stars along a jump taken at `beat` from a surface at height y0.
  arc(beat: number, y0?: number): void
  // The same under flipped gravity, hanging from the ceiling.
  carc(beat: number): void
  // Stars along a pad launch.
  padArc(beat: number, y0?: number): void
}

function make(name: string, hue: number, accent: number, jumps: number[], fn: (b: Builder) => void): Layout {
  const pits: Array<[number, number]> = []
  const lay: Layout = { name, hue, accent, solids: [], floor: [], ceiling: [], blocks: [], spikes: [], pads: [], rings: [], portals: [], stars: [], jumps }
  const c = CELLS_PER_BEAT
  const b: Builder = {
    spikes(beat, count = 1, y = 0) {
      for (let i = 0; i < count; i++) lay.spikes.push({ x: beat * c + i - (count - 1) / 2, y, dir: 1 })
    },
    cspikes(beat, count = 1) {
      for (let i = 0; i < count; i++) lay.spikes.push({ x: beat * c + i - (count - 1) / 2, y: CEIL, dir: -1 })
    },
    hang(beat, count = 1) {
      lay.blocks.push({ x0: beat * c - count / 2, x1: beat * c + count / 2, y0: HANG_Y, y1: HANG_Y + 0.5 })
      for (let i = 0; i < count; i++) lay.spikes.push({ x: beat * c + i - (count - 1) / 2, y: HANG_Y, dir: -1 })
    },
    chang(beat) {
      lay.blocks.push({ x0: beat * c - 0.5, x1: beat * c + 0.5, y0: CEIL - HANG_Y - 0.5, y1: CEIL - HANG_Y })
      lay.spikes.push({ x: beat * c, y: CEIL - HANG_Y, dir: 1 })
    },
    block(b0, b1, h, y0 = 0) {
      lay.blocks.push({ x0: b0 * c, x1: b1 * c, y0, y1: y0 + h })
    },
    pit(b0, b1) {
      pits.push([b0 * c, b1 * c])
    },
    ceiling(b0, b1) {
      lay.ceiling.push({ x0: b0 * c, x1: b1 * c, y0: CEIL, y1: CEIL + 4 })
    },
    pad(beat, y = 0) {
      lay.pads.push({ x: beat * c, y, dir: 1 })
    },
    ring(beat, y = 0.3) {
      lay.rings.push({ x: beat * c, y })
    },
    portal(beat, to) {
      lay.portals.push({ x: beat * c, to })
    },
    star(beat, y) {
      lay.stars.push({ x: beat * c, y, big: false })
    },
    gem(beat, y) {
      lay.stars.push({ x: beat * c, y, big: true })
    },
    arc(beat, y0 = 0) {
      for (const t of [0.25, 0.5, 0.75]) lay.stars.push({ x: (beat + t) * c, y: y0 + 0.5 + JUMP_V * t - (GRAV / 2) * t * t, big: false })
    },
    carc(beat) {
      for (const t of [0.25, 0.5, 0.75]) lay.stars.push({ x: (beat + t) * c, y: CEIL - 0.5 - JUMP_V * t + (GRAV / 2) * t * t, big: false })
    },
    padArc(beat, y0 = 0) {
      for (const t of [0.3, 0.525, 0.75, 0.975, 1.2]) lay.stars.push({ x: (beat + t) * c, y: y0 + 0.5 + PAD_V * t - (GRAV / 2) * t * t, big: false })
    },
  }
  fn(b)

  pits.sort((p, q) => p[0] - q[0])
  // Physics floor runs past both ends so a section joins the next seamlessly.
  let from = -16
  for (const [p0, p1] of pits) {
    lay.solids.push({ x0: from, x1: p0, y0: -4, y1: 0 })
    from = p1
  }
  lay.solids.push({ x0: from, x1: SECTION_CELLS + 16, y0: -4, y1: 0 })
  for (const r of lay.solids) {
    const x0 = Math.max(0, r.x0)
    const x1 = Math.min(SECTION_CELLS, r.x1)
    if (x1 > x0) lay.floor.push({ x0, x1, y0: r.y0, y1: r.y1 })
  }
  lay.solids.push(...lay.ceiling, ...lay.blocks)
  return lay
}

// Ordered so the first minute already has a launch pad in it and the second
// has the gravity flip; each section adds one idea. Timing windows (from the
// verifier): single spikes forgive 0.3 of a beat either way, doubles 0.18.
export const LAYOUTS: Layout[] = [
  // 1. The verb: one spike, one tap, on the beat. Ends with a hold-able run.
  make('HOP', 262, 185, [2, 4, 6, 8, 9, 11, 12, 13], (b) => {
    for (const beat of [2, 4, 6, 8, 9, 11, 12, 13]) {
      b.spikes(beat + 0.5)
      b.arc(beat)
    }
  }),

  // 2. Pads: no tap needed. A free launch first, then one over a wall and one
  // up onto a high platform.
  make('PADS', 216, 165, [5, 11, 14], (b) => {
    b.pad(2.5)
    b.padArc(2.5)
    b.spikes(5.5)
    b.arc(5)
    b.pad(6.5)
    b.block(7, 7.5, 3)
    b.padArc(6.5)
    b.pad(8.75)
    b.block(9.25, 12.5, 3)
    b.star(9.05, 3.9)
    b.star(9.35, 5.0)
    b.gem(9.6, 5.5)
    b.spikes(11.5, 1, 3)
    b.arc(11, 3)
    b.star(12.85, 2.4)
    b.star(13.0, 1.4)
    b.spikes(14.5)
    b.arc(14)
  }),

  // 3. Doubles, four in a row to hold through, and the first "do not jump" bars.
  make('DOUBLES', 282, 48, [2, 4, 6, 7, 8, 9, 11, 13], (b) => {
    b.spikes(2.5, 2)
    b.arc(2)
    b.spikes(4.5, 2)
    b.arc(4)
    b.hang(5.5)
    b.hang(10.5)
    for (const beat of [6, 7, 8, 9]) {
      b.spikes(beat + 0.5)
      b.arc(beat)
    }
    b.spikes(11.5, 2)
    b.arc(11)
    b.spikes(13.5, 2)
    b.arc(13)
  }),

  // 4. Gravity flip: fall up, run on the ceiling, jump downwards.
  make('FLIP', 246, 190, [4, 5, 7, 10, 13], (b) => {
    b.ceiling(1, 15.75)
    b.portal(2.25, 1)
    b.star(2.5, 1.6)
    b.star(2.7, 3.0)
    b.star(2.88, 4.4)
    b.cspikes(4.5)
    b.carc(4)
    b.cspikes(5.5)
    b.carc(5)
    b.chang(6.5)
    b.cspikes(7.5)
    b.carc(7)
    b.portal(8.25, -1)
    b.star(8.5, 4.4)
    b.star(8.7, 3.0)
    b.star(8.88, 1.6)
    b.spikes(10.5)
    b.arc(10)
    b.portal(11.25, 1)
    b.gem(11.7, 3.0)
    b.cspikes(13.5)
    b.carc(13)
    b.portal(14.25, -1)
  }),

  // 5. Blocks: land on them, climb stairs, fall off the far side.
  make('BLOCKS', 182, 48, [2, 5, 6, 7, 8, 12, 13], (b) => {
    b.block(2.5, 4, 1)
    b.arc(2)
    b.star(3.25, 1.6)
    b.star(3.6, 1.6)
    b.spikes(5.5)
    b.arc(5)
    b.block(6.5, 7.5, 1)
    b.block(7.5, 8.5, 2)
    b.block(8.5, 9.5, 3)
    b.star(6.5, 3.0)
    b.star(7.5, 4.0)
    b.star(8.5, 5.0)
    b.gem(9.5, 5.7)
    b.star(9.9, 2.76)
    b.star(10.05, 1.8)
    b.hang(11.5)
    b.spikes(12.5, 2)
    b.arc(12)
    b.block(13.5, 14.5, 1)
    b.arc(13)
  }),

  // 6. Pits: the floor goes missing, and three islands to bounce across.
  make('PITS', 328, 36, [2, 4, 6, 7, 8, 10, 12, 13, 14], (b) => {
    b.pit(2.19, 2.81)
    b.arc(2)
    b.pit(4.19, 4.81)
    b.arc(4)
    b.hang(3.5)
    b.hang(9.5)
    b.hang(11.5)
    for (const beat of [6, 7, 8]) {
      b.pit(beat + 0.19, beat + 0.81)
      b.arc(beat)
    }
    b.spikes(10.5)
    b.arc(10)
    b.pit(12.19, 12.81)
    b.arc(12)
    b.pit(13.19, 13.81)
    b.arc(13)
    b.spikes(14.5)
    b.arc(14)
  }),

  // 7. Rings: tap again in mid-air, on the beat, to cross a long drop.
  make('RINGS', 204, 128, [2, 3, 5, 7, 8, 9, 11, 13, 14], (b) => {
    b.pit(2.19, 3.75)
    b.ring(3)
    b.arc(2)
    b.arc(3)
    b.spikes(5.5)
    b.arc(5)
    b.pit(7.19, 9.75)
    b.ring(8)
    b.ring(9)
    b.arc(7)
    b.arc(8)
    b.arc(9)
    b.spikes(11.5, 2)
    b.arc(11)
    b.pit(13.19, 14.75)
    b.ring(14)
    b.arc(13)
    b.arc(14)
  }),

  // 8. Everything in one breath.
  make('FINALE', 350, 45, [2, 5, 7, 8, 11, 14], (b) => {
    b.spikes(2.5, 2)
    b.arc(2)
    b.pad(3.5)
    b.spikes(4.25, 4)
    b.padArc(3.5)
    b.block(5.5, 6.25, 1)
    b.arc(5)
    b.pit(7.19, 8.75)
    b.ring(8)
    b.arc(7)
    b.arc(8)
    b.ceiling(8.75, 13.5)
    b.portal(9.25, 1)
    b.gem(9.7, 3.0)
    b.cspikes(11.5)
    b.carc(11)
    b.portal(12.25, -1)
    b.spikes(14.5, 2)
    b.arc(14)
  }),
]
