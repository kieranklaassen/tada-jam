import { CLOTH_COL, COLS, LOOP, NEXT_COL, ROWS, isSeat, logOn, mod, type Board, type BoardEvent, type Lane, type MoverKind } from './board'
import { LOOKS } from './figures'
import type { Bystander, Onlooker } from './bystanders'
import type { Guidance } from './guidance'
import { DUCK_POST, FEET, SLIDE, SQUARE, centreX, centreY } from './layout'
import { CAB_SLIDE, DEPTH, ROLL_UP_SECONDS, SPIT_TURNS, rollUp, HOP_SECONDS, LEAP_LONGER, LEAP_UNDER, MARK_HOPS, PEEL_AFTER, PEEL_LENGTH, ROLL_SECONDS, SPIT_SECONDS, TRAIN_AFTER, TRAIN_SECONDS, UNDER_SECONDS, WORLD_AT, clamp01, hopArc, hopDelay, peel, roll, scurry, shunted, spotLift, vault, type Arc, type Roll } from './motion'
import { paint } from './paint'
import type { Scenery } from './scenery'

// The board as it is shown. The model steps in an instant when the finger lands; this turns what the step did
// into motion that starts at once and catches up: a hop is an arc, a mover's step a roll, a spit a flight. A new
// hop never waits for the last one to finish: every piece sets off again from wherever it is drawn. Nothing here
// decides anything, and all of it runs on the game's attended time. This file keeps where everything is and
// when it set off; paint.ts draws it.

/** A square, or a square on a mover: then the place rides along with that mover's roll. `lead` is how many rows ahead of the mover's resting place it is, for a rider that will not be on it when the roll ends. */
export type Place = { c: number; r: number; index?: number; lead?: number }
type SegKind = 'hop' | 'vault' | 'scurry' | 'spot' | 'under' | 'spit' | 'rollUp' | 'drop' | 'slide' | 'tumble'
/** `way` is which way round a spat pawn goes, for its roll upright. */
type Seg = { kind: SegKind; start: number; dur: number; to: Place; way?: 1 | -1 }

export type PawnView = {
  segs: Seg[]
  /** Where it was drawn when the last step came, which is where its next motion starts. */
  baseX: number
  baseY: number
  goX: number
  goY: number
  flatFrom: number | null
  peelFrom: number | null
  /** How many more hops of the line it stays wet, and when the wet began to fade once they were made. */
  wetHops: number
  wetOff: number
  /** When it landed wet: the rabbit shakes herself dry from then. */
  wetAt: number
  /** How many more hops of the line it keeps its tyre track, and when the track began to fade. */
  trackHops: number
  trackOff: number
  /** When it began to dust a tyre track off its tummy with an ear, at the picnic. */
  dustAt: number
  /** When she landed on a log: her ears windmill from then. */
  millAt: number
  /** The marks on it are the sleepers' stripes and not a tyre's. */
  sleepers: boolean
  wideAt: number
  wiggleAt: number
  roofUntil: number
  perch: number
  /** How far it has lain down, eased by the draw. */
  lie: number
  /** When it peeled up: the eager one looks round from then. */
  upAt: number
  /** The picnic: when its slice arrives, when the napkin goes round it, when a second slice arrives. */
  sliceAt: number | null
  napkinAt: number | null
  extraAt: number | null
}

export type MoverView = {
  kind: MoverKind
  dir: 1 | -1
  start: number
  dur: number
  /** Rows it travels in this step. */
  dist: number
  mode: 'roll' | 'shunt' | 'shove'
  shoveFrom: number
  shoveDir: 1 | -1
  /** Which way it faced when the train shoved it: a lorry met head on goes into the tunnel tail first. */
  faced: 1 | -1
  carried: number
  carriedAt: number
  /** When somebody landed on it: a car's driver pops up, a log dips. */
  popAt: number
  lookBackAt: number
  tiltAt: number
  rockAt: number
  depthFrom: number
  depthTo: number
  bubblesAt: number
}

export type TrainView = { runAt: number; runDir: 1 | -1; runs: number; shut: boolean; wakeAt: number; snoreAt: number }
/** `early` is how long before `start` the fish is already up with its mouth open, waiting. */
export type Effect = { kind: 'splash' | 'fish' | 'dust' | 'blip'; x: number; y: number; start: number; who: number; size: number; early?: number }
export type Ring = { c: number; r: number; at: number }

/** The duck: where it set off from, where it is going (a place on the board, or a point of the table), and what has befallen it. */
export type DuckView = {
  fromX: number
  fromY: number
  to: Place | null
  toX: number
  toY: number
  start: number
  dur: number
  how: 'waddle' | 'spit'
  face: 1 | -1
  flatFrom: number | null
  peelFrom: number | null
  hiddenFrom: number
  hiddenUntil: number
  quackAt: number
  shakeAt: number
  track: boolean
}

