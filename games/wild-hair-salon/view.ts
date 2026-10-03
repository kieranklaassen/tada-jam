import { drawFigure, pencil, stamp, strip, type Wears } from './figure'
import { handPose, type Guidance, type HandPose } from './guidance'
import { FAN, type Strand } from './hair'
import { BLADES } from './hand'
import { hintFor, type Hint } from './ladder'
import { BESIDE_X, CHAIR, COLLAR_Y, DOOR, FLOOR_Y, HEAD, LOCK_X, STEP, STRIP_W, fit } from './layout'
import { FLUFF, LOOKS, RIBBON, hueOf } from './looks'
import type { Play } from './play'
import { SPOT_Y, clippingBox, onHead, placesOf, ribbonShape, tuftPose, tuftTip, type Point } from './poses'
import { TAIL_LEN } from './rules'
import { PAW_HOME, SHOULDER, TAIL_OF_CUSTOMER, tailOf } from './scenes'
import type { Sprites } from './sprites'
import { WINDOW, type Shown } from './staging'
import { CUSTOMERS, type CustomerId } from './tastes'
import { GRAPHITE, type Ctx } from './wash'
import type { Salon, Who } from './world'

// One frame of the game. The painted pieces are stamped where the staging,
// the puppets and the hair say they are; the plain pieces (the three strips
// and the clippings) and the faces' features are drawn fresh, flat, each
// frame, which is cheap and lets them change length and expression freely.
// Nothing here decides anything: it only draws. Returns how many pieces it
// drew, for the grown-up overlay.

const STEEL = '#cfd2dc', STEEL_EDGE = '#8a8fa0', HANDLE = '#ee7c62'
const PANE = '#fbeeb5', PANE_EDGE = '#e0c66a', DOORWAY = '#5f8f82'
/** How far above the line its length is taken from a lock comes out of the mane. */
const ROOT = 44
/** A lock on someone who is walking: it only swings. */
const WALKING: Strand = { swing: { x: 0, v: 0 }, stretch: { x: 1, v: 0 }, flutter: 0, kick: { x: 0, v: 0 } }

export type Frame = {
  play: Play
  guidance: Guidance | null
}

const pose: HandPose = { travel: 0, press: 0, opacity: 0 }

