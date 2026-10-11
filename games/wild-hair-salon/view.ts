import { drawFigure, drawLimbs, features, pencil, stamp, strip, type Figure, type Wears } from './figure'
import { handPose, type Guidance, type HandPose } from './guidance'
import { FAN, type Strand } from './hair'
import { BLADES } from './hand'
import { hintFor, type Hint } from './ladder'
import { BESIDE_X, CHAIR, COLLAR_Y, DOOR, FLOOR_Y, HEAD, LOCK_X, LOOKING_GLASS, PEG, STEP, STRIP_W, fit } from './layout'
import { FLUFF, LOOKS, RIBBON, hueOf } from './looks'
import type { Play } from './play'
import { FIRST_WAIT, FIRST_WAIT_BOX, GLASS_AT, SPOT_Y, bowOn, clippingBox, modelRootAt, onHead, placesOf, ribbonShape, tuftPose, tuftTip, type Point } from './poses'
import { TAIL_LEN } from './rules'
import { PAW_HOME, SHOULDER, TAIL_OF_CUSTOMER, tailOf } from './scenes'
import type { Sprites } from './sprites'
import { WINDOW } from './staging'
import { CUSTOMERS, type CustomerId } from './tastes'
import { GRAPHITE, PAPER, type Ctx } from './wash'
import type { Salon, Who } from './world'

// One frame of the game. The painted pieces are stamped where the staging,
// the puppets and the hair say they are; the plain pieces (the three strips
// and the clippings) and the faces' features are drawn fresh, flat, each
// frame, which is cheap and lets them change length and expression freely.
// Nothing here decides anything: it only draws. Returns how many pieces it
// drew, for the grown-up overlay.