export const LONG_AGO = -1000
/** How high a pawn stands above the board on each thing it rides, in stage units. */
export const PERCH: Record<MoverKind, number> = { car: 28, lorry: 16, log: 10, turtle: 12 }

const arc: Arc = { along: 0, lift: 0, tip: 0, stretch: 1 }
const rolled: Roll = { along: 0, pitch: 0, bob: 0, turn: 0 }
const at = { x: 0, y: 0, lift: 0, tip: 0, stretch: 1, hidden: false, air: -1, landed: LONG_AGO, spin: 0 }
export type Drawn = typeof at

function freshPawn(x: number, y: number, perch: number): PawnView {
  return { segs: [], baseX: x, baseY: y, goX: 1, goY: 0, flatFrom: null, peelFrom: null, wetHops: 0, wetOff: LONG_AGO, wetAt: LONG_AGO, trackHops: 0, trackOff: LONG_AGO, dustAt: LONG_AGO, millAt: LONG_AGO, sleepers: false, wideAt: LONG_AGO, wiggleAt: LONG_AGO, roofUntil: LONG_AGO, perch, lie: 0, upAt: LONG_AGO, sliceAt: null, napkinAt: null, extraAt: null }
}

function freshMover(kind: MoverKind, dir: 1 | -1, count: number): MoverView {
  return { kind, dir, start: LONG_AGO, dur: 1, dist: 0, mode: 'roll', shoveFrom: 0, shoveDir: 1, faced: dir, carried: 0, carriedAt: LONG_AGO, popAt: LONG_AGO, lookBackAt: LONG_AGO, tiltAt: LONG_AGO, rockAt: LONG_AGO, depthFrom: DEPTH[count] ?? 0, depthTo: DEPTH[count] ?? 0, bubblesAt: LONG_AGO }
}

/** How far a pawn turned `spin` radians round its feet must be lifted so that its head, and not its feet, is on the ground when it is upside down. */
const onHead = (who: number, spin: number): number => 84 * LOOKS[who].size * (1 - Math.cos(spin)) * 0.5

const freshMovers = (lane: Lane): MoverView[] => lane.movers.map((mover) => freshMover(mover.kind, mover.dir, mover.kind === 'turtle' ? mover.count ?? 0 : 0))
const freshTrain = (): TrainView => ({ runAt: LONG_AGO, runDir: 1, runs: 0, shut: false, wakeAt: LONG_AGO, snoreAt: LONG_AGO })

export class BoardView {
  board: Board | null = null
  /** What stands still round the board, for the things in it that are alive: the onlookers' eyes, the bells, whoever sits on a seat. */
  scenery: Scenery | null = null
  prevScenery: Scenery | null = null
  pawns: PawnView[] = []
  movers: MoverView[][] = []
  trains: TrainView[] = []
  effects: Effect[] = []
  rings: Ring[] = []
  steppedAt = LONG_AGO
  cat = { purrAt: LONG_AGO, flinchAt: LONG_AGO, keenAt: LONG_AGO, duckFrom: LONG_AGO, upFrom: LONG_AGO }
  old = { tummyAt: LONG_AGO, nearTummyAt: LONG_AGO, earsAt: LONG_AGO, laughAt: LONG_AGO, helloAt: LONG_AGO, snortAt: LONG_AGO }
  /** The bystanders, touched: the onlooker that is answering, when a hamper was opened and behind which cloth, and when any of them was last touched. */
  poked: { c: number; what: Onlooker; at: number } | null = null
  hamper = { at: LONG_AGO, c: CLOTH_COL }
  pokedAt = LONG_AGO
  /** The wind of a train on its run: when it comes by, and in which column. */
  wind = { at: LONG_AGO, col: 0 }
  /** Where the fish's shadow is drawn, and whether it has come near: she hopped on the spot beside its river, and it stays near until she moves. */
  fishAt = { x: 0, y: 0, set: false, near: false }
  order: number[] = []
  duck: DuckView = { fromX: DUCK_POST.x, fromY: DUCK_POST.y, to: null, toX: DUCK_POST.x, toY: DUCK_POST.y, start: LONG_AGO, dur: 1, how: 'waddle', face: 1, flatFrom: null, peelFrom: null, hiddenFrom: LONG_AGO, hiddenUntil: LONG_AGO, quackAt: LONG_AGO, shakeAt: LONG_AGO, track: false }
  /** The crossing is over: the family sits on the cloth with its slices, and the cake stand is bare. */
  finished = false
  /** The picnic as it is served: how many slices have left the cake, and when the eating began. */
  picnic = { served: 0, eatAt: LONG_AGO }
  /** The leaf behind the fold, lifted: 0 flat, 1 as high as it goes. */
  leaf = 0
  /** The board the slide is leaving, with its movers, while it slides; and how far the picture has slid, in stage units. */
  prev: Board | null = null
  prevMovers: MoverView[][] = []
  prevTrains: TrainView[] = []
  slid = 0
  /** Figures painted by the last draw, and the largest picture stamped: what a canvas game reports as its draw calls. */
  figures = 0

