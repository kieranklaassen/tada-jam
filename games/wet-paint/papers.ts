import { spreadInto, type Spread } from './marble'
import { makeRng } from './rng'

// The marbled papers the room is cut from, made the way the water's patterns are:
// drops that push each other aside, and a comb drawn through bands of
// colour. Each is a small grid of tones, made once from a seed of its own, so
// the room looks the same on every visit. catArt.ts, backdrop.ts and view.ts
// give the tones their colours.

export type Paper = { w: number; h: number; cells: Uint8Array }

/**
 * A stone pattern: drops of `tones` tones scattered over the sheet, each pushing the ones before it aside, so
 * the early ones end as thin veins between the late ones. `size` is the middle radius of a drop, in cells.
 */
export function stonePaper(seed: number, w: number, h: number, tones: number, size: number): Paper {
  const rng = makeRng(seed)
  const spreads: Spread[] = []
  const count = Math.round((w * h) / (size * size * 5))
  for (let i = 0; i < count; i++) {
    const radius = size * (0.55 + 0.9 * rng.next())
    spreads.push({ x: rng.next() * w, y: rng.next() * h, added: radius * radius, colour: i % tones })
  }
  const cells = new Uint8Array(w * h)
  spreadInto(new Uint8Array(w * h), cells, w, h, spreads)
  return { w, h, cells }
}

/**
 * A combed pattern: bands across the sheet, in the tones `stripes` lists from the top and round again, with a
 * comb drawn down through them and then up again between its first lines, which bends every band into a row of
 * feathers. A tooth drags what lies on its line the furthest and what lies beside it less, so a column of the
 * sheet is shifted as a whole and no cell is smeared. `band` is how many cells high a band is, `gap` how far
 * apart the comb's teeth are, and `depth` how far a tooth drags.
 */
export function combedPaper(seed: number, w: number, h: number, stripes: readonly number[], band: number, gap: number, depth: number): Paper {
  const rng = makeRng(seed)
  const teeth: { x: number; drag: number }[] = []
  for (let x = -gap; x < w + gap; x += gap) {
    teeth.push({ x: x + (rng.next() - 0.5) * gap * 0.25, drag: depth * (0.85 + 0.3 * rng.next()) })
    teeth.push({ x: x + gap / 2 + (rng.next() - 0.5) * gap * 0.25, drag: -depth * (0.85 + 0.3 * rng.next()) })
  }
  const cells = new Uint8Array(w * h), soft = gap * 0.2
  // The bands waver a little, each column by its own slow drift.
  let drift = 0
  for (let x = 0; x < w; x++) {
    drift += (rng.next() - 0.5) * 0.5
    drift *= 0.95
    let shift = drift
    for (const tooth of teeth) shift += tooth.drag * Math.exp(-Math.abs(x + 0.5 - tooth.x) / soft)
    for (let y = 0; y < h; y++) cells[y * w + x] = stripes[Math.floor((y + 0.5 - shift) / band + stripes.length * 64) % stripes.length]
  }
  return { w, h, cells }
}
