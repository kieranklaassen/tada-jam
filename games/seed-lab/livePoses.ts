import { beetleHome } from './hit'
import { hash } from './ink'
import { BORDER_PLACES, HANDLE, PLANT, stemHeight, type Layout } from './layout'
import { stillLive, type Live, type Mote, type VisitorLive } from './live'
import { beadsOf } from './loupe'
import { lookFromCode, lookOf } from './plant'
import { POD } from './specimen'
import type { PageView, PlantView, Row, VisitorKind } from './spikePage'
import { roseOf, toolScale } from './tools'
import { LIKES } from './visitors'
import { restingVisitor, visitorSpot, waitingSpot } from './walker'

// Fixed moments of the page in motion, by name, for stills: the Mount shows
// one when the address carries `pose=<name>`, on the view `poseView` gives for
// it, since some moments need another visitor, a tool or a sketch that the
// spike page does not hold. Nothing here is played. Every
// number comes from the places of the layout and the plants of the view, and
// what looks scattered comes from the seeded `hash`: the same pose is the same
// picture every time. `time` only keeps a pose breathing a little.

type Point = { x: number; y: number }
/** A plant of a row, with its soil point, the middle of its flower and the middle of a pod on it. */
type Stood = { plant: PlantView; pot: number; x: number; soil: number; flower: Point; pod: Point }

function rowOf(view: PageView, layout: Layout, row: Exclude<Row, 'border'>): Stood[] {
  return view.plants.filter((plant) => plant.row === row && layout[row][plant.slot]).sort((a, b) => a.slot - b.slot).map((plant) => {
    const place = layout[row][plant.slot], k = layout.k, soil = place.soil + k, top = soil - stemHeight(lookOf(plant.pairs, plant.dry).joints, k)
    return { plant, pot: (row === 'tray' ? layout.shelf.length : 0) + plant.slot, x: place.x, soil, flower: { x: place.x, y: top }, pod: { x: place.x + POD.x * k, y: top + POD.y * k } }
  })
}

/** A point `u` of the way along a thrown arc that rises by `lift` at its middle. */
const arc = (from: Point, to: Point, lift: number, u: number): Point => ({ x: from.x + (to.x - from.x) * u, y: from.y + (to.y - from.y) * u - lift * 4 * u * (1 - u) })

/** A cloud of specks about a point, thickest at its middle. */
function cloud(at: Point, count: number, r: number, seed: number, alpha = 1): Mote[] {
  const out: Mote[] = []
  for (let i = 0; i < count; i++) {
    const a = hash(seed, i) * Math.PI * 2, far = r * hash(seed + 1, i) ** 0.7
    out.push({ x: at.x + Math.cos(a) * far, y: at.y + Math.sin(a) * far * 0.8, r: 0.8 + 1.3 * hash(seed + 2, i), alpha: alpha * (0.55 + 0.45 * hash(seed + 3, i)) })
  }
  return out
}

/** The dust a finger sheds on its way: specks along an arc, the older ones fallen further and fainter. */
function trail(from: Point, to: Point, count: number, seed: number, lift: number): Mote[] {
  const out: Mote[] = []
  for (let i = 0; i < count; i++) {
    const u = (i + hash(seed, i)) / count, at = arc(from, to, lift, u), fallen = (1 - u) * (1 - u) * 46 * hash(seed + 1, i)
    out.push({ x: at.x + (hash(seed + 2, i) - 0.5) * 9, y: at.y + fallen + (hash(seed + 3, i) - 0.5) * 6, r: 0.7 + 1.1 * hash(seed + 4, i), alpha: 0.3 + 0.7 * u })
  }
  return out
}

/** The visitor of that kind as it stands in its place, breathing, with whatever the moment sets. */
function visitorAt(layout: Layout, kind: VisitorKind, time: number, set: Partial<VisitorLive> = {}): VisitorLive {
  const { x, y } = visitorSpot(layout, kind)
  return { ...restingVisitor(kind), x, y, pose: { lean: -0.05, look: 0.15, breath: 0.5 - 0.5 * Math.cos(time * 1.7), sway: (time * 0.21) % 1 }, legs: (time * 0.9) % 1, ...set }
}

/** Sets a plant of the page down where a visitor is offered one, and gives the middle of its flower there. */
function offered(live: Live, layout: Layout, one: Stood | undefined): Point {
  if (one) live.plants.set(one.plant.id, { grow: 1, bend: 0, squash: 1, at: { x: layout.offer.x, y: layout.offer.y, k: layout.k }, held: false })
  return { x: layout.offer.x, y: layout.offer.y - (one ? one.soil - one.flower.y : 0) }
}