  /** The board as it was left: everything stands where the save has it, and nothing eases in. */
  reset(board: Board, scenery: Scenery | null = this.scenery, finished = false): void {
    this.board = board
    this.scenery = scenery
    this.pawns = board.family.map((one) => freshPawn(centreX(one.c), centreY(one.r) + FEET, one.on ? PERCH[board.lanes[one.c].movers[one.on.index].kind] : 0))
    this.movers = board.lanes.map(freshMovers)
    this.trains = board.lanes.map(freshTrain)
    this.effects = []
    this.rings = []
    this.order = board.family.map((_, who) => who)
    this.fishAt.set = false
    this.fishAt.near = false
    this.finished = finished
    this.picnic.served = finished ? 5 : 0
    this.picnic.eatAt = LONG_AGO
    this.leaf = 0
    this.prev = null
    this.slid = 0
    this.poked = null
    this.duckHome(LONG_AGO)
  }

  /** A bystander was touched, and answers as itself. */
  poke(by: Bystander, time: number): void {
    this.pokedAt = time
    if (by.who === 'duck') {
      this.duck.quackAt = time
      this.duck.shakeAt = time + 0.3
    } else if (by.who === 'hamper') this.hamper = { at: time, c: by.c }
    else if (by.who === 'old') this.old.helloAt = time
    else if (by.who === 'sleeper') this.old.snortAt = time
    else this.poked = { c: by.c, what: by.what, at: time }
  }

  /** The cat was touched. */
  purr(time: number): void {
    this.cat.purrAt = time
  }

  /** Whether anything a touch set off is still moving, so that the idle ladder waits for it. */
  busy(time: number): boolean {
    return time - this.steppedAt < 1.6 || time - this.cat.purrAt < 1.6 || time - this.pokedAt < 1.2
  }

  /** How far, in rows, a mover is drawn from where its step leaves it: its roll still to come, and what was left of the last roll when this one was asked for, which it makes up in a moment. */
  shift(col: number, index: number, time: number, movers: MoverView[][] = this.movers): number {
    const view = movers[col][index]
    const left = view.carried * (1 - clamp01((time - view.carriedAt) / 0.1))
    if (view.mode === 'shove' || view.dist === 0) return left
    const t = (time - view.start) / view.dur
    const along = view.mode === 'shunt' ? shunted(t, rolled).along : roll(view.kind, t, rolled).along
    return view.dir * view.dist * (along - 1) + left
  }

  placeY(place: Place, time: number): number {
    const ride = place.index === undefined ? 0 : (this.shift(place.c, place.index, time) + (place.lead ?? 0)) * SQUARE.h
    return centreY(place.r) + FEET + ride
  }

  /** Where the model has a pawn now: its square, riding along with its mover if it stands on one. */
  private rest(who: number): Place {
    const one = this.board!.family[who]
    return one.on ? { c: one.c, r: one.r, index: one.on.index } : { c: one.c, r: one.r }
  }

  /** Where pawn `who` is drawn at `time`. Writes into one shared record. */
  where(who: number, time: number): Drawn {
    const view = this.pawns[who]
    let x = view.baseX, y = view.baseY, from: Place | null = null
    at.lift = 0; at.tip = 0; at.stretch = 1; at.hidden = false; at.air = -1; at.landed = LONG_AGO; at.spin = 0
    for (const seg of view.segs) {
      if (time < seg.start) break
      if (from) { x = centreX(from.c); y = this.placeY(from, time) }
      const tx = centreX(seg.to.c), ty = this.placeY(seg.to, time)
      const u = (time - seg.start) / seg.dur
      if (u >= 1) {
        from = seg.to
        if (seg.kind !== 'under') at.landed = seg.start + seg.dur
        continue
      }
      if (seg.kind === 'vault' || seg.kind === 'scurry') {
        // A leapfrog: she goes high over, and the small one goes under her along the ground.
        if (seg.kind === 'vault') vault(u, arc)
        else scurry(u, arc)
        at.x = x + (tx - x) * arc.along
        at.y = y + (ty - y) * arc.along
        at.lift = arc.lift * SQUARE.h
        at.tip = arc.tip
        at.stretch = arc.stretch
      } else if (seg.kind === 'hop' || seg.kind === 'drop') {
        hopArc(who, u, arc)
        at.x = x + (tx - x) * arc.along
        at.y = y + (ty - y) * arc.along
        at.lift = arc.lift * SQUARE.h * (seg.kind === 'drop' ? 0.45 : 1)
        at.tip = arc.tip
        at.stretch = arc.stretch
      } else if (seg.kind === 'spot') {
        at.x = tx; at.y = ty
        at.lift = spotLift(who, u) * SQUARE.h
        at.stretch = 1 + 0.12 * Math.sin(u * Math.PI)
      } else if (seg.kind === 'slide') {
        at.x = x + (tx - x) * u
        at.y = y + (ty - y) * u
        return at
      } else if (seg.kind === 'tumble') {
        // Down the lifted leaf, head over heels, each a little after the one before.
        const v = u * u
        at.x = x + (tx - x) * v
        at.y = y + (ty - y) * v
        at.spin = v * Math.PI * 2 * (1 + who * 0.5)
        at.lift = 12 * Math.sin(u * Math.PI)
      } else if (seg.kind === 'under') {
        at.x = tx; at.y = ty
        at.hidden = true
      } else if (seg.kind === 'rollUp') {
        // Down on its head, a small one rolls upright where it landed: the wobbly one three times round first.
        at.x = tx; at.y = ty
        at.spin = rollUp(who, u) * Math.PI * 2 * (seg.way ?? 1)
        at.lift = onHead(who, at.spin)
      } else {
        // Spat out: a high arc, head over heels. The rabbit comes down on her feet; a small one comes down on its head.
        at.x = x + (tx - x) * u
        at.y = y + (ty - y) * u
        at.spin = u * Math.PI * 2 * (tx >= x ? 1 : -1) * (who === 0 ? 1 : SPIT_TURNS)
        at.lift = (who === 0 ? 1.7 : 1.1) * SQUARE.h * 4 * u * (1 - u) + (who === 0 ? 0 : onHead(who, at.spin))
      }
      at.air = u
      return at
    }
    const place = from ?? null
    if (place) { at.x = centreX(place.c); at.y = this.placeY(place, time) } else { at.x = x; at.y = y }
    return at
  }

