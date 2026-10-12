import { MAKINGS, draftOf, sailArea, weightOf } from './build'
import { actEnded, leaveBank, ringOnBrook, stepJourney } from './journey'
import { EDDY, FROG_AT_REEDS, LINE, SEAT, SPRITE, STONE, WATER, clamp, distance, shoreAt, type Spot } from './layout'
import { onBoat, ringOut, seatOf, type Piece } from './pieces'
import { FLY, fly, land, lieSound, poseActs, startAct, stepActs } from './play'
import { BREATH, flinch } from './pokeActs'
import { gaze, idle } from './rig'
import { stepScene } from './scenes'
import { hasBroadSail, moodOf } from './traits'
import { EDDY_IN, HOLD_LIFT, PUFF_LIFE, RING_LIFE, STEP, anchorsOf, boatShown, buildNow, emit, gnomeSpot, homesOf, mark, partsToLookAt, ringRadius, type Running, type World } from './world'

// One step of the world on the game's clock. Everything that moves is moved
// here, in fixed steps, so the same touches give the same brook on every
// machine; and every sound of a step is queued on that step.

const FLOAT_SPEED = 220
/** Below this speed a ring's push on a floating thing is over. */
const PUSH_OVER = 14
/** How far off the shore a floating thing rides, and off the stone, which stands further into the brook. */
const FLOAT_OFF_SHORE = 26
const FLOAT_OFF_STONE = 66

/** Plays `dt` seconds in fixed steps. */
export function step(w: World, dt: number): void {
  w.owed += dt
  let steps = 0
  while (w.owed >= STEP - 1e-9 && steps < 8) {
    w.owed -= STEP
    steps += 1
    tick(w, STEP)
  }
  if (w.owed > STEP) w.owed = 0
}

function tick(w: World, dt: number): void {
  w.time += dt
  stepScene(w)
  const build = buildNow(w)
  const seated = w.gnomeAt === 'aboard' && w.show.aboard >= 1
  idle(w.stage, w.time, seated, moodOf(build))
  look(w)
  for (const run of stepActs(w, dt)) actEnded(w, run)
  driftActs(w, dt)
  poseActs(w)
  const j = w.journey
  if (j.phase === 'held' && j.holder?.holds) j.holder.holds(w.stage, anchorsOf(w, { x: w.boat.x, y: w.boat.y }, { x: 0, y: 0 }))
  shown(w)
  // The sun let go of before it was lifted clear sinks back to where it rests.
  if (w.show.sun > 0 && w.hand?.on !== 'sun' && !w.scene) w.show.sun = Math.max(0, w.show.sun - 260 * dt)
  stepBoat(w, dt)
  stepRings(w, dt)
  for (const piece of w.pieces) stepPiece(w, piece, dt)
  for (const puff of w.puffs) puff.age += dt
  while (w.puffs.length > 0 && w.puffs[0].age >= PUFF_LIFE) w.puffs.shift()
}

/** Where everyone's eyes go: the frog's to the berry, the kingfisher's to the deck, the sprite's to the boat, the gnome's to the finger. */
function look(w: World): void {
  const homes = homesOf(w.frame), s = w.stage
  const finger = w.finger.down ? w.finger : null
  const berry = w.pieces.find((piece) => piece.kind === 'berry')
  const berryAt: Spot | null = !berry ? null : berry.mode === 'rest' && onBoat(berry) ? { x: w.boat.x + seatOf(berry, w.pieces).x, y: w.boat.y + seatOf(berry, w.pieces).y } : w.frame < 0 || onBoat(berry) ? berry : null
  const boatAt = w.boat.mode === 'none' ? null : { x: w.boat.x, y: w.boat.y - 60 }
  const set = (rig: { lookX: number; lookY: number }, from: Spot | null, at: Spot | null): void => {
    const eyes = from ? gaze(from, at) : { x: 0, y: 0 }
    rig.lookX = eyes.x; rig.lookY = eyes.y
  }
  // Among the reeds he swims, up to his eyes.
  if (homes.frog === FROG_AT_REEDS) s.frog.under = 0.55
  set(s.frog, homes.frog && { x: homes.frog.x, y: homes.frog.y - 110 }, berryAt ?? finger)
  set(s.bird, homes.bird && { x: homes.bird.x, y: homes.bird.y - 120 }, finger ?? boatAt)
  set(s.sprite, homes.sprite && { x: homes.sprite.x, y: homes.sprite.y - 100 }, finger ?? boatAt)
  const gnome = gnomeSpot(w)
  set(s.gnome, { x: gnome.x, y: gnome.y - 90 }, finger)
}

