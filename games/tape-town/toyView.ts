import { EYES } from './art'
import { REV_SECONDS, revShows, tapeNear, wantOf, watching } from './going'
import { ACTS, GAITS, WANT, type Mover } from './habits'
import type { Point } from './input'
import { ROLLS, TOY_SCALE, TOY_SIZE, type Pose, type ToyId } from './layout'
import { acting, blend, blink, dazed, idle, landed, lying, strained, tapped, travelling, type Move } from './motion'
import { PEGS, type PegId } from './save'
import { doorSideOf, doorsOf } from './shoebox'
import type { Town } from './town'

// One toy, drawn: its shadow, its sprite, and the few live parts laid on
// it (pupils, a lid, the dog's tail, the bus's doors, a hat of leaves).
// Everything the model says about a toy is read here: where it is, what it
// is doing and how far into it, whether it is hidden, hatted or stuck.

type G = CanvasRenderingContext2D
const TAU = Math.PI * 2
const INK = '#3a2a22'

/** What the view gives a painter: the surface, a way to stamp a sprite, and the draw count to add to. */
export interface Pen {
  g: G
  n: number
  scale: number
  stamp(name: string, scale: number): void
  sprite(name: string, scale: number): CanvasImageSource
}

const isPeg = (id: ToyId): id is PegId => (PEGS as readonly string[]).includes(id)
const isMover = (id: ToyId): id is Mover => id in WANT

/** What each toy looks at: the finger while one is down, and otherwise the thing it wants. */
export function gazeOf(town: Town, id: ToyId): Point {
  if (town.finger) return town.finger
  const body = town.bodies[id], at = body.at, ahead = { x: at.x + Math.cos(at.a) * 200, y: at.y + Math.sin(at.a) * 200 }
  if (id === 'car') {
    // On the move it looks where it goes. Standing, it looks at the grey roll and back at the floor in front of it.
    if (body.doing.is !== 'stand') return ahead
    return Math.sin(town.time * 1.1) > 0.15 ? ROLLS[0] : { x: at.x + Math.cos(at.a) * 90, y: at.y + Math.sin(at.a) * 90 }
  }
  if (id === 'duck' || id === 'train') return wantOf(town, id) ?? ROLLS[WANT[id]!]
  if (id === 'bus') {
    let best: Point = ahead, far = Infinity
    for (const peg of PEGS) {
      const theirs = town.poseOf(peg), gap = Math.hypot(theirs.x - at.x, theirs.y - at.y)
      if (!town.state.riding[peg] && gap < far) { far = gap; best = theirs }
    }
    return best
  }
  if (id === 'dog') {
    // While it howls and watches the train by, it looks at the train.
    const doing = body.doing
    if (watching(town)) {
      // Lying beside the road it watches whoever moves nearest.
      let best: Point | null = null, far = Infinity
      for (const other of Object.keys(WANT) as Mover[]) {
        const theirs = town.bodies[other]
        if (other === 'dog' || (!theirs.flight && theirs.doing.is === 'stand')) continue
        const pose = town.poseOf(other), gap = Math.hypot(pose.x - at.x, pose.y - at.y)
        if (gap < far) { far = gap; best = pose }
      }
      if (best) return best
    }
    return town.poseOf(doing.is === 'act' && (doing.name === 'howl' || doing.name === 'watch') ? 'train' : town.leader?.id ?? 'car')
  }
  return tapeNear(town, 0, at) ?? town.poseOf('bus')
}

/** What a sound of its way does to the toy that makes it: each its own. It leaves the toy's own part (its smoke ring, its doors) as it is. */
function sounded(id: ToyId, u: number, afloat: boolean): Move {
  if (u < 0 || u >= 0.5) return { lift: 0, sx: 1, sy: 1, da: 0, part: 0 }
  const bob = Math.sin((u / 0.5) * Math.PI)
  // The horn of a car or a bus afloat rocks it from side to side.
  if (afloat) return { lift: 0, sx: 1, sy: 1, da: 0.07 * Math.sin((u / 0.5) * Math.PI * 2), part: 0 }
  // The hoot swells the train's boiler and pulls it short.
  if (id === 'train') return { lift: 0, sx: 1 - 0.04 * bob, sy: 1 + 0.09 * bob, da: 0, part: 0 }
  // Hollow boards: the car bounces twice, bom-bom, and the bus sinks once on its springs.
  if (id === 'car') return { lift: 0.07 * Math.abs(Math.sin((u / 0.5) * Math.PI * 2)), sx: 1, sy: 1, da: 0, part: 0 }
  return { lift: 0.03 * bob, sx: 1 + 0.03 * bob, sy: 1 - 0.05 * bob, da: 0, part: 0 }
}

