import { GLOW, STAIN, WOOD, blob, cut, engrave, inlay, poly, rivet, stroke, type Box, type G, type Path } from './ply'
import type { PlaceId, Season } from './wood'

// The six covers as cut pieces, each drawn about the point it turns on (or,
// for the stone and the floating leaf, about its middle), which is where
// motion.ts places it. They are the things a child touches most, so each has
// a strong stain of its own, a thick scorched edge and a brass pin where it
// has a hinge.

export type CoverArt = { box: Box; seasonal: boolean; paint: (g: G, season: Season, grain: boolean) => void }

const TAU = Math.PI * 2

/**
 * The left fan of the long grass, leaning in over what it hides. The right fan is this one mirrored. It is three
 * sheets of cut blades: tall ones at the back in a deeper stain, a bent one that hangs over to the side, and short
 * ones in front, with something small looking out between them.
 */
const grass: CoverArt = {
  box: [-48, -156, 86, 22], seasonal: true,
  paint: (g, season, grain) => {
    const stain = STAIN[season].grass
    // The back sheet: tall blades, a deeper wash.
    cut(g, poly([-28, 10, -30, -70, -20, -134, -8, -80, 6, -148, 20, -92, 34, -140, 44, -84, 60, -112, 66, 10]), WOOD.maple, [-32, -150, 68, 12], { grain, gap: 5, seed: 3, stain, wash: 0.86, slant: 1.4, edge: 2.6 })
    engrave(g, (h) => { stroke([-18, 0, -18, -70, -20, -118])(h); stroke([8, 0, 8, -80, 6, -130])(h); stroke([36, 0, 36, -80, 34, -124])(h) }, 1.4, 0.5)
    // A blade that has bent right over, and one that leans the other way.
    cut(g, blob([40, -40, 52, -96, 78, -112, 80, -100, 62, -88, 54, -40]), WOOD.birch, [38, -114, 82, -38], { grain, gap: 3, seed: 4, stain, wash: 0.7, edge: 2.2 })
    cut(g, blob([-20, -30, -34, -78, -44, -96, -38, -100, -24, -80, -8, -30]), WOOD.birch, [-46, -102, -6, -28], { grain, gap: 3, seed: 6, stain, wash: 0.7, edge: 2.2 })
    // Something small looks out between the blades: a beetle's head and its two feelers.
    engrave(g, (h) => { stroke([10, -62, 4, -80, -2, -84])(h); stroke([20, -62, 26, -80, 32, -84])(h) }, 1.8, 0.95)
    inlay(g, 15, -54, 12, '#3c2a1c', 1.6)
    inlay(g, 10, -57, 3.2, '#fbf7ea', 0)
    inlay(g, 20, -57, 3.2, '#fbf7ea', 0)
    // The front sheet: short blades, a lighter wash, over the head's chin.
    cut(g, poly([-32, 12, -30, -34, -22, -62, -12, -30, -2, -52, 8, -26, 18, -48, 28, -24, 40, -56, 50, -28, 60, -44, 68, 12]), WOOD.birch, [-34, -64, 70, 14], { grain, gap: 4, seed: 8, stain, wash: 0.68, slant: 1.5, edge: 2.6 })
    engrave(g, (h) => { stroke([-20, 4, -22, -40])(h); stroke([0, 4, -2, -36])(h); stroke([18, 4, 18, -32])(h); stroke([40, 4, 40, -40])(h); stroke([58, 4, 60, -30])(h) }, 1.4, 0.55)
  },
}

