import { ACTS, anglerBulb, type BaitPose } from './acts'
import { DRIPS, INK_LASTS, RIPPLE_LASTS, type Flight, type Game } from './game'
import { handPose, type Guidance, type HandPose } from './guidance'
import type { Point } from './input'
import { disc, line, ring, sprite, type Item } from './items'
import { SHOAL_SIZE, TAU, boatPose, catPose, clamp01, droolOf, ease, gullPose, patOf, hang, shoalFish, span, type CatPose, type Catch, type Fish, type Pose } from './motion'
import { BOAT_PIVOT, IN_TUB, KELP, PARTS, WAVE_PERIOD, type SpriteId } from './rig'
import { FLIGHT_SECONDS, NET_DIPS, OFF_THE_PILE, PILE, TIP, flightAt, slideAt, splashOf, tipAt, towAt } from './scenes'
import { BAITS, BOW, CAT, CAT_IN_TUB, CREATURES, GULL, HOOK_EYE, LANTERN, PEGS, ROD_TIP, SEABED, TUB, TUB_FRONT_FIRST, TUB_SLOTS, WATERLINE, light, linePath, type Bait, type CreatureId } from './sea'

// One frame as a list of things to draw, in order from the back (items.ts).
// It is made from the game's numbers alone, with no canvas, so a test can
// count a frame and measure where things lie, and the painter (view.ts) only
// carries the list out. A creature is drawn where the rules have it
// (`game.pose`), with its answer to the hook laid over by its act (acts.ts).

/** The most a frame may hold: sprite stamps plus live strokes. The frame-budget test holds every moment under it. */
export const FRAME_BUDGET = 80

type Turned = { x: number; y: number; rot: number; sx: number; sy: number; face: 1 | -1 }

/** A part hung on a body at one of its points and turned by `angle`, which runs the same way on a body that faces left. */
function part(out: Item[], id: SpriteId, pose: Turned, at: { x: number; y: number }, angle: number, a: number, grow = 1, tint: 0 | 1 | 2 = 0): void {
  const where = hang(pose, at.x, at.y)
  sprite(out, id, where.x, where.y, pose.rot + pose.face * angle, pose.face * pose.sx * grow, pose.sy * grow, a, false, tint)
}

/** One pupil, turned toward what the eye is looking at. A shut eye is a small arc, bowed upward, and never a level bar. */
function pupil(out: Item[], centre: Point, radius: number, look: Point, lid: number, a: number, size = 1): void {
  if (lid > 0.55) {
    const pts: number[] = []
    for (let i = 0; i <= 6; i++) {
      const angle = Math.PI * (1.12 + (0.76 * i) / 6)
      pts.push(centre.x + radius * 0.72 * Math.cos(angle), centre.y + radius * 0.34 + radius * 0.8 * Math.sin(angle))
    }
    line(out, pts, Math.max(1.6, radius * 0.26), 'dark', a)
    return
  }
  const dx = look.x - centre.x, dy = look.y - centre.y, away = Math.hypot(dx, dy) || 1
  const reach = radius * 0.36 * Math.min(1, away / 60)
  disc(out, centre.x + (dx / away) * reach, centre.y + (dy / away) * reach, radius * 0.56 * size, radius * 0.56 * size * (1 - 0.6 * lid), 'dark', a)
}

function eyes(out: Item[], id: CreatureId, pose: Pose, look: Point, a: number, size = 1): void {
  for (const eye of CREATURES[id].eyes) pupil(out, hang(pose, eye.x, eye.y), eye.r * Math.min(Math.abs(pose.sx), pose.sy), pose.look ?? look, pose.lid, a, size * pose.pupil)
}

function body(out: Item[], id: SpriteId, pose: Turned, a: number, tint: 0 | 1 | 2 = 0): void {
  sprite(out, id, pose.x, pose.y, pose.rot, pose.sx * pose.face, pose.sy, a, false, tint)
}

/** The boat as it lies now: rocked, dipped, leant and drawn along. */
export type Boat = { rot: number; lift: number; shift: number }
export function boatOf(game: Game): Boat {
  const boat = boatPose(game.boat.t, game.boat.dip, game.boat.heel)
  return { rot: boat.rot, lift: boat.lift, shift: game.boat.shift }
}
/** Where the boat has carried a point of its deck. */
export function onDeck(at: { x: number; y: number }, boat: Boat): Point {
  const dx = at.x - BOAT_PIVOT.x, dy = at.y - BOAT_PIVOT.y, cos = Math.cos(boat.rot), sin = Math.sin(boat.rot)
  return { x: BOAT_PIVOT.x + boat.shift + dx * cos - dy * sin, y: BOAT_PIVOT.y + dx * sin + dy * cos + boat.lift }
}
/** The tip of the rod: where the line starts. */
export function rodTip(game: Game): Point {
  return onDeck(ROD_TIP, boatOf(game))
}

