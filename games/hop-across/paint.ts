import { CLOTH_COL, COLS, LOOP, ROWS, SEAT_ROW, type Board } from './board'
import { eyesOf, hamperOpen, paintOnlooker } from './ends'
import { LOOKS, OLD_LOOK, bell, bubble, cake, car, cat, duck, dust, fish, fishShadow, glowRing, hand, log, lorry, pawn, pawnShadow, pupils, slice, splash, trainFace, trainRunning, turtle, type CatPose, type DuckPose, type PawnPose, type TurtlePose } from './figures'
import { handPose, type Guidance, type HandPose } from './guidance'
import { CAT, FEET, FOLD_X, LANES, LEAF_SQUEEZE, SIGHT, SLIDE, SQUARE, centreX, centreY } from './layout'
import { PEEL_LENGTH, SPIT_SECONDS, SWELL_SECONDS, TRAIN_SECONDS, UNDER_SECONDS, blinking, blown, breath, clamp01, dusting, lookBehind, logLanded, riderSway, shadowRow, earTrail, gaze, landSquash, nosed, overShell, roll, settle, shakeDry, shoved, shunted, swell, trainRun, waddle, windmill, yawn, type Arc, type Roll, type Squash, type Swell } from './motion'
import type { Scenery } from './scenery'
import { LONG_AGO, PERCH, type BoardView, type MoverView, type TrainView } from './view'

// Draws what view.ts keeps: everything that moves or is alive, over the stamped picture of what stands still.
// It returns how many figures it painted, which is what this game reports as its draw calls.

type Ctx = CanvasRenderingContext2D

const CAR_PAINT = ['#f2b33d', '#4fb3bf', '#ef6f8f', '#9a86e8', '#8ccf5a']
const squash: Squash = { wide: 1, tall: 1, lean: 0 }
const rolled: Roll = { along: 0, pitch: 0, bob: 0, turn: 0 }
const step: Arc = { along: 0, lift: 0, tip: 0, stretch: 1 }
const pose: PawnPose = { x: 0, y: 0, lift: 0, wide: 1, tall: 1, lean: 0, flat: 0, ears: 0, goX: 0, goY: 0, shut: false, lookX: 0, lookY: 0, wet: 0, track: 0, sleepers: false, whirl: 0, mill: 0, blown: 0, hide: 0, dust: null, lie: 0, napkin: 0, toes: 0, wide_eyed: 0, time: 0 }
const swollen: Swell = { wide: 1, tall: 1, shut: false, big: 0 }
const catPose: CatPose = { lookX: 0, lookY: 0, purr: 0, flinch: 0, keen: 0, shut: false, sway: 0, twitch: 0, tail: 0, duck: 0 }
const turtlePose: TurtlePose = { x: 0, y: 0, depth: 0, lookX: 0, lookY: 0, shut: false, bubbles: -1, slosh: 0, peek: 0 }
const landedOn = { dip: 0, roll: 0 }
const duckPose: DuckPose = { x: 0, y: 0, lift: 0, face: 1, rock: 0, flat: 0, quack: 0, shake: 0, shut: false, track: 0 }
const eye = { x: 0, y: 0 }
const handOut: HandPose = { travel: 0, press: 0, opacity: 0 }

/** A bump that rises at once and dies away over `over` seconds: 1 at `since` 0, 0 from `over` on and before 0. */
function pulse(since: number, over: number): number {
  return since < 0 || since >= over ? 0 : 1 - since / over
}

/** The river nearest the rabbit, or -1. */
function nearestRiver(board: Board): number {
  const rabbit = board.family[0]
  let river = -1
  for (let c = 0; c < COLS; c++) if (board.lanes[c].kind === 'river' && (river < 0 || Math.abs(c - rabbit.c) < Math.abs(river - rabbit.c))) river = c
  return river
}