export function drawFrame(g: Ctx, width: number, height: number, sprites: Sprites, frame: Frame): number {
  let drawn = 1
  g.setTransform(1, 0, 0, 1, 0, 0)
  g.globalAlpha = 1
  g.globalCompositeOperation = 'source-over'
  g.drawImage(sprites.backdrop.canvas, 0, 0)
  const { play } = frame
  const game = play.game
  // Before the slot has been read the room is all there is.
  if (!game) return drawn
  sprites.frame()
  const { staging, hair } = play
  const f = fit(width, height)
  g.setTransform(f.scale, 0, 0, f.scale, f.dx, f.dy)
  const hint = hintFor(game, frame.guidance, play.inScene)
  const breathe = 0.8 + 0.2 * Math.sin(play.time * 2.4)
  const glowOn = (name: Hint['glow'][number]): number => (hint.glow.includes(name) ? (frame.guidance?.glow ?? 0) * breathe : 0)
  const light = (x: number, y: number, w: number, h: number, strength: number): void => {
    if (strength <= 0) return
    g.save()
    g.globalAlpha = strength
    g.translate(x, y)
    g.scale(w / 120, h / 120)
    drawn += stamp(g, sprites.glow)
    g.restore()
  }

  // The door: its pane, who waits behind it under their rain hats, and the doorway when it stands open.
  light(DOOR.x + DOOR.w / 2, DOOR.y + DOOR.h / 2, DOOR.w * 1.5, DOOR.h * 1.25, glowOn('door'))
  drawn += door(g, sprites, play, game)

  const places = placesOf(game)
  const shape = ribbonShape(game)
  const carriedRibbon = hair.carried?.what === 'ribbon'
  const chair = game.chair, friend = game.friend
  const customerAt = staging.customer, friendAt = staging.friend
  const caped = staging.cape

  if (chair && friend && customerAt && friendAt && places.customer && places.friend) {
    const look = LOOKS[chair]
    const inChair = customerAt.x === places.customer.x && customerAt.y === places.customer.y
    // The chair and the light on it, when it is the thing to touch.
    light(CHAIR.x, 440, 420, 420, glowOn('chair'))
    // Off the customer, the cape hangs over the chair behind the pair.
    if (caped < 1 && inChair) {
      g.save()
      g.globalAlpha = 1 - caped
      drawn += stamp(g, sprites.drape)
      g.restore()
    }
    drawn += tail(g, sprites, chair, inChair ? { x: 322, y: FLOOR_Y - 20 } : { x: customerAt.x - 60 * customerAt.s, y: customerAt.y + 250 * customerAt.s }, inChair ? TAIL_OF_CUSTOMER : null, play.customer()?.at('tail') ?? 0, staging.tails, customerAt.s)

    const wearsOf = (who: Who): Wears => ({
      pieces: game.clippings.filter((c) => c.on === 'face' && c.who === who && !hair.flights.has(c) && hair.carried?.what !== c).map((c) => (c.on === 'face' ? { y: SPOT_Y[c.spot], half: (c.len * STEP) / 2, hue: c.hue } : { y: 0, half: 0, hue: c.hue })),
      blindfold: !carriedRibbon && staging.ribbon === null && shape?.kind === 'worn' && shape.as === 'blindfold' && game.ribbon?.at === 'face' && game.ribbon.who === who,
      hat: staging.hats,
    })
    const customer = play.customer(), other = play.friend()
    if (customer) drawn += drawFigure(g, sprites, { who: chair, puppet: customer, at: customerAt, mane: { steps: game.mane, hair }, body: 1 - caped, wears: wearsOf('chair'), time: play.time })

    // The cape, over the chin when the customer ducks; it breathes a little. In the air it rises and fades.
    if (caped > 0 && inChair) {
      const breath = Math.sin((customer?.breath ?? 0) * Math.PI * 2)
      g.save()
      g.globalAlpha = Math.min(1, caped * 1.4)
      g.translate(HEAD.x, COLLAR_Y - (1 - caped) * 240)
      g.rotate((1 - caped) * -0.5)
      g.scale(1 + breath * 0.004, 1 + breath * 0.006)
      g.translate(-HEAD.x, -COLLAR_Y)
      drawn += stamp(g, sprites.cape)
      g.restore()
      if (places.knot && caped >= 1) {
        light(places.knot.x, places.knot.y + 8, 150, 150, glowOn('knot'))
        const give = play.pressed === 'knot' ? 0.86 : 1
        g.save()
        g.translate(places.knot.x, places.knot.y)
        g.scale(give, give)
        drawn += stamp(g, sprites.knot)
        g.restore()
      }
    }

    // The friend, in front of the customer's mane where the two meet, with a paw on the top of its own lock.
    drawn += tail(g, sprites, friend, { x: friendAt.x + 44 * friendAt.s, y: friendAt.y + 300 * friendAt.s }, tailOf(friendAt), other?.at('tail') ?? 0, staging.tails, friendAt.s)
    if (other) drawn += drawFigure(g, sprites, { who: friend, puppet: other, at: friendAt, mane: null, body: 1, wears: wearsOf('friend'), time: play.time })

    // The three strips. The friend's lock goes with the friend while it is on its way somewhere.
    if (staging.hats < 0.5 && places.lock && places.model) {
      const dx = friendAt.x - places.friend.x, dy = friendAt.y - places.friend.y - friendAt.lift
      const modelRoot = { x: places.model.x + dx, y: places.model.y + dy }
      const lockLength = game.lock + (hair.holds === 'lock' ? play.hand.drawnOut : 0), modelLength = game.model + (hair.holds === 'model' ? play.hand.drawnOut : 0)
      const even = Math.min(game.lock, game.model) * STEP
      light(places.lock.x, places.lock.y + Math.max(60, game.lock * STEP) / 2, 114, Math.max(60, game.lock * STEP) + 70, glowOn('lock'))
      if (shape && !carriedRibbon && staging.ribbon === null && shape.kind === 'hang' && game.ribbon && game.ribbon.at !== 'peg') {
        const root = game.ribbon.at === 'model' ? { x: shape.root.x + dx, y: shape.root.y + dy } : shape.root
        drawn += hanging(g, root, game.ribbon.len * shape.unit, hair.strands.ribbon, play.time, RIBBON, 0, 0, true)
      }
      drawn += hanging(g, places.lock, lockLength * places.lock.unit, hair.strands.lock, play.time, { fill: look.lock, edge: look.lockEdge }, ROOT, staging.fx ? even : 0, false)
      drawn += hanging(g, modelRoot, modelLength * places.model.unit, hair.strands.model, play.time, { fill: LOOKS[friend].lock, edge: LOOKS[friend].lockEdge }, 0, staging.fx ? even : 0, false)
      // The friend's paw, holding the top of its lock out where the customer can see it.
      g.fillStyle = LOOKS[friend].fur
      g.strokeStyle = LOOKS[friend].furEdge
      g.lineWidth = 2
      g.beginPath()
      g.arc(modelRoot.x, modelRoot.y - 2, 15, 0, Math.PI * 2)
      g.fill()
      g.stroke()
     drawn += 2
      // A bow at the end of a tuft.
      if (shape && !carriedRibbon && staging.ribbon === null && shape.kind === 'worn' && shape.as === 'bow') drawn += bow(g, shape.at.x, shape.at.y, 0)
    }

    if (staging.paw && customer) drawn += paw(g, chair, staging.paw, caped > 0.5)
  }

  // The pair that was done, on their way out.
  staging.leaving.forEach((goer, i) => {
    const puppet = play.leaving[i]
    if (!puppet || goer.at.seen <= 0) return
    // Each goes out with what it has: the customer's mane as it was cut, whatever is stuck on its face, and its lock at its cheek, swinging as it walks.
    drawn += drawFigure(g, sprites, { who: goer.who, puppet, at: goer.at, mane: goer.mane ? { steps: goer.mane, hair } : null, body: 1, wears: { pieces: goer.worn.map((c) => ({ y: SPOT_Y[c.spot], half: (c.len * STEP) / 2, hue: c.hue })), blindfold: false, hat: 0 }, time: play.time })
    const size = goer.at.s / goer.from.s, home = goer.part === 'chair' ? { x: LOCK_X, y: COLLAR_Y } : { x: BESIDE_X, y: COLLAR_Y }
    WALKING.swing.x = Math.sin(play.time * 8 + i * 2) * 0.14
    g.save()
    g.globalAlpha = goer.at.seen
    g.translate(goer.at.x, goer.at.y - goer.at.lift)
    g.scale(size, size)
    drawn += hanging(g, { x: home.x - goer.from.x, y: home.y - goer.from.y }, goer.lock * STEP, WALKING, play.time, { fill: LOOKS[goer.who].lock, edge: LOOKS[goer.who].lockEdge }, goer.part === 'chair' ? ROOT : 0, 0, false)
    g.restore()
  })

  // The ribbon on its peg, on the floor, or where a showing has it.
  if (game.ribbon && !carriedRibbon) {
    if (staging.ribbon) drawn += hanging(g, staging.ribbon, staging.ribbon.len * STEP, hair.strands.ribbon, play.time, RIBBON, 0, 0, true)
    else if (shape?.kind === 'hang' && game.ribbon.at === 'peg') drawn += hanging(g, shape.root, game.ribbon.len * shape.unit, hair.strands.ribbon, play.time, RIBBON, 0, 0, true)
    else if (shape?.kind === 'lie') {
      drawn += strip(g, shape.from.x + (game.ribbon.len * shape.unit) / 2, shape.from.y, (game.ribbon.len * shape.unit) / 2, 0, 'ribbon')
      drawn += clip(g, shape.from.x - 8, shape.from.y, Math.PI / 2)
    }
  } else if (staging.ribbon) drawn += hanging(g, staging.ribbon, staging.ribbon.len * STEP, hair.strands.ribbon, play.time, RIBBON, 0, 0, true)

  // The pieces that lie still on the floor are drawn together, one path for each colour; a piece in the air is drawn by itself.
  const lying = new Map<string, { x: number; y: number; half: number; turn: number }[]>()
  game.clippings.forEach((piece, index) => {
    if (hair.carried?.what === piece) return
    const flight = hair.flights.get(piece)
    if (flight) { drawn += strip(g, flight.x, flight.y, (piece.len * STEP) / 2, flight.turn, piece.hue); return }
    if (piece.on !== 'floor') return
    const box = clippingBox(game, piece)
    if (!box) return
    const group = lying.get(piece.hue) ?? []
    group.push({ x: box.x, y: box.y, half: box.half, turn: ((index % 5) - 2) * 0.05 })
    lying.set(piece.hue, group)
  })
  for (const [hue, group] of lying) drawn += strips(g, group, hue)
  if (hair.carried) {
    const at = hair.carried.at, wriggle = Math.sin(play.time * 26) * 0.22
    if (hair.carried.what === 'ribbon') drawn += hanging(g, { x: at.x, y: at.y - 6 }, (game.ribbon?.len ?? 20) * STEP, hair.strands.ribbon, play.time, RIBBON, 0, 0, true)
    else drawn += strip(g, at.x, at.y - 18, (hair.carried.what.len * STEP) / 2, wriggle, hair.carried.what.hue)
  }

  // The fluff in the air, one path for each colour: a puff swells, then shrinks to nothing rather than fading by itself.
  const puffs = new Map<string, typeof hair.puffs>()
  for (const puff of hair.puffs) {
    const hue = puff.hue.startsWith('#') ? puff.hue : puff.hue === 'fluff' ? FLUFF : LOOKS[puff.hue as CustomerId]?.mane ?? FLUFF
    const group = puffs.get(hue) ?? []
    group.push(puff)
    puffs.set(hue, group)
  }
  g.globalAlpha = 0.8
  for (const [hue, group] of puffs) {
    g.fillStyle = hue
    g.beginPath()
    for (const puff of group) {
      const fade = Math.max(0, 1 - puff.age / puff.life)
      const r = puff.r * (puff.rolls ? fade : (1 + (1 - fade) * 0.6) * Math.min(1, fade * 2.5))
      g.moveTo(puff.x + r, puff.y)
      g.arc(puff.x, puff.y, r, 0, Math.PI * 2)
    }
    g.fill()
    drawn++
  }
  g.globalAlpha = 1

  if (hair.scissors.shown > 0) drawn += scissors(g, hair.scissors.at, hair.scissors.open.x, hair.scissors.shown)
  // The ghost hand is drawn last, over what it shows.
  drawn += ghost(g, frame, hint, game)
  g.setTransform(1, 0, 0, 1, 0, 0)
  // With what the frame has left to paint: the pair behind the door first, the friend's whole head with it, then anyone not met yet.
  sprites.ahead(game.waiting[0], false)
  sprites.ahead(game.waiting[1], true)
  for (const who of CUSTOMERS) sprites.ahead(who, false)
  return drawn
}