export { anglerBulb }

const fish: Fish = { x: 0, y: 0, face: 1, rot: 0, a: 1 }

/** How each creature is drawn in the sea. `a` is how much light reaches it; `t` the dye it is drawn in. */
const DRAWN: Record<CreatureId, (out: Item[], game: Game, pose: Pose, a: number, t: 0 | 1 | 2) => void> = {
  shoal(out, game, pose) {
    const c = game.creatures.shoal, act = c.cell !== null && !c.cut ? ACTS[c.cell].fish : undefined
    const moment = act ? game.momentOf('shoal')! : null, around = { hook: game.hook, light: null, bright: game.spoonFlashes() || c.notice > 0.5 }
    for (let i = 0; i < SHOAL_SIZE; i++) {
      shoalFish(i, pose, c, around, fish)
      if (act) act(fish, i, moment!, pose)
      if (i < 2 && game.cat.act === 'dream') {
        // The cat is patting the water for them: two of them jump over its paw.
        const u = (((game.cat.since * 1.5 + i * 0.5) % 1) + 1) % 1, paw = CAT.x + game.boat.shift + 46
        fish.x = paw - 44 + 88 * u
        fish.y = WATERLINE + 8 - 46 * Math.sin(Math.PI * u)
        fish.face = 1
        fish.rot = (u - 0.5) * 1.7
        fish.a = 1 / light(fish.y)
      }
      sprite(out, 'fish', fish.x, fish.y, fish.rot, fish.face, 1, light(fish.y) * fish.a)
    }
  },
  puffer(out, game, pose, a, t) {
    part(out, 'pufferTail', pose, PARTS.pufferTail, pose.a, a, 1, t)
    body(out, 'puffer', pose, a, t)
    const spines = Math.max(pose.open, pose.more)
    if (spines > 0.02) sprite(out, 'pufferSpikes', pose.x, pose.y, pose.rot, pose.sx, pose.sy, a * Math.min(1, spines * 1.6), false, t)
    eyes(out, 'puffer', pose, game.hook, a, 1 - 0.35 * pose.open)
    if (pose.open > 0.05) {
      const mouth = hang(pose, PARTS.pufferMouth.x, PARTS.pufferMouth.y), wide = 2.6 + 4.4 * pose.open
      disc(out, mouth.x, mouth.y, wide, wide * 1.15, 'dark', a)
    }
    // One brow, which goes up at its inner end as the fish swells, and down when it is cross.
    const inner = hang(pose, 4, -25 - 8 * pose.open + 9 * pose.b), outer = hang(pose, 27, -21 + 5 * pose.open - 5 * pose.b)
    line(out, [inner.x, inner.y, outer.x, outer.y], 3.2, 'dark', a)
  },
  turtle(out, game, pose, a, t) {
    if (pose.alt > 0.5) return body(out, 'turtleShell', pose, a, t)
    part(out, 'turtleFlipper', pose, PARTS.turtleBack, 2.25 + pose.b, a, 0.74, t)
    body(out, 'turtle', pose, a, t)
    part(out, 'turtleFlipper', pose, PARTS.turtleFront, 1.75 + pose.a, a, 1, t)
    eyes(out, 'turtle', pose, game.hook, a)
  },
  squid(out, game, pose, a, t) {
    const arms = hang(pose, PARTS.squidArms.x, PARTS.squidArms.y)
    sprite(out, 'squidArms', arms.x, arms.y, pose.rot, pose.sx, pose.a * pose.sy, a, false, t)
    body(out, 'squid', pose, a, t)
    // Bands of light run down its skin in answer to a light.
    const bands = Math.max(pose.more, game.litAt(pose, null, 230))
    if (bands > 0.02) sprite(out, 'squidBands', pose.x, pose.y + 16 * Math.sin(game.time * 5), pose.rot, pose.sx, pose.sy, Math.min(1, bands) * (0.55 + 0.45 * Math.sin(game.time * 11)), true)
    eyes(out, 'squid', pose, game.hook, a, 1 - 0.4 * pose.open)
  },
  jelly(out, _game, pose, a, t) {
    sprite(out, 'halo', pose.x, pose.y - 6, 0, 1.25, 1.25, 0.5 * pose.glow, true)
    const arms = hang(pose, PARTS.jellyArms.x, PARTS.jellyArms.y)
    sprite(out, 'jellyArms', arms.x, arms.y, pose.rot + pose.a, pose.sx, pose.sy, a, false, t)
    body(out, 'jelly', pose, Math.min(1, a + 0.18), t)
  },
  shark(out, game, pose, a, t) {
    part(out, 'sharkTail', pose, PARTS.sharkTail, pose.a, a, 1, t)
    part(out, 'sharkJaw', pose, PARTS.sharkJaw, 0.62 * pose.open, a, 1, t)
    body(out, 'shark', pose, a, t)
    // The stick inside it lights it up, so that its bones and an old boot show through.
    if (pose.more > 0.02) {
      sprite(out, 'halo', pose.x + 10 * pose.face, pose.y + 4, 0, 1.5, 0.7, 0.7 * pose.more, true)
      body(out, 'sharkBones', pose, pose.more)
    }
    eyes(out, 'shark', pose, game.hook, a)
  },
  angler(out, game, pose, a, t) {
    body(out, 'angler', pose, a, t)
    part(out, 'anglerLamp', pose, PARTS.anglerLamp, pose.a, Math.min(1, a + 0.3), 1, t)
    const bulb = anglerBulb(pose)
    sprite(out, 'halo', bulb.x, bulb.y, 0, 0.8, 0.8, Math.min(1, 0.85 * pose.glow), true)
    // It gazes at its own lamp, until a finger is drawing the line or it has noticed a hook hanging beside it.
    eyes(out, 'angler', pose, game.held || game.creatures.angler.notice > 0.5 ? game.hook : bulb, a)
  },
  octopus(out, game, pose, a, t) {
    const hook = game.hook, home = CREATURES.octopus.home
    // The pot stands on the seabed whoever is at home in it.
    const pot = (): void => sprite(out, 'pot', home.x + PARTS.pot.x, home.y + PARTS.pot.y, 0, 1, 1, Math.min(1, light(home.y) + 0.12))
    if (pose.alt > 0.5) {
      // Moved into the boot: a boot with eyes and arms.
      pot()
      body(out, 'octopus', pose, a, t)
      sprite(out, 'boot', pose.x - 8, pose.y - 22, pose.rot, 1, 1, Math.min(1, a + 0.15))
      for (const side of [1, -1]) {
        const from = hang(pose, side * 30, 6)
        sprite(out, 'octopusArm', from.x, from.y, pose.rot + (side === 1 ? 0.5 + 0.3 * Math.sin(game.time * 4) : Math.PI - 0.5 - 0.3 * Math.sin(game.time * 4 + 1)), 0.5, side * 0.6, a, false, t)
      }
      eyes(out, 'octopus', pose, hook, a)
      return
    }
    body(out, 'octopus', pose, a, t)
    pot()
    PARTS.octopusArms.forEach((at, index) => {
      const from = hang(pose, at.x, at.y), side = index === 0 ? 1 : -1
      // At rest an arm hangs out over the rim of the pot, and one of them sorts shells there. The first one reaches for the hook; the second pats it.
      let angle = side === 1 ? 1 + pose.a : Math.PI - 1 - 0.5 * pose.b, long = side === 1 ? 0.74 : 0.6 + 0.2 * pose.b
      const reach = index === 0 ? pose.open : pose.more
      if (reach > 0.01) {
        const away = Math.hypot(hook.x - from.x, hook.y - from.y)
        let to = Math.atan2(hook.y - from.y, hook.x - from.x)
        if (side === -1 && to < 0) to += TAU
        angle += (to - angle) * reach
        long += (Math.max(0.6, Math.min(1.6, away / 104)) - long) * reach
      }
      sprite(out, 'octopusArm', from.x, from.y, angle, long, side * 0.9, a, false, t)
    })
    eyes(out, 'octopus', pose, hook, a)
  },
  blobfish(out, game, pose, a, t) {
    body(out, 'blobfish', pose, a, t)
    eyes(out, 'blobfish', pose, game.hook, a)
    if (pose.open > 0.04) {
      const mouth = hang(pose, PARTS.blobfishMouth.x, PARTS.blobfishMouth.y + 8 * pose.open)
      disc(out, mouth.x, mouth.y, 11 + 9 * pose.open, 2.4 + 21 * pose.open, 'dark', a)
    }
    if (pose.more > 0.02) sprite(out, 'sand', pose.x, pose.y + 6, 0, 1, pose.more, Math.min(1, 0.5 + a * 0.5))
  },
}

