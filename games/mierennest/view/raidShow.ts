import { BODY, partyFile, type Camper } from '../camp'
import type { Room } from '../chambers'
import { CELL, OPEN, at, type Ground } from '../ground'
import type { Flying, Scene } from '../kingdom'
import { RELOAD } from '../machines'
import type { Mover } from '../motion'
import type { Party } from '../order'
import type { InvaderKind } from '../habits'
import { APART, type Invader, type Raid } from '../raid'
import type { Machine } from '../save'
import { GRASS_Y, GROUND, MOUTH_X } from './layout'
import type { Effect, Thing } from './things'

// What a raid, the machines and the rooms show, as numbers and names with no canvas in sight: which creature in
// which pose stands where. The display list (display.ts) turns these into things to draw.

const toStage = (cx: number, cy: number) => ({ x: GROUND.x + cx * CELL, y: GROUND.y + cy * CELL })

/** The creature that plays each kind of invader. */
export const PLAYED_BY: Record<InvaderKind, Mover> = { ant: 'raider', beetle: 'beetle', fly: 'fly', dungBeetle: 'dungBeetle', dungFly: 'dungFly' }

/** How long before the end of its own act an invader shows the end of it: the nap, the burp, the foot. */
export const ACT_END = 1.6

export type Shown = {
  who: Mover
  pose: string
  x: number
  y: number
  flip: boolean
  turn: number
  /** How much of its full size it is shown at. */
  size: number
  /** The invader it is, or the invader whose ball it is; -1 for a ball that was left behind. */
  id: number
  /** It stands and waits: it fidgets as its kind does at the camp. */
  idle: boolean
}

const flick = (seconds: number, rate: number) => Math.floor(seconds * rate) % 2 === 0

/** The pose in which each kind hides its face when somebody passes in front of it: no eye shows in it. */
export const DUCKS: Partial<Record<Mover, string>> = { raider: 'duck', beetle: 'duck', fly: 'duck', dungBeetle: 'duck', dungFly: 'duck' }