/** What a scene shows on its way, and what the brook does to the gnome's hat, written over the stage. */
function shown(w: World): void {
  const s = w.stage, show = w.show, j = w.journey
  if (w.scene?.name === 'aboard') {
    // He looks the boat over: at each part in turn, the keel first and the top last.
    const parts = partsToLookAt(w), part = parts[Math.min(parts.length - 1, Math.floor(show.look * parts.length))]
    const at = gnomeSpot(w), eyes = gaze({ x: at.x, y: at.y - 90 }, part)
    s.gnome.lookX = eyes.x
    s.gnome.lookY = eyes.y
    s.gnome.armR = Math.max(s.gnome.armR, show.fix)
    s.gnome.hatTilt *= 1 - show.fix
  }
  if (w.gnomeAt === 'aboard' && show.aboard < 1) {
    // Climbing over the side: he tucks up at the top of the hop and is sat when he lands.
    s.gnome.sit = show.aboard
    s.gnome.squash = -0.2 * Math.sin(show.aboard * Math.PI)
    s.gnome.armL = s.gnome.armR = 0.6 * Math.sin(show.aboard * Math.PI)
  }
  if (w.gnomeAt === 'pad' || show.pad > 0) {
    s.gnome.sit = 1 - show.pad
    s.gnome.hide = 0
    s.gnome.armL = Math.max(s.gnome.armL, 0.5 * Math.sin(show.pad * Math.PI))
    if (show.pad >= 1) { s.gnome.mouth = 0.8; s.gnome.lookX = -0.6 }
  }
  if (show.fix > 0 && w.scene?.name !== 'aboard') s.gnome.armR = Math.max(s.gnome.armR, show.fix)
  // He points only when his arms are his own: not in an answer, and not in a scene.
  if (w.scene || w.gnomeAt !== 'aboard' || w.acts.some((run) => run.act.who.includes('gnome'))) s.gnome.point = 0
  // He shuffles astern, away from a pebble, and back when it is gone.
  const away = buildNow(w).deck.includes('pebble') ? 1 : 0
  show.scoot += (away - show.scoot) * Math.min(1, STEP * 7)
  if (Math.abs(away - show.scoot) < 0.01) show.scoot = away
  s.boat.billow += show.sigh
  s.boat.tilt += 0.09 * show.rock * Math.sin(w.time * 6.5)
  s.place.pile = Math.max(s.place.pile, show.pile)
  // Running before the water, his hat streams out behind him.
  const running = w.boat.mode === 'brook' && w.hand?.on !== 'boat' && (j.phase === 'out' || j.phase === 'pan' || j.phase === 'enter' || j.phase === 'leave')
  if (running && hasBroadSail(buildNow(w))) {
    s.gnome.stream = Math.max(s.gnome.stream, 0.7)
    s.boat.billow = Math.max(s.boat.billow, 0.7)
  }
}

