import { AIRS, FULL, IDS, MAX_LAYERS, PAPERS, bits, isAir, type AirId, type Id, type Paper } from './layout'
import { BURSTS_AT, CLOSES_FROM, MAX_SCRAPS, freshWorld, scrapsToCome, topOf, type Layer, type Scrap, type World } from './model'

// What goes into ctx.storage: the room as it is. A paper that is closing by
// itself is saved closed, the cat is saved at home, and what the family has
// come for is saved ripped, so nothing plays on load.

export const STATE_VERSION = 1

export type Save = {
  v: typeof STATE_VERSION
  paper: Paper
  layers: Record<Id, Layer[]>
  airs: Record<AirId, { x: number; y: number; r: number } | null>
  ties: [Id, Id][]
  oldAir: AirId
  scraps: Scrap[]
  shown: boolean
  ripped: boolean
  door: boolean
}

const closed = (l: Layer): Layer => ({ ...l, cover: !l.torn && bits(l.cover) >= CLOSES_FROM ? FULL : l.cover })
const round = (n: number) => Math.round(n * 10) / 10

export function serialize(w: World): Save {
  const ripped = new Set<Id>(w.visit?.todo ?? [])
  const layers = Object.fromEntries(IDS.map((id) => [id, ripped.has(id) ? [] : w.layers[id].map(closed)])) as Save['layers']
  const airs = Object.fromEntries(AIRS.map((id) => {
    const a = layers[id].length ? w.airs[id] : null
    return [id, a ? { x: round(a.at.x), y: round(a.at.y), r: round(a.r) } : null]
  })) as Save['airs']
  return {
    v: STATE_VERSION,
    paper: w.paper,
    layers,
    airs,
    ties: w.ties.filter(([a, b]) => !ripped.has(a) && !ripped.has(b)),
    oldAir: w.oldAir,
    scraps: [...w.scraps, ...scrapsToCome(w)].slice(-MAX_SCRAPS).map((s) => ({ ...s, x: round(s.x), y: round(s.y), turn: round(s.turn) })),
    shown: w.shown,
    ripped: w.known.ripped,
    door: w.known.door,
  }
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const isPaper = (v: unknown): v is Paper => typeof v === 'number' && Number.isInteger(v) && v >= 0 && v < PAPERS
const isId = (v: unknown): v is Id => typeof v === 'string' && (IDS as readonly string[]).includes(v)
const within = (v: unknown, lo: number, hi: number): v is number => typeof v === 'number' && v >= lo && v <= hi

/** Saved state is untrusted: what is not this game's record gives the first visit, and each damaged field its own default. */
export function deserialize(raw: unknown): World {
  const w = freshWorld()
  if (!isRecord(raw) || raw.v !== STATE_VERSION) return w
  if (isPaper(raw.paper)) w.paper = raw.paper
  w.shown = raw.shown === true
  w.known = { ripped: raw.ripped === true, door: raw.door === true }
  if (isRecord(raw.airs)) for (const id of AIRS) {
    const a = raw.airs[id]
    if (isRecord(a) && within(a.x, 0, 1180) && within(a.y, 0, 820) && within(a.r, 40, 90)) w.airs[id] = { at: { x: a.x, y: a.y }, r: a.r }
  }
  if (isRecord(raw.layers)) for (const id of IDS) {
    const list = raw.layers[id]
    if (!Array.isArray(list)) continue
    const read: Layer[] = []
    for (const l of list.slice(0, MAX_LAYERS)) {
      if (!isRecord(l) || !isPaper(l.paper) || !within(l.cover, 0, FULL) || !Number.isInteger(l.cover) || l.cover === 0) continue
      const torn = l.torn === true && l.cover !== FULL && bits(l.cover) > BURSTS_AT
      read.push(closed({ paper: l.paper, cover: l.cover, torn }))
    }
    // Only the outermost may be open.
    w.layers[id] = read.map((l, i) => (i < read.length - 1 ? { ...l, cover: FULL, torn: false } : l))
  }
  for (const id of IDS) if (isAir(id)) {
    if (!w.airs[id]) w.layers[id] = []
    else if (!topOf(w, id)) w.airs[id] = null
  }
  if (raw.oldAir === 'air1') w.oldAir = 'air1'
  if (Array.isArray(raw.ties)) for (const p of raw.ties) {
    if (!Array.isArray(p) || !isId(p[0]) || !isId(p[1]) || p[0] === p[1]) continue
    if (topOf(w, p[0]) && topOf(w, p[1]) && !w.ties.flat().includes(p[0]) && !w.ties.flat().includes(p[1])) w.ties.push([p[0], p[1]])
  }
  if (Array.isArray(raw.scraps)) for (const s of raw.scraps.slice(0, MAX_SCRAPS)) {
    if (isRecord(s) && within(s.x, 0, 1180) && within(s.y, 0, 820) && isPaper(s.paper) && within(s.turn, 0, 7)) w.scraps.push({ x: s.x, y: s.y, paper: s.paper, turn: s.turn })
  }
  return w
}