  /** Everything is caught where it is drawn at this moment, before the model moves on. */
  private freeze(time: number): void {
    for (let who = 0; who < this.pawns.length; who++) {
      const now = this.where(who, time), view = this.pawns[who]
      view.baseX = now.x
      view.baseY = now.y
      view.segs = []
    }
  }

  /** One lane's movers set off on their step: `before` is the lane as it stood, `lane` as it stands now, and `t0` when the step begins. */
  private stepLane(col: number, before: Lane, lane: Lane, events: readonly BoardEvent[], time: number, t0: number): void {
    const views = this.movers[col]
    for (let index = 0; index < views.length; index++) {
      const view = views[index], mover = lane.movers[index]
      view.carried = this.shift(col, index, time)
      view.carriedAt = time
      view.start = LONG_AGO
      view.mode = 'roll'
      view.dir = mover.dir
      view.dist = mover.kind === 'turtle' ? 0 : mod((mover.at - before.movers[index].at) * mover.dir, LOOP)
    }
    const train = this.trains[col]
    for (const event of events) {
      if (!('col' in event) || event.col !== col || event.type === 'flatten' || event.type === 'bell') continue
      switch (event.type) {
        case 'roll':
          views[event.index].start = t0
          views[event.index].dur = ROLL_SECONDS[event.kind]
          break
        case 'shunt': {
          const view = views[event.index]
          view.mode = 'shunt'
          view.start = t0 + ROLL_SECONDS.lorry * 0.45
          view.dur = 0.24
          view.lookBackAt = view.start
          break
        }
        case 'over':
          views[event.index].tiltAt = t0
          views[event.turtle].bubblesAt = t0 + 0.1
          break
        case 'turtle': {
          const view = views[event.index], u = clamp01((time - view.start) / view.dur)
          view.depthFrom = view.depthFrom + (view.depthTo - view.depthFrom) * u
          view.depthTo = DEPTH[event.count]
          view.start = t0
          view.dur = ROLL_SECONDS.turtle
          break
        }
        case 'wake':
          train.wakeAt = t0 + 0.12
          break
        case 'snore':
          train.snoreAt = t0 + 0.1
          train.runs = 0
          break
        case 'train':
          train.runAt = t0 + TRAIN_AFTER
          this.wind.at = train.runAt + TRAIN_SECONDS * 0.3
          this.wind.col = col
          train.runDir = event.from === 'far' ? 1 : -1
          train.runs += 1
          train.shut = train.runs >= 4
          for (const index of event.shoved) {
            const view = views[index]
            view.mode = 'shove'
            view.shoveFrom = before.movers[index].at + view.carried
            view.faced = before.movers[index].dir
            view.shoveDir = train.runDir
            view.carried = 0
            view.start = train.runAt
            view.dur = TRAIN_SECONDS
          }
          break
        case 'nose':
          views[event.index].rockAt = t0 + 0.1
          break
        case 'blip':
          this.fishAt.near = true
          this.effects.push({ kind: 'blip', x: centreX(event.col), y: this.fishAt.y - 20, start: t0 + 0.16, who: 0, size: 1 })
          break
      }
    }
  }

