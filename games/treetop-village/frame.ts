import { handPose, type Guidance, type HandPose } from './guidance'
import { STILL, gaitPose, idlePose, makeOn, type On, type PiecePose } from './motion'
import { playAt } from './scripts'
import { BOW, LINE_UP, PUSH, RIPPLES, TURNS, seatOf } from './shape'
import { STAGE } from './stage'
import { BODY, FOLK, HILL_Y, HOME, LEAF_CARDS, PLACES, PLACE_COUNT, TRUNK_X, basketSlot, mid, toPlace, type Folk, type Pt } from './tree'
import { FLUTTER_SECONDS, JUMP_SECONDS, TAP_SECONDS, UNFOLD_SECONDS, bucketAt, cupAt, glowOn, hint, standOf, tabAt, type Stand, type Village, type Walker } from './village'
import { KINDS, OWN_FIT, type Kind } from './ways'

// One frame of the game as a flat list of things to draw, composed from the
// rules with no canvas in sight. render.ts stamps the list, and the length of
// the list is the frame's draw count: one entry is one sprite stamped or one
// live stroke. Where a walker is and what its card and its piece are doing
// come from the one timeline the rules step (`standOf`), so the picture and
// the sound cannot part.

/** An affine transform in stage units: x' = a x + c y + e, y' = b x + d y + f. */
export type Mat = [number, number, number, number, number, number]

/** A pair of pegs' one peg. `night` is whether it stands under the evening sheet. */
export type Peg = { x: number; y: number; lean: number; night: boolean }

export type Item =
  /** A card. `floor` cuts off what lies below that height of the stage; `rows` stamps only that band of an unturned card. */
  | { t: 'sprite'; id: string; m: Mat; alpha: number; floor?: number; rows?: readonly [number, number] }
  /** A walker's pupils, drawn live so that every walker looks at what is happening. `shut` is each eye's lid. */
  | { t: 'eyes'; m: Mat; at: readonly Pt[]; r: number; look: Pt; shut: readonly [boolean, boolean]; alpha: number; floor?: number }
  /** Every pair of pegs in one stroke. `lean` opens a pair outwards or jogs it. */
  | { t: 'pegs'; pegs: Peg[] }
  /** The idle ladder's warm light: `ry` flattens it over the long basket. */
  | { t: 'glow'; x: number; y: number; r: number; ry: number; alpha: number }

/** A card under the evening sheet is the same card with this on its name. */
export const NIGHT = '@n'

/** What one entry costs: a sprite stamped, or the fills of a live stroke. The pegs are four fills: their shadows, the pegs by day, the pegs under the sheet, their pins. */
export function drawCount(list: readonly Item[]): number {
  let count = 0
  for (const item of list) count += item.t === 'pegs' ? 4 : 1
  return count
}

const at = (x: number, y: number, rot = 0, sx = 1, sy = sx): Mat => {
  const c = Math.cos(rot), s = Math.sin(rot)
  return [c * sx, s * sx, -s * sy, c * sy, x, y]
}
const mul = (p: Mat, q: Mat): Mat => [
  p[0] * q[0] + p[2] * q[1], p[1] * q[0] + p[3] * q[1],
  p[0] * q[2] + p[2] * q[3], p[1] * q[2] + p[3] * q[3],
  p[0] * q[4] + p[2] * q[5] + p[4], p[1] * q[4] + p[3] * q[5] + p[5],
]
/** A turn about a point of the stage. */
const about = (c: Pt, rot: number): Mat => mul(at(c.x, c.y, rot), at(-c.x, -c.y))

const sprite = (list: Item[], id: string, m: Mat, alpha = 1, floor?: number): void => {
  if (alpha <= 0) return
  list.push(floor === undefined ? { t: 'sprite', id, m, alpha } : { t: 'sprite', id, m, alpha, floor })
}

/** How a piece opens out when it snaps on: up from flat, past its size and back, like a pop-up. */
export function unfold(seconds: number): number {
  if (seconds >= UNFOLD_SECONDS * 2.4) return 1
  const u = seconds / UNFOLD_SECONDS
  return 1 - Math.exp(-4.5 * u) * Math.cos(9 * u)
}

/** The height on the stage of the evening sheet's upper edge: everything below it is under the sheet. */
export const sheetEdge = (v: Village): number => STAGE.height * (1 - v.dusk)
const under = (v: Village, y: number): boolean => v.dusk > 0 && y >= sheetEdge(v)