/** Deepest first, so whoever is nearer the light is drawn over whoever is in the dark. */
const BACK_TO_FRONT: readonly CreatureId[] = ['blobfish', 'octopus', 'angler', 'squid', 'jelly', 'shark', 'turtle', 'puffer', 'shoal']

/** How much light reaches a creature: daylight by its depth, and any light that is near it. */
function lightOn(game: Game, id: CreatureId, pose: Pose): number {
  return Math.min(1, light(pose.y) + 0.5 * game.litAt(pose, id, 260))
}

/** About where the cat's face is, on its seat. */
export function catFace(game: Game): Point {
  return { x: CAT.neck.x + game.boat.shift, y: CAT.neck.y - 22 }
}
/** What the cat's eyes are on: the catch it has an opinion of, for as long as it has it, and the hook otherwise. */
export function catLooksAt(game: Game): Point {
  const cat = game.cat
  return cat.act !== null && cat.act.startsWith('op') ? { x: CAT.x + cat.slot.x + game.boat.shift, y: CAT.y + cat.slot.y } : game.hook
}
/** Where the reel sits on the rod, from the boat's pivot. */
const REEL = { x: 170, y: -36, r: 6.5 } as const

/** A catch out of the sea: in the tub, or in the air on its way. `grow` is 0 at its size in the sea and 1 at its size in the tub. */
function drawCatch(out: Item[], game: Game, id: Catch, x: number, y: number, turn: number, grow: number, a: number): void {
  const lies = IN_TUB[id], scale = 1 + (lies.scale - 1) * grow, t = game.creatures[id].inked > 0 ? 1 : 0
  const pose: Turned = { x, y: y + lies.y * grow, rot: lies.rot * grow + turn, sx: scale, sy: scale, face: 1 }
  // The blobfish and the cat stare at each other for as long as the cat has its opinion of it; everyone else watches the hook.
  const look = id === 'blobfish' && game.cat.act === 'opBlobfish' ? catFace(game) : game.hook
  switch (id) {
    case 'puffer': body(out, 'puffer', pose, a, t); break
    // The jellyfish came up sitting on the boot, and the boot is part of that catch wherever it is drawn.
    case 'jelly': sprite(out, 'halo', x, y, 0, 0.5, 0.5, 0.4 * a, true); body(out, 'jelly', pose, a, t); part(out, 'boot', pose, { x: -12, y: 6 }, 0, a); break
    case 'angler': body(out, 'angler', pose, a, t); part(out, 'anglerLamp', pose, PARTS.anglerLamp, 0.3 * Math.sin(game.time * 2.3), a, 1, t); break
    case 'octopus': body(out, 'octopus', { ...pose, y: pose.y - 4 * scale }, a, t); sprite(out, 'boot', pose.x - 8 * scale, pose.y - 6 * scale, pose.rot, scale * 0.9, scale * 0.9, a); break
    case 'blobfish': body(out, 'blobfish', pose, a, t); break
    case 'squid': body(out, 'squid', pose, a, t); break
  }
  for (const eye of CREATURES[id].eyes) pupil(out, hang(pose, eye.x, id === 'octopus' ? eye.y - 4 : eye.y), eye.r * scale, look, 0, a)
}