/** Fills `pose` for pawn `who` at `time`, and says whether it is to be drawn at all. */
function posePawn(view: BoardView, who: number, time: number, by: number, river: number): boolean {
  const board = view.board!
  const pv = view.pawns[who], one = board.family[who]
  const now = view.where(who, time)
  if (now.hidden) return false
  const flat = view.flatness(who, time)
  const since = time - now.landed
  const still = now.air < 0
  landSquash(who, still ? since : -1, squash)
  // It stands a little above the board on whatever it rides, and comes down when that has gone.
  const mover = one.on ? board.lanes[one.c].movers[one.on.index] : null
  const wantPerch = time < pv.roofUntil ? PERCH.car : mover ? PERCH[mover.kind] : 0
  pv.perch += (wantPerch - pv.perch) * Math.min(1, by * 18)
  // The dozy one lies down on a log.
  const wantLie = who === 2 && still && mover !== null && mover.kind === 'log' && flat <= 0 ? 1 : 0
  pv.lie += (wantLie - pv.lie) * Math.min(1, by * 6)
  const wiggle = pulse(time - pv.wiggleAt, 0.4) * Math.sin((time - pv.wiggleAt) * 46)
  // The eager one bounces on the lorry's bed, and looks round to see who saw it peel up.
  const bounce = who === 1 && still && mover !== null && mover.kind === 'lorry' && flat <= 0 ? Math.abs(Math.sin(time * 9)) * 9 : 0
  const upFor = time - pv.upAt
  const lookRound = who === 1 && upFor > 0 && upFor < 0.9 ? Math.sin(upFor * 14) * 3 : 0
  // The picnic: a bite now and then, once the eating has begun.
  const watched = view.picnic.eatAt > LONG_AGO
  const eating = pv.sliceAt !== null && (watched ? time > view.picnic.eatAt : view.finished)
  const bite = eating ? pulse((time + who * 0.7) % (watched && time - view.picnic.eatAt < 1.3 ? 0.26 : 2.6 + who * 0.9), 0.2) : 0
  pose.x = now.x + wiggle * 4
  pose.y = now.y
  pose.lift = now.lift + pv.perch * (1 - Math.max(0, flat)) + bounce
  pose.wide = squash.wide * (still ? 1 : 2 - now.stretch) * (1 + bite * 0.06)
  pose.tall = squash.tall * now.stretch * (1 + breath(who, time)) * (1 - bite * 0.09)
  // The rabbit leans towards the cloth, the eager one leans forward on its toes, the wobbly one teeters.
  const idle = who === 0 ? 0.05 : who === 1 ? 0.09 : who === 3 ? 0.07 * Math.sin(time * 2.3) : 0
  // A rider leans as its log rides up over a turtle, and wobbles when the fish noses the log from below.
  const log = mover !== null && mover.kind === 'log' ? view.movers[one.c][one.on!.index] : null
  const sway = log ? riderSway(time - log.tiltAt, time - log.rockAt) : 0
  pose.lean = squash.lean + now.tip * (pv.goX || 1) + now.spin + (still && flat <= 0 ? idle : 0) + sway
  pose.flat = flat
  pose.ears = still ? earTrail(who, 1, since) : earTrail(who, now.air, -1)
  pose.goX = pv.goX
  pose.goY = pv.goY
  // On a lorry's bed its ears stream for as long as the lorry rolls.
  const bed = mover !== null && mover.kind === 'lorry' ? view.movers[one.c][one.on!.index] : null
  const rolling = bed ? (time - bed.start) / bed.dur : -1
  if (bed && still && flat <= 0 && rolling > 0 && rolling < 1) {
    pose.ears = Math.max(pose.ears, Math.sin(rolling * Math.PI) * 1.3)
    pose.goX = 0
    pose.goY = mover!.dir
  }
  // The dozy one sleeps on its log and dozes on as a pancake.
  // Flat, the rabbit blinks up at whatever is parked on her.
  pose.shut = (flat < 0.5 && blinking(who, time)) || pv.lie > 0.5 || (who === 2 && flat > 0.5) || bite > 0.5 || (who === 0 && flat > 0.5 && time % 0.9 < 0.14)
  // Wet and tyre-marked for a few hops, which the view counts; when they are made, the marks fade.
  pose.wet = pv.wetHops > 0 ? (time >= pv.wetAt - SPIT_SECONDS ? 1 : 0) : clamp01(1 - (time - pv.wetOff) / 0.8)
  pose.track = flat > 0.5 || pv.trackHops > 0 ? 1 : clamp01(1 - (time - pv.trackOff) / 0.8)
  pose.sleepers = pv.sleepers
  pose.whirl = who === 0 && still ? shakeDry(time - pv.wetAt) : 0
  // On a log she windmills her ears for balance; a train passing a lane or two away lays everyone's ears over, away from it.
  // The wobbly one windmills its ears upright after every landing.
  pose.mill = flat > 0 ? 0 : who === 0 ? windmill(time - pv.millAt) : who === 3 && still ? windmill(since) * 0.5 : 0
  const away = one.c - view.wind.col
  pose.blown = flat <= 0 && away !== 0 && Math.abs(away) <= 2 ? blown(time - view.wind.at) * Math.sign(away) : 0
  // Standing still short of the picnic, her ears lean towards the cloth.
  if (who === 0 && still && flat <= 0 && one.c < CLOTH_COL && pose.blown === 0 && pose.mill === 0 && pose.whirl === 0) pose.blown = 0.14 * clamp01(since / 0.5)
  // The wobbly one hides behind its ears while the fish's shadow is in the lane beside it.
  pose.hide = who === 3 && still && flat <= 0 && river >= 0 && Math.abs(one.c - river) === 1 ? 1 : 0
  pose.lie = pv.lie
  pose.dust = flat > 0 ? null : dusting(time - pv.dustAt)
  pose.napkin = pv.napkinAt === null ? 0 : clamp01((time - pv.napkinAt) / 0.25) * (watched ? 1 - clamp01((time - view.picnic.eatAt) / 0.3) : 1)
  pose.toes = who === 1 ? 1 : 0
  pose.wide_eyed = Math.max(flat > 0.5 && who !== 2 ? 1 : 0, pulse(time - pv.wideAt, 0.9))
  pose.time = time + who
  // The rabbit looks towards the picnic; a small one looks at the one ahead of it.
  const ahead = who === 0 ? null : view.pawns[who - 1]
  pose.lookX = flat > 0.5 ? 0 : who === 0 ? 1.6 : Math.sign((ahead ? ahead.baseX : now.x) - now.x) * 1.4 + lookRound
  pose.lookY = flat > 0.5 ? -1.5 : 0
  return true
}