  /** The step the model has just made: every piece sets off from where it is drawn now. */
  apply(board: Board, events: readonly BoardEvent[], time: number): void {
    const before = this.board
    if (!before || this.pawns.length !== board.family.length) {
      this.reset(board)
      return
    }
    this.freeze(time)
    for (let who = 0; who < this.pawns.length; who++) {
      const view = this.pawns[who]
      if (!board.family[who].flat) view.flatFrom = null
      view.peelFrom = null
      // Wet and a tyre track last a few hops of the line, counted here and never timed.
      if (view.wetHops > 0 && --view.wetHops === 0) view.wetOff = time
      if (view.trackHops > 0 && --view.trackHops === 0) view.trackOff = time
    }
    const t0 = time + WORLD_AT
    // The fish's shadow stays near until she moves to another square.
    if (before.family[0].c !== board.family[0].c || before.family[0].r !== board.family[0].r) this.fishAt.near = false
    this.board = board
    for (let c = 0; c < COLS; c++) this.stepLane(c, before.lanes[c], board.lanes[c], events, time, t0)
    this.steppedAt = time
    const gone = (who: number) => events.some((e) => (e.type === 'knock' || (e.type === 'spit' && e.by !== 'water')) && e.who === who)
    const lane = (c: number, index: number) => board.lanes[c].movers[index]

    for (const event of events) {
      if (!('who' in event)) continue
      const who = event.who, view = this.pawns[who], one = board.family[who]
      const start = time + hopDelay(who), hopEnd = start + HOP_SECONDS[who]
      switch (event.type) {
        case 'hop': {
          view.goX = Math.sign(event.to.c - event.from.c)
          view.goY = Math.sign(event.to.r - event.from.r)
          let to: Place = { c: event.to.c, r: event.to.r }
          if (event.mover) {
            const mover = lane(event.to.c, event.mover.index)
            // Still aboard when the roll ends: it lands on the mover wherever the roll has brought it. Carried off
            // the board this very step: it lands on it and rides it out. A car rolls out from under it.
            if (one.on && !gone(who)) to = this.rest(who)
            else if (mover.kind !== 'car') to = { ...to, index: event.mover.index, lead: mover.dir * this.movers[event.to.c][event.mover.index].dist }
            else view.roofUntil = t0 + ROLL_SECONDS.car * 0.5
            // The driver's head pops up; a log dips and rolls a little.
            if (mover.kind === 'car' || mover.kind === 'log') this.movers[event.to.c][event.mover.index].popAt = hopEnd
          }
          // Down on the lorry's cab, and a slide back onto the bed.
          const mover = event.cab && event.mover && one.on && !gone(who) ? lane(event.to.c, event.mover.index) : null
          if (mover) {
            view.segs.push({ kind: 'hop', start, dur: HOP_SECONDS[who], to: { ...to, r: to.r + mover.dir } }, { kind: 'slide', start: hopEnd + 0.05, dur: CAB_SLIDE, to })
          } else if (event.leap) view.segs.push(who === 0 ? { kind: 'vault', start, dur: HOP_SECONDS[0] * LEAP_LONGER, to } : { kind: 'scurry', start: time + LEAP_UNDER, dur: HOP_SECONDS[who], to })
          else view.segs.push({ kind: 'hop', start, dur: HOP_SECONDS[who], to })
          if (who === 0 && event.landing === 'log') view.millAt = hopEnd
          if (event.landing === 'cloth') this.old.earsAt = hopEnd
          if (event.landing === 'grass' || event.landing === 'bank' || event.landing === 'road') this.effects.push({ kind: 'dust', x: centreX(event.to.c), y: centreY(event.to.r) + FEET, start: hopEnd, who, size: LOOKS[who].size })
          break
        }
        case 'spot': {
          // On the spot, on whatever it stands on: a rider is carried, and one carried off the board rides out first.
          const was = before.family[who]
          const to: Place = one.on && !gone(who) ? this.rest(who) : was.on && gone(who) ? { c: was.c, r: was.r, index: was.on.index, lead: lane(was.c, was.on.index).dir * this.movers[was.c][was.on.index].dist } : { c: event.at.c, r: event.at.r }
          if (event.why === 'cab' && event.off) {
            // Down on the cab of a lorry whose bed is taken, wherever its roll has brought it, and a slide back off it.
            const lorry = lane(event.off.c, event.off.index)
            const cab: Place = { c: event.off.c, r: event.off.r, index: event.off.index, lead: lorry.dir * this.movers[event.off.c][event.off.index].dist }
            view.goX = Math.sign(event.off.c - event.at.c)
            view.goY = Math.sign(event.off.r - event.at.r)
            view.segs.push({ kind: 'hop', start, dur: HOP_SECONDS[who], to: cab }, { kind: 'slide', start: hopEnd + 0.05, dur: CAB_SLIDE, to })
            break
          }
          view.segs.push({ kind: 'spot', start, dur: HOP_SECONDS[who] * (who === 0 ? 1 : 0.8), to })
          // Off the tummy of whoever sits there: the old rabbit at the far side, or the one asleep on the home cloth.
          if (event.why === 'seat') this.old[event.at.c >= CLOTH_COL - 1 ? 'tummyAt' : 'nearTummyAt'] = start + HOP_SECONDS[who] * 0.5
          break
        }
        case 'stuck':
          view.wiggleAt = time
          break
        case 'spit': {
          // Into the water, down with a turtle, or off the edge with the log: under for a moment, then out of the
          // fish in a high arc.
          const hopped = event.by === 'water' && (event.from.c !== event.at.c || event.from.r !== event.at.r)
          const under = hopped ? hopEnd : t0 + ROLL_SECONDS.log * 0.8
          if (hopped) {
            view.goX = Math.sign(event.at.c - event.from.c)
            view.goY = Math.sign(event.at.r - event.from.r)
            view.segs.push({ kind: 'hop', start, dur: HOP_SECONDS[who], to: event.at })
          }
          view.segs.push({ kind: 'under', start: Math.max(under, view.segs.length ? view.segs[view.segs.length - 1].start + view.segs[view.segs.length - 1].dur : under), dur: UNDER_SECONDS, to: event.at })
          const down = view.segs[view.segs.length - 1].start
          view.segs.push({ kind: 'spit', start: down + UNDER_SECONDS, dur: SPIT_SECONDS, to: event.to })
          if (who > 0) view.segs.push({ kind: 'rollUp', start: down + UNDER_SECONDS + SPIT_SECONDS, dur: ROLL_UP_SECONDS[who], to: event.to, way: event.to.c >= event.at.c ? 1 : -1 })
          // Down with a turtle, she treads water for a blink before the fish has her: a wriggle, and her ears going round.
          if (event.by === 'turtle') {
            view.wiggleAt = down - 0.32
            if (who === 0) view.millAt = down - 0.4
          }
          // A log that has floated over the place leaves the fish the strip of water beside it, on the side it spits to.
          const beside = logOn(board.lanes[event.at.c], event.at.r) ? Math.sign(event.to.c - event.at.c || -1) * SQUARE.w * 0.37 : 0
          const x = centreX(event.at.c) + beside, y = centreY(event.at.r) + FEET
          // Off the edge on a log, the fish is there already with its mouth open, from the moment the log sets off.
          this.effects.push({ kind: 'splash', x, y, start: down, who, size: who === 0 ? 1 : 0.7 }, { kind: 'fish', x, y, start: down, who, size: 1, ...(event.by === 'edge' ? { early: Math.max(0, down - time) } : {}) })
          view.wetAt = down + UNDER_SECONDS + SPIT_SECONDS
          view.wetHops = MARK_HOPS
          this.cat.keenAt = down
          break
        }
        case 'knock':
          view.segs.push({ kind: 'drop', start: t0 + ROLL_SECONDS.lorry * 0.6, dur: 0.22, to: this.rest(who) })
          break
        case 'scoop':
          view.segs.push({ kind: 'drop', start: t0 + ROLL_SECONDS.log * 0.7, dur: 0.16, to: this.rest(who) })
          break
        case 'slideOff':
        case 'carry':
          break
        case 'flatten':
          view.flatFrom = t0 + (event.kind === 'train' ? TRAIN_AFTER + TRAIN_SECONDS * (0.2 + 0.1 * event.at.r) : ROLL_SECONDS[event.kind] * 0.55)
          view.sleepers = event.kind === 'train'
          view.wideAt = view.flatFrom
          this.cat.flinchAt = view.flatFrom
          break
        case 'peel':
          view.peelFrom = t0 + PEEL_AFTER[who]
          view.upAt = view.peelFrom + PEEL_LENGTH[who]
          view.trackHops = MARK_HOPS
          this.effects.push({ kind: 'dust', x: centreX(event.at.c), y: centreY(event.at.r) + FEET, start: view.peelFrom + PEEL_LENGTH[who] * 0.45, who, size: LOOKS[who].size * 1.3 })
          break
        case 'bell':
          this.rings.push({ c: event.at.c, r: event.at.r, at: hopEnd })
          break
        default:
          event satisfies never
      }
    }
    // Whatever the step did, every pawn ends where the model has it.
    for (let who = 0; who < this.pawns.length; who++) {
      const view = this.pawns[who], last = view.segs[view.segs.length - 1]
      const home = this.rest(who)
      // One that made no motion of its own (flat under a car) is drawn in from wherever the last step left it.
      if (!last) view.segs.push({ kind: 'slide', start: time, dur: 0.08, to: home })
      else if (last.to.c !== home.c || last.to.r !== home.r || last.to.index !== home.index || (last.to.lead ?? 0) !== 0) view.segs.push({ kind: 'slide', start: last.start + last.dur, dur: 0.02, to: home })
    }
    if (this.effects.length > 24) this.effects.splice(0, this.effects.length - 24)
    if (this.rings.length > 6) this.rings.splice(0, this.rings.length - 6)
  }