/** The pose of an invader, from what it is doing. Every state of every kind has a pose of its own. */
export function invaderPose(invader: Invader, seconds: number, cols: number): string {
  const { kind, state } = invader
  // Where it is headed: the place it is on its way to, or between two steps the next place of its way.
  const next = headedFor(invader)
  const rows = Math.floor(next / cols) - Math.floor(invader.cell / cols)
  const upright = next !== invader.cell && next % cols === invader.cell % cols
  if (kind === 'ant') {
    switch (state) {
      case 'coming': return flick(seconds, 9) ? 'walk' : 'walk2'
      case 'going': case 'leaving': return upright ? 'climb' : flick(seconds, 9) ? 'walk' : 'walk2'
      case 'waiting': return 'pillow'
      case 'stuck': return flick(seconds, 1.4) ? 'stuck' : 'stuck2'
      case 'acting': return invader.wait > ACT_END ? 'lie' : flick(seconds, 0.8) ? 'nap' : 'nap2'
      case 'dazed': return invader.lastShot === 'stone' ? 'flat' : 'buried'
      case 'held': return invader.lastShot === 'mud' ? 'balled' : 'shrug'
      case 'givingUp': return 'shrug'
      case 'straining': case 'widening': return 'walk'
      case 'home': return 'nap'
    }
  }
  if (kind === 'beetle') {
    switch (state) {
      case 'coming': return flick(seconds, 5) ? 'walk' : 'walk2'
      case 'going': return rows > 1 ? 'fall' : flick(seconds, 5) ? 'walk' : 'walk2'
      case 'waiting': return 'napkin'
      case 'leaving': return invader.lastShot === 'mud' ? 'blind' : flick(seconds, 5) ? 'walk' : 'walk2'
      case 'straining': case 'widening': return flick(seconds, 2) ? 'lean' : 'strain'
      case 'acting': return invader.wait > ACT_END ? 'eat' : 'burp'
      case 'dazed': return invader.lastShot === 'stone' ? (flick(seconds, 3) ? 'onBack' : 'onBack2') : invader.lastShot === 'mud' ? 'blind' : 'walk'
      case 'givingUp': case 'held': case 'home': case 'stuck': return 'sit'
    }
  }
  if (kind === 'fly') {
    switch (state) {
      case 'coming': case 'going': return flick(seconds, 14) ? 'fly' : 'fly2'
      case 'waiting': return flick(seconds, 3) ? 'hands' : 'hands2'
      case 'leaving': return invader.lastShot === 'mud' ? 'gummed' : flick(seconds, 14) ? 'fly' : 'fly2'
      case 'acting': return invader.wait > ACT_END ? 'taste' : 'tasteFoot'
      case 'dazed': return invader.lastShot === 'sand' ? 'tumble' : invader.lastShot === 'mud' ? 'gummed' : 'dodge'
      case 'givingUp': return 'peer'
      case 'straining': case 'widening': case 'stuck': case 'held': case 'home': return 'bump'
    }
  }
  if (kind === 'dungBeetle') {
    switch (state) {
      case 'coming': return invader.ball > 0 ? 'push' : flick(seconds, 5) ? 'walk' : 'walk2'
      case 'going': return rows > 1 ? (flick(seconds, 3) ? 'onBack' : 'onBack2') : invader.ball > 0 ? 'push' : flick(seconds, 5) ? 'walk' : 'walk2'
      case 'leaving': return invader.ball > 0 ? 'push' : flick(seconds, 5) ? 'walk' : 'walk2'
      case 'waiting': return flick(seconds, 1.2) ? 'polish' : 'polish2'
      case 'widening': return invader.jammed > 0 ? 'heave' : 'push'
      case 'straining': return 'heave'
      case 'acting': return flick(seconds, 1.2) ? 'polish' : 'polish2'
      case 'dazed': return invader.lastShot === 'mud' ? 'heave' : invader.lastShot === 'stone' ? (flick(seconds, 3) ? 'onBack' : 'onBack2') : 'push'
      case 'givingUp': return invader.lostIn === -2 ? 'lost' : 'sit'
      case 'held': case 'home': case 'stuck': return 'sit'
    }
  }
  switch (state) {
    case 'coming': case 'going': return flick(seconds, 14) ? 'fly' : 'fly2'
    case 'leaving': return invader.lastShot === 'mud' ? 'down' : flick(seconds, 14) ? 'fly' : 'fly2'
    case 'acting': return flick(seconds, 2.4) ? 'conduct' : 'conduct2'
    case 'dazed': return invader.lastShot === 'sand' ? 'tumble' : invader.lastShot === 'mud' ? 'down' : flick(seconds, 14) ? 'fly' : 'fly2'
    case 'givingUp': return 'arms'
    case 'waiting': case 'straining': case 'widening': case 'stuck': return flick(seconds, 1.5) ? 'point' : 'point2'
    case 'held': return invader.lastShot === 'mud' ? 'down' : 'arms'
    case 'home': return flick(seconds, 1.5) ? 'point' : 'point2'
  }
  return 'fly'
}

/** The place an invader is headed for: the one it is on its way to, or, between two steps of a way, the next one. */
export function headedFor(invader: Invader): number {
  if (invader.along > 0) return invader.toward
  const moving = invader.state === 'going' || invader.state === 'leaving'
  return moving ? invader.way[invader.step + 1] ?? invader.cell : invader.cell
}