/** The movers of the columns from `from` up to `to`, clipped where they go under the cards. */
function movers(view: BoardView, ctx: Ctx, board: Board, views: MoverView[][], trains: TrainView[], from: number, to: number, time: number, gloss: boolean, rx: number, ry: number): number {
  let figures = 0
  ctx.save()
  ctx.beginPath()
  ctx.rect(centreX(from) - SQUARE.w / 2, SIGHT.top, (to - from) * SQUARE.w, SIGHT.bottom - SIGHT.top)
  ctx.clip()
  for (const turtles of [true, false]) {
    for (let c = from; c < to; c++) {
      const lane = board.lanes[c]
      for (let index = 0; index < lane.movers.length; index++) {
        const mover = lane.movers[index], mv = views[c][index]
        if ((mover.kind === 'turtle') !== turtles) continue
        const u = (time - mv.start) / mv.dur
        const x = centreX(c)
        if (mover.kind === 'turtle') {
          const depth = mv.depthFrom + (mv.depthTo - mv.depthFrom) * roll('turtle', u, rolled).along
          const ridden = board.family.some((one) => one.c === c && one.on !== null && one.on.index === index)
          turtlePose.x = x; turtlePose.y = centreY(mover.at)
          turtlePose.depth = depth
          turtlePose.lookX = ridden ? 0 : Math.sign(rx - x) * 0.8
          turtlePose.lookY = ridden ? -1 : Math.sign(ry - turtlePose.y) * 0.5
          turtlePose.shut = ridden && (time + index) % 2.6 < 0.45
          turtlePose.bubbles = (time - mv.bubblesAt) / 0.7
          turtlePose.slosh = u >= 0 && u < 1 ? rolled.bob : 0
          // Its head comes out to look up at whoever stands on it, even with its shell awash.
          turtlePose.peek = ridden && depth < 0.9 ? 0.6 : 0
          turtle(ctx, turtlePose, gloss)
          figures++
          continue
        }
        const after = settle(mover.kind, time - mv.start - mv.dur)
        if (mv.mode === 'shove' && u >= 0 && u < 1) {
          // Shoved out of the lane ahead of the train.
          shoved(u, rolled)
          const y = centreY(mv.shoveFrom + mv.shoveDir * rolled.along * (ROWS + 3))
          if (mover.kind === 'car') car(ctx, { x, y, dir: mv.faced, nod: rolled.pitch, pop: 1, colour: CAR_PAINT[(c * 2 + index) % CAR_PAINT.length], lookBack: 1 }, gloss)
          else lorry(ctx, { x, y, dir: mv.faced, shake: rolled.pitch * 0.4, puff: -1 }, gloss)
          figures++
          continue
        }
        if (mv.mode === 'shunt') shunted(u, rolled)
        else roll(mover.kind, u, rolled)
        const coord = mover.at + view.shift(c, index, time, views)
        const moving = u >= 0 && u < 1
        // A lane is a loop, so a mover going out at one end is also the one coming in at the other.
        for (let turn = -1; turn <= 1; turn++) {
          const row = coord + turn * LOOP
          if (row < -2.4 || row > ROWS + 1.4) continue
          const y = centreY(row)
          if (mover.kind === 'car') car(ctx, { x, y, dir: mover.dir, nod: (moving ? rolled.pitch : 0) + after, pop: pulse(time - mv.popAt, 0.5), colour: CAR_PAINT[(c * 2 + index) % CAR_PAINT.length], lookBack: lookBehind(time - mv.lookBackAt) }, gloss)
          else if (mover.kind === 'lorry') lorry(ctx, { x, y: y + (moving ? rolled.bob * SQUARE.h : 0), dir: mover.dir, shake: after, puff: (time - mv.start) / 0.5 }, gloss)
          else {
            // Landed on, it dips and rolls a little.
            logLanded(time - mv.popAt, landedOn)
            log(ctx, { x, y, dir: mover.dir, bob: (moving ? rolled.bob : 0) + after - 0.09 * landedOn.dip, turn: coord * 0.25 + 0.05 * landedOn.roll, tilt: 0.09 * overShell(time - mv.tiltAt) + 0.07 * nosed(time - mv.rockAt) + 0.035 * landedOn.roll }, gloss)
          }
          figures++
        }
      }
    }
  }
  // A train on its run takes the whole lane.
  for (let c = from; c < to; c++) {
    const tv = trains[c], u = (time - tv.runAt) / TRAIN_SECONDS
    if (!board.lanes[c].train || u < 0 || u >= 1) continue
    const span = SIGHT.bottom - SIGHT.top + SQUARE.h * 3 + 120
    const y = tv.runDir === 1 ? SIGHT.top - 60 + span * trainRun(u) : SIGHT.bottom + 60 - span * trainRun(u)
    trainRunning(ctx, centreX(c), y, tv.runDir, tv.shut, clamp01((tv.runs - 1) / 2), gloss)
    figures++
  }
  ctx.restore()
  return figures
}