/** The door's pane, the next pair behind it under their rain hats, and the dark of the doorway as the door swings open. */
function door(g: Ctx, sprites: Sprites, play: Play, game: Salon): number {
  const { staging } = play
  let drawn = 0
  const w = DOOR.window
  const nudge = play.pressed === 'door' ? 3 : 0
  g.save()
  g.beginPath()
  g.arc(w.x + nudge, w.y, w.r, 0, Math.PI * 2)
  g.fillStyle = PANE
  g.fill()
  drawn++
  if (staging.waiting > 0 && play.waiting) {
    g.clip()
    game.waiting.forEach((who, i) => {
      const puppet = play.waiting?.[i]
      if (!puppet) return
      const at: Shown = { ...WINDOW[i], x: WINDOW[i].x + nudge, lift: 0, seen: staging.waiting }
      drawn += drawFigure(g, sprites, { who, puppet, at, mane: null, body: 0, wears: { pieces: [], blindfold: false, hat: 1 }, time: play.time })
    })
  }
  g.restore()
  g.strokeStyle = PANE_EDGE
  g.lineWidth = 3
  g.beginPath()
  g.arc(w.x + nudge, w.y, w.r, 0, Math.PI * 2)
  g.stroke()
  drawn++
  if (staging.door > 0) {
    // Open, the door shows the dark of the doorway, from its hinge side across.
    g.fillStyle = DOORWAY
    g.fillRect(DOOR.x + DOOR.w * (1 - staging.door), DOOR.y + 4, DOOR.w * staging.door, DOOR.h - 6)
    drawn++
  }
  return drawn
}