/** Every pose `invaderPose` and the ducking can name, by the creature that plays it: a test holds each of them to exist. */
export const RAID_POSES: Record<'raider' | 'beetle' | 'fly' | 'dungBeetle' | 'dungFly', readonly string[]> = {
  raider: ['walk', 'walk2', 'climb', 'pillow', 'stuck', 'stuck2', 'lie', 'nap', 'nap2', 'flat', 'buried', 'balled', 'shrug', 'duck'],
  beetle: ['walk', 'walk2', 'fall', 'napkin', 'blind', 'lean', 'strain', 'eat', 'burp', 'onBack', 'onBack2', 'sit', 'duck'],
  fly: ['fly', 'fly2', 'hands', 'hands2', 'gummed', 'taste', 'tasteFoot', 'tumble', 'dodge', 'peer', 'bump', 'duck'],
  dungBeetle: ['push', 'walk', 'walk2', 'polish', 'polish2', 'heave', 'lost', 'sit', 'onBack', 'onBack2', 'duck'],
  dungFly: ['fly', 'fly2', 'point', 'point2', 'conduct', 'conduct2', 'down', 'tumble', 'arms', 'duck'],
}

/** How high over the floor of its block a flier hangs, in cells: the dung fly leads from the air, a cell higher. */
const HANGS: Partial<Record<InvaderKind, number>> = { fly: 0.3, dungFly: 1 }

/** The middle of an invader's feet for a place, in stage units: a flier hangs in the middle of its block, off the floor. */
function feetAt(kind: InvaderKind, cell: number, cols: number): { x: number; y: number } {
  const x = cell % cols, y = Math.floor(cell / cols), hangs = HANGS[kind]
  return hangs !== undefined ? toStage(x + 1, y + 1 - hangs) : toStage(x + 0.5, y + 1)
}

/** Where an invader in the nest is, between the place it came from and the one it is in. */
export function invaderAt(invader: Invader, cols: number): { x: number; y: number } {
  const a = feetAt(invader.kind, invader.cell, cols), b = feetAt(invader.kind, invader.along > 0 ? invader.toward : invader.cell, cols)
  return { x: a.x + (b.x - a.x) * invader.along, y: a.y + (b.y - a.y) * invader.along }
}

/** How far behind the one in front an invader stands when two stand still in one place, in stage units. */
export const QUEUE_STEP = 40

/** Where the party steps off the grass into the mouth. */
export const MOUTH_STEP = { x: MOUTH_X - 46, y: GRASS_Y }

/** A dung ball's size on the stage for its size in cells, as a share of the ball as painted (three cells across). */
const ballSize = (cells: number) => cells / 3
/** Half a ball as painted, and how far behind the middle of its ball a dung beetle's own middle is. */
const BALL_HALF = BODY.dungBall.width / 2
const behindBall = (size: number) => BALL_HALF * size + BODY.dungBeetle.width / 2 - 14

/**
 * Where a dung beetle is, this far behind the middle of its ball along the places it was last in. `dx` and `dy`
 * say which way from the ball it lies, and `foot` is the lower end of the stretch it is on. With no wake to go by,
 * it is straight behind the ball, away from where it faces.
 */
function behindOnWake(invader: Invader, ball: { x: number; y: number }, far: number, cols: number): { x: number; y: number; dx: number; dy: number; foot: number } {
  const points = [ball]
  // The ball is between the place it is in and the one it is on its way to; behind it lie that place and the ones before.
  if (invader.along > 0) points.push(feetAt(invader.kind, invader.cell, cols))
  for (const cell of invader.wake) points.push(feetAt(invader.kind, cell, cols))
  let left = far
  for (let n = 1; n < points.length; n++) {
    const a = points[n - 1], b = points[n], leg = Math.hypot(b.x - a.x, b.y - a.y)
    if (leg === 0) continue
    if (left <= leg || n === points.length - 1) {
      // On this leg, or past the end of what it remembers: straight on the way the last leg ran.
      const u = left / leg
      return { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u, dx: b.x - a.x, dy: b.y - a.y, foot: Math.max(a.y, b.y) }
    }
    left -= leg
  }
  return { x: ball.x - invader.facing * far, y: ball.y, dx: -invader.facing, dy: 0, foot: ball.y }
}