/**
 * What is alive in the columns from `from` up to `to`. On the table, at their ends: the train's face in its arch
 * and the onlookers' eyes. On the board: the bells. The two are drawn apart while a leaf is lifted, since only
 * the board is then seen narrower.
 */
function alive(ctx: Ctx, board: Board, scenery: Scenery | null, trains: TrainView[], rings: BoardView['rings'], from: number, to: number, time: number, rx: number, ry: number, table = true, leaf = true, poked: BoardView['poked'] = null): number {
  let figures = 0
  for (let c = from; c < to; c++) {
    const train = board.lanes[c].train, tv = trains[c]
    if (table && train && time >= tv.runAt + TRAIN_SECONDS) {
      const woke = time - tv.wakeAt
      trainFace(ctx, {
        x: centreX(c),
        far: train.arch === 'far',
        awake: train.awake ? (woke < 0 ? 0 : woke < 0.22 ? 0.5 : 1) : 0,
        bubble: train.awake ? 0 : (time - tv.snoreAt) / 0.5,
        steam: train.awake ? woke / 0.6 : -1,
        breath: train.awake ? 0 : Math.sin(time * 1.3 + c),
        bleary: clamp01((tv.runs - 1) / 2),
        yawn: train.awake ? 0 : yawn(time - tv.runAt - TRAIN_SECONDS - 0.2),
      })
      figures++
    }
    if (!scenery) continue
    const column = scenery.columns[c], eyes = eyesOf(column.far)
    if (table && eyes) {
      const ex = centreX(c)
      let ey = eyes.y, gap = eyes.gap, r = eyes.r, shut = (time * 0.9 + c * 1.7) % (4.1 + c * 0.3) < 0.14
      // Touched, it swells from its chin in its own way, and its eyes go with it.
      if (poked && poked.c === c && poked.what === column.far && time - poked.at < SWELL_SECONDS) {
        swell(poked.what, time - poked.at, swollen)
        paintOnlooker(ctx, column.far, ex, swollen.wide, swollen.tall)
        const chin = LANES.y - 10
        ey = chin + (ey - chin) * swollen.tall
        gap *= swollen.wide
        r *= 1 + swollen.big * 0.25
        shut = shut || swollen.shut
        figures++
      }
      gaze(ex, ey, rx, ry - 50, r * 0.45, eye)
      pupils(ctx, ex, ey, gap, r, eye.x, eye.y, shut, column.far === 'teddy' ? '#c98f54' : column.far === 'robot' ? '#a5d3e2' : column.far === 'giraffe' ? '#f4c13d' : '#f6d7b8')
      figures++
    }
    if (leaf && column.plate >= 0) {
      let ring = 0
      for (const one of rings) if (one.c === c && one.r === column.plate) ring = Math.max(ring, pulse(time - one.at, 0.7))
      bell(ctx, centreX(c), centreY(column.plate) + 2, ring, time)
      figures++
    }
  }
  return figures
}