/** Whether a point is in the light of a string of lanterns that burns. */
function inLight(v: Village, here: Pt): boolean {
  for (let index = 0; index < PLACE_COUNT; index++) if (v.lit[index] > 0.5 && toPlace({ x: here.x, y: here.y - 40 }, PLACES[index]) < 120) return true
  return false
}

/** Where the parts of each walker's card are pinned, from its feet, facing right. The eyes are the far one and the near one. */
const PARTS: Record<Folk, { part: Pt; eyes: readonly Pt[]; r: number; turn: number }> = {
  squirrel: { part: { x: -20, y: -24 }, eyes: [{ x: 6, y: -78 }, { x: 25, y: -78 }], r: 7, turn: 0.5 },
  owl: { part: { x: 0, y: -60 }, eyes: [{ x: -15, y: -8 }, { x: 15, y: -8 }], r: 11, turn: Math.PI / 2 },
  mice: { part: { x: 0, y: 0 }, eyes: [{ x: 0, y: -41 }, { x: 12, y: -41 }], r: 4.6, turn: 0.12 },
  beetle: { part: { x: 5, y: -79 }, eyes: [{ x: -4, y: -66 }, { x: 14, y: -66 }], r: 6, turn: -0.5 },
}

/** Where the squirrel's letter is: held out in his paw, and at his feet when he has dropped it. */
const LETTER = { held: { x: 52, y: -57 }, dropped: { x: 46, y: -9 } }

const ons: On[] = FOLK.map(() => makeOn())
const stands: Stand[] = FOLK.map(() => ({ x: 0, y: 0, floor: null, lean: 0 }))
const empty = makeOn()
const hand: HandPose = { travel: 0, press: 0, opacity: 0 }
const HANGING: readonly Kind[] = ['bridge', 'swing', 'lanterns', 'bucket']

/** The nearest place that holds one of these kinds, as the point at its middle. */
function nearestOf(v: Village, here: Pt, kinds: readonly Kind[]): Pt | null {
  let best: Pt | null = null, nearest = Infinity
  for (let index = 0; index < PLACE_COUNT; index++) {
    const kind = v.places[index]
    if (!kind || !kinds.includes(kind) || v.held?.from === index) continue
    const where = kind === 'bucket' ? cupAt(v, index) : mid(PLACES[index])
    const far = Math.hypot(where.x - here.x, where.y - here.y)
    if (far < nearest) { best = where; nearest = far }
  }
  return best
}

/**
 * What a walker looks at. A piece in the child's hand takes every eye; a
 * walker with somewhere to go looks there; and otherwise each looks at what
 * it wants: the squirrel from his letter to the tree, the owl at the nearest
 * bucket or else the basket, the twins up at whatever hangs nearest, the
 * beetle up at the next landing above him.
 */
export function lookAt(v: Village, walker: Walker, here: Pt): Pt {
  if (v.held) return v.held.at
  if (walker.show?.what === 'ask') return { x: here.x + walker.askToward * 300, y: here.y - 120 }
  // A walker that has to stay looks at the piece that stopped it; one with somewhere to go looks there, a place or its own door.
  if (walker.blocked >= 0) return mid(PLACES[walker.blocked])
  if (typeof walker.errand === 'number') return mid(PLACES[walker.errand])
  if (walker.errand === 'home') return { x: HOME[walker.folk].door.x, y: HOME[walker.folk].door.y - 40 }
  switch (walker.folk) {
    case 'squirrel': return (v.time + 0.4) % 3.4 < 1.6 ? { x: here.x + walker.face * 60, y: here.y - 50 } : { x: TRUNK_X, y: 240 }
    case 'owl': return nearestOf(v, here, ['bucket']) ?? { x: TRUNK_X, y: 778 }
    case 'mice': return nearestOf(v, here, HANGING) ?? { x: here.x + walker.face * 40, y: here.y - 300 }
    case 'beetle': return { x: here.x + walker.face * 50, y: here.y - 220 }
  }
}