/**
 * A strip that hangs from a root: as long as it is, swinging, fanned out
 * while it is ruffled. `above` draws where a lock comes out of the mane above
 * the line its length is taken from. `kickFrom` bends the end of it aside
 * from that far down: the piece of a lock that reaches past its model, when
 * the cape has come off. `clipped` draws the ribbon's clip at its top.
 */
function hanging(g: Ctx, root: Point, length: number, strand: Strand, time: number, colour: { fill: string; edge: string }, above: number, kickFrom: number, clipped: boolean): number {
  const half = STRIP_W / 2
  const long = Math.max(6, length * Math.max(0.3, strand.stretch.x))
  let drawn = 0
  g.fillStyle = colour.fill
  g.strokeStyle = colour.edge
  g.lineWidth = 2
  if (above > 0) {
    g.beginPath()
    g.moveTo(root.x - half * 0.55, root.y - above)
    g.lineTo(root.x + half * 0.55, root.y - above)
    g.lineTo(root.x + half, root.y + 1)
    g.lineTo(root.x - half, root.y + 1)
    g.closePath()
    g.fill()
    g.stroke()
    drawn += 2
  }
  const strands = strand.flutter > 0 ? 3 : 1
  for (let i = 0; i < strands; i++) {
    const spread = strands === 1 ? 0 : (i - 1) * FAN * strand.flutter + Math.sin(time * 38 + i * 2.1) * 0.07 * strand.flutter
    const w = strands === 1 ? half : half * 0.62
    const bend = kickFrom > 0 && long > kickFrom + 8 && strands === 1
    const first = bend ? kickFrom : long
    g.save()
    g.translate(root.x, root.y)
    g.rotate(-(strand.swing.x + spread))
    g.fillStyle = colour.fill
    g.strokeStyle = colour.edge
    g.lineWidth = 2
    g.beginPath()
    g.moveTo(-w, 0)
    g.lineTo(w, 0)
    if (bend) {
      g.lineTo(w, first)
      g.lineTo(-w, first)
    } else {
      g.lineTo(w, first - Math.min(w, first))
      g.arc(0, first - Math.min(w, first), w, 0, Math.PI)
    }
    g.closePath()
    g.fill()
    g.stroke()
    drawn += 2
    if (bend) {
      // The piece past the other lock's end: the part things happen to.
      const rest = long - first
      g.translate(0, first)
      g.rotate(-(strand.kick.x + Math.sin(time * 9) * 0.05))
      g.beginPath()
      g.moveTo(-w, 0)
      g.lineTo(w, 0)
      g.lineTo(w, rest - Math.min(w, rest))
      g.arc(0, rest - Math.min(w, rest), w, 0, Math.PI)
      g.closePath()
      g.fill()
      g.stroke()
      drawn += 2
    }
    g.restore()
  }
  if (clipped) drawn += clip(g, root.x, root.y - 12, 0)
  return drawn
}