/** Whoever sits on the seat of a cloth: awake and on tiptoe with the cake at the far side, asleep over the crumbs once its picnic is behind the family. */
function host(view: BoardView, ctx: Ctx, c: number, asleep: boolean, time: number, rx: number, ry: number, gloss: boolean): number {
  const seatX = centreX(c) + 8, seatY = centreY(SEAT_ROW) + FEET + 10
  const sway = breath(0, time * 0.7 + 3 + c)
  pose.x = seatX; pose.y = seatY; pose.goX = 0; pose.goY = 0; pose.flat = 0; pose.wet = 0; pose.track = 0; pose.sleepers = false
  pose.whirl = 0; pose.hide = 0; pose.dust = null; pose.lie = 0; pose.napkin = 0; pose.time = time
  pose.mill = 0; pose.blown = 0
  if (asleep) {
    // Asleep it only breathes. Bounced off, its tummy rings and it chuckles in its sleep; touched, it starts
    // up with a snort, looks about, and sinks back.
    const bounced = time - view.old.nearTummyAt, snort = time - view.old.snortAt
    const ring = bounced >= 0 ? Math.exp(-6 * bounced) * Math.cos(22 * bounced) : 0
    const giggle = bounced > 0.25 && bounced < 0.95 ? Math.sin(bounced * 42) * 0.05 : 0
    const up = snort >= 0 && snort < 0.9 ? Math.sin(Math.min(1, snort / 0.12) * Math.PI * 0.5) * (snort < 0.6 ? 1 : 1 - (snort - 0.6) / 0.3) : 0
    pose.lift = up * 10; pose.wide = 1.04 + 0.2 * ring; pose.tall = 0.96 * (1 + sway * 1.6) * (1 - 0.24 * ring) * (1 + up * 0.1); pose.lean = 0.16 * (1 - up) + giggle
    pose.ears = 0.5 - up * 1.6; pose.shut = up < 0.5; pose.lookX = up * Math.sin(snort * 14) * 2; pose.lookY = 0; pose.wide_eyed = up; pose.toes = 0
    pawnShadow(ctx, OLD_LOOK, pose)
    pawn(ctx, OLD_LOOK, pose, gloss)
    bubble(ctx, seatX + 16, seatY - 92, up > 0 ? 2 : ((time * 0.35 + c) % 1.4) / 1.0)
    cake(ctx, seatX - 58, seatY + 14, 0, 0)
    return 4
  }
  const tummy = time - view.old.tummyAt, perk = pulse(time - view.old.earsAt, 1.1)
  const boing = tummy >= 0 ? Math.exp(-6 * tummy) * Math.cos(22 * tummy) : 0
  const chuckle = tummy > 0.25 && tummy < 0.95 ? Math.sin(tummy * 42) * 0.05 : 0
  const laughing = time - view.old.laughAt
  const laugh = laughing > 0 && laughing < 0.9 ? Math.sin(laughing * 48) * 0.07 : 0
  // Touched, it bobs twice on its toes with its ears up and lifts the cake to show it.
  const hello = pulse(time - view.old.helloAt, 0.8)
  const bob = hello > 0 ? Math.abs(Math.sin((time - view.old.helloAt) * Math.PI * 2.5)) * hello : 0
  pose.lift = 4 + Math.abs(laugh) * 30 + bob * 16; pose.toes = 1
  pose.wide = 1 + 0.2 * boing; pose.tall = (1 - 0.24 * boing) * (1 + sway)
  pose.lean = -0.09 + chuckle + laugh
  pose.ears = -Math.max(perk, hello) * 1.6
  pose.shut = (time + 2.4) % 4.3 < 0.13 || chuckle !== 0 || laugh !== 0
  gaze(seatX, seatY - 100, rx, ry - 60, 2.4, eye)
  pose.lookX = eye.x; pose.lookY = eye.y
  pose.wide_eyed = perk * 0.6
  pawnShadow(ctx, OLD_LOOK, pose)
  pawn(ctx, OLD_LOOK, pose, gloss)
  cake(ctx, seatX - 60, seatY + 14, 4 + sway * 90 + perk * 6 + bob * 22, Math.max(0, 5 - view.picnic.served))
  return 3
}