function walkerItems(v: Village, walker: Walker, index: number, list: Item[]): void {
  if (walker.door >= 1) return
  const folk = walker.folk, on = ons[index], stand = stands[index], p = on.pose, face = walker.face
  const plain = !walker.on && walker.riding < 0 && !walker.seated && !walker.show
  if (plain) { if (walker.walk) gaitPose(folk, walker.strides, p); else idlePose(folk, v.time + index * 0.7, p) }
  const body = BODY[folk], half = body.h / 2
  const night = under(v, stand.y) && !inLight(v, stand) ? NIGHT : ''
  const alpha = 1 - walker.door
  const floor = stand.floor ?? undefined
  // The card turns and tumbles about its middle, squashes on its fold at the feet, closes as it turns on a rope, and folds flat in the shake.
  // A tap in the middle of a flourish gets a small jump on top of whatever is playing.
  const jump = walker.jump > 0 ? Math.sin((1 - walker.jump / JUMP_SECONDS) * Math.PI) : 0
  let m = at(stand.x + p.dx * face, stand.y + p.dy - half - 16 * jump)
  m = mul(m, at(0, 0, (p.tilt + p.spin) * face + stand.lean))
  m = mul(m, at(0, half, 0, (face * p.puff * Math.cos(p.yaw) * (1 - 0.5 * walker.door)) / Math.sqrt(p.squash), p.puff * p.squash * (1 - 0.94 * walker.flat)))
  const parts = PARTS[folk]
  const pin = mul(m, at(parts.part.x, parts.part.y, p.part * parts.turn))
  const target = lookAt(v, walker, stand)
  const dx = (target.x - stand.x) * face, dy = target.y - (stand.y - body.h * 0.7)
  const far = Math.hypot(dx, dy) || 1
  const look = { x: dx / far, y: dy / far }
  // Everyone blinks now and then, but the owl in her bucket does not.
  const blink = (v.time * 0.31 + index * 0.23) % 1 < 0.035 && !(folk === 'owl' && (walker.seated || walker.riding >= 0))
  const shut: [boolean, boolean] = [blink || p.lid >= 0.75 || p.lid <= -0.25, blink || p.lid >= 0.25]
  const eyes = (em: Mat): void => { list.push(floor === undefined ? { t: 'eyes', m: em, at: parts.eyes, r: parts.r, look, shut, alpha } : { t: 'eyes', m: em, at: parts.eyes, r: parts.r, look, shut, alpha, floor }) }
  if (folk === 'squirrel') {
    sprite(list, `squirrel-tail${night}`, pin, alpha, floor)
    sprite(list, `squirrel${night}`, m, alpha, floor)
    eyes(m)
    const drop = Math.max(0, Math.min(1, p.prop))
    sprite(list, `letter${night}`, mul(m, at(LETTER.held.x + (LETTER.dropped.x - LETTER.held.x) * drop, LETTER.held.y + (LETTER.dropped.y - LETTER.held.y) * drop, drop * 1.3)), alpha, floor)
  } else if (folk === 'owl') {
    sprite(list, `owl${night}`, m, alpha, floor)
    sprite(list, `owl-head${night}`, pin, alpha, floor)
    eyes(pin)
  } else if (folk === 'mice') {
    // Two small cards. The one behind tugs and the one in front bobs, a beat apart; a script moves them apart, lifts one and tips the other.
    const gap = 20 + p.pair / 2
    const behind = mul(m, at(-gap, p.stack, p.part * parts.turn - p.flip * 0.5)), ahead = mul(m, at(gap, 0, -p.part * parts.turn + p.flip))
    const points = p.prop > 0.5 ? '-point' : ''
    sprite(list, `mouse-b${points}${night}`, behind, alpha, floor)
    eyes(behind)
    sprite(list, `mouse-a${points}${night}`, ahead, alpha, floor)
    eyes(ahead)
  } else {
    sprite(list, `beetle${p.prop > 0.5 ? '-open' : ''}${night}`, m, alpha, floor)
    eyes(m)
    sprite(list, `beetle-hat${night}`, mul(pin, at(0, -Math.max(0, p.part) * 16)), alpha, floor)
  }
}

const pieceId = (kind: Kind, place: number): string => `piece:${kind}:${place}`
/** The printing of a piece that is shown now: a bucket's wheels turn as its cup runs, and a tapped rope bridge carries a bump from one end to the other. */
function printing(v: Village, kind: Kind, place: number): string {
  if (kind === 'bucket') { const turn = Math.floor(v.run[place] * TURNS * 3) % TURNS; return turn > 0 ? `:t${turn}` : '' }
  if (kind === 'bridge' && v.tap[place] < TAP_SECONDS) return `:r${Math.min(RIPPLES - 1, Math.floor((v.tap[place] / TAP_SECONDS) * RIPPLES))}`
  return ''
}
/** A piece in the hand is larger than in the basket, so it shows around the finger that carries it. */
const HELD_SIZE = 1.25

export const iconId = (kind: Kind): string => `icon:${kind}`