/** The ribbon's clip: a small wooden peg, the part the ribbon is carried by. */
function clip(g: Ctx, x: number, y: number, turn: number): number {
  g.save()
  g.translate(x, y)
  g.rotate(turn)
  g.fillStyle = RIBBON.clip
  g.strokeStyle = RIBBON.clipEdge
  g.lineWidth = 2
  g.beginPath()
  g.rect(-11, -22, 22, 40)
  g.fill()
  g.stroke()
  g.restore()
  return 2
}

/** The ribbon tied as a bow: two loops, a knot and two short ends. */
function bow(g: Ctx, x: number, y: number, turn: number): number {
  g.save()
  g.translate(x, y)
  g.rotate(turn)
  g.fillStyle = RIBBON.fill
  g.strokeStyle = RIBBON.edge
  g.lineWidth = 2.2
  g.beginPath()
  for (const side of [-1, 1]) {
    g.moveTo(0, 0)
    g.quadraticCurveTo(side * 26, -30, side * 38, -6)
    g.quadraticCurveTo(side * 30, 16, 0, 0)
    g.moveTo(side * 3, 4)
    g.lineTo(side * 18, 30)
    g.lineTo(side * 6, 32)
    g.closePath()
  }
  g.moveTo(9, 0)
  g.arc(0, 0, 9, 0, Math.PI * 2)
  g.fill()
  g.stroke()
  g.restore()
  return 2
}