/** Where one of the party sits at the log: one who rides a beetle's back sits on the grass while that beetle is away. */
function seatY(raid: Raid, file: readonly Camper[], n: number): number {
  const seat = file[n]
  if (seat.y >= GRASS_Y || seat.kind !== 'raider') return seat.y
  const carrier = file.findIndex((other) => other !== seat && other.x === seat.x && other.y === GRASS_Y)
  const state = carrier >= 0 ? raid.invaders[carrier]?.state : undefined
  const there = state === 'home' || (state === 'coming' && raid.invaders[carrier - 1]?.state === 'coming')
  return there ? seat.y : GRASS_Y
}

/** The body of something shown, as a box on the stage: turned on end where it climbs. */
export function shownBox(one: Shown): { left: number; right: number; top: number; bottom: number } {
  const body = BODY[one.who], w = body.width * one.size, h = body.height * one.size
  if (Math.abs(Math.abs(one.turn) - Math.PI / 2) < 0.01 && one.who !== 'dungBall') {
    // Turned about the middle of its body: as long up and down as it was wide.
    const cy = one.y - h / 2
    return { left: one.x - h / 2, right: one.x + h / 2, top: cy - w / 2, bottom: cy + w / 2 }
  }
  return { left: one.x - w / 2, right: one.x + w / 2, top: one.y - h, bottom: one.y }
}

/** The face of something shown: a circle at the front of its body. A ball has none, and neither has one who ducks. */
export function shownFace(one: Shown): { x: number; y: number; radius: number } | null {
  if (one.who === 'dungBall' || DUCKS[one.who] === one.pose) return null
  const body = BODY[one.who], w = body.width * one.size, h = body.height * one.size
  const radius = Math.min(18, body.height * 0.45) * one.size, front = one.flip ? -1 : 1
  // As it stands: at the front, a little over the middle of its height.
  let dx = front * (w / 2 - radius - 2), dy = -h * 0.55
  if (one.turn !== 0 && Math.abs(Math.abs(one.turn) - Math.PI / 2) < 0.01) {
    // Turned about the middle of its body.
    const ry = dy + h / 2, cos = Math.cos(one.turn), sin = Math.sin(one.turn)
    const tx = dx * cos - ry * sin, ty = dx * sin + ry * cos
    dx = tx
    dy = ty - h / 2
  }
  return { x: one.x + dx, y: one.y + dy, radius }
}

/** Whether a face is touched by a box. */
export function covers(box: { left: number; right: number; top: number; bottom: number }, face: { x: number; y: number; radius: number }): boolean {
  return Math.hypot(Math.max(box.left - face.x, 0, face.x - box.right), Math.max(box.top - face.y, 0, face.y - box.bottom)) < face.radius
}

/**
 * Whoever is drawn later lies over whoever is drawn earlier. One whose face would lie under another ducks: it
 * hides its face in its own way until the other has gone by, so that no face is ever under anybody.
 */
function duckUnder(list: Shown[]): void {
  for (let n = 0; n < list.length; n++) {
    const one = list[n], duck = DUCKS[one.who]
    if (!duck || one.y <= GRASS_Y) continue
    const face = shownFace(one)
    if (!face) continue
    for (let m = n + 1; m < list.length; m++) {
      if (list[m].id === one.id || list[m].y <= GRASS_Y) continue
      if (covers(shownBox(list[m]), face)) {
        one.pose = duck
        one.idle = false
        break
      }
    }
  }
}

/**
 * Everyone of a raid, as they are shown, in the order they are drawn. One still at the log sits in its place
 * there; the next to come in walks to the mouth and waits there, in view, until it can; one in the nest is where
 * the raid has it; one that is home sits at the log again. A dung beetle's ball is shown with it.
 */