/** A making afloat in the middle of its own water act that a ring has pushed: the act goes on while the whole of it drifts away from the ring, in open water. */
function driftActs(w: World, dt: number): void {
  for (const run of w.acts) {
    const piece = run.piece
    if (!piece || !floatsInAct(run) || Math.hypot(piece.pushX, piece.pushY) <= PUSH_OVER) continue
    run.drop.x = clamp(run.drop.x + piece.pushX * dt, 60, 1120)
    run.drop.y = clamp(run.drop.y + piece.pushY * dt, WATER.top + 30, shoreAt(run.drop.x) - FLOAT_OFF_SHORE)
    const fade = Math.exp(-2.6 * dt)
    piece.pushX *= fade; piece.pushY *= fade
  }
}

/** Whether `run` is a making's own act on the water that leaves it floating: the twig turning, the leaf as a raft, the feather, the berry, the cap. A sunk pebble does not float. */
const floatsInAct = (run: Running): boolean => !run.brook && run.piece !== null && run.piece.mode === 'act' && run.act.leaves === 'float'

function stepPiece(w: World, piece: Piece, dt: number): void {
  ;[piece.squash, piece.squashV] = ringOut(piece.squash, piece.squashV, dt, 420, 22)
  ;[piece.swing, piece.swingV] = ringOut(piece.swing, piece.swingV, dt, 90, 9)
  if (piece.roll > 0) {
    piece.roll = Math.max(0, piece.roll - dt * 3.2)
    // The berry has rolled to its place.
    if (piece.roll === 0) emit(w, 'tick')
  }
  const standing = piece.mode === 'held' ? 0.4 : onBoat(piece) ? 1 : 0
  piece.stand += (standing - piece.stand) * Math.min(1, dt * 16)
  if (piece.mode === 'held') {
    // It hangs a little behind the finger and swings like something held by one end.
    const before = piece.x
    piece.x += (w.finger.x - piece.x) * Math.min(1, dt * 30)
    piece.y += (w.finger.y - HOLD_LIFT - piece.y) * Math.min(1, dt * 30)
    piece.swingV += clamp((piece.x - before) * 0.9, -6, 6) * dt * 60 * 0.05
  } else if (piece.mode === 'fly') {
    piece.t += dt
    const k = Math.min(1, piece.t / piece.flight)
    const seat = seatOf(piece, w.pieces)
    const to = piece.knock ?? (piece.place.on === 'bank' ? piece.place : piece.place.on === 'hull' ? SEAT : { x: w.boat.x + seat.x, y: w.boat.y + seat.y })
    const ease = k * k * (3 - 2 * k)
    piece.x = piece.fromX + (to.x - piece.fromX) * ease
    piece.y = piece.fromY + (to.y - piece.fromY) * ease - Math.sin(k * Math.PI) * piece.arc
    if (k >= 1 && piece.knock) {
      // It knocks where the boat had no room for it, with its own landing sound, seen and heard on this step, and flies on to where it rests.
      piece.knock = null
      emit(w, ...lieSound(piece.kind))
      fly(piece, FLY.toss * 0.8, 60)
      piece.squash = 0.7
    } else if (k >= 1) land(w, piece)
  } else if (piece.mode === 'float' && piece.place.on === 'bank') {
    // It rides the brook along the shore until it is off its own spot, and only there comes in: it never
    // goes under the stone, the boat on it or the moss on its way.
    const to = piece.place
    const go = FLOAT_SPEED * dt, across = to.x - piece.x
    const pushed = Math.hypot(piece.pushX, piece.pushY)
    if (pushed > PUSH_OVER) {
      // A ring has pushed it: it rides away from the ring, in open water, until the push has died, and then makes for the shore again.
      piece.x = clamp(piece.x + piece.pushX * dt, 60, 1120)
      piece.y = clamp(piece.y + piece.pushY * dt, WATER.top + 30, shoreAt(piece.x) - FLOAT_OFF_SHORE)
      const fade = Math.exp(-2.6 * dt)
      piece.pushX *= fade; piece.pushY *= fade
      piece.swingV += piece.pushX * dt * 0.05
    } else if (Math.abs(across) > go) {
      piece.x += Math.sign(across) * go
      // It looks ahead, so it has swung out before it reaches the stone.
      const shore = Math.min(shoreAt(piece.x), shoreAt(piece.x + Math.sign(across) * 90))
      piece.y += (shore - (shore === STONE.edge ? FLOAT_OFF_STONE : FLOAT_OFF_SHORE) - piece.y) * Math.min(1, dt * 6)
    } else if (to.y - piece.y > go) {
      piece.x = to.x
      piece.y += go
    } else {
      piece.x = to.x; piece.y = to.y
      piece.mode = 'rest'
      piece.squash = 0.5
      piece.rider = null
      emit(w, 'knock', piece.kind === 'pebble' ? 0.8 : MAKINGS[piece.kind].part === 'mast' ? 1 : 1.25)
    }
  }
}