const STEEL = '#cfd2dc', STEEL_EDGE = '#8a8fa0', HANDLE = '#ee7c62'
const RAIN = 'rgba(75,74,87,0.4)'
/** How much of its width the door's leaf loses when it stands wide open: it is seen nearly edge on. */
const OPEN_BY = 0.86
/** Somebody goes by in the street every so many seconds, and takes this long to cross the door's glass. */
const PASSER = { every: 13, takes: 5 }
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

  // The door: the street behind its glass and who waits there under their rain hats. The light for the pair that waits is
  // on the door, or on a first visit on the pair by the bench.
  if (game.chair === null) light(FIRST_WAIT_BOX.x + FIRST_WAIT_BOX.w / 2, FIRST_WAIT_BOX.y + FIRST_WAIT_BOX.h / 2, FIRST_WAIT_BOX.w * 1.3, FIRST_WAIT_BOX.h * 1.2, glowOn('door'))
  else light(DOOR.x + DOOR.w / 2, DOOR.y + DOOR.h / 2, DOOR.w * 1.5, DOOR.h * 1.25, glowOn('door'))
  drawn += door(g, sprites, play, game)

  const places = placesOf(game)
  const shape = ribbonShape(game)
  const carriedRibbon = hair.carried?.what === 'ribbon'
  const chair = game.chair, friend = game.friend
  const customerAt = staging.customer, friendAt = staging.friend
  const caped = staging.cape

  // With nobody in the chair the cape hangs over it and waits for the first customer, and the first pair waits in the room by
  // the bench: whole, large, under their rain hats, the friend first since it stands further back.
  if (!chair) {
    drawn += stamp(g, sprites.drape)
    for (const i of [1, 0] as const) {
      const puppet = play.waiting?.[i], who = game.waiting[i], at = FIRST_WAIT[i]
      if (!puppet) continue
      const shown = { ...at, lift: 0, seen: 1 }
      drawn += tail(g, sprites, who, i === 0 ? { x: at.x - 60 * at.s, y: at.y + 250 * at.s } : { x: at.x + 44 * at.s, y: at.y + 300 * at.s }, null, puppet.at('tail'), 0, at.s, 1)
      drawn += drawFigure(g, sprites, { who, puppet, at: shown, mane: null, body: 1, wears: { pieces: [], blindfold: false, hat: 1 }, time: play.time })
    }
  }

  if (chair && friend && customerAt && friendAt && places.customer && places.friend) {
    const look = LOOKS[chair]
    const inChair = customerAt.x === places.customer.x && customerAt.y === places.customer.y
    // Off the customer, the cape hangs over the chair behind the pair, and waits there while a pair walks in.
    if (caped < 1) {
      g.save()
      g.globalAlpha = 1 - caped
      drawn += stamp(g, sprites.drape)
      g.restore()
    }
    // The light on the chair, when it is the thing to touch: on the cape that hangs over it, behind the pair.
    light(CHAIR.x, 470, 440, 400, glowOn('chair'))
    // In the chair its tail comes out from under the cape's hem well clear of the plain ground at the bench, so that its
    // tuft is never behind a ribbon hung beside the friend's lock there.
    drawn += tail(g, sprites, chair, inChair ? { x: 350, y: FLOOR_Y - 20 } : { x: customerAt.x - 60 * customerAt.s, y: customerAt.y + 250 * customerAt.s }, inChair ? TAIL_OF_CUSTOMER : null, play.customer()?.at('tail') ?? 0, staging.tails, customerAt.s, customerAt.seen)

    const wearsOf = (who: Who): Wears => ({
      pieces: game.clippings.filter((c) => c.on === 'face' && c.who === who && !hair.flights.has(c) && hair.carried?.what !== c).map((c) => (c.on === 'face' ? { y: SPOT_Y[c.spot], half: (c.len * STEP) / 2, hue: c.hue } : { y: 0, half: 0, hue: c.hue })),
      blindfold: !carriedRibbon && staging.ribbon === null && shape?.kind === 'worn' && shape.as === 'blindfold' && game.ribbon?.at === 'face' && game.ribbon.who === who,
      hat: staging.hats,
      // A bow sits on the end of its tuft and goes wherever the head goes.
      bow: who === 'chair' && !carriedRibbon && staging.ribbon === null ? bowOn(game) : null,
      snap: hair.strands.ribbon.stretch.x,
    })
    const customer = play.customer(), other = play.friend()
    // Its limbs come later, over the cape and the strips: a paw that pats its lock and a foot that thumps are out in front of both.
    // Hair that springs back is drawn out as far as the fingers have it while they hold it: the lock below, and here a tuft of the mane with the cape off.
    const held = hair.holds, maneNow = typeof held === 'number' && play.hand.drawnOut > 0 ? game.mane.map((steps, index) => (index === held ? steps + play.hand.drawnOut : steps)) : game.mane
    const seated: Figure | null = customer ? { who: chair, puppet: customer, at: customerAt, mane: { steps: maneNow, hair }, body: 1 - caped, wears: wearsOf('chair'), time: play.time, limbsLater: true } : null
    if (seated) drawn += drawFigure(g, sprites, seated)
    // The looking glass shows the customer's face, the hair it has now, and what it thinks of both.
    // The glass shows the mane as it was until a tuft that a showing will change has been changed where the child can see it.
    if (customer && inChair && staging.hats < 0.5) drawn += reflection(g, sprites, { who: chair, puppet: customer, at: { ...GLASS_AT, s: GLASS_AT.s * (1 + 0.25 * Math.max(-0.4, Math.min(0.6, play.glass.x))), lift: 0, seen: 1 }, mane: null, body: 0, wears: wearsOf('chair'), time: play.time, whole: sprites.mane(chair, game.mane, hair.holds === null && hair.tufts.every((tuft) => tuft.rest === 1)), flipped: true })

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
    drawn += tail(g, sprites, friend, { x: friendAt.x + 44 * friendAt.s, y: friendAt.y + 300 * friendAt.s }, tailOf(friendAt), other?.at('tail') ?? 0, staging.ownTail, friendAt.s, friendAt.seen)
    if (other) drawn += drawFigure(g, sprites, { who: friend, puppet: other, at: friendAt, mane: null, body: 1, wears: wearsOf('friend'), time: play.time })

    // The three strips. The friend's lock goes with the friend while it is on its way somewhere.
    if (staging.hats < 0.5 && places.lock && places.model) {
      const modelRoot = modelRootAt({ x: friendAt.x, y: friendAt.y - friendAt.lift })
      const dx = modelRoot.x - places.model.x, dy = modelRoot.y - places.model.y
      const lockLength = game.lock + staging.stretch + (hair.holds === 'lock' ? play.hand.drawnOut : 0), modelLength = game.model + (hair.holds === 'model' ? play.hand.drawnOut : 0)
      const even = Math.min(game.lock, game.model) * STEP
      light(places.lock.x, places.lock.y + Math.max(60, game.lock * STEP) / 2, 114, Math.max(60, game.lock * STEP) + 70, glowOn('lock'))
      if (shape && !carriedRibbon && staging.ribbon === null && shape.kind === 'hang' && game.ribbon && game.ribbon.at !== 'peg') {
        const root = game.ribbon.at === 'model' ? { x: shape.root.x + dx, y: shape.root.y + dy } : shape.root
        drawn += hanging(g, root, game.ribbon.len * shape.unit, hair.strands.ribbon, play.time, RIBBON, 0, true, true)
      }
      drawn += hanging(g, places.lock, lockLength * places.lock.unit, hair.strands.lock, play.time, { fill: look.lock, edge: look.lockEdge }, staging.fx ? even : 0, false)
      // While the friend shows what the ribbon is for, its paw has the ribbon and its own lock is tucked away behind it: one strip at a time beside a tail.
      const inPaw = staging.ribbon !== null && (staging.ribbon.x !== PEG.x || staging.ribbon.y !== PEG.y) ? staging.ribbon : null
      if (!inPaw) drawn += hanging(g, modelRoot, modelLength * places.model.unit, hair.strands.model, play.time, { fill: LOOKS[friend].lock, edge: LOOKS[friend].lockEdge }, staging.fx ? even : 0, false)
      // The friend's paw, holding the top of its lock out where the customer can see it.
      const pawAt = inPaw ?? modelRoot
      // With the ribbon hung beside its lock, the paw that holds the lock has the ribbon's clip in it as well.
      const both = !inPaw && shape?.kind === 'hang' && game.ribbon?.at === 'model' && !carriedRibbon ? (STRIP_W + 10) / 2 : 0
      g.fillStyle = LOOKS[friend].fur
      g.strokeStyle = LOOKS[friend].furEdge
      g.lineWidth = 2
      g.beginPath()
      g.ellipse(pawAt.x + both, pawAt.y - 2, 15 + both, 15, 0, 0, Math.PI * 2)
      g.fill()
      g.stroke()
     drawn += 2
    }

    if (seated) drawn += drawLimbs(g, seated)
    if (staging.paw && customer) drawn += paw(g, chair, staging.paw, caped > 0.5)
  }

  // The pair that was done, on their way out.
  staging.leaving.forEach((goer, i) => {
    const puppet = play.leaving[i]
    if (!puppet || goer.at.seen <= 0) return
    // Each goes out with what it has: the customer's mane as it was cut, whatever is stuck on its face, and its lock at its cheek, swinging as it walks.
    drawn += drawFigure(g, sprites, { who: goer.who, puppet, at: goer.at, mane: goer.mane ? { steps: goer.mane, hair } : null, whole: goer.mane ? sprites.mane(goer.who, goer.mane, true) : null, body: 1, wears: { pieces: goer.worn.map((c) => ({ y: SPOT_Y[c.spot], half: (c.len * STEP) / 2, hue: c.hue })), blindfold: false, hat: 0 }, time: play.time })
    const size = goer.at.s / goer.from.s, home = goer.part === 'chair' ? { x: LOCK_X, y: COLLAR_Y } : { x: BESIDE_X, y: COLLAR_Y }
    WALKING.swing.x = Math.sin(play.time * 8 + i * 2) * 0.14
    g.save()
    g.globalAlpha = goer.at.seen
    g.translate(goer.at.x, goer.at.y - goer.at.lift)
    g.scale(size, size)
    drawn += hanging(g, { x: home.x - goer.from.x, y: home.y - goer.from.y }, goer.lock * STEP, WALKING, play.time, { fill: LOOKS[goer.who].lock, edge: LOOKS[goer.who].lockEdge }, 0, false)
    if (goer.part === 'friend') {
      // The friend still has the top of its lock in its paw.
      g.fillStyle = LOOKS[goer.who].fur
      g.strokeStyle = LOOKS[goer.who].furEdge
      g.lineWidth = 2
      g.beginPath()
      g.arc(home.x - goer.from.x, home.y - goer.from.y - 2, 15, 0, Math.PI * 2)
      g.fill()
      g.stroke()
      drawn += 2
    }
    g.restore()
  })

  // The ribbon on its peg, on the floor, or where a showing has it.
  if (game.ribbon && !carriedRibbon) {
    if (staging.ribbon) drawn += hanging(g, staging.ribbon, staging.ribbon.len * STEP, hair.strands.ribbon, play.time, RIBBON, 0, true, true)
    else if (shape?.kind === 'hang' && game.ribbon.at === 'peg') drawn += hanging(g, shape.root, game.ribbon.len * shape.unit, hair.strands.ribbon, play.time, RIBBON, 0, true, true)
    else if (shape?.kind === 'lie') {
      // Poked where it lies, it jumps up short and drops back to its length, as it does where it hangs.
      drawn += ribbonOnFloor(g, shape.from, game.ribbon.len * shape.unit * Math.max(0.3, hair.strands.ribbon.stretch.x), hair.strands.ribbon.flutter, play.time)
      drawn += clip(g, shape.from.x - 8, shape.from.y, Math.PI / 2)
    }
  } else if (staging.ribbon) drawn += hanging(g, staging.ribbon, staging.ribbon.len * STEP, hair.strands.ribbon, play.time, RIBBON, 0, true, true)

  // The pieces that lie still on the floor are drawn together, one path for each colour; a piece in the air is drawn by itself.
  const lying = new Map<string, { x: number; y: number; half: number; turn: number }[]>()
  game.clippings.forEach((piece) => {
    if (hair.carried?.what === piece) return
    const flight = hair.flights.get(piece)
    if (flight) { drawn += strip(g, flight.x, flight.y, (piece.len * STEP) / 2, flight.turn, piece.hue); return }
    if (piece.on !== 'floor') return
    const box = clippingBox(game, piece)
    if (!box) return
    const group = lying.get(piece.hue) ?? []
    group.push({ x: box.x, y: box.y, half: box.half, turn: fallen(piece) })
    lying.set(piece.hue, group)
  })
  for (const [hue, group] of lying) drawn += strips(g, group, hue)
  if (hair.carried) {
    const at = hair.carried.at, wriggle = Math.sin(play.time * 26) * 0.22
    if (hair.carried.what === 'ribbon') drawn += hanging(g, { x: at.x, y: at.y - 6 }, (game.ribbon?.len ?? 20) * STEP, hair.strands.ribbon, play.time, RIBBON, 0, true, true)
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

/** The ribbon on the floor: it lies in loose waves from its clip to its free end, as a ribbon that was dropped does, never as a level bar. */
function ribbonOnFloor(g: Ctx, from: Point, long: number, flutter: number, time: number): number {
  // Ruffled where it lies, it twists and writhes along its length, and lies still again.
  const half = STRIP_W / 2, bends = Math.max(2, Math.round(long / 20)), wave = (t: number): number => Math.sin(t * Math.PI * 2 * Math.max(1, long / 110) + flutter * time * 22) * (7 + flutter * 9) * Math.min(1, t * 6)
  g.fillStyle = RIBBON.fill
  g.strokeStyle = RIBBON.edge
  g.lineWidth = 2.4
  g.beginPath()
  g.moveTo(from.x, from.y - half)
  for (let k = 1; k <= bends; k++) g.lineTo(from.x + (long * k) / bends, from.y - half + wave(k / bends))
  for (let k = bends; k >= 0; k--) g.lineTo(from.x + (long * k) / bends, from.y + half + wave(k / bends))
  g.closePath()
  g.fill()
  g.stroke()
  return 2
}

/** How a piece lies where it fell: tilted by a fixed amount of its own, never level, so that a piece of hair on the floor is a thing that dropped and no kind of sign. */
export function fallen(piece: { len: number; x?: number }): number {
  // All one way, by a little or a lot, so that two pieces never cross each other like a sign.
  return -0.12 - (((Math.round(piece.x ?? 0) * 5 + piece.len * 3) % 7) / 6) * 0.26
}

/** A head as the looking glass shows it: the other way round, smaller, and only as much of it as the oval holds. */
function reflection(g: Ctx, sprites: Sprites, figure: Figure): number {
  if (!figure.whole) return 0
  g.save()
  g.beginPath()
  g.ellipse(LOOKING_GLASS.x, LOOKING_GLASS.y, LOOKING_GLASS.rx - 3, LOOKING_GLASS.ry - 3, 0, 0, Math.PI * 2)
  g.clip()
  const drawn = drawFigure(g, sprites, figure)
  g.restore()
  return drawn
}

/** The door's glass: the street behind it, the next pair at it under their rain hats, the rain on it, and the door's edge when it stands open. */
function door(g: Ctx, sprites: Sprites, play: Play, game: Salon): number {
  const { staging } = play
  let drawn = 0
  const pane = DOOR.glass
  const nudge = play.pressed === 'door' ? 3 : 0
  // Open, the leaf has swung out of the doorway and the street is seen whole, with no glass before it.
  const open = staging.door
  if (open > 0) drawn += stamp(g, sprites.doorway)
  g.save()
  g.beginPath()
  if (open > 0) g.rect(DOOR.x, DOOR.y, DOOR.w, DOOR.h)
  else g.rect(pane.x, pane.y, pane.w, pane.h)
  g.clip()
  // Somebody goes by in the street now and then, under an umbrella: nothing to do with the salon.
  const walk = (play.time % PASSER.every) / PASSER.takes
  if (walk < 1) {
    g.save()
    g.translate(pane.x - 70 + (pane.w + 140) * walk, pane.y + pane.h * 0.5 + Math.abs(Math.sin(walk * Math.PI * 9)) * -5)
    g.scale(0.9, 0.9)
    drawn += stamp(g, sprites.passer)
    g.restore()
  }
  // On a first visit the pair that waits is in the room, and nobody is at the glass yet.
  if (staging.waiting > 0 && play.waiting && game.chair !== null) {
    game.waiting.forEach((who, i) => {
      const puppet = play.waiting?.[i]
      if (!puppet) return
      // The whole figure is one sheet that sinks, bobs and tips as its puppet says; only its eyes are drawn on it.
      const at = WINDOW[i], breath = Math.sin(puppet.breath * Math.PI * 2)
      g.save()
      g.globalAlpha = staging.waiting
      g.translate(at.x + nudge + puppet.at('shift') * 30 * at.s, at.y - puppet.at('lift') * 46 * at.s + (puppet.at('sink') * 150 + puppet.at('bob') * 12) * at.s)
      g.scale(at.s, at.s * (1 + breath * 0.008))
      g.rotate(puppet.at('tilt') * 0.17)
      drawn += stamp(g, sprites.waiting(who))
      drawn += features(g, puppet, LOOKS[who], true, 'eyes')
      g.restore()
    })
  }
  g.restore()
  // The leaf. Shut, it is in the room's own sheet; as it opens it swings on its hinges at the right, which is seen
  // as the leaf narrowing towards them, with the rain on its glass and the light across it going with it.
  g.save()
  if (open > 0) {
    const hinge = DOOR.x + DOOR.w
    g.translate(hinge, 0)
    g.scale(1 - OPEN_BY * open, 1)
    g.translate(-hinge, 0)
    drawn += stamp(g, sprites.leaf)
  }
  g.beginPath()
  g.rect(pane.x, pane.y, pane.w, pane.h)
  g.clip()
  // Rain down the glass, and the light on it.
  g.strokeStyle = RAIN
  g.lineWidth = 2
  g.lineCap = 'round'
  g.beginPath()
  for (let i = 0; i < 9; i++) {
    const x = pane.x + 12 + ((i * 53) % (pane.w - 20)), y = pane.y + ((play.time * (150 + (i % 3) * 40) + i * 97) % (pane.h + 30)) - 20
    g.moveTo(x, y)
    g.lineTo(x - 4, y + 16)
  }
  g.stroke()
  drawn++
  g.globalAlpha = 0.34
  g.strokeStyle = PAPER
  g.lineWidth = 16
  g.beginPath()
  g.moveTo(pane.x + 24 + nudge, pane.y + 150)
  g.lineTo(pane.x + 92 + nudge, pane.y + 18)
  g.moveTo(pane.x + 58 + nudge, pane.y + 170)
  g.lineTo(pane.x + 104 + nudge, pane.y + 82)
  g.stroke()
  g.globalAlpha = 1
  drawn++
  g.restore()
  return drawn
}

/**
 * A strip that hangs from a root: as long as it is, swinging, fanned out
 * while it is ruffled. Its top is the line its length is taken from, flat
 * and level with the top of whatever hangs beside it. `kickFrom` bends the end of it aside
 * from that far down: the piece of a lock that reaches past its model, when
 * the cape has come off. `clipped` draws the ribbon's clip at its top.
 */
function hanging(g: Ctx, root: Point, length: number, strand: Strand, time: number, colour: { fill: string; edge: string }, kickFrom: number, clipped: boolean, twists = false): number {
  const half = STRIP_W / 2
  const long = Math.max(6, length * Math.max(0.3, strand.stretch.x))
  g.fillStyle = colour.fill
  g.strokeStyle = colour.edge
  g.lineWidth = 2
  // The whole strip is one path, filled once and lined once: each strand, and the piece past a bend.
  g.beginPath()
  // A ribbon that is ruffled does not fan out as hair does: it spins into a corkscrew, seen as a strip whose width comes and goes down its length, and unwinds as the spin dies.
  if (twists && strand.flutter > 0) {
    const turns = Math.max(3, Math.round(long / 22)), spin = time * 16
    const widthAt = (k: number): number => half * (1 - strand.flutter + strand.flutter * Math.max(0.14, Math.abs(Math.cos(spin + k * 1.25))))
    g.save()
    g.translate(root.x, root.y)
    g.rotate(-strand.swing.x)
    g.moveTo(-widthAt(0), 0)
    for (let k = 1; k <= turns; k++) g.lineTo(-widthAt(k), (long * k) / turns)
    for (let k = turns; k >= 0; k--) g.lineTo(widthAt(k), (long * k) / turns)
    g.closePath()
    g.restore()
  }
  const strands = twists && strand.flutter > 0 ? 0 : strand.flutter > 0 ? 3 : 1
  for (let i = 0; i < strands; i++) {
    const spread = strands === 1 ? 0 : (i - 1) * FAN * strand.flutter + Math.sin(time * 38 + i * 2.1) * 0.07 * strand.flutter
    const w = strands === 1 ? half : half * 0.62
    const bend = kickFrom > 0 && long > kickFrom + 8 && strands === 1
    const first = bend ? kickFrom : long
    g.save()
    g.translate(root.x, root.y)
    g.rotate(-(strand.swing.x + spread))
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
    if (bend) {
      // The piece past the other lock's end: the part things happen to.
      const rest = long - first
      g.translate(0, first)
      g.rotate(-(strand.kick.x + Math.sin(time * 9) * 0.05))
      g.moveTo(-w, 0)
      g.lineTo(w, 0)
      g.lineTo(w, rest - Math.min(w, rest))
      g.arc(0, rest - Math.min(w, rest), w, 0, Math.PI)
      g.closePath()
    }
    g.restore()
  }
  g.fill()
  g.stroke()
  let drawn = 2
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
function tail(g: Ctx, sprites: Sprites, who: CustomerId, from: Point, straight: Point | null, swish: number, out: number, s: number, seen: number): number {
  // A tail is seen as much as its owner is, and no tail stands in a doorway by itself.
  if (seen <= 0) return 0
  const end = sprites.animal(who).tailEnd
  const held = straight ? out : 0
  const sway = swish * 0.55
  const tipX = from.x + (-46 + Math.sin(sway) * 26) * s, tipY = from.y - (130 + Math.abs(Math.sin(sway)) * 8) * s
  const long = TAIL_LEN * STEP
  const x = straight ? tipX + (straight.x - tipX) * held : tipX
  const y = straight ? tipY + (straight.y + long - tipY) * held : tipY
  const rootX = straight ? from.x + (straight.x - from.x) * held : from.x, rootY = straight ? from.y + (straight.y - from.y) * held : from.y
  g.save()
  g.globalAlpha *= seen
  pencil(g, [{ x: rootX, y: rootY }, { x: rootX + (x - rootX) * 0.5 - 30 * s * (1 - held), y: rootY + (y - rootY) * 0.4 }, { x, y }], 1.6 + held * 6, 0.6 + held * 0.3)
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