export function showRaid(raid: Raid, party: Party, seconds: number): Shown[] {
  const ground = raid.ground, cols = ground.cols, file = partyFile(party)
  const out: Shown[] = []
  // The balls that were left where they lay.
  for (const ball of raid.balls) {
    if (ball.cell < 0) continue
    const p = toStage((ball.cell % cols) + 0.5, Math.floor(ball.cell / cols) + 1)
    out.push({ who: 'dungBall', pose: ball.size > 3 ? 'sandy' : 'plain', x: p.x, y: p.y, flip: false, turn: 0, size: ballSize(ball.size), id: -1, idle: false })
  }
  raid.invaders.forEach((invader, n) => {
    const who = PLAYED_BY[invader.kind], seat: Camper | undefined = file[n]
    const pose = invaderPose(invader, seconds, cols)
    const rolled = invader.ball > 0 ? ballSize(invader.ball) : 0
    const ballPose = invader.ball > 3 ? 'sandy' : 'plain'
    if (invader.state === 'coming' && seat) {
      // The next to come in walks to the mouth while it waits its turn; the others sit where they sat.
      const before = raid.invaders[n - 1]
      const walk = before && before.state === 'coming' ? 0 : Math.min(1, Math.max(0, 1 - invader.wait / APART))
      const size = (seat.size ?? 1) + (1 - (seat.size ?? 1)) * walk
      const from = seatY(raid, file, n)
      const x = seat.x + (MOUTH_STEP.x - seat.x) * walk, y = from + (MOUTH_STEP.y - from) * walk
      if (rolled > 0) {
        // Its ball rolls to the mouth before it, and it comes down off the ball to push.
        const bx = seat.x + (MOUTH_STEP.x + 18 - seat.x) * walk
        out.push({ who: 'dungBall', pose: ballPose, x: bx, y: GRASS_Y, flip: false, turn: walk === 0 ? 0 : bx / (BALL_HALF * size), size: size * rolled, id: invader.id, idle: false })
        out.push({ who, pose: walk > 0 ? pose : seat.poses[0], x: walk > 0 ? bx - behindBall(size * rolled) : x, y: walk > 0 ? GRASS_Y : y, flip: false, turn: 0, size, id: invader.id, idle: walk === 0 })
        return
      }
      const waits = walk >= 1
      out.push({ who, pose: walk > 0 && !waits ? pose : seat.poses[0], x, y, flip: false, turn: 0, size, id: invader.id, idle: walk === 0 || waits })
      return
    }
    if ((invader.state === 'home' || invader.cell < 0) && seat) {
      if (rolled > 0) out.push({ who: 'dungBall', pose: ballPose, x: seat.x, y: GRASS_Y, flip: false, turn: 0, size: (seat.size ?? 1) * rolled, id: invader.id, idle: false })
      out.push({ who, pose, x: seat.x, y: seatY(raid, file, n), flip: false, turn: 0, size: seat.size ?? 1, id: invader.id, idle: true })
      return
    }
    const at = invaderAt(invader, cols)
    // Those who stand still in the same place stand one behind the other, each a little further back, so each is seen.
    if (invader.along === 0 && invader.state !== 'going' && invader.state !== 'leaving') {
      let ahead = 0
      for (let m = 0; m < n; m++) if (raid.invaders[m].cell === invader.cell && raid.invaders[m].along === 0 && raid.invaders[m].state !== 'home') ahead++
      at.x -= ahead * QUEUE_STEP * invader.facing
    }
    const falling = invader.along > 0 && invader.cell % cols === invader.toward % cols
    if (rolled > 0) {
      // The ball lies where the beetle's place is, and the beetle is behind it; down a shaft the beetle comes after it.
      const bx = at.x - invader.facing * CELL * 0.25
      out.push({ who: 'dungBall', pose: ballPose, x: bx, y: at.y, flip: false, turn: (bx + at.y) / (BALL_HALF * rolled), size: rolled, id: invader.id, idle: false })
      const sits = invader.state === 'held' || (invader.state === 'givingUp' && invader.lostIn !== -2)
      if (sits) {
        // Under a roof there is no room to sit on the ball: it sits down against it, on the side it came from.
        out.push({ who, pose, x: bx - invader.facing * BALL_HALF * rolled * 0.8, y: at.y, flip: invader.facing < 0, turn: 0, size: 1, id: invader.id, idle: false })
        return
      }
      // The beetle walks where the ball has just been: behind it along the way it came, round a corner and down a shaft.
      const behind = behindOnWake(invader, at, behindBall(rolled), cols)
      const upright = Math.abs(behind.dy) > Math.abs(behind.dx)
      // On end in a shaft it is as long up and down as it was wide, and it does not hang below the shaft's foot.
      const long = BODY.dungBeetle.width, high = BODY.dungBeetle.height
      const middle = Math.min(behind.y - long / 2, behind.foot - long / 2)
      out.push({
        who, pose: upright && falling ? pose : upright ? 'push' : pose, x: behind.x, y: upright ? middle + high / 2 : behind.y,
        flip: upright ? false : behind.dx > 0 ? true : behind.dx < 0 ? false : invader.facing < 0,
        turn: upright ? (behind.dy < 0 ? Math.PI / 2 : -Math.PI / 2) : 0, size: 1, id: invader.id, idle: invader.state === 'waiting',
      })
      return
    }
    // An ant held fast where the way is one cell wide has no room to lie along it: it stands on end, pulling to get up.
    const narrow = invader.kind === 'ant' && invader.state === 'stuck' && ground.cells[invader.cell - 1] !== OPEN && ground.cells[invader.cell + 1] !== OPEN
    // An ant whose way into a room ends on a face over open air has no floor to lie on: it lies down across the
    // way where it is, as it would on a floor, and is drawn flat like any other that naps.
    const upright = pose === 'climb' || narrow
    const goingUp = narrow || Math.floor(headedFor(invader) / cols) < Math.floor(invader.cell / cols)
    out.push({ who, pose, x: at.x, y: at.y, flip: invader.facing < 0, turn: upright ? (goingUp ? -1 : 1) * (invader.facing < 0 ? -1 : 1) * (Math.PI / 2) : 0, size: 1, id: invader.id, idle: invader.state === 'waiting' })
  })
  duckUnder(out)
  return out
}