/** The slice in front of each of the family that has one, on its way from the cake or on its plate. */
function slices(view: BoardView, ctx: Ctx, time: number): number {
  let figures = 0
  const cakeX = centreX(CLOTH_COL) - 52, cakeY = centreY(SEAT_ROW) + FEET
  const eaten = view.picnic.eatAt > LONG_AGO ? clamp01((time - view.picnic.eatAt) / 3) * 0.6 : view.finished ? 0.6 : 0
  for (let who = 0; who < view.pawns.length; who++) {
    const pv = view.pawns[who]
    if (pv.sliceAt === null) continue
    const now = view.where(who, time)
    if (now.hidden) continue
    const size = 0.8 + LOOKS[who].size * 0.3
    for (const [startAt, side] of [[pv.sliceAt, -1], [pv.extraAt, 1]] as const) {
      if (startAt === null || time < startAt) continue
      const u = clamp01((time - startAt) / 0.4)
      const tx = now.x + side * 30 * LOOKS[who].size, ty = now.y + 8
      slice(ctx, cakeX + (tx - cakeX) * u, cakeY + (ty - cakeY) * u - Math.sin(u * Math.PI) * 60, size, side === -1 ? eaten : eaten * 0.5)
      figures++
    }
  }
  return figures
}

/** The duck, at its post at the board's edge or wherever its showing has taken it. */
function paintDuck(view: BoardView, ctx: Ctx, time: number, offset: number, sliding: boolean, gloss: boolean): number {
  const d = view.duck
  if (time >= d.hiddenFrom && time < d.hiddenUntil) return 0
  const now = view.duckWhere(time)
  const moving = now.u < 1 && d.start > LONG_AGO
  waddle(now.u, step)
  duckPose.x = now.x + (d.to ? offset : 0)
  duckPose.y = now.y
  duckPose.lift = moving ? (d.how === 'spit' ? 150 * 4 * now.u * (1 - now.u) : step.lift * SQUARE.h) : sliding ? Math.abs(Math.sin(time * 9)) * 5 : 0
  duckPose.face = d.face
  duckPose.rock = moving ? (d.how === 'spit' ? now.u * Math.PI * 2 : step.tip) : sliding ? Math.sin(time * 18) * 0.16 : Math.sin(time * 1.1) * 0.02
  duckPose.flat = d.peelFrom !== null && time >= d.peelFrom ? Math.max(0, 1 - (time - d.peelFrom) / PEEL_LENGTH[0]) : d.flatFrom !== null && time >= d.flatFrom ? 1 : 0
  duckPose.quack = pulse(time - d.quackAt, 0.5) > 0 ? Math.abs(Math.sin((time - d.quackAt) * 20)) : 0
  duckPose.shake = pulse(time - d.shakeAt, 0.5)
  duckPose.shut = (time + 0.6) % 3.4 < 0.12 || duckPose.flat > 0.5
  duckPose.track = d.track ? 1 : 0
  const riding = d.to !== null && d.to.index !== undefined
  if (riding) {
    ctx.save()
    ctx.beginPath()
    ctx.rect(-4000, SIGHT.top - 80, 8000, SIGHT.bottom - SIGHT.top + 80)
    ctx.clip()
  }
  duck(ctx, duckPose, gloss)
  if (riding) ctx.restore()
  return 1
}