function stepBoat(w: World, dt: number): void {
  const boat = w.boat, build = buildNow(w)
  const aboard = w.gnomeAt === 'aboard'
  const weight = weightOf(build, aboard), area = sailArea(build)
  const wet = boat.mode === 'afloat' || boat.mode === 'brook'
  const before = wet ? boat.dipV : boat.squashV
  ;[boat.lean, boat.leanV] = ringOut(boat.lean, boat.leanV, dt, wet ? 34 : 110, wet ? 3.2 : 11)
  ;[boat.squash, boat.squashV] = ringOut(boat.squash, boat.squashV, dt, 300, 18)
  ;[boat.dip, boat.dipV] = ringOut(boat.dip, boat.dipV, dt, 58, 5)
  if (boat.wet > 0) boat.wet = Math.max(0, boat.wet - dt)
  // The sprite's breath: on the step it reaches the boat a sail fills, and a bare hull only nods.
  const breath = w.stage.sprite.breath, sprite = homesOf(w.frame).sprite
  if (breath <= 0) w.blown = false
  const half = build.hull ? MAKINGS[build.hull].hw : 0
  const inWay = sprite !== null && breath > 0 && boat.mode !== 'none' && boat.mode !== 'held' && w.hand?.on !== 'boat' && boat.x < SPRITE.mouth.x
  const reached = inWay && SPRITE.mouth.x - BREATH.reach * breath <= boat.x + half
  if (reached && !w.blown) {
    w.blown = true
    if (area > 0) { emit(w, 'flap', 1.25 - area * 0.35); boat.billowV += 9; boat.leanV -= 0.8 * area }
    else { emit(w, 'whiff'); boat.leanV -= 0.5 }
  }
  const fill = reached && area > 0 ? 1 : 0
  boat.billowV += ((fill - boat.billow) * 70 - boat.billowV * 9) * dt
  boat.billow += boat.billowV * dt
  const push = fill ? (330 * area * dt) / (weight / 6) : 0
  if (w.hand?.on === 'boat') {
    const tx = w.finger.x + w.hand.dx, ty = w.finger.y + w.hand.dy
    const was = boat.x
    boat.x += (tx - boat.x) * Math.min(1, dt * 26)
    boat.y += (ty - boat.y) * Math.min(1, dt * 26)
    boat.leanV += clamp((was - boat.x) * 0.02, -0.6, 0.6)
  } else if (boat.mode === 'glide') {
    boat.glide = Math.min(1, boat.glide + dt / 0.22)
    const k = boat.glide * boat.glide * (3 - 2 * boat.glide)
    boat.x = boat.fromX + (SEAT.x - boat.fromX) * k
    boat.y = boat.fromY + (SEAT.y - boat.fromY) * k
    if (boat.glide >= 1) {
      boat.mode = 'stone'
      boat.squashV += 5
      emit(w, 'thock', 1.25 - weight / 30)
    }
  } else if (boat.mode === 'fall') {
    const line = LINE + draftOf(build, aboard)
    boat.vy += 2400 * dt
    boat.y += boat.vy * dt
    if (boat.y >= line) {
      boat.mode = 'afloat'
      boat.dip = boat.y - line
      boat.dipV = Math.min(170, boat.vy * 0.3)
      boat.vy = 0
      w.rings.push({ x: boat.x, y: LINE + 14, age: 0, strength: 1.6, hitBoat: true, hitFrog: false })
      emit(w, 'splash', 1.3 - weight / 28)
    }
  } else if (boat.mode === 'afloat') {
    boat.vx -= push
    // Past the eddy's end the brook's own pull has it.
    if (boat.x < EDDY_IN) boat.vx -= 220 * dt
    boat.vx *= Math.exp(-1.1 * dt)
    boat.x += boat.vx * dt
    if (boat.x > EDDY.right) { boat.x = EDDY.right; boat.vx = -Math.abs(boat.vx) * 0.25 }
    boat.y = LINE + draftOf(build, aboard) + boat.dip + Math.sin(w.time * 1.9) * 2.4
    if (Math.abs(boat.vx) > 2) { boat.restX = Math.max(EDDY_IN, boat.x); mark(w, false) }
    if (boat.x <= EDDY.left) leaveBank(w)
  } else if (boat.mode === 'brook') {
    boat.vx -= push
    stepJourney(w, dt)
  } else {
    boat.x = SEAT.x; boat.y = SEAT.y
  }
  // The hull groans at the bottom of the dip a heavy thing gave it.
  const after = wet ? boat.dipV : boat.squashV
  if (boat.groan && before > 0 && after <= 0) { boat.groan = false; emit(w, 'groan') }
}