/** A point this share of the way along a line of points. */
function alongWay(way: readonly { x: number; y: number }[], share: number): { x: number; y: number } {
  let whole = 0
  for (let n = 1; n < way.length; n++) whole += Math.hypot(way[n].x - way[n - 1].x, way[n].y - way[n - 1].y)
  let left = whole * share
  for (let n = 1; n < way.length; n++) {
    const leg = Math.hypot(way[n].x - way[n - 1].x, way[n].y - way[n - 1].y)
    if (left <= leg) {
      const u = leg > 0 ? left / leg : 1
      return { x: way[n - 1].x + (way[n].x - way[n - 1].x) * u, y: way[n - 1].y + (way[n].y - way[n - 1].y) * u }
    }
    left -= leg
  }
  return way[way.length - 1]
}

/**
 * Those the workers carry out when a raid is over, and the balls that were left: each goes out the way it came
 * in, through the open and not through the earth, back along its own trail to the mouth, and then to the log.
 */
export function showCarriedOut(scene: Extract<Scene, { is: 'putBack' }>, raid: Raid, party: Party): Shown[] {
  const cols = raid.ground.cols, file = partyFile(party), p = Math.min(1, scene.t / scene.length)
  const out: Shown[] = []
  const a = Math.min(1, p / 0.6), b = Math.min(1, Math.max(0, (p - 0.6) / 0.4))
  for (const ball of raid.balls) {
    if (ball.cell < 0 || b > 0) continue
    const way = [toStage((ball.cell % cols) + 0.5, Math.floor(ball.cell / cols) + 1)]
    for (let n = ball.trail.length - 1; n >= 0; n--) way.push(feetAt('dungBeetle', ball.trail[n], cols))
    way.push(MOUTH_STEP)
    const at = alongWay(way, a)
    out.push({ who: 'dungBall', pose: ball.size > 3 ? 'sandy' : 'plain', x: at.x, y: at.y, flip: false, turn: (at.x + at.y) / (BALL_HALF * ballSize(ball.size)), size: ballSize(ball.size), id: -1, idle: false })
  }
  for (const id of scene.held) {
    const invader = raid.invaders[id], seat = file[id]
    if (!invader || !seat || invader.cell < 0) continue
    const from = invaderAt(invader, cols), who = PLAYED_BY[invader.kind]
    const pose = invader.kind === 'ant' ? (invader.lastShot === 'mud' ? 'balled' : 'stuck') : invader.kind === 'beetle' || invader.kind === 'dungBeetle' ? 'sit' : invader.kind === 'dungFly' ? 'down' : 'bump'
    const size = seat.size ?? 1
    if (b > 0) {
      out.push({ who, pose, x: MOUTH_STEP.x + (seat.x - MOUTH_STEP.x) * b, y: GRASS_Y + (seat.y - GRASS_Y) * b, flip: false, turn: 0, size: 1 + (size - 1) * b, id, idle: false })
      continue
    }
    const way = [from]
    for (let n = invader.trail.length - 1; n >= 0; n--) way.push(feetAt(invader.kind, invader.trail[n], cols))
    way.push(MOUTH_STEP)
    const at = alongWay(way, a)
    if (invader.ball > 0) out.push({ who: 'dungBall', pose: invader.ball > 3 ? 'sandy' : 'plain', x: at.x, y: at.y, flip: false, turn: (at.x + at.y) / (BALL_HALF * ballSize(invader.ball)), size: ballSize(invader.ball), id, idle: false })
    out.push({ who, pose, x: at.x, y: invader.ball > 0 ? at.y - (BODY.dungBall.height - 4) * ballSize(invader.ball) : at.y, flip: false, turn: 0, size: 1, id, idle: false })
  }
  return out
}