const pieceNow: PiecePose = { ...STILL }
const cupSwing: number[] = Array.from({ length: PLACE_COUNT }, () => 0), cupSag: number[] = Array.from({ length: PLACE_COUNT }, () => 0)

/**
 * What a piece is doing: what the walker on it does to it, what a tap set
 * going, and the shake of a finger that pulls at it while someone is on it.
 * `glow` is how brightly a tapped string of lanterns glows.
 */
export function piecePose(v: Village, place: number, kind: Kind, out: PiecePose): number {
  Object.assign(out, STILL)
  const add = (pose: PiecePose): void => { out.sway += pose.sway; out.bounce += pose.bounce; out.rattle += pose.rattle; out.swing += pose.swing; out.sag += pose.sag }
  let ridden = false
  v.walkers.forEach((walker, index) => {
    if (walker.on?.place !== place && walker.riding !== place && !(walker.seated && walker.waiting === place)) return
    add(ons[index].piece)
    ridden = ridden || walker.riding === place
  })
  // A bucket that runs with nobody in it swings by itself.
  const ride = v.rides[place]
  if (ride && !ridden) add(playAt(ride, v.rideT[place], empty).piece)
  let glow = 0
  const t = v.tap[place]
  if (t < TAP_SECONDS) {
    const d = (1 - t / TAP_SECONDS) ** 2
    switch (kind) {
      case 'plank': out.bounce += 0.9 * d * Math.sin(t * 34); break
      case 'ladder': out.rattle += 0.05 * d * Math.sin(t * 52); break
      case 'bridge': out.sway += 0.5 * d * Math.sin(t * 14); out.bounce += 0.5 * d * Math.sin(t * 21); break
      case 'bucket': out.swing += 0.16 * d * Math.sin(t * 12); break
      case 'swing': out.swing += 0.6 * d * Math.sin(t * 8); break
      case 'lanterns': out.sway += 0.22 * d * Math.sin(t * 12); glow = Math.sqrt(d); break
      case 'slide': out.rattle += 0.02 * d * Math.sin(t * 60); break
    }
  }
  out.rattle += Math.sin(v.wiggle[place] * 46) * v.wiggle[place] * 0.09
  out.swing += Math.sin(v.wiggle[place] * 46) * v.wiggle[place] * 0.2
  return glow
}

/** The transform of a piece's card: opened out as it snapped on, and given by what is on it. */
function pieceMat(place: number, kind: Kind, pose: PiecePose, size: number): Mat {
  const { pa, pb, fit } = PLACES[place]
  const centre = mid(PLACES[place])
  let m = mul(at(centre.x, centre.y, pose.rattle, 1 + (size - 1) * 0.35, size), at(-centre.x, -centre.y))
  if (fit === 'span') {
    // Swung sideways about the line between its pegs; what sags sags deeper under a weight, and what is flat is pushed down whole.
    const sags = kind === 'bridge' || kind === 'lanterns' || kind === 'slide'
    const deep = sags ? 1 + BOW * pose.bounce : 1, push = sags ? 0 : PUSH * pose.bounce
    if (pose.sway !== 0 || pose.bounce !== 0) m = mul([1, 0, pose.sway * 0.6, deep, -pose.sway * 0.6 * pa.y, pa.y * (1 - deep) + push], m)
  } else if (pose.sway !== 0 || pose.bounce !== 0) {
    // On a rise it hangs from its upper peg and swings about it, and gives sideways.
    m = mul(mul(at(pose.bounce * 4, 0), about(pb, pose.sway * 0.12)), m)
  }
  return m
}