  /** One lane alone has taken its step, for the duck: its movers set off now. `settled` lands them at once, for a touch that ends the showing. */
  applyLane(col: number, lane: Lane, events: readonly BoardEvent[], time: number, settled: boolean): void {
    const board = this.board
    if (!board) return
    const before = board.lanes[col]
    this.board = { lanes: board.lanes.map((one, c) => (c === col ? lane : one)), family: board.family }
    if (settled) {
      this.movers[col] = freshMovers(lane)
      this.trains[col] = freshTrain()
      return
    }
    this.stepLane(col, before, lane, events, time, time)
  }

  /** A bell plate is stepped on by somebody the model does not know: the duck. */
  ring(c: number, r: number, time: number): void {
    this.rings.push({ c, r, at: time })
  }

  flatness(who: number, time: number): number {
    const view = this.pawns[who]
    if (view.peelFrom !== null) return time < view.peelFrom ? 1 : peel((time - view.peelFrom) / PEEL_LENGTH[who], who)
    if (view.flatFrom !== null) return clamp01((time - view.flatFrom) / 0.05)
    return this.board!.family[who].flat ? 1 : 0
  }

  /** How each of the family arrives at the picnic, as the old rabbit sees it at that moment. */
  arrival(who: number): 'wet' | 'tracked' | 'dry' {
    const view = this.pawns[who]
    return view.wetHops > 0 ? 'wet' : view.trackHops > 0 ? 'tracked' : 'dry'
  }