export type MachineShown = { kind: Machine['kind']; load: Machine['load']; pose: 'ready' | 'fired'; x: number; y: number; flip: boolean }

/** How long a machine stays flung after it fired, in seconds. */
export const FLUNG = 0.4

/** A machine as it is shown: in a raid its cup is empty until its own lump is back in it. */
export function showMachine(machine: Machine, reloading: number, sinceFired: number): MachineShown {
  const p = toStage(machine.x + 1, machine.y + 1)
  const flung = sinceFired < FLUNG || reloading > RELOAD - FLUNG
  return { kind: machine.kind, load: reloading > 0 ? null : machine.load, pose: flung ? 'fired' : 'ready', x: p.x, y: p.y, flip: machine.facing < 0 }
}

/** A shot in the air: which effect, where on its way, and which way it flies. */
export function showShot(flying: Flying, cols: number): { effect: Effect; x: number; y: number; progress: number; flip: boolean } {
  const p = Math.min(1, flying.t / flying.length), at = p * (flying.path.length - 1)
  const a = flying.path[Math.floor(at)], b = flying.path[Math.min(flying.path.length - 1, Math.floor(at) + 1)]
  const part = at - Math.floor(at)
  const ax = (a % cols) + 0.5, ay = Math.floor(a / cols) + 0.5, bx = (b % cols) + 0.5, by = Math.floor(b / cols) + 0.5
  const here = toStage(ax + (bx - ax) * part, ay + (by - ay) * part)
  const first = flying.path[0], last = flying.path[flying.path.length - 1]
  return { effect: flying.shot === 'sand' ? 'sandBlast' : flying.shot === 'mud' ? 'mudBall' : 'stoneShot', x: here.x, y: here.y, progress: p, flip: last % cols < first % cols }
}

/** The things on the back wall of the rooms: two to a chamber, in turn, so no two rooms next in the list look alike. */
export const FURNISHINGS: readonly (readonly [Thing, Thing])[] = [['seeds', 'shelf'], ['bed', 'lamp'], ['cup', 'washing']]
/** The most chambers that are furnished: past this a new room is bare until an older one is gone. */
export const FURNISHED = 6
/** Things that hang on the wall, and how high over the floor they hang. */
const HUNG: Partial<Record<Thing, number>> = { shelf: 34, lamp: 40, washing: 36 }