/** The bark lid of the log, drawn hinged at its left end; motion.ts mirrors it, so in the wood the hinge is at the right. */
const log: CoverArt = {
  box: [-18, -62, 238, 28], seasonal: false,
  paint: (g, _season, grain) => {
    cut(g, blob([-8, 4, 6, -30, 60, -52, 150, -52, 208, -32, 226, 4, 150, 12, 60, 12]), WOOD.walnut, [-10, -54, 228, 14], { grain, gap: 6, seed: 5, stain: '#6f4a2a', wash: 0.35, edge: 2.8 })
    engrave(g, (h) => { stroke([24, -20, 70, -36, 120, -30])(h); stroke([96, -12, 150, -22, 200, -12])(h); stroke([40, -2, 80, -8, 120, -2])(h) }, 1.8, 0.8)
    rivet(g, 4, -6, 5.5)
  },
}

/** The stone: one grey-blue cobble, drawn about its middle. */
const stone: CoverArt = {
  box: [-78, -64, 86, 66], seasonal: false,
  paint: (g, _season, grain) => {
    cut(g, blob([-66, 8, -56, -34, -18, -54, 32, -50, 64, -22, 70, 18, 40, 46, -22, 50, -54, 36]), WOOD.maple, [-68, -56, 72, 52], { grain, gap: 6, seed: 7, stain: '#8496a6', wash: 0.82, edge: 2.8 })
    // One crack that wanders across it, and a nick: neither is a stroke of anything.
    engrave(g, (h) => { stroke([-36, -26, -14, -14, -22, 6, -2, 20, 10, 38])(h); stroke([26, -34, 34, -24])(h) }, 1.8, 0.8)
    for (const [x, y] of [[-40, 14], [-30, 24], [46, -4]] as const) inlay(g, x, y, 4, '#7fae5c', 0)
  },
}

const pad: Path = (g) => { g.moveTo(0, 0); g.ellipse(0, 0, 76, 41, 0, 0.3, TAU - 0.3); g.closePath() }

/** What floats on the puddle: a lily pad, in autumn a fallen leaf, in winter a sheet of ice. */
const puddle: CoverArt = {
  box: [-92, -50, 96, 52], seasonal: true,
  paint: (g, season, grain) => {
    if (season === 'winter') {
      cut(g, poly([-80, -6, -46, -36, 10, -42, 66, -26, 84, 6, 50, 36, -12, 42, -62, 26]), WOOD.board, [-82, -44, 86, 44], { grain, gap: 3, seed: 9, stain: '#bfe3f5', wash: 0.7, edge: 2.6 })
      // A crack that wanders, and a short one apart from it: they do not meet.
      engrave(g, (h) => { stroke([-54, -12, -22, 2, 2, -10, 26, 4])(h); stroke([-2, 22, 14, 30])(h); stroke([44, 10, 62, 6])(h) }, 1.5, 0.6)
      g.strokeStyle = 'rgba(255, 255, 255, 0.85)'
      g.lineWidth = 4
      g.lineCap = 'round'
      g.beginPath()
      g.moveTo(-40, -22); g.lineTo(-8, -28)
      g.stroke()
      return
    }
    if (season === 'autumn') {
      cut(g, poly([-80, 0, -40, -32, -12, -22, 20, -40, 44, -18, 80, -4, 46, 18, 22, 36, -8, 22, -38, 34]), WOOD.birch, [-82, -42, 82, 38], { grain, gap: 3, seed: 11, stain: STAIN.autumn.float, wash: 0.82, edge: 2.6 })
      engrave(g, (h) => { stroke([-76, 0, 0, -2, 76, -4])(h); stroke([-20, -2, -34, -24])(h); stroke([-10, -2, -30, 24])(h); stroke([24, -2, 22, -30])(h); stroke([30, -2, 26, 26])(h) }, 1.6, 0.7)
      return
    }
    cut(g, pad, WOOD.birch, [-78, -43, 78, 43], { grain, gap: 3, seed: 13, stain: STAIN[season].float, wash: 0.82, edge: 2.6 })
    engrave(g, (h) => { for (const angle of [0.9, 1.6, 2.4, 3.14, 3.9, 4.7, 5.4]) { h.moveTo(0, 0); h.lineTo(Math.cos(angle) * 62, Math.sin(angle) * 33) } }, 1.5, 0.6)
  },
}