const SPRITE_OF: Record<Exclude<Bait, 'none'>, SpriteId> = { worm: 'worm', spoon: 'spoon', glow: 'glow', cheese: 'cheese', boot: 'boot' }
const bait: BaitPose = { x: 0, y: 0, rot: 0, sx: 1, sy: 1, a: 1, spring: false }
const hand: HandPose = { travel: 0, press: 0, opacity: 0 }

/** The frame as it stands: everything to draw, from the back. `out` is emptied and filled. */
export function buildFrame(game: Game, guidance: Guidance | null, out: Item[] = []): Item[] {
  out.length = 0
  const hook = game.hook, now = game.time
  sprite(out, 'cloth', 0, 0)
  sprite(out, 'kelp', KELP.x, KELP.y, 0.05 * Math.sin(now * 0.6) + 0.015 * Math.sin(now * 1.7), 1, KELP.tall, 0.4)
  if (game.tooth) sprite(out, 'tooth', game.tooth.x, SEABED - 4, 1.2, 1, 1, 0.8 * (1 - span(game.tooth.age, 16, 20)))

  for (const id of BACK_TO_FRONT) {
    const c = game.creatures[id]
    if (c.mode === 'away') continue
    const pose = game.pose(id), a = lightOn(game, id, pose) * (1 - pose.hid)
    DRAWN[id](out, game, pose, a, c.inked > 0 ? 1 : pose.tint)
    // The jellyfish comes up sitting on the boot.
    if (id === 'jelly' && c.booted) sprite(out, 'boot', pose.x - 12, pose.y + 6, pose.rot * 0.5, 1, 1, Math.min(1, a + 0.15))
    const draw = c.cell !== null && !c.cut ? ACTS[c.cell].draw : undefined
    if (draw) draw(out, game.momentOf(id)!, pose, a)
  }

  // The bait on the hook, as whoever has hold of it has it; and for a moment on its way between its peg and the hook.
  const flown = ease(clamp01(game.baitSince / 0.22)), at = game.baitAt()
  if (game.bait !== 'none') {
    bait.x = at.x; bait.y = at.y; bait.rot = Math.max(-0.5, Math.min(0.5, -hook.vx * 0.0016)); bait.sx = bait.sy = bait.a = 1; bait.spring = false
    for (const id of BACK_TO_FRONT) {
      const c = game.creatures[id], act = c.cell !== null && !c.cut && c.mode !== 'away' ? ACTS[c.cell].bait : undefined
      if (act) { act(bait, game.momentOf(id)!, game.pose(id)); break }
    }
    const peg = PEGS[game.bait]
    const spoon = game.bait === 'spoon' && game.spoonFlashes()
    sprite(out, bait.spring ? 'wormSpring' : SPRITE_OF[game.bait], peg.x + (bait.x - peg.x) * flown, peg.y + (bait.y - peg.y) * flown, bait.rot, bait.sx, bait.sy, bait.a * (game.bait === 'spoon' && !spoon ? 0.82 : 1))
    // A spoon in the light flashes; the stick glows where daylight does not drown it.
    if (spoon) disc(out, bait.x + 3 * Math.sin(now * 9), bait.y + 26 * bait.sy, 2 + 2.5 * Math.abs(Math.sin(now * 7)), 2 + 2.5 * Math.abs(Math.sin(now * 7)), 'cream', 0.9 * bait.a * flown)
    if (game.bait === 'glow') sprite(out, 'halo', bait.x, bait.y + 28, 0, 0.75, 0.75, bait.a * flown * (0.25 + 0.6 * span(hook.y, WATERLINE + 100, WATERLINE + 260)), true)
  }

  for (const ink of game.inks) {
    const u = ink.age / INK_LASTS, grown = (0.3 + 0.9 * Math.min(1, ink.age / 0.6)) * ink.size
    sprite(out, 'ink', ink.x + 14 * u, ink.y - 26 * u, ink.age * 0.3, grown, grown, 0.92 * (1 - u * u))
  }
  for (const bubble of game.bubbles) {
    const sway = bubble.big ? 5 * Math.sin(bubble.sway * 3.1) : 3 * Math.sin(bubble.sway * 2.3)
    const wobble = bubble.big ? 1 + 0.08 * Math.sin(bubble.sway * 7) : 1
    ring(out, bubble.x + sway, bubble.y, bubble.r * wobble, 0.35 + 0.5 * light(bubble.y), bubble.big ? 3 : 1.6, 2 - wobble)
  }

  // The boat, and what stands on its deck and goes with it.
  const boat = boatOf(game), tip = game.tip ? tipAt(game.tip.t) : null
  const hull = onDeck(BOAT_PIVOT, boat)
  // The net swings down under whoever it scoops, and up to toss it.
  const swing = game.netSwing === null ? 0 : game.netSwing < NET_DIPS ? 0.12 * Math.sin((Math.PI * game.netSwing) / NET_DIPS) : -1.1 * Math.sin(Math.PI * span(game.netSwing, NET_DIPS, FLIGHT_SECONDS.scoop))
  const net = onDeck({ x: BOAT_PIVOT.x + PARTS.net.x, y: BOAT_PIVOT.y + PARTS.net.y }, boat)
  sprite(out, 'net', net.x, net.y, boat.rot + swing)
  sprite(out, 'boat', hull.x, hull.y, boat.rot)
  // The reel's bar turns one step at each click, the way the line is going.
  const reel = onDeck({ x: BOAT_PIVOT.x + REEL.x, y: BOAT_PIVOT.y + REEL.y }, boat), turn = boat.rot + game.reelShown
  line(out, [reel.x - REEL.r * Math.cos(turn), reel.y - REEL.r * Math.sin(turn), reel.x + REEL.r * Math.cos(turn), reel.y + REEL.r * Math.sin(turn)], 2.4, 'cream')
  if (game.finished && (!tip || tip.lit)) {
    const lantern = onDeck(LANTERN, boat)
    sprite(out, 'halo', lantern.x, lantern.y, 0, 0.7, 0.7, 0.8 + 0.15 * Math.sin(now * 3.1), true)
  }

  const tub = onDeck(TUB, boat), tipped = tip ? tip.tipped : 0, tubRot = boat.rot - 0.5 * tipped
  const slop = game.tubWater.slosh * Math.sin(game.tubWater.phase)
  const cat = catPose(game.cat.t, now, game.cat.act, game.cat.since, game.cat.slot, game.cat.asleep, CAT_IN_TUB, game.cat.poked)
  if (cat.curl > 0.5) drawCat(out, game, cat, boat)
  else sprite(out, 'tubWater', tub.x + 6 * slop, tub.y - 31 - 5 * game.tubWater.slosh + 10 * tipped, tubRot + 0.16 * slop, 1, 1, game.finished ? (game.tip && game.tip.t < TIP.tipped ? 1 - tipped : 0) : 1)
  // (A tub that has been tipped out stays empty of water until the next trip.)
  // The catches lie behind the staves, each in its place; in a tub that is being tipped out, each until it slides.
  if (game.tip) {
    for (let at = TUB_FRONT_FIRST.length - 1; at >= 0; at--) {
      const index = TUB_FRONT_FIRST[at], id = game.tip.who[index], lies = id === undefined ? null : slideAt(game.tip.t, index)
      if (lies) drawCatch(out, game, id, lies.x + boat.shift, lies.y + boat.lift, boat.rot + lies.rot, 1, lies.a)
    }
  } else {
    for (let at = TUB_FRONT_FIRST.length - 1; at >= 0; at--) {
      const id = game.tub[TUB_FRONT_FIRST[at]]
      if (id === undefined || game.flights.some((flight) => flight.id === id)) continue
      const lies = onDeck(game.creatures[id].off, boat)
      drawCatch(out, game, id, lies.x, lies.y, boat.rot, 1, 1)
    }
  }
  sprite(out, 'tub', tub.x - 10 * tipped, tub.y + 8 * tipped, tubRot)
  if (cat.curl <= 0.5) drawCat(out, game, cat, boat)

  const gull = gullPose(game.gull.t, game.gull.hop, game.gull.watching)
  sprite(out, 'gull', GULL.x, GULL.y - gull.lift, gull.rot, 1, gull.sy)

  // The baits on their pegs. One that was tapped while the hook was busy swings; one that has just left the hook is on its way back.
  for (const each of BAITS) {
    if (each === game.bait) continue
    const peg = PEGS[each], back = each === game.baitWas ? flown : 1
    const sway = 0.03 * Math.sin(now * 1.3 + peg.x) + (game.peg.bait === each ? 0.5 * Math.sin(game.peg.since * 16) * Math.max(0, 1 - game.peg.since / 0.6) : 0)
    sprite(out, SPRITE_OF[each], at.x + (peg.x - at.x) * back, at.y + (peg.y - at.y) * back, sway)
  }

  // A catch in the air: swung in from the hook, tossed in by the net, or tipped back over the rail.
  for (const flight of game.flights) {
    const from = flight.kind === 'tipBack' ? onDeck(flight.from, boat) : flight.from
    const to = flight.fits ? onDeck(TUB_SLOTS[Math.max(0, game.tub.indexOf(flight.id))], boat) : PILE
    const into = flight.kind === 'tipBack' ? splashOf(flight.slot) : OFF_THE_PILE
    const lasts = FLIGHT_SECONDS[flight.kind], grow = flight.kind === 'tipBack' ? 1 : ease(clamp01(flight.t / lasts))
    const where = flightAtOf(flight, from, to, into)
    drawCatch(out, game, flight.id, where.x, where.y, where.rot, grow, where.a)
  }

  // The band of waves slides along the waterline, over the hull and the net.
  sprite(out, 'waves', -(((now * 16) % WAVE_PERIOD) + WAVE_PERIOD) % WAVE_PERIOD, WATERLINE)
  for (const ripple of game.ripples) {
    const u = ripple.age / RIPPLE_LASTS
    ring(out, ripple.x, WATERLINE, 8 + 46 * u, 0.9 * (1 - u), 2.4, 0.28)
  }

  // The line from the rod's tip to the hook: round the bow when the hook is under the boat, sagging when it runs sideways, tight in a tow.
  // The hook swings about its foot as it is pulled, so its eye, where the line is tied, leans the way it came from.
  let turned = Math.max(-0.5, Math.min(0.5, -hook.vx * 0.0016))
  // Beside the bow it leans no further than the bow lets it.
  const edge = BOW.x + game.boat.shift + 2
  if (hook.x >= edge && hook.y - HOOK_EYE < BOW.y + 8) turned = Math.max(turned, Math.asin(Math.max(-1, (edge - hook.x) / HOOK_EYE)))
  const eye = { x: hook.x + HOOK_EYE * Math.sin(turned), y: hook.y - HOOK_EYE * Math.cos(turned) }
  const rod = onDeck(ROD_TIP, boat), path = linePath(rod, eye, boat.shift), from = path[path.length - 2]
  const tight = game.tow ? towAt(game.tow.t, game.tow.bite).tight : 0
  const sag = Math.min(60, Math.abs(eye.x - from.x) * 0.1) * (1 - tight) * (path.length > 2 ? 0.25 : 1)
  // The line trails a little behind a hook that is moving, and never so far that its belly reaches the bow: beside the boat it bellies away from it only.
  const bow = BOW.x + boat.shift + 3, direct = path.length === 2
  const lag = direct && eye.x < bow ? 0 : Math.max(-30, Math.min(30, -hook.vx * 0.05)) * (direct ? 1 : 0.4)
  const midX = direct && eye.x >= bow ? Math.max(bow, (from.x + eye.x) / 2 + lag) : (from.x + eye.x) / 2 + lag, midY = (from.y + eye.y) / 2 + sag
  const pts: number[] = []
  for (let i = 0; i < path.length - 1; i++) pts.push(path[i].x, path[i].y)
  for (let i = path.length > 2 ? 1 : 0; i <= 10; i++) {
    const u = i / 10, v = 1 - u
    pts.push(v * v * from.x + 2 * v * u * midX + u * u * eye.x, v * v * from.y + 2 * v * u * midY + u * u * eye.y)
  }
  line(out, pts, 2.2, 'cream', 0.95)

  // What the idle ladder shows: a glow on what can be touched next, then one move of a ghost hand.
  const want = game.want(), tapsBait = want === 'bare' && guidance !== null && guidance.demoIndex % 2 === 1
  const worm = PEGS.worm
  if (guidance && guidance.glow > 0.01) {
    const pulse = 0.8 * guidance.glow * (0.75 + 0.25 * Math.sin(now * TAU * 0.6))
    if (want === 'tub') sprite(out, 'halo', tub.x, tub.y + 4, 0, 1.3, 0.6, pulse, true)
    else sprite(out, 'halo', hook.x + 6, hook.y - 22, 0, 0.9, 0.9, pulse, true)
    if (want === 'bare') sprite(out, 'halo', worm.x, worm.y + 24, 0, 0.6, 0.6, pulse, true)
  }
  // In a tow the hook is in the shark.
  if (!(game.tow && towAt(game.tow.t, game.tow.bite).held)) sprite(out, 'hook', eye.x, eye.y, turned)
  // A hook just out of the water drips: three drops, each from the moment its drip is heard (`DRIPS` in game.ts).
  for (const [index, at] of DRIPS.entries()) {
    const fall = game.dripping - at
    if (fall > 0 && fall < 0.3) disc(out, hook.x + [-3, 5, 0][index], hook.y + 10 + 520 * fall * fall, 2.2, 3.4 - 2 * fall, 'cream', 0.9)
  }

  // The hand shows one move and changes nothing: it draws the hook a little way down, or a catch up toward the boat, or taps a bait or the full tub.
  if (guidance && guidance.demo !== null) {
    const drags = want !== 'tub' && !tapsBait
    handPose(guidance.demo, drags, hand)
    const squeeze = 1 - 0.08 * hand.press
    const where = want === 'tub' ? { x: tub.x, y: tub.y - 6 } : tapsBait ? { x: worm.x - 2, y: worm.y + 18 } : { x: hook.x + 8, y: hook.y - 14 + (want === 'up' ? -Math.min(150, hook.y - WATERLINE) : 130) * hand.travel }
    sprite(out, 'hand', where.x, where.y + (drags ? 0 : 5 * hand.press), 0, squeeze, squeeze, 0.9 * hand.opacity)
  }
  return out
}