/** Several flat strips of one colour in one path: the pieces that lie on the floor. */
function strips(g: Ctx, group: readonly { x: number; y: number; half: number; turn: number }[], hue: string): number {
  const colour = hueOf(hue), h = STRIP_W / 2
  g.fillStyle = colour.fill
  g.strokeStyle = colour.edge
  g.lineWidth = 2.4
  g.beginPath()
  for (const piece of group) {
    const c = Math.cos(piece.turn), s = Math.sin(piece.turn)
    const corner = (u: number, w: number): void => { const x = piece.x + u * c - w * s, y = piece.y + u * s + w * c; if (u < 0 && w < 0) g.moveTo(x, y); else g.lineTo(x, y) }
    corner(-piece.half, -h)
    corner(piece.half, -h)
    corner(piece.half, h)
    corner(-piece.half, h)
    g.closePath()
  }
  g.fill()
  g.stroke()
  return 2
}

/**
 * A tail: a pencil line from where it leaves the body to its end, which
 * swishes. Held out to be measured (`out` from 0 to 1) it hangs straight
 * down from `straight`, as long as the ribbon is made.
 */
function tail(g: Ctx, sprites: Sprites, who: CustomerId, from: Point, straight: Point | null, swish: number, out: number, s: number): number {
  const end = sprites.animal(who).tailEnd
  const held = straight ? out : 0
  const sway = swish * 0.55
  const tipX = from.x + (-46 + Math.sin(sway) * 26) * s, tipY = from.y - (130 + Math.abs(Math.sin(sway)) * 8) * s
  const long = TAIL_LEN * STEP
  const x = straight ? tipX + (straight.x - tipX) * held : tipX
  const y = straight ? tipY + (straight.y + long - tipY) * held : tipY
  const rootX = straight ? from.x + (straight.x - from.x) * held : from.x, rootY = straight ? from.y + (straight.y - from.y) * held : from.y
  pencil(g, [{ x: rootX, y: rootY }, { x: rootX + (x - rootX) * 0.5 - 30 * s * (1 - held), y: rootY + (y - rootY) * 0.4 }, { x, y }], 1.6 + held * 4, 0.6 + held * 0.3)
  g.save()
  g.translate(x, y)
  g.rotate((0.5 + sway) * (1 - held) + Math.PI * held)
  g.scale(s, s)
  const drawn = stamp(g, end)
  g.restore()
  return drawn + 1
}

/**
 * The customer's paw, out at work: an arm of its own fur from under the cape,
 * or from its shoulder when the cape is off, round the outside of its face to
 * where the paw is, with the scissors in it when it holds a pair.
 */
function paw(g: Ctx, who: CustomerId, at: { x: number; y: number; scissors: number | null }, caped: boolean): number {
  const look = LOOKS[who], from = caped ? PAW_HOME : SHOULDER
  // The arm bows away from the middle of the face, so it never crosses the eyes.
  const mid = { x: (from.x + at.x) / 2, y: (from.y + at.y) / 2 }, far = Math.max(1, Math.hypot(at.x - from.x, at.y - from.y))
  const across = { x: -(at.y - from.y) / far, y: (at.x - from.x) / far }
  const out = across.x * (mid.x - HEAD.x) + across.y * (mid.y - HEAD.y) >= 0 ? 1 : -1
  const elbow = { x: mid.x + across.x * out * far * 0.45, y: mid.y + across.y * out * far * 0.45 }
  g.lineCap = 'round'
  for (const [colour, wide] of [[look.furEdge, 22], [look.fur, 18]] as const) {
    g.strokeStyle = colour
    g.lineWidth = wide
    g.beginPath()
    g.moveTo(from.x, from.y)
    g.quadraticCurveTo(elbow.x, elbow.y, at.x, at.y)
    g.stroke()
  }
  g.fillStyle = look.fur
  g.strokeStyle = look.furEdge
  g.lineWidth = 2
  g.beginPath()
  g.arc(at.x, at.y, 17, 0, Math.PI * 2)
  g.fill()
  g.stroke()
  let drawn = 4
  if (at.scissors !== null) drawn += scissors(g, { x: at.x + 14, y: at.y - BLADES.y - 6 }, at.scissors, 0.9, 0.6)
  return drawn
}