/** Drops of water falling from a point to a line below it, spread a little. */
function rain(from: Point, to: number, count: number, spread: number, seed: number): Mote[] {
  const out: Mote[] = []
  for (let i = 0; i < count; i++) out.push({ x: from.x + (hash(seed, i) - 0.5) * spread, y: from.y + (to - from.y) * ((i + hash(seed + 1, i)) / count), r: 2 + 1.1 * hash(seed + 2, i), alpha: 1, wet: true })
  return out
}

const ringOf = (layout: Layout, at: Point) => ({ x: at.x, y: at.y, r: Math.max(HANDLE / 2 + 6, (PLANT.flower + 9) * layout.k) })

type PoseOf = (live: Live, view: PageView, layout: Layout, time: number) => void

const MAKERS: Record<string, PoseOf> = {
  /** A flower bent under a finger that has just left it, its dust in the air above it and along the finger's way. */
  dust(live, view, layout, time) {
    const [, from, over] = rowOf(view, layout, 'shelf'), k = layout.k
    if (!from || !over) return
    const finger = { x: over.x + 8 * k, y: from.flower.y + 34 * k }
    live.plants.set(from.plant.id, { grow: 1, bend: 0.1 + 0.03 * Math.sin(time * 7), squash: 0.97, at: null, held: false })
    live.motes.push(...cloud({ x: from.flower.x + 16 * k, y: from.flower.y - 20 * k }, 44, 26 * k, 3), ...trail({ x: from.flower.x + 18 * k, y: from.flower.y - 6 * k }, finger, 46, 9, 20 * k), ...cloud(finger, 16, 7 * k, 15))
  },
  /** A pod half swollen on one plant, and on another a pod that is full and holding its breath. */
  pod(live, view, layout, time) {
    const shelf = rowOf(view, layout, 'shelf'), half = shelf[0], full = shelf[3] ?? shelf[1]
    if (!half || !full) return
    live.pods.push({ on: half.plant.id, swell: 0.5, shake: 0 }, { on: full.plant.id, swell: 1.24 + 0.04 * Math.sin(time * 9), shake: 0.5 * Math.sin(time * 37) })
    live.plants.set(half.plant.id, { grow: 1, bend: 0.035, squash: 1, at: null, held: false })
  },
  /** A pod has just gone: a pop where it hung, six seeds on six arcs to the tray, two of them down in a puff of soil. */
  burst(live, view, layout, time) {
    const from = rowOf(view, layout, 'shelf')[1], tray = rowOf(view, layout, 'tray'), k = layout.k
    if (!from) return
    live.puffs.push({ x: from.pod.x, y: from.pod.y, r: 20 * k, age: 0.3, kind: 'pop' })
    tray.forEach((young, i) => {
      const u = [1, 1, 0.8, 0.62, 0.45, 0.3][i] ?? 0.5, soil = { x: young.x, y: young.soil - 2 * k }
      live.plants.set(young.plant.id, { grow: i === 0 ? 0.07 : 0, bend: 0, squash: 1, at: null, held: false })
      if (u >= 1) live.puffs.push({ x: soil.x, y: soil.y, r: 12 * k, age: i === 0 ? 0.7 : 0.25, kind: 'soil' })
      else {
        const at = arc(from.pod, soil, (70 + 12 * i) * k, u)
        live.seeds.push({ x: at.x, y: at.y, turn: time * 0.4 + i * 1.3 + u * 5, k })
      }
    })
  },
  /** The six of the tray drawing themselves, each further on than the last: from a line just out of the soil to a flower that pops. */
  grow(live, view, layout) {
    rowOf(view, layout, 'tray').forEach((young, i) => live.plants.set(young.plant.id, { grow: [0.08, 0.3, 0.52, 0.74, 0.89, 0.955][i] ?? 1, bend: 0, squash: 1, at: null, held: false }))
  },
  /** Three of the tray in mid-hop to the border, smaller the nearer they are, and one plant in the hand above the page. */
  hop(live, view, layout) {
    const tray = rowOf(view, layout, 'tray'), k = layout.k
    const free = [...Array(BORDER_PLACES).keys()].filter((slot) => !view.plants.some((plant) => plant.row === 'border' && plant.slot === slot))
    tray.slice(0, 3).forEach((plant, i) => {
      const to = layout.border[free[i + 2] ?? i], u = [0.2, 0.5, 0.82][i], at = arc({ x: plant.x, y: plant.soil }, { x: to.x, y: to.ground }, 74 * k, u)
      live.plants.set(plant.plant.id, { grow: 1, bend: [-0.06, 0.03, 0.08][i], squash: [1.1, 1.02, 0.93][i], at: { ...at, k: k + (layout.small - k) * u }, held: false })
    })
    const held = tray[4]
    if (held) live.plants.set(held.plant.id, { grow: 1, bend: -0.07, squash: 1.03, at: { x: held.x + 46 * k, y: held.soil - 62 * k, k: k * 1.06 }, held: true })
  },
  /** The beetle on its back, all six legs going. */
  'beetle-flip'(live, _view, _layout, time) {
    live.beetle = { ...live.beetle, pose: { lean: 0.05 * Math.sin(time * 9), look: 0.5, breath: 0.4, sway: (time * 1.7) % 1 }, flip: 1, pedal: (time * 2.6) % 1 }
  },
  /** The beetle gold with dust, reared back in the middle of a sneeze, the cloud of the last one before it and its gold footprints behind. */
  'beetle-gold'(live, _view, layout, time) {
    const box = layout.beetle, s = Math.min(1.35 * layout.k, box.w / 205, box.h / 100), x = box.x + box.w * 0.52, y = box.y + box.h * 0.9
    live.beetle = { ...live.beetle, at: { x, y }, pose: { lean: 0.12, look: 0.3, breath: 1, sway: (time * 0.9) % 1 }, gold: 1, sneeze: 0.8, pedal: 0.2, loupe: 0.5 }
    for (let i = 0; i < 9; i++) live.prints.push({ x: x + (62 + i * 11) * s, y: y + (2 + (i % 2) * 5 - i * 0.4) * s, r: 1.5 * s, alpha: 1 - i * 0.1 })
    live.puffs.push({ x: x - 70 * s, y: y - 50 * s, r: 22 * layout.k, age: 0.45, kind: 'sneeze' })
    live.motes.push(...cloud({ x: x - 70 * s, y: y - 46 * s }, 22, 24 * s, 31, 0.9))
  },
  /** The worm up out of the bare pot in a puff of soil, wearing a cap of gold dust. */
  worm(live, view, layout, time) {
    const pot = view.worm ?? 5, place = [...layout.shelf, ...layout.tray][pot]
    if (!place) return
    live.worm = { pot, rise: 0.92, look: -0.7 + 0.1 * Math.sin(time * 2), cap: true }
    live.puffs.push({ x: place.x, y: place.soil - 2 * layout.k, r: 16 * layout.k, age: 0.3, kind: 'soil' })
  },
  /** What can be touched, shown: a pencil ring on every flower of the shelf and the tray. */
  glow(live, view, layout) {
    live.glow = { strength: 1, rings: [...rowOf(view, layout, 'shelf'), ...rowOf(view, layout, 'tray')].map((one) => ringOf(layout, one.flower)) }
  },
  /** The ghost hand half way from one flower to another, the first one's dust behind its finger, with the rings on. */
  hand(live, view, layout, time) {
    const shelf = rowOf(view, layout, 'shelf'), from = shelf[1], to = shelf[3] ?? shelf[0], k = layout.k
    MAKERS.glow(live, view, layout, time)
    if (!from || !to) return
    const u = 0.5 + 0.03 * Math.sin(time * 1.5), at = arc(from.flower, to.flower, 40 * k, u)
    live.hand = { x: at.x, y: at.y, press: 0, opacity: 0.92 }
    live.motes.push(...trail(from.flower, at, 40, 41, 40 * k * u), ...cloud({ x: at.x, y: at.y - 2 * k }, 12, 6 * k, 43))
  },
  /** A bare pot lifted in the hand, and a pot that has just come down squashing as it lands, its plant with it. */
  'carry-pot'(live, view, layout) {
    const pots = [...layout.shelf, ...layout.tray], bare = view.worm ?? 5, place = pots[bare], k = layout.k, landing = rowOf(view, layout, 'shelf')[2]
    if (place) live.pots.set(bare, { at: { x: place.x - 58 * k, y: place.soil - 66 * k }, squash: 1.04 })
    if (!landing) return
    const squash = 0.8, sunk = PLANT.potH * k * (1 - squash)
    live.pots.set(landing.pot, { at: null, squash })
    live.plants.set(landing.plant.id, { grow: 1, bend: 0.04, squash: 0.9, at: { x: landing.x, y: landing.soil + sunk, k }, held: false })
    live.puffs.push({ x: landing.x, y: landing.soil + sunk - 2 * k, r: 16 * k, age: 0.35, kind: 'soil' })
  },
  /** A packet shaken by a touch, and the seed that has hopped out of it in mid-air. */
  packet(live, view, layout, time) {
    const at = Math.min(1, view.packets.length - 1), id = view.packets[at], box = layout.packets[at]
    if (!id || !box) return
    live.packets.set(id, { shake: 5 * Math.sin(time * 40) + 4, spin: 0.13 })
    live.seeds.push({ x: box.x + box.w * 1.1, y: box.y - box.h * 0.1, turn: 0.7 + time * 0.3, k: 1.25 * layout.k })
  },
  /** The snail half way in from where it waited, its foot rippling. */
  'visitor-in'(live, _view, layout, time) {
    const home = visitorSpot(layout, 'snail'), edge = waitingSpot(layout, 'snail')
    live.visitor = visitorAt(layout, 'snail', time, { x: (home.x + edge.x) / 2, y: (home.y + edge.y) / 2, legs: (time * 0.5) % 1, pose: { lean: -0.03, look: 0.1, breath: 0.3, sway: (time * 0.21) % 1 } })
  },
  /** A short plant set down before the snail, which leans to it with both stalks swung to the flower. */
  like(live, view, layout, time) {
    const tray = rowOf(view, layout, 'tray')
    offered(live, layout, tray.find((one) => one.soil - one.flower.y < stemHeight(4, layout.k)) ?? tray[0])
    live.visitor = visitorAt(layout, 'snail', time, { pose: { lean: -0.16, look: -0.95 + 0.05 * Math.sin(time * 3), breath: 0.8, sway: (time * 0.21) % 1 } })
  },
  /** The snail up the stem of a tall plant it was offered, stretching for the flower. */
  'miss-snail-up'(live, view, layout, time) {
    const flower = offered(live, layout, rowOf(view, layout, 'shelf')[0])
    live.visitor = visitorAt(layout, 'snail', time, { x: layout.offer.x, y: layout.offer.y - (layout.offer.y - flower.y) * 0.34, turn: 1.42, legs: (time * 0.5) % 1, pose: { lean: -0.06, look: -0.5, breath: 0.6, sway: (time * 0.4) % 1 } })
  },
  /** The same snail a moment later: over backwards and on its shell, turning slowly, its far stalk half pulled in. */
  'miss-snail-back'(live, view, layout, time) {
    const spot = visitorSpot(layout, 'snail')
    offered(live, layout, rowOf(view, layout, 'shelf')[0])
    live.visitor = visitorAt(layout, 'snail', time, { x: spot.x - 26 * spot.s, turn: 2.6 + 0.05 * Math.sin(time * 1.1), part2: 0.55, legs: (time * 0.5) % 1, pose: { lean: 0, look: 0.7, breath: 0.4, sway: (time * 0.5) % 1 } })
  },
  /** The bee nose down over the flower of a plant it was offered, its rump swung, while the moth that waits flutters at the edge. */
  'bee-land'(live, view, layout, time) {
    const flower = offered(live, layout, rowOf(view, layout, 'shelf')[2] ?? rowOf(view, layout, 'shelf')[0]), s = visitorSpot(layout, 'bee').s, edge = waitingSpot(layout, 'moth')
    live.visitor = visitorAt(layout, 'bee', time, { x: flower.x + 30 * s, y: flower.y - 2 * s, lift: 6 * s, part: 0.85, part2: 1, legs: (time * 9) % 1 })
    live.waiting = { ...restingVisitor('moth'), x: edge.x, y: edge.y, lift: (8 + 3 * Math.sin(time * 5)) * edge.s, legs: (time * 3 + 0.2) % 1, pose: { lean: 0.04, look: 0.2, breath: 0.5, sway: (time * 0.6) % 1 } }
  },
  /** A fuller wish, rolled under the snail's arm. */
  'wish-roll'() {},
  /** The fuller wish open in place of the first, swinging a little on its tape. */
  'wish-open'(live, _view, _layout, time) { live.wish = { big: 1, shake: 0.5 * Math.sin(time * 5) } },
  /** A wish for three alike, with its numeral. */
  'wish-three'() {},
  /** Two of the three plants it asked for stand beside the snail. */
  given() {},
  /** The snail has all it asked for and sits with its plants. */
  settled() {},
  /** The can and the blotter lying in their places. */
  tools() {},
  /** The can in the hand, tipped over a pot: water from its rose, drops falling and a splash at the soil. */
  pour(live, _view, layout) {
    const pot = layout.tray[3], u = toolScale(layout), to = { x: pot.x + 14 * u, y: pot.soil }
    live.can = { x: pot.x - 58 * u, y: pot.soil - 92 * u, tip: 0.85 }
    const rose = roseOf(live.can, u)
    live.motes.push(...rain({ x: (rose.x + to.x) / 2 + 6 * u, y: rose.y + 26 * u }, to.y - 6 * u, 9, 20 * u, 71))
    live.puffs.push({ x: to.x, y: to.y - 2 * u, r: 13 * layout.k, age: 0.35, kind: 'splash' })
  },
  /** The blotter in the hand, rocked on the soil of a pot. */
  blot(live, _view, layout, time) {
    const place = layout.shelf[5], u = toolScale(layout)
    live.blotter = { x: place.x, y: place.soil - 15 * u, tip: 0.16 * Math.sin(time * 4) + 0.1 }
  },
  /** The loupe in the hand over a plant of the tray that carries what it does not show, and its note beside the flower. */
  beads(live, view, layout) {
    const tray = rowOf(view, layout, 'tray'), hides = (one: Stood) => beadsOf(one.plant.pairs).filter((pair) => pair.hidden).length
    const one = tray.slice().sort((a, b) => hides(b) - hides(a))[0]
    if (!one) return
    live.loupe = { x: one.flower.x - 4 * layout.k, y: one.flower.y + 3 * layout.k }
    live.beads = { x: one.flower.x, y: one.flower.y, k: layout.k, pairs: beadsOf(one.plant.pairs) }
  },
  /** The runner buds: one swung out like a spring, one curled shut. */
  buds(live, view, layout, time) {
    const [swung, , curled] = rowOf(view, layout, 'shelf')
    if (swung) live.buds.set(swung.plant.id, { boing: 0.9 + 0.1 * Math.sin(time * 20), curl: 0 })
    if (curled) live.buds.set(curled.plant.id, { boing: 0, curl: 1 })
  },
  /** Five pencil sketches in the top margin, the last one half drawn. */
  sketches(live) { live.sketching = 0.5 },
  /** The beetle under its own wing cases, drops drumming on them. */
  'beetle-umbrella'(live, _view, layout, time) {
    const home = beetleHome(layout)
    live.beetle = { ...live.beetle, pose: { lean: 0.03, look: 0.5, breath: 0.6, sway: (time * 0.5) % 1 }, cases: 1 }
    live.motes.push(...rain({ x: home.x + 8 * home.s, y: home.y - 190 * home.s }, home.y - 88 * home.s, 8, 96 * home.s, 73))
    live.puffs.push({ x: home.x + 30 * home.s, y: home.y - 80 * home.s, r: 7 * layout.k, age: 0.4, kind: 'splash' })
  },
  /** The beetle dug into the soil of the bare pot of the shelf, its back and feelers showing. */
  'beetle-dig'(live, _view, layout, time) {
    const place = layout.shelf[5]
    live.beetle = { ...live.beetle, at: { x: place.x, y: place.soil }, pose: { lean: 0, look: 0.3, breath: 0.5, sway: (time * 0.8) % 1 }, sink: 0.8 }
    live.puffs.push({ x: place.x, y: place.soil - 2 * layout.k, r: 15 * layout.k, age: 0.5, kind: 'soil' })
  },
  /** The beetle on its way off the page, turned about, with three plants of the border on its back. */
  'beetle-lug'(live, view, layout, time) {
    const home = beetleHome(layout), at = { x: home.x + 40 * home.s, y: home.y }
    live.beetle = { ...live.beetle, at, pose: { lean: 0.16, look: 0.35, breath: 0.6, sway: (time * 0.4) % 1 }, pedal: (time * 1.7) % 1, turned: true }
    view.plants.filter((plant) => plant.row === 'border').slice(0, 3).forEach((plant, place) => {
      live.plants.set(plant.id, { grow: 1, bend: 0, squash: 1, at: { x: at.x - (14 + (place - 1) * 15) * home.s, y: at.y - 55 * home.s, k: layout.small * 0.9 }, held: false })
    })
  },
  /** The beetle towed on its tail by a runner, a back leg hooked in it, from a bud of the shelf towards a pot of the tray. */
  'beetle-towed'(live, _view, layout, time) {
    const k = layout.k, home = beetleHome(layout), from = layout.shelf[1], to = layout.tray[4]
    const at = { x: (from.x + to.x) / 2 + 62 * k, y: (from.soil + to.soil) / 2 + 48 * k }
    live.beetle = { ...live.beetle, at, pose: { lean: 0.32, look: 0.5, breath: 0.4, sway: (time * 0.4) % 1 }, flip: 0.28, pedal: (time * 3) % 1 }
    live.tow = { from: { x: from.x + 53 * k, y: from.soil + 22 * k }, to: { x: at.x + 34 * home.s, y: at.y - 14 * home.s } }
  },
  /** A plant set in the beetle's corner, fenced in with tape, and the beetle leaning to it. */
  fence(live, view, layout, time) {
    const one = rowOf(view, layout, 'tray').find((it) => it.soil - it.flower.y < stemHeight(4, layout.k)), box = layout.beetle, at = { x: box.x + box.w * 0.1, y: box.y + box.h * 0.84 }
    if (one) live.plants.set(one.plant.id, { grow: 1, bend: 0, squash: 1, at: { ...at, k: layout.k * 0.8 }, held: false })
    live.fence = { ...at, up: 1 }
    live.beetle = { ...live.beetle, pose: { lean: -0.16, look: 0.1 + 0.05 * Math.sin(time * 2), breath: 0.7, sway: (time * 0.3) % 1 } }
  },
}
/** Each of the other four as the visitor on the page: its funniest part all the way, its second part past half. */
for (const kind of ['bee', 'moth', 'ladybird', 'ant'] as const) {
  MAKERS[kind] = (live, _view, layout, time) => { live.visitor = visitorAt(layout, kind, time, { part: 1, part2: 0.6, lift: kind === 'bee' ? 34 * layout.k : 0, legs: (time * (kind === 'bee' ? 9 : 1.3)) % 1 }) }
}