function flightAtOf(flight: Flight, from: Point, to: Point, into: Point): Point & { rot: number; a: number } {
  return flightAt(flight.kind, flight.fits, flight.t, from, to, into)
}

/** The cat: on its seat by the tub, wherever what it is doing has taken it, or curled up in the empty tub. */
function drawCat(out: Item[], game: Game, cat: CatPose, boat: Boat): void {
  const seat = onDeck({ x: CAT.x + cat.x, y: CAT.y - cat.lift }, boat), tint = cat.inked ? 1 : 0
  const sitting: Turned = { x: seat.x, y: seat.y, rot: boat.rot + cat.rot, sx: cat.sx, sy: cat.sy, face: 1 }
  if (cat.frizz > 0.02) sprite(out, 'catFrizz', sitting.x, sitting.y, sitting.rot, cat.sx * 1.06, cat.sy * 1.06, cat.frizz)
  part(out, 'catTail', sitting, PARTS.catTail, cat.tail * 0.5, 1, 1, tint)
  body(out, 'catBody', sitting, 1, tint)
  const neck = hang(sitting, PARTS.catHead.x, PARTS.catHead.y)
  const head: Turned = { x: neck.x, y: neck.y, rot: sitting.rot + cat.head, sx: 1, sy: 1, face: 1 }
  body(out, 'catHead', head, 1, tint)
  const look = catLooksAt(game)
  for (const eye of PARTS.catEyes) {
    const centre = hang(head, eye.x, eye.y)
    // Inked, it is a black cat with two round eyes.
    if (cat.inked) disc(out, centre.x, centre.y, eye.r + 1.5, eye.r + 1.5, 'cream')
    pupil(out, centre, eye.r, look, cat.lid, 1, cat.pupil)
  }
  if (cat.open > 0.02) {
    const mouth = hang(head, PARTS.catMouth.x, PARTS.catMouth.y)
    disc(out, mouth.x, mouth.y + 3 * cat.open, 3.5 + 2.5 * cat.open, 1 + 8 * cat.open, 'dark', 1, head.rot)
  }
  // Dreaming of the shoal, it drools: one drop that runs down from its chin.
  const drool = droolOf(game.cat.act, game.cat.since)
  if (drool !== null) {
    const chin = hang(head, PARTS.catMouth.x + 3, PARTS.catMouth.y + 7)
    disc(out, chin.x, chin.y + 15 * drool * drool, 2.2, 3 + 3 * drool, 'cream', 0.95)
  }
  // The octopus in the tub pats it on the head with one arm, for as long as it nods and purrs.
  const pat = game.cat.act === 'opOctopus' ? patOf(game.cat.since) : null
  if (pat) {
    const from = onDeck({ x: CAT.x + game.cat.slot.x + 14, y: CAT.y + game.cat.slot.y - 6 }, boat), top = hang(head, 0, -50)
    const to = { x: from.x + (top.x - from.x) * pat.reach, y: from.y + (top.y - 9 * pat.bob - from.y) * pat.reach - 22 * Math.sin(Math.PI * pat.reach) * (1 - pat.reach) }
    sprite(out, 'octopusArm', from.x, from.y, Math.atan2(to.y - from.y, to.x - from.x), Math.hypot(to.x - from.x, to.y - from.y) / ARM_LONG, 0.62, 1, false, game.creatures.octopus.inked > 0 ? 1 : 0)
  }
  if (cat.paw) {
    // Its free paw, reaching.
    const from = hang(sitting, PARTS.catShoulder.x, PARTS.catShoulder.y), to = onDeck({ x: CAT.x + cat.x + cat.paw.x, y: CAT.y - cat.lift + cat.paw.y }, boat)
    line(out, [from.x, from.y, (from.x + to.x) / 2, Math.min(from.y, to.y) - 10, to.x, to.y], 9, cat.inked ? 'dark' : 'cream')
    disc(out, to.x, to.y, 7.5, 6.5, cat.inked ? 'dark' : 'cream')
  }
}

/** How long the octopus's arm is as it is painted, from where it is hung to its tip. */
export const ARM_LONG = 100

/** What the frame-budget test counts and the Mount reports as draw calls: sprite stamps plus live strokes. */
export function drawCount(items: readonly Item[]): number {
  return items.length
}