/** How a toy moves this frame. */
function moveOf(town: Town, id: ToyId, lift: number): Move {
  const t = town.time, body = town.bodies[id], doing = body.doing
  let move: Move
  if (body.flight?.started || doing.is === 'held') move = { lift, sx: 1, sy: 1, da: doing.is === 'held' ? 0.12 * Math.sin(t * 5) : 0, part: 0 }
  else if (doing.is === 'act') move = doing.still && doing.name !== 'circle' ? idle(id, t) : acting(doing.name, doing.t, ACTS[doing.name].cues.map((cue) => cue.at))
  else if (doing.is === 'ride' || doing.is === 'walk') move = travelling(doing.gait, doing.odo, GAITS[doing.gait].every, t)
  else if (doing.is === 'stuck') move = strained(doing.t)
  else if (doing.as === 'lying') move = lying(t)
  else if (doing.as === 'dazed') move = dazed(t - doing.since)
  else move = idle(id, t)
  if (doing.is === 'walk' && doing.gait === 'scoot') move = { ...move, lift: Math.max(move.lift, 0.1 * Math.sin(Math.max(0, Math.min(1, (t - town.bumpAt) / 0.14)) * Math.PI)) }
  if (doing.is === 'ride' || doing.is === 'walk') {
    // Held up, it bobs on each toot; braked at the level crossing, it shakes on each put of its idling engine.
    const u = Math.max(0, Math.min(1, (t - doing.tootAt) / 0.3)), bob = Math.sin(u * Math.PI)
    if (doing.is === 'ride' && doing.braked) move = { ...move, sx: move.sx * (1 - 0.03 * bob), sy: move.sy * (1 + 0.05 * bob), part: 1 }
    else if (doing.toots > 0) move = { ...move, lift: Math.max(move.lift, 0.09 * bob), sx: move.sx * (1 + 0.05 * bob) }
  }
  move = blend(blend(move, landed(id, t - body.landedAt)), tapped(id, t - body.tappedAt))
  // No sound without sight: the hoot swells the train, the drum of a bridge bounces whoever drives over it, and the horn rocks whoever is afloat.
  move = blend(move, sounded(id, t - body.soundedAt, doing.is === 'ride' && doing.gait === 'sail'))
  // Its want shows while the tape it wants is being pulled: the car revs, the duck stretches its neck, the train leans.
  const pull = town.pull
  // No shake without its sound: the car shakes for as long as its rev sounds, and its eyes jiggle with it.
  if (pull && isMover(id) && WANT[id] === pull.kind && (id === 'car' ? t - pull.revAt < REV_SECONDS && revShows(town) : doing.is === 'stand')) {
    const toward = Math.atan2(pull.by - body.at.y, pull.bx - body.at.x) - body.at.a, side = Math.sin(toward)
    if (id === 'car') { const rev = Math.max(0, 1 - (t - pull.revAt) / REV_SECONDS); move = { ...move, sx: move.sx * (1 + 0.04 * Math.sin(t * 60)), sy: move.sy * (1 + 0.05 * rev + 0.03 * Math.sin(t * 47)), part: Math.sin(t * 53) } }
    if (id === 'duck') move = { ...move, sx: move.sx * 1.14, da: move.da + 0.18 * side }
    if (id === 'train') move = { ...move, sx: move.sx * 1.05, da: move.da + 0.12 * side }
  }
  // The bus leans toward the nearest peg person.
  if (id === 'bus' && doing.is !== 'act') {
    const peg = gazeOf(town, 'bus')
    move = { ...move, da: move.da + 0.05 * Math.sin(Math.atan2(peg.y - body.at.y, peg.x - body.at.x) - body.at.a) }
  }
  // A peg aboard the ferry waves.
  if (isPeg(id) && town.state.riding[id]) {
    const bus = town.bodies.bus.doing
    if (bus.is === 'ride' && bus.kind === 1) move = { ...move, da: move.da + 0.5 * Math.sin(t * 7) }
  }
  return move
}