/** Draws everything that moves, and returns how many figures that was. */
export function paint(view: BoardView, ctx: Ctx, time: number, by: number, guidance: Guidance | null, gloss: boolean): number {
  const board = view.board
  if (!board) return 0
  let figures = 0
  const sliding = view.prev !== null
  /** Where the board's own frame is drawn: a slide's length to the right when the slide begins, and home when it ends. */
  const offset = sliding ? SLIDE - view.slid : 0
  const rabbit = view.where(0, time)
  const rx = rabbit.x + offset, ry = rabbit.y
  const river = nearestRiver(board)

  // The cat, which looks over the things that stand at the far ends.
  const down = view.cat.duckFrom > view.cat.upFrom ? clamp01((time - view.cat.duckFrom) / 0.2) : 1 - clamp01((time - view.cat.upFrom) / 0.35)
  if (down < 1 && !sliding && view.leaf <= 0) {
    gaze(CAT.x, CAT.y, rx, ry - 50, 11, eye)
    catPose.lookX = eye.x
    catPose.lookY = eye.y
    const purring = time - view.cat.purrAt
    catPose.purr = purring < 0 || purring > 1.5 ? 0 : Math.sin(clamp01(purring / 1.5) * Math.PI)
    catPose.flinch = pulse(time - view.cat.flinchAt, 0.8)
    catPose.keen = pulse(time - view.cat.keenAt, 1.4)
    catPose.shut = (time + 1.1) % 5.3 < 0.14
    catPose.sway = Math.sin(time * 0.55) * 0.018
    catPose.twitch = pulse(time % 7.7, 0.25)
    catPose.tail = purring > 0.7 && purring < 1.5 ? Math.sin(((purring - 0.7) / 0.8) * Math.PI) : 0
    catPose.duck = down
    cat(ctx, catPose, gloss)
    figures += 1
  }

  // The board the slide is leaving: its lanes up to the fold, with everything on them standing still.
  if (view.prev) {
    ctx.save()
    ctx.translate(-view.slid, 0)
    figures += alive(ctx, view.prev, view.prevScenery, view.prevTrains, view.rings, 0, CLOTH_COL, time, rx + view.slid, ry)
    figures += movers(view, ctx, view.prev, view.prevMovers, view.prevTrains, 0, CLOTH_COL, time, gloss, rx + view.slid, ry)
    if (view.prev.lanes[0].kind === 'cloth') figures += host(view, ctx, 0, true, time, rx, ry, gloss)
    ctx.restore()
  }

  ctx.save()
  ctx.translate(offset, 0)
  const lrx = rx - offset

  // The fish's shadow keeps beside the rabbit, in the river nearest her, and comes nearer when she waits beside it.
  const fishUp = view.effects.some((effect) => effect.kind === 'fish' && time - effect.start < UNDER_SECONDS + 0.9 && time >= effect.start)
  if (river >= 0) {
    // It keeps to the row next to hers; when she hops on the spot beside its river it slides one whole square
    // nearer, to her own row and towards her side of the water, and stays there until she moves.
    const near = view.fishAt.near ? Math.sign(board.family[0].c - river) * 22 : 0
    const tx = centreX(river) + near, ty = centreY(shadowRow(board.family[0].r, view.fishAt.near, ROWS))
    if (!view.fishAt.set) { view.fishAt.x = tx; view.fishAt.y = ty; view.fishAt.set = true }
    const ease = Math.min(1, by * 2.2)
    view.fishAt.x += (tx - view.fishAt.x) * ease
    view.fishAt.y += (ty - view.fishAt.y) * ease
    if (!fishUp) {
      fishShadow(ctx, view.fishAt.x, view.fishAt.y, Math.sin(time * 2.3))
      figures++
    }
  }

  // The idle glow: the square the hand will show, and a ring round her feet.
  const glow = guidance && !sliding && view.leaf <= 0 ? guidance.glow : 0
  const show = view.offer()
  if (glow > 0.01 && show) {
    const breathe = glow * (0.62 + 0.38 * Math.sin(time * 3.1))
    ctx.fillStyle = `rgba(255, 252, 214, ${0.42 * breathe})`
    ctx.fillRect(centreX(show.c) - SQUARE.w / 2 + 6, centreY(show.r) - SQUARE.h / 2 + 6, SQUARE.w - 12, SQUARE.h - 12)
    glowRing(ctx, lrx, ry - 4, 50, 19, breathe)
    figures += 2
  }

  // The leaf behind the fold is lifted: what stands on it is drawn as narrow as the leaf shows.
  const lifted = view.leaf > 0 && !sliding
  if (lifted) {
    figures += alive(ctx, board, view.scenery, view.trains, view.rings, 0, CLOTH_COL, time, lrx, ry, true, false)
    ctx.save()
    ctx.translate(FOLD_X, 0)
    ctx.scale(1 - LEAF_SQUEEZE * view.leaf, 1)
    ctx.translate(-FOLD_X, 0)
  }
  const first = 0, split = lifted ? CLOTH_COL : COLS
  figures += alive(ctx, board, view.scenery, view.trains, view.rings, first, split, time, lrx, ry, !lifted, true, view.poked)
  // The hamper that was touched, behind the far cloth or the home one: its flap flies up and an apple hops out and back.
  const opened = time - view.hamper.at
  if (opened >= 0 && opened < 0.8 && !sliding) {
    const u = opened / 0.8
    hamperOpen(ctx, centreX(view.hamper.c), u < 0.2 ? u / 0.2 : u < 0.7 ? 1 : 1 - (u - 0.7) / 0.3, Math.sin(clamp01((u - 0.1) / 0.75) * Math.PI))
    figures++
  }
  // Flat pawns lie on the road, under whatever rolls over them, and so does the duck.
  const duckFlat = view.duck.flatFrom !== null && time >= view.duck.flatFrom && (view.duck.peelFrom === null || time < view.duck.peelFrom)
  if (duckFlat) figures += paintDuck(view, ctx, time, 0, sliding, gloss)
  for (let who = 0; who < view.pawns.length; who++) {
    if (view.flatness(who, time) <= 0.5 || !posePawn(view, who, time, by, river)) continue
    pawn(ctx, LOOKS[who], pose, false)
    figures++
    if (who === 2) {
      bubble(ctx, pose.x + 26, pose.y - 8, ((time * 0.8) % 1.3) / 1.0)
      figures++
    }
  }
  figures += movers(view, ctx, board, view.movers, view.trains, first, split, time, gloss, lrx, ry)
  if (lifted) {
    ctx.restore()
    figures += alive(ctx, board, view.scenery, view.trains, view.rings, CLOTH_COL, COLS, time, lrx, ry)
    figures += movers(view, ctx, board, view.movers, view.trains, CLOTH_COL, COLS, time, gloss, lrx, ry)
  }

  // Whoever sits on a seat.
  if (board.lanes[0].kind === 'cloth') figures += host(view, ctx, 0, true, time, lrx, ry, gloss)
  figures += host(view, ctx, CLOTH_COL, false, time, lrx, ry, gloss)

  // The family, the far ones first. The few of them are sorted in place.
  const order = view.order
  for (let i = 1; i < order.length; i++) {
    const who = order[i], y = view.where(who, time).y
    let j = i - 1
    while (j >= 0 && view.where(order[j], time).y > y) { order[j + 1] = order[j]; j-- }
    order[j + 1] = who
  }
  for (const who of order) {
    if (view.flatness(who, time) > 0.5 || !posePawn(view, who, time, by, river)) continue
    pawnShadow(ctx, LOOKS[who], pose)
    pawn(ctx, LOOKS[who], pose, gloss)
    figures += 2
  }
  figures += slices(view, ctx, time)

  // What a touch threw up: dust, a splash, a bubble, and the fish.
  for (const effect of view.effects) {
    const since = time - effect.start
    if (since < 0) {
      // The fish waits at the board's edge with its mouth open for whoever a log is carrying off it.
      if (effect.kind === 'fish' && effect.early !== undefined && since >= -effect.early) {
        fish(ctx, { x: effect.x, y: effect.y, up: Math.min(1, (since + effect.early) / 0.14), puff: 0, open: 1, holds: null, pleased: false }, gloss)
        figures++
      }
      continue
    }
    if (effect.kind === 'dust') {
      if (since < 0.35) { dust(ctx, effect.x, effect.y, since / 0.35, effect.size, 'rgba(255, 250, 235, 0.9)'); figures++ }
    } else if (effect.kind === 'splash') {
      if (since < 0.6) { splash(ctx, effect.x, effect.y, since / 0.6, effect.size); figures++ }
    } else if (effect.kind === 'blip') {
      if (since < 0.7) { bubble(ctx, view.fishAt.x + 8, view.fishAt.y - 18 - since * 40, 0.25 + since * 0.7); figures++ }
    } else if (since < UNDER_SECONDS + 0.9) {
      // Up with the pawn in its mouth, two puffs of the cheeks, the spit, a pleased look, and down again.
      const spat = since - UNDER_SECONDS
      const up = spat < 0 ? Math.min(1, since / 0.16) * (1 + 0.12 * Math.sin(clamp01(since / 0.16) * Math.PI)) : spat < 0.55 ? 1 : 1 - clamp01((spat - 0.55) / 0.3)
      const puff = spat < 0 ? Math.abs(Math.sin((since / UNDER_SECONDS) * Math.PI * 2)) : pulse(spat, 0.2)
      fish(ctx, { x: effect.x, y: effect.y, up, puff, open: spat < 0 ? 0 : 1 - clamp01((spat - 0.2) / 0.3), holds: spat < 0 ? (effect.who < 0 ? '#f7d038' : LOOKS[effect.who].ear) : null, pleased: spat > 0.25 }, gloss)
      figures++
    }
  }
  ctx.restore()

  if (!duckFlat) figures += paintDuck(view, ctx, time, offset, sliding, gloss)

  // The ghost hand shows one hop she could make now: a press on the square the glow is on.
  if (guidance && guidance.demo !== null && show && !sliding && view.leaf <= 0) {
    handPose(guidance.demo, false, handOut)
    hand(ctx, centreX(show.c), centreY(show.r) + 6, handOut.press, handOut.opacity)
    figures++
  }
  return figures
}

/** Seconds a spit takes from the moment the water closes over somebody, for whoever times a scene by it. */
export const SPIT_AFTER = UNDER_SECONDS + SPIT_SECONDS