  /** Which of the family the sleepers have striped, for the sound of its peel. */
  striped(): boolean[] {
    return this.pawns.map((view) => view.sleepers)
  }

  // --- The duck ------------------------------------------------------------

  private duckNow(time: number): { x: number; y: number } {
    const d = this.duck, u = clamp01((time - d.start) / d.dur)
    const tx = d.to ? centreX(d.to.c) : d.toX, ty = d.to ? this.placeY(d.to, time) : d.toY
    return { x: d.fromX + (tx - d.fromX) * u, y: d.fromY + (ty - d.fromY) * u }
  }

  /** The duck sets off for a place on the board, or for a point of the table. */
  duckTo(to: Place | { x: number; y: number }, time: number, dur: number, how: 'waddle' | 'spit' = 'waddle'): void {
    const d = this.duck, now = this.duckNow(time)
    d.fromX = now.x; d.fromY = now.y
    if ('c' in to) { d.to = to; d.toX = centreX(to.c) } else { d.to = null; d.toX = to.x; d.toY = to.y }
    if (Math.abs(d.toX - d.fromX) > 4) d.face = d.toX > d.fromX ? 1 : -1
    d.start = time; d.dur = dur; d.how = how
  }

  /** The duck is put somewhere at once: where the fish comes up with it, or below the frame's edge. */
  duckAt(x: number, y: number): void {
    const d = this.duck
    d.fromX = x; d.fromY = y; d.to = null; d.toX = x; d.toY = y; d.start = LONG_AGO
  }

  /** The duck is back at its post, with nothing left of what befell it. */
  duckHome(time: number): void {
    const d = this.duck
    this.duckAt(DUCK_POST.x, DUCK_POST.y)
    d.face = 1; d.flatFrom = null; d.peelFrom = null; d.hiddenFrom = LONG_AGO; d.hiddenUntil = LONG_AGO; d.track = false
    d.shakeAt = LONG_AGO
    if (time <= LONG_AGO) d.quackAt = LONG_AGO
  }

  /** The water closes over the duck at a square of the river, and the fish comes up with it. */
  duckDunk(c: number, r: number, time: number): void {
    const x = centreX(c), y = centreY(r) + FEET
    this.effects.push({ kind: 'splash', x, y, start: time, who: -1, size: 0.8 }, { kind: 'fish', x, y, start: time, who: -1, size: 1 })
    this.duck.hiddenFrom = time
    this.duck.hiddenUntil = time + UNDER_SECONDS
    this.cat.keenAt = time
  }

  /** The duck is rolled flat, and the cat flinches. */
  duckFlat(time: number): void {
    this.duck.flatFrom = time
    this.duck.peelFrom = null
    this.duck.track = true
    this.cat.flinchAt = time
  }

  /** Where the duck is drawn. */
  duckWhere(time: number): { x: number; y: number; u: number } {
    const now = this.duckNow(time)
    return { x: now.x, y: now.y, u: clamp01((time - this.duck.start) / this.duck.dur) }
  }

  // --- The picnic ----------------------------------------------------------

  /** A slice leaves the cake for one of the family, wrapped in the napkin first if it came wet. */
  serve(who: number, time: number, wrap: boolean): void {
    const view = this.pawns[who]
    if (view.sliceAt === null) {
      view.sliceAt = time
      this.picnic.served += 1
    } else {
      view.extraAt = time
      this.picnic.served = 5
    }
    if (wrap && view.napkinAt === null) view.napkinAt = time
  }

  /** The picnic as it stands when nobody watched it: everyone served, and the stand bare. */
  served(): void {
    this.finished = true
    this.picnic.served = 5
    for (const view of this.pawns) {
      if (view.sliceAt === null) view.sliceAt = LONG_AGO
      view.trackHops = 0; view.trackOff = LONG_AGO; view.dustAt = LONG_AGO
      view.wetHops = 0; view.wetOff = LONG_AGO
    }
  }