/** The leaves of the low branch, hanging from the twig they turn on. In winter they carry snow. */
const branch: CoverArt = {
  box: [-94, -14, 100, 150], seasonal: true,
  paint: (g, season, grain) => {
    cut(g, blob([-14, -4, -58, 18, -84, 62, -66, 102, -36, 84, -22, 120, 0, 136, 22, 120, 38, 86, 66, 104, 86, 62, 60, 18, 14, -4]), WOOD.birch, [-86, -6, 88, 138], { grain, gap: 6, seed: 15, stain: STAIN[season].leaf, wash: season === 'winter' ? 0.86 : 0.8, slant: 1.2, edge: 2.8 })
    // Three leaves hang here, and each has a rib of its own, with a short vein or two off it. No rib meets another, so nothing here has a point.
    engrave(g, (h) => { for (const vein of BRANCH_VEINS) stroke(vein)(h) }, 1.7, 0.7)
    if (season === 'winter') for (const [x, y] of [[-40, 40], [30, 30], [0, 96], [50, 74]] as const) inlay(g, x, y, 4, STAIN.winter.other, 0)
    if (season === 'spring') for (const [x, y] of [[-44, 44], [34, 34], [4, 100]] as const) inlay(g, x, y, 7, STAIN.spring.other, 1.3)
    rivet(g, 0, 0, 5.5)
  },
}

/** The flap of bark over the burrow, hung on one pin at its top right corner. */
const burrow: CoverArt = {
  box: [-140, -20, 28, 144], seasonal: false,
  paint: (g, _season, grain) => {
    cut(g, blob([-120, 2, -60, -10, 6, -8, 12, 56, -4, 118, -62, 130, -120, 112, -130, 56]), WOOD.alder, [-132, -12, 14, 132], { grain, gap: 6, seed: 17, stain: '#7a5230', wash: 0.5, slant: 1.5, edge: 2.8 })
    engrave(g, (h) => { stroke([-100, 12, -104, 60, -96, 108])(h); stroke([-64, 4, -60, 60, -68, 118])(h); stroke([-24, 4, -28, 56, -20, 108])(h) }, 1.8, 0.8)
    rivet(g, 0, 0, 5.5)
  },
}

/** The ribs of the three leaves of the low branch, each with its short veins. The first three are the ribs. */
export const BRANCH_VEINS: readonly (readonly number[])[] = [
  [3, 46, -2, 86, 1, 126], [-22, 26, -46, 58, -64, 92], [38, 38, 54, 66, 62, 96],
  [-1, 70, -14, 84], [0, 96, 12, 106], [-42, 54, -58, 56], [51, 62, 42, 78],
]

export const COVER_ART: Readonly<Record<PlaceId, CoverArt>> = { grass, log, stone, puddle, branch, burrow }

/** The light behind a cover that can be touched: a ring of warm light on the sheet behind it. */
export const GLOW_BOX: Box = [-112, -112, 112, 112]
export function paintGlow(g: G): void {
  const light = g.createRadialGradient(0, 0, 20, 0, 0, 110)
  light.addColorStop(0, `rgba(${GLOW}, 0.3)`)
  light.addColorStop(0.55, `rgba(${GLOW}, 0.5)`)
  light.addColorStop(0.78, `rgba(${GLOW}, 0.95)`)
  light.addColorStop(1, `rgba(${GLOW}, 0)`)
  g.fillStyle = light
  g.fillRect(-112, -112, 224, 224)
}

/** A chip of ply: what hops up from under the finger when the wood is knocked. */
export const CHIP_ART: { box: Box; paint: (g: G, grain: boolean) => void } = {
  box: [-13, -9, 13, 9],
  paint: (g, grain) => cut(g, blob([-11, 1, -3, -7, 10, -3, 4, 7]), WOOD.birch, [-12, -8, 12, 8], { grain, gap: 2, seed: 77, edge: 1.8 }),
}