function stepRings(w: World, dt: number): void {
  const boat = w.boat, frog = homesOf(w.frame).frog
  for (const ring of w.rings) {
    ring.age += dt
    const reach = ringRadius(ring)
    if (!ring.hitBoat && (boat.mode === 'afloat' || boat.mode === 'brook') && w.hand?.on !== 'boat') {
      // The ring meets the boat where the boat is drawn.
      const shownX = boatShown(w).x
      const gap = Math.max(0, Math.abs(shownX - ring.x) - 120)
      if (gap < 380 && reach >= gap) {
        ring.hitBoat = true
        const way = Math.sign(shownX - ring.x) || -1
        const weight = weightOf(buildNow(w), w.gnomeAt === 'aboard')
        const strength = ring.strength * (1 - gap / 380)
        if (boat.mode === 'brook') ringOnBrook(w, way, strength)
        else {
          boat.vx += (way * strength * 250) / (weight / 6)
          boat.leanV += way * 1.5 * ring.strength
          boat.dipV += 36 * ring.strength
        }
        emit(w, 'lap', 1.3 - weight / 26)
      }
    }
    // A ring pushes whatever floats away from it: a making or a hull on its way to the shore, as it pushes the boat.
    for (const piece of w.pieces) {
      const floats = piece.mode === 'float' || (piece.mode === 'act' && w.acts.some((run) => run.piece === piece && floatsInAct(run)))
      if (!floats || piece.place.on !== 'bank' || ring.pushed?.includes(piece)) continue
      const far = distance(ring.x, ring.y, piece.x, piece.y)
      if (far < 16 || far > 380 || reach < far) continue
      ;(ring.pushed ??= []).push(piece)
      const strength = (ring.strength * (1 - far / 380) * 420) / (0.8 + MAKINGS[piece.kind].weight * 0.5)
      piece.pushX += ((piece.x - ring.x) / far) * strength
      piece.pushY += ((piece.y - ring.y) / far) * strength * 0.6
      piece.squash = 0.4
    }
    if (!ring.hitFrog && frog && reach >= distance(ring.x, ring.y, frog.x, frog.y) - 60) {
      ring.hitFrog = true
      // He flinches unless he is busy with something else.
      if (!w.acts.some((run) => run.act.who.includes('frog'))) startAct(w, flinch)
    }
  }
  while (w.rings.length > 0 && w.rings[0].age >= RING_LIFE) w.rings.shift()
}