const SNAIL_BIG = LIKES.snail, KEPT_LOOK = { ...LIKES.snail }
/** What a moment needs of the page that the spike page does not hold. */
const VIEWS: Record<string, (view: PageView) => Partial<PageView>> = {
  'bee-land': () => ({ visitor: { kind: 'bee', wish: { colour: 'white', petals: 'spotted' }, count: 1 }, waiting: { kind: 'moth', wish: { colour: 'white' }, count: 1 } }),
  'wish-roll': (view) => ({ visitor: view.visitor && { ...view.visitor, big: SNAIL_BIG } }),
  'wish-open': (view) => ({ visitor: view.visitor && { ...view.visitor, big: SNAIL_BIG } }),
  'wish-three': (view) => ({ visitor: view.visitor && { ...view.visitor, count: 3 } }),
  given: (view) => ({ visitor: view.visitor && { ...view.visitor, count: 3, given: [KEPT_LOOK, KEPT_LOOK] } }),
  settled: (view) => ({ visitor: view.visitor && { ...view.visitor, count: 3, given: [KEPT_LOOK, KEPT_LOOK, KEPT_LOOK], settled: true } }),
  tools: () => ({ tools: true }),
  pour: () => ({ tools: true }),
  blot: (view) => ({ tools: true, worm: null, dry: view.dry.map((dry, pot) => dry || pot === 5) }),
  sketches: () => ({ sketched: [5, 30, 13, 22, 8].map(lookFromCode) }),
  'beetle-dig': () => ({ worm: null }),
}
for (const kind of ['bee', 'moth', 'ladybird', 'ant'] as const) VIEWS[kind] = () => ({ visitor: { kind, wish: LIKES[kind], count: 1 }, waiting: { kind: 'snail', wish: { colour: 'red' }, count: 1 } })

export const POSES: readonly string[] = Object.keys(MAKERS)

/** The page a named moment is shown on: the view given, with the visitor, the tools or the sketches that moment needs. Any other name gives the view back. */
export function poseView(name: string | null, view: PageView): PageView {
  return name !== null && Object.hasOwn(VIEWS, name) ? { ...view, ...VIEWS[name](view) } : view
}

/** The page in motion at the named moment, or none for a name it does not know. */
export function poseLive(name: string | null, view: PageView, layout: Layout, time: number): Live | null {
  if (name === null || !Object.hasOwn(MAKERS, name)) return null
  const live = stillLive()
  MAKERS[name](live, view, layout, Number.isFinite(time) ? time : 0)
  return live
}