/** Draws one toy. `shrink` is how much smaller it is drawn: 1 on the floor, less down in the box. */
export function paintToy(pen: Pen, town: Town, id: ToyId, shrink = 1): void {
  const g = pen.g, t = town.time, body = town.bodies[id], pose = town.poseOf(id), size = TOY_SIZE[id], doing = body.doing
  const riding = isPeg(id) && town.state.riding[id] && !body.flight && doing.is !== 'held'
  const move = moveOf(town, id, pose.lift), lift = Math.max(move.lift, pose.lift)
  const tailOnly = id === 'duck' && doing.is === 'stand' && (doing.as === 'nested' || doing.as === 'reeds')
  // The shadow stays on the floor and parts from a toy that is off it.
  g.save()
  g.translate(pose.x + 4 + lift * 16, pose.y + 7 + lift * 26)
  g.rotate(pose.a + move.da)
  g.globalAlpha = 1 - 0.35 * Math.min(1, lift)
  const grow = (1 + lift * 0.12) * shrink * (tailOnly ? 0.4 : riding ? 0.7 : 1)
  g.drawImage(pen.sprite('shadow', pen.scale), -size.long * 0.6 * grow, -size.wide * 0.66 * grow, size.long * 1.2 * grow, size.wide * 1.32 * grow)
  pen.n++
  g.restore()
  g.save()
  g.translate(pose.x, pose.y)
  g.rotate(pose.a + move.da)
  if (tailOnly) {
    // In its nest, or in the reeds, only its tail shows, and wags.
    // Its looking about, which nobody sees, shows as an uneven wag.
    g.rotate(0.3 * Math.sin(t * 3.1) + 0.12 * Math.max(-1, Math.min(1, move.part)))
    pen.stamp('duckTail', pen.scale)
    g.restore()
    return
  }
  const up = (1 + lift * 0.14) * TOY_SCALE * shrink * (riding ? 0.9 : 1)
  g.scale(up * move.sx, up * move.sy)
  // Lain down it is another drawing: flat on its belly, paws out, its tail curled along its flank and still.
  const lies = id === 'dog' && doing.is === 'stand' && doing.as === 'lying'
  if (id === 'dog' && !lies) tail(pen, move.part)
  if (id === 'bus') {
    // Its doors are on the side of whoever waits for it.
    g.save()
    g.scale(1, doorSideOf(town))
    doors(pen, Math.max(doorsOf(town), t - body.tappedAt < 0.95 ? move.part : 0))
    g.restore()
  }
  // Painted at the size it is drawn at, so it is as sharp as the floor.
  pen.stamp(lies ? 'dogLying' : id, pen.scale * TOY_SCALE)
  // The dog that lay down to watch has its eyes open; one that lay down with nobody to follow is asleep.
  eyes(pen, town, id, pose, move, doing.is === 'stand' && doing.as === 'lying' && !(id === 'dog' && watching(town)))
  if (id === 'bus' && body.hatAt > -Infinity) leaves(pen, [[-40, -6, 22], [-12, 8, 26], [14, -8, 20]], 0.2 * Math.sin((t - body.hatAt) * 9) * Math.exp(-(t - body.hatAt) * 3))
  if (id === 'train' && body.leafAt > -Infinity) leaves(pen, [[40, 0, 15]], 0.5 * Math.sin((t - body.leafAt) * 8))
  g.restore()
  if (id === 'train' && t - body.tappedAt < 0.85) smokeRing(pen, pose, move.part)
}

/** The dog's tail, wagging from the root. */
function tail(pen: Pen, wag: number): void {
  const g = pen.g
  g.lineCap = 'round'
  for (const [colour, wide] of [[INK, 13], ['#f6f1e7', 8]] as const) {
    g.strokeStyle = colour
    g.lineWidth = wide
    g.beginPath()
    g.moveTo(-46, 0)
    g.quadraticCurveTo(-60, wag * 8, -70, wag * 22)
    g.stroke()
    pen.n++
  }
}

/**
 * The bus's doors: two leaves in its side, each hinged at the body by its outer edge. Shut, they lie flush
 * along the side and meet in the middle; open, each has swung out on its hinge and the dark doorway shows.
 */