/** Composes the frame. `guidance` is what the idle ladder shows, or null. */
export function compose(v: Village, guidance: Guidance | null, list: Item[] = []): Item[] {
  list.length = 0
  const edge = sheetEdge(v)
  const dark = (y: number): string => (under(v, y) ? NIGHT : '')
  // The page: by day, under the evening sheet, or the part above the sheet's edge and the part below it. Together they are one page.
  if (v.dusk <= 0) sprite(list, 'backdrop', at(0, 0))
  else if (v.dusk >= 1) sprite(list, `backdrop${NIGHT}`, at(0, 0))
  else {
    list.push({ t: 'sprite', id: 'backdrop', m: at(0, 0), alpha: 1, rows: [0, edge] })
    list.push({ t: 'sprite', id: `backdrop${NIGHT}`, m: at(0, 0), alpha: 1, rows: [edge, STAGE.height] })
  }
  // The sun or the moon on its tab: what is below the hill's top is behind the hill.
  const tab = tabAt(v)
  sprite(list, v.moon ? 'moon' : 'sun', at(tab.x, tab.y - 26 * Math.sin(v.tabBob * Math.PI) * v.tabBob, 0.25 * Math.sin(v.tabBob * 9) * v.tabBob), 1, HILL_Y)
  sprite(list, `cloud-a${dark(66)}`, at(1066 + 40 * Math.sin(v.time * 0.05), 66))
  sprite(list, `cloud-b${dark(366)}`, at(1128 + 18 * Math.sin(v.time * 0.04 + 2), 366))
  // The crown: each card sways at its own pace, shakes about its own pin, leans with a pull on the trunk and rocks in the shake.
  const rock = Math.sin(v.time * 15) * v.rock
  const leaves = (index: number): void => {
    const card = LEAF_CARDS[index]
    const shake = Math.sin(v.time * 38 + index * 1.7) * 0.07 * v.shake
    const lean = v.lean + rock
    sprite(list, `leaves:${index}${dark(card.y)}`, at(card.x + lean * (26 + index * 3), card.y, card.sway * Math.sin(v.time * card.pace * Math.PI * 2 + index) + shake + lean * 0.13, card.size))
  }
  for (let index = 0; index < 4; index++) leaves(index)
  // A window is lit in the door of a walker that is in.
  for (const walker of v.walkers) if (walker.door > 0) sprite(list, `window:${walker.folk}`, at(0, 0), walker.door)

  // Where every walker is, and what its card and its piece are doing, from the timeline it is on.
  v.walkers.forEach((walker, index) => standOf(v, walker, ons[index], stands[index]))

  // The pegs of every place, and the pieces that are in the tree.
  const pegs: Peg[] = []
  for (let index = 0; index < PLACE_COUNT; index++) {
    const place = PLACES[index]
    const jog = v.knock.place === index ? Math.sin(v.knock.t * 60) * v.knock.t * 0.9 : 0
    const lean = (v.open === index ? 0.5 : 0) + jog
    pegs.push({ x: place.pa.x, y: place.pa.y, lean: -lean, night: under(v, place.pa.y) }, { x: place.pb.x, y: place.pb.y, lean, night: under(v, place.pb.y) })
  }
  list.push({ t: 'pegs', pegs })
  for (let index = 0; index < PLACE_COUNT; index++) {
    const kind = v.places[index]
    cupSwing[index] = 0
    cupSag[index] = 0
    if (!kind || v.held?.from === index) continue
    const centre = mid(PLACES[index])
    const glow = piecePose(v, index, kind, pieceNow)
    const m = pieceMat(index, kind, pieceNow, unfold(v.born[index]))
    const night = dark(centre.y)
    const lit = kind === 'lanterns' ? Math.max(v.lit[index], glow) : 0
    // A string that burns is its own card, with its light on it; while it is lighting or glowing from a tap, that card comes up over the plain one.
    if (lit >= 1) sprite(list, `${pieceId(kind, index)}:lit`, m)
    else {
      sprite(list, pieceId(kind, index) + printing(v, kind, index) + night, m)
      if (lit > 0) sprite(list, `${pieceId(kind, index)}:lit`, m, lit)
    }
    // The seat of a swing turns about the pin it hangs from, and sinks under a weight.
    if (kind === 'swing') sprite(list, `seat:${index}${night}`, mul(m, mul(at(0, pieceNow.sag), about(seatOf(index).pin, pieceNow.swing))))
    cupSwing[index] = pieceNow.swing
    cupSag[index] = pieceNow.sag
  }

  // A bucket's cup with nobody in it hangs behind the walkers. The cup someone is in is two cards: its ropes go up behind that walker and its tub is in front of that walker and nobody else.
  const cup = (index: number, part = ''): void => {
    const where = bucketAt(v, index)
    sprite(list, `cup${part}${dark(where.y)}`, at(where.x, where.y - LINE_UP + cupSag[index], cupSwing[index], Math.min(1, v.born[index] * 6)))
  }
  const inCup = v.walkers.map((walker) => (walker.riding >= 0 ? walker.riding : walker.seated ? walker.waiting : walker.on?.what === 'board' ? walker.on.place : -1))
  for (let index = 0; index < PLACE_COUNT; index++) if (v.places[index] === 'bucket' && v.held?.from !== index && !inCup.includes(index)) cup(index)
  // Walkers, the higher in the tree the further back.
  const order = v.walkers.map((_, index) => index).sort((a, b) => stands[a].y - stands[b].y)
  for (const index of order) {
    const own = inCup[index] >= 0 && v.places[inCup[index]] === 'bucket'
    if (own) cup(inCup[index], '-rope')
    walkerItems(v, v.walkers[index], index, list)
    if (own) cup(inCup[index], '-tub')
  }
  for (let index = 4; index < LEAF_CARDS.length; index++) leaves(index)
  sprite(list, `bird${dark(196)}`, at(1080 + 5 * Math.sin(v.time * 1.1), 196 + 7 * Math.sin(v.time * 2.2) + 10 * v.shake + 12 * Math.abs(rock), 0.1 * Math.sin(v.time * 2.2)))
  sprite(list, `snail${dark(782)}`, at(104 + ((v.time * 1.5) % 40), 782, 0, 1, 1 + 0.04 * Math.sin(v.time * 3)))

  for (const bit of v.bits) sprite(list, bit.kind + dark(bit.y), at(bit.x, bit.y, bit.kind === 'leaf' ? Math.sin(bit.t * 5) * 0.8 : bit.x * 0.05), Math.min(1, (2.6 - bit.t) * 2))

  // The basket: one of each kind, always. A kind that was just taken hops back into view.
  const hop = Math.sin(v.basketHop * Math.PI) * v.basketHop
  KINDS.forEach((kind, index) => {
    const slot = basketSlot(index)
    const fresh = v.held && v.held.from < 0 && v.held.kind === kind ? Math.min(1, v.held.age * 5) : 1
    sprite(list, iconId(kind) + dark(slot.y), at(slot.x, slot.y - hop * (4 + (index % 3) * 2), 0, 0.74 * fresh))
  })
  // The idle glow: on the bucket someone waits for, else on the basket, else on the walkers that are out.
  if (guidance && guidance.glow > 0) {
    const on = glowOn(v)
    if ('bucket' in on) { const cup = cupAt(v, on.bucket); list.push({ t: 'glow', x: cup.x, y: cup.y, r: 84, ry: 84, alpha: guidance.glow }) }
    else if ('basket' in on) list.push({ t: 'glow', x: 590, y: 776, r: 380, ry: 78, alpha: guidance.glow })
    else for (const walker of on.walkers) { const here = stands[FOLK.indexOf(walker.folk)]; list.push({ t: 'glow', x: here.x, y: here.y - BODY[walker.folk].h / 2, r: 80, ry: 80, alpha: guidance.glow }) }
  }
  for (const flutter of v.flutters) {
    const u = flutter.t / FLUTTER_SECONDS
    const to = basketSlot(flutter.slot)
    const x = flutter.from.x + (to.x - flutter.from.x) * u + Math.sin(u * 9) * 26 * (1 - u)
    const y = flutter.from.y + (to.y - flutter.from.y) * u * u - 40 * Math.sin(u * Math.PI)
    // A falling card turns over and over: its width closes and opens.
    sprite(list, iconId(flutter.kind), at(x, y, Math.sin(u * 7) * 0.5, 0.75 * Math.cos(u * 11), 0.75))
  }
  if (v.held) {
    const held = v.held
    const stretch = 1 + 0.3 * Math.exp(-held.age * 9)
    const own = OWN_FIT[held.kind] === 'rise'
    sprite(list, iconId(held.kind), at(held.at.x, held.at.y - 34, held.swing * (own ? 0.6 : 1), HELD_SIZE / Math.sqrt(stretch), HELD_SIZE * stretch))
  }
  if (guidance && guidance.demo !== null && !v.held && !v.grab) {
    // The ghost hand shows one move: a piece carried to a free place, a tap, or the sun or the moon drawn along its slot.
    const shown = hint(v, guidance.demoIndex)
    const drag = 'from' in shown
    handPose(guidance.demo, drag, hand)
    const from = drag ? shown.from : shown.tap, to = drag ? shown.to : shown.tap
    const x = from.x + (to.x - from.x) * hand.travel, y = from.y + (to.y - from.y) * hand.travel
    if (drag && hand.press > 0.5) {
      if (shown.carries) sprite(list, iconId(shown.carries), at(x, y - 34, 0, 0.9), hand.opacity * 0.8)
      else sprite(list, v.moon ? 'moon' : 'sun', at(x, y), hand.opacity * 0.5, HILL_Y)
    }
    sprite(list, 'hand', at(x, y, 0, 1 - 0.12 * hand.press), hand.opacity)
  }
  return list
}