/** The scissors in the hand: two flat blades that cross above the finger, and two loops, big enough to read as scissors at a glance. */
function scissors(g: Ctx, at: Point, open: number, shown: number, size = 1): number {
  const angle = 0.12 + Math.max(0, open) * 0.4
  g.save()
  g.globalAlpha = shown
  g.translate(at.x + BLADES.x, at.y + BLADES.y)
  g.scale(size, size)
  g.rotate(-0.5)
  const turned = (side: number, x: number, y: number): Point => { const c = Math.cos(side * angle), s = Math.sin(side * angle); return { x: x * c - y * s, y: x * s + y * c } }
  // Both loops in one stroke, then both blades in one path over them.
  g.strokeStyle = HANDLE
  g.lineWidth = 9
  g.beginPath()
  for (const side of [-1, 1]) { const c = turned(side, side * 5, 46); g.moveTo(c.x + 16, c.y); g.ellipse(c.x, c.y, 16, 22, side * angle, 0, Math.PI * 2) }
  g.stroke()
  g.fillStyle = STEEL
  g.strokeStyle = STEEL_EDGE
  g.lineWidth = 2.2
  g.beginPath()
  for (const side of [-1, 1]) {
    const a = turned(side, -9, 14), tip = turned(side, -1, -84), bulge = turned(side, 7, -60), b = turned(side, 10, 14)
    g.moveTo(a.x, a.y)
    g.lineTo(tip.x, tip.y)
    g.quadraticCurveTo(bulge.x, bulge.y, b.x, b.y)
    g.closePath()
  }
  g.fill()
  g.stroke()
  g.restore()
  return 3
}

/**
 * The ghost hand: one move, never a solution. Under the cape it shows the
 * verb on a tuft of the mane (a snip across it, or a pull out along it), and
 * after that it taps the cape's knot.
 */
function ghost(g: Ctx, frame: Frame, hint: Hint, game: Salon): number {
  const guidance = frame.guidance
  if (!guidance || guidance.demo === null || !hint.hand || game.chair === null) return 0
  const places = placesOf(game)
  if (hint.hand.on === 'knot') {
    if (!places.knot) return 0
    handPose(guidance.demo, false, pose)
    return ghostHand(g, places.knot.x, places.knot.y + 6, pose.press, pose.opacity)
  }
  if (!places.customer) return 0
  const steps = game.mane[hint.hand.tuft] ?? 40
  const at = tuftPose(game.chair, hint.hand.tuft, steps, game.mane.length), tip = tuftTip(at)
  const along = (t: number, across = 0): Point => onHead(places.customer!, { x: at.base.x + (tip.x - at.base.x) * t + Math.cos(at.angle) * across, y: at.base.y + (tip.y - at.base.y) * t + Math.sin(at.angle) * across })
  handPose(guidance.demo, true, pose)
  const snip = hint.hand.move === 'snip'
  const from = snip ? along(0.7, 90) : along(0.75), to = snip ? along(0.7, -90) : along(1.35)
  const x = from.x + (to.x - from.x) * pose.travel, y = from.y + (to.y - from.y) * pose.travel
  let drawn = 0
  if (snip) drawn += scissors(g, { x, y: y - BLADES.y }, Math.abs(pose.travel - 0.5) < 0.08 ? 0 : 1, pose.opacity * 0.8)
  return drawn + ghostHand(g, x, snip ? y - BLADES.y : y, pose.press, pose.opacity)
}

/** A pale hand with one finger out, pressed down a little while it works. */
function ghostHand(g: Ctx, x: number, y: number, press: number, opacity: number): number {
  g.save()
  g.globalAlpha = opacity * 0.85
  g.translate(x, y + 6 - press * 6)
  g.scale(1.3 - press * 0.08, 1.3 - press * 0.08)
  g.fillStyle = '#fff6e6'
  g.strokeStyle = GRAPHITE
  g.lineWidth = 2
  g.beginPath()
  // The finger, whose tip is the point, and the palm below it.
  g.moveTo(-9, 4)
  g.quadraticCurveTo(-10, -8, 0, -8)
  g.quadraticCurveTo(10, -8, 9, 4)
  g.lineTo(10, 34)
  g.quadraticCurveTo(34, 34, 34, 56)
  g.quadraticCurveTo(34, 86, 6, 88)
  g.quadraticCurveTo(-24, 88, -26, 60)
  g.quadraticCurveTo(-26, 44, -10, 40)
  g.closePath()
  g.fill()
  g.stroke()
  g.restore()
  return 2
}
