import { GRID_H, GRID_W, cellAt, type Patch, type Surface } from './surface'

// How a vehicle is muddy when it rolls in, for each place in the designed
// order. Laid out from a seeded stream, so the same seed gives the same mud.

/** A small seeded stream: xorshift32. `next` returns a number in [0, 1) and the state to carry on from. */
export function next(seed: number): [number, number] {
  let s = seed >>> 0 || 0x9e3779b9
  s ^= s << 13; s >>>= 0
  s ^= s >>> 17
  s ^= s << 5; s >>>= 0
  return [s / 2 ** 32, s]
}

/** Grows a blob of `patch` from a starting cell over the body, up to `size` patches. */
function blob(surface: Surface, col: number, row: number, size: number, patch: Patch, seed: number, over: readonly Patch[]): number {
  const frontier: [number, number][] = [[col, row]]
  let placed = 0, s = seed
  while (frontier.length && placed < size) {
    let pick: number
    ;[pick, s] = next(s)
    const [c, r] = frontier.splice(Math.floor(pick * frontier.length), 1)[0]
    if (c < 0 || c >= GRID_W || r < 0 || r >= GRID_H) continue
    const cell = cellAt(c, r)
    if (!over.includes(surface[cell])) continue
    surface[cell] = patch
    placed += 1
    frontier.push([c - 1, r], [c + 1, r], [c, r - 1], [c, r + 1])
  }
  return s
}

/** Body cells in a band of rows, in a seeded order. */
function pickIn(surface: Surface, rows: readonly [number, number], seed: number, over: readonly Patch[]): [[number, number] | null, number] {
  const found: [number, number][] = []
  for (let r = rows[0]; r <= rows[1]; r++) for (let c = 0; c < GRID_W; c++) if (over.includes(surface[cellAt(c, r)])) found.push([c, r])
  const [pick, s] = next(seed)
  return [found.length ? found[Math.floor(pick * found.length)] : null, s]
}

/** The mud a vehicle arrives with at `position`, on its clean silhouette. An unknown position is muddied as the first. */
export function arrive(clean: Surface, position: string, seed: number): Surface {
  const surface = clean.slice()
  const body = surface.filter((patch) => patch !== '.').length
  let s = seed
  const splash = (share: number, rows: readonly [number, number], blobs: number, patch: Patch, over: readonly Patch[]): void => {
    const each = Math.max(2, Math.round((body * share) / blobs))
    for (let i = 0; i < blobs; i++) {
      let at: [number, number] | null
      ;[at, s] = pickIn(surface, rows, s, over)
      if (at) s = blob(surface, at[0], at[1], each, patch, s, over)
    }
  }
  if (position === 'caked-all-over') {
    // Dried mud over all of it but for two small clean windows, and soft mud along the sills.
    for (let cell = 0; cell < surface.length; cell++) if (surface[cell] === 'd') surface[cell] = 'c'
    splash(0.12, [2, GRID_H - 1], 2, 'd', ['c'])
    for (let c = 0; c < GRID_W; c++) for (const r of [0, 1]) {
      const cell = cellAt(c, r)
      let roll: number
      ;[roll, s] = next(s)
      if (surface[cell] !== '.' && (r === 0 || roll < 0.45)) surface[cell] = 's'
    }
  } else {
    // Soft mud thrown up from the wheels, on about a third of the vehicle.
    splash(0.34, [0, 2], 3, 's', ['d'])
    // And, further on, two or three patches that have dried on.
    if (position === 'dried-patches') {
      // One of them is always on top of the nose, open to the sky, where a drop can fall on it.
      const col = 1
      for (let r = GRID_H - 1; r >= 0; r--) if (surface[cellAt(col, r)] !== '.') {
        s = blob(surface, col, r, Math.max(3, Math.round(body * 0.06)), 'c', s, ['d', 's'])
        break
      }
      splash(0.14, [2, GRID_H - 1], 2, 'c', ['d', 's'])
    }
  }
  return surface
}

/** The most trips through the puddle that add mud. A further tap only splashes. */
export const MAX_DIPS = 2

/**
 * One trip through the puddle, the first (`dip` 0) or the second (`dip` 1).
 * The first covers the wheels and sills in soft mud, the second reaches
 * halfway up, and each throws a few splashes higher. Dried mud and foam it
 * lands on become soft mud too. How many trips a vehicle has had is kept
 * beside its surface in the save: it cannot be read back from the mud.
 */
export function puddled(surface: Surface, dip: number, seed: number): Surface {
  const top = dip <= 0 ? 1 : 3
  const out = surface.slice()
  for (let r = 0; r <= top; r++) for (let c = 0; c < GRID_W; c++) if (out[cellAt(c, r)] !== '.') out[cellAt(c, r)] = 's'
  let s = seed
  for (let i = 0; i < 2; i++) {
    let at: [number, number] | null
    ;[at, s] = pickIn(out, [top + 1, Math.min(GRID_H - 1, top + 1)], s, ['d', 'w', 'p', 'c', 'm', 'f', 'b'])
    if (at) s = blob(out, at[0], at[1], 2, 's', s, ['d', 'w', 'p', 'c', 'm', 'f', 'b'])
  }
  return out
}