/** The floor of a room: its lowest row, and the first and last cell of the longest stretch of it with something firm under it. */
export function roomFloor(ground: Ground, room: Room): { y: number; from: number; to: number } {
  const cols = ground.cols
  const lowest = Math.floor(room.cells[room.cells.length - 1] / cols)
  const inRow = new Set(room.cells.filter((i) => Math.floor(i / cols) === lowest).map((i) => i % cols))
  let best = { y: lowest, from: 0, to: -1 }, from = -1
  for (let x = 0; x <= cols; x++) {
    const floor = inRow.has(x) && at(ground, x, lowest + 1) !== OPEN
    if (floor && from < 0) from = x
    if (!floor && from >= 0) {
      if (x - 1 - from > best.to - best.from) best = { y: lowest, from, to: x - 1 }
      from = -1
    }
  }
  return best
}

/** The chambers in the order their glow-worms are lit: nearest the mouth first, by the first cell of each. */
export function lightingOrder(ground: Ground, chambers: readonly Room[]): number[] {
  const cols = ground.cols, mouthX = MOUTH_X / CELL - GROUND.x / CELL
  const far = (room: Room) => Math.hypot((room.cells[0] % cols) + 0.5 - mouthX, Math.floor(room.cells[0] / cols))
  return chambers.map((_, n) => n).sort((a, b) => far(chambers[a]) - far(chambers[b]) || a - b)
}

/**
 * What each chamber has on its back wall, and where: two things, a third and two thirds of the way along its
 * floor. In the queen's room they hang on the part of the wall she does not sit in front of: `queen` is the
 * room she is in and the span of the floor she takes, in cell units. `lit` is how many chambers have their
 * glow-worm awake, nearest the mouth first. Once the kingdom is open (`every`), every chamber has a lantern: one
 * that had none hangs one between its two things.
 */
export function showFurnishings(ground: Ground, chambers: readonly Room[], lit: number, queen: { room: number; from: number; to: number } | null = null, every = false): { thing: Thing; x: number; y: number; lit: boolean }[] {
  const out: { thing: Thing; x: number; y: number; lit: boolean }[] = []
  const awake = new Set(lightingOrder(ground, chambers).slice(0, Math.max(0, lit)))
  chambers.forEach((room, n) => {
    const furnished = n < FURNISHED
    if (!furnished && !every) return
    const floor = roomFloor(ground, room)
    let from = floor.from, to = floor.to + 1
    if (queen && queen.room === n) {
      // The longer stretch of floor beside her.
      if (queen.from - from >= to - queen.to) to = queen.from
      else from = queen.to
    }
    const pair = FURNISHINGS[n % FURNISHINGS.length]
    if (to - from < 3) {
      // No room on the wall for its two things; its lantern hangs over the middle of the floor all the same.
      if (every) {
        const p = toStage((floor.from + floor.to + 1) / 2, floor.y + 1)
        out.push({ thing: 'lamp', x: p.x, y: p.y - HUNG.lamp!, lit: awake.has(n) })
      }
      return
    }
    if (furnished) {
      pair.forEach((thing, i) => {
        const p = toStage(from + (to - from) * (i === 0 ? 0.3 : 0.7), floor.y + 1)
        out.push({ thing, x: p.x, y: p.y - (HUNG[thing] ?? 0), lit: thing === 'lamp' && awake.has(n) })
      })
    }
    if (every && !(furnished && pair.includes('lamp'))) {
      const p = toStage(from + (to - from) * 0.5, floor.y + 1)
      out.push({ thing: 'lamp', x: p.x, y: p.y - HUNG.lamp!, lit: awake.has(n) })
    }
  })
  return out
}

/** The most marks that are drawn where a wall gave. */
export const MARKS_SHOWN = 6

/** Where the marks lie: on the floor of each cell that gave, the first few of them, in stage units. */
export function showMarks(marks: readonly number[], cols: number): { x: number; y: number }[] {
  return marks.slice(0, MARKS_SHOWN).map((cell) => toStage((cell % cols) + 0.5, Math.floor(cell / cols) + 1))
}