  // --- The tip and the slide -----------------------------------------------

  /** The small ones left on the lifted leaf slide down it to the cloth in a heap. */
  tumble(left: readonly number[], time: number): void {
    const board = this.board
    if (!board) return
    this.freeze(time)
    const row = Math.min(ROWS - 2, Math.max(1, board.family[0].r))
    left.forEach((who, n) => {
      const view = this.pawns[who]
      view.flatFrom = null; view.peelFrom = null; view.perch = 0
      view.segs.push({ kind: 'tumble', start: time + n * 0.08, dur: 0.55, to: { c: CLOTH_COL, r: row + (n - 1) * 0.3 } })
    })
    for (let who = 0; who < this.pawns.length; who++) {
      if (left.includes(who)) continue
      const one = board.family[who]
      this.pawns[who].segs.push({ kind: 'slide', start: time, dur: 0.01, to: one.on ? { c: one.c, r: one.r, index: one.on.index } : { c: one.c, r: one.r } })
    }
  }

  /** The board begins to slide: `board` is the next crossing's, on which the family already stands. The one that is left slides out with its movers standing still. */
  beginSlide(board: Board, scenery: Scenery | null, time: number): void {
    const before = this.board
    if (!before) return
    this.prevScenery = this.scenery
    // Where the family is drawn now, in the frame of the board it is sliding on to.
    const drawn = this.pawns.map((_, who) => {
      const now = this.where(who, time)
      return { x: now.x - SLIDE, y: now.y }
    })
    const tracks = this.pawns.map((view) => ({ wetHops: view.wetHops, wetOff: view.wetOff, wetAt: view.wetAt, trackHops: view.trackHops, trackOff: view.trackOff, sleepers: view.sleepers }))
    this.prev = before
    this.prevMovers = this.movers
    this.prevTrains = this.trains
    const moved = this.movers[NEXT_COL]
    this.reset(board, scenery)
    this.prev = before
    // The lane she stands on comes along as it is.
    this.movers[NEXT_COL - CLOTH_COL] = moved
    this.pawns.forEach((view, who) => {
      Object.assign(view, tracks[who])
      view.baseX = drawn[who].x
      view.baseY = drawn[who].y
      const one = board.family[who]
      const home: Place = one.on ? { c: one.c, r: one.r, index: one.on.index } : { c: one.c, r: one.r }
      // The heap untangles into its line: each hops to its own square.
      const far = Math.hypot(centreX(home.c) - view.baseX, centreY(home.r) + FEET - view.baseY)
      view.segs.push(far > 6 ? { kind: 'hop', start: time + hopDelay(who) + who * 0.07, dur: HOP_SECONDS[who] * 1.4, to: home } : { kind: 'slide', start: time, dur: 0.01, to: home })
    })
    this.slid = 0
    this.catDown(time)
  }

  /** The slide is over: the board that was left is gone. */
  endSlide(time: number): void {
    if (this.prev) this.cat.upFrom = time
    this.prev = null
    this.prevScenery = null
    this.prevMovers = []
    this.prevTrains = []
    this.slid = 0
    this.leaf = 0
  }

  /** The cat gets down behind the cards, for as long as the board is lifted or sliding. */
  catDown(time: number): void {
    if (this.cat.duckFrom <= this.cat.upFrom || this.cat.duckFrom === LONG_AGO) this.cat.duckFrom = time
    this.cat.upFrom = LONG_AGO
  }

  /**
   * The one hop the idle guidance offers. It is a hop she can make, never the way across: the square ahead of
   * her, her own square while she lies flat, the first square of the next lane once the crossing is over, and a
   * free square along the cloth while the line behind her still needs room on it.
   */
  offer(): { c: number; r: number } | null {
    const board = this.board
    if (!board) return null
    const rabbit = board.family[0]
    if (rabbit.flat) return { c: rabbit.c, r: rabbit.r }
    const free = (c: number, r: number) => c >= 0 && c < COLS && r >= 0 && r < ROWS && !isSeat(c, r)
    if (rabbit.c === CLOTH_COL && !this.finished) {
      for (const dr of [1, -1]) if (free(rabbit.c, rabbit.r + dr) && !board.family.some((one) => one.c === rabbit.c && one.r === rabbit.r + dr)) return { c: rabbit.c, r: rabbit.r + dr }
      return { c: rabbit.c, r: rabbit.r }
    }
    for (const [dc, dr] of [[1, 0], [0, 1], [0, -1], [-1, 0]]) if (free(rabbit.c + dc, rabbit.r + dr)) return { c: rabbit.c + dc, r: rabbit.r + dr }
    return null
  }

  /** Draws everything that moves, over the stamped backdrop, and counts what it painted. */
  draw(ctx: CanvasRenderingContext2D, time: number, step: number, guidance: Guidance | null, gloss: boolean): void {
    this.figures = paint(this, ctx, time, step, guidance, gloss)
  }
}