function doors(pen: Pen, open: number): void {
  const g = pen.g, swing = Math.max(0, Math.min(1, open)) * 1.45, side = 37, leaf = 17
  if (swing > 0.05) {
    g.fillStyle = '#2f2748'
    g.fillRect(6, side - 7, leaf * 2, 8)
    pen.n++
  }
  g.lineCap = 'butt'
  for (const [colour, wide] of [[INK, 8.5], ['#f2b23a', 5]] as const) {
    g.strokeStyle = colour
    g.lineWidth = wide
    g.beginPath()
    // The left leaf is hinged at its left end and the right leaf at its right end.
    g.moveTo(6, side)
    g.lineTo(6 + Math.cos(swing) * leaf, side + Math.sin(swing) * leaf)
    g.moveTo(6 + leaf * 2, side)
    g.lineTo(6 + leaf * 2 - Math.cos(swing) * leaf, side + Math.sin(swing) * leaf)
    g.stroke()
    pen.n++
  }
}

/** Leaves lying on a toy: the bus's hat, the leaf on the train's funnel. Each is its place and its length. */
function leaves(pen: Pen, where: readonly (readonly [number, number, number])[], flutter: number): void {
  const g = pen.g
  g.fillStyle = '#4f9a48'
  g.strokeStyle = '#2d6a34'
  g.lineWidth = 2
  g.beginPath()
  where.forEach(([x, y, long], k) => {
    const a = k * 2.1 + 0.4 + flutter, c = Math.cos(a), s = Math.sin(a), w = long * 0.42
    g.moveTo(x - c * long, y - s * long)
    g.quadraticCurveTo(x - s * w, y + c * w, x + c * long, y + s * long)
    g.quadraticCurveTo(x + s * w, y - c * w, x - c * long, y - s * long)
  })
  g.fill()
  g.stroke()
  pen.n += 2
}

/** The one ring of smoke the train blows when it is tapped: it drifts off, grows and is gone. */
function smokeRing(pen: Pen, pose: Pose, part: number): void {
  if (part <= 0) return
  const g = pen.g, fx = pose.x + Math.cos(pose.a) * 40 * TOY_SCALE, fy = pose.y + Math.sin(pose.a) * 40 * TOY_SCALE
  g.strokeStyle = `rgba(255, 255, 255, ${0.8 * (1 - part)})`
  g.lineWidth = 6 + part * 5
  g.beginPath()
  // Not a clean circle: a wobbling loop of smoke, wider than it is tall.
  g.ellipse(fx + part * 14, fy - part * 60, 10 + part * 26, 7 + part * 15, part * 1.4, 0, TAU)
  g.stroke()
  pen.n++
}

/** Pupils that look where the toy looks, and a lid when it blinks or sleeps. */
export function eyes(pen: Pen, town: Town, id: ToyId, pose: Pose, move: Move, asleep: boolean): void {
  const g = pen.g, eye = EYES[id], look = gazeOf(town, id)
  // The gaze, turned into the toy's own frame. Between the rails the car's eyes jiggle with it.
  const dx = look.x - pose.x, dy = look.y - pose.y, far = Math.hypot(dx, dy) || 1
  const turn = -(pose.a + move.da), lx = (dx * Math.cos(turn) - dy * Math.sin(turn)) / far, ly = (dx * Math.sin(turn) + dy * Math.cos(turn)) / far
  const reach = eye.r * 0.42 * Math.min(1, far / 60)
  const doing = town.bodies[id].doing
  const jiggle = (doing.is === 'ride' && doing.gait === 'judder') || (doing.is === 'stand' && doing.as === 'dazed') ? move.part * eye.r * 0.35 : 0
  // Every toy's own part shows in its eyes: the car's shiver, the duck's looking about, the train's chuff, a peg's rocking.
  const own = Math.max(-1, Math.min(1, move.part)) * eye.r * 0.08
  g.fillStyle = '#2b2622'
  g.beginPath()
  for (const side of [-1, 1]) {
    g.moveTo(eye.x + lx * reach + own + eye.r * 0.52, eye.y * side + ly * reach + jiggle * side)
    g.arc(eye.x + lx * reach + own, eye.y * side + ly * reach + jiggle * side, eye.r * 0.52, 0, TAU)
  }
  g.fill()
  pen.n++
  const shut = asleep ? 1 : blink(id, town.time)
  if (shut > 0.25) {
    g.fillStyle = eye.lid
    g.beginPath()
    for (const side of [-1, 1]) {
      g.moveTo(eye.x + eye.r + 1, eye.y * side)
      g.ellipse(eye.x, eye.y * side, eye.r + 1, (eye.r + 1) * shut, 0, 0, TAU)
    }
    g.fill()
    pen.n++
  }
}
