import { WIDE } from './figures'
import { handPose, type Guidance, type HandPose } from './guidance'
import { JOIN_SECONDS, REST, SQUASH_SECONDS, TRICKS, WEIGHT, blend, calling, eggCalling, entrance, idle, join, joinNote, squash, trick, type Move } from './motion'
import { CRACK, PEEK, PILE_PEEK, Paper } from './paper'
import { ASKING_EGG, STONE_FEET, nestOf, waitersOf, type Thing } from './picture'
import { HEARD_STEP, LUNGE, type Act, type Body, type Cast } from './plays'
import { react } from './reactions'
import { poseOf, SCRAP_SECONDS, type Show } from './show'
import { RIDER, twinApart, twinSize } from './sizes'
import { EGG, type Rect } from './stage'
import { type Kind, RUSTLE, VOICES, shapeOf } from './voices'

// Draws the game: the page, the row, whoever asks, whoever is out, the basket,
// whoever waits at the edge, the play that is running, and the idle ladder's
// glow and ghost hand. Everything it draws is a cached piece of tissue laid
// down with a transform. Where a thing is comes from the picture and the show
// (picture.ts, show.ts), and how it moves from each kind's own motion
// (motion.ts, reactions.ts). It holds no state of the game: if the look is
// ever changed, this file and paper.ts are what is redone.

const clamp = (t: number) => Math.max(0, Math.min(1, t))
const ease = (t: number) => t * t * (3 - 2 * t)
const hump = (t: number) => Math.sin(Math.PI * clamp(t))
/** The eggs still in a nest, small, side by side. */
const IN_NEST: readonly (readonly [number, number])[] = [[-36, -40], [0, -50], [36, -40], [0, -24]]
const NEST_EGG = 0.56
/** One who asks holds both wings out to the row, empty, with its face turned to it: it listens. */
const ASKS: Move = { ...REST, wings: 1, reach: 1, turn: 1, lean: 0.045 }
/** One who asked and now has someone beside it: its wings are down and its face is turned to that one. */
const MEETS: Move = { ...REST, turn: 0.8 }
/**
 * While it reacts to a voice or sings in step it is not asking: its wings and its face are the reaction's, so that
 * nothing held out to the row is stretched or thrown about with it.
 */
const reacting = (acts: { act: Act }[]) => acts.some(({ act }) => act.do === 'react')
/**
 * One of two who stand side by side opens its wings away from the other: both to its own side, as far as they
 * are open, so that the two inner wings never lie across each other.
 */
const outward = (move: Move, side: 1 | -1): Move => ({ ...move, reach: Math.max(-1, Math.min(1, move.reach + side * move.wings)) })
/** How far beyond the edge a thing that has not arrived yet stands. */
const AWAY = 250

/** A blink now and then: 0 with the eyes open, up to 1 and back, once every `every` seconds. */
function blinkOf(seconds: number, every: number, start: number): number {
  const into = (seconds + start) % every, shut = 0.16
  return into > every - shut ? Math.sin(((into - (every - shut)) / shut) * Math.PI) : 0
}

export class GameView {
  private ctx: CanvasRenderingContext2D
  private paper: Paper
  private count = 0
  private hand: HandPose = { travel: 0, press: 0, opacity: 0 }
  /** Whether some figure is still to be cut for this surface: one is cut after each frame until none is left. */
  warming = true

  constructor(canvas: HTMLCanvasElement, seed: number) {
    this.ctx = canvas.getContext('2d')!
    this.paper = new Paper(canvas, seed, { hill: true, stone: false })
  }

  /** The part of the page the surface shows, in design pixels. */
  get view(): Rect {
    return this.paper.view
  }

  /** Makes the page ready for a surface of this size. Returns whether the part of the page it shows changed, so the picture has to be read again. */
  fit(width: number, height: number, dpr: number): boolean {
    if (width <= 0 || height <= 0) return false
    const before = this.paper.view
    this.paper.fit(width, height, dpr)
    const after = this.paper.view
    return before.x !== after.x || before.y !== after.y || before.w !== after.w || before.h !== after.h
  }

  private stamp(name: keyof NonNullable<Paper['props']>) {
    const sprite = this.paper.props![name]
    this.ctx.drawImage(sprite.canvas, sprite.x, sprite.y, sprite.w, sprite.h)
    this.count++
  }

  /** What the acts running on someone add to how it moves. `egg` bodies show a call as a shell does. */
  private acted(acts: { act: Act; progress: number }[], kind: Kind, base: Move, shell: 'egg' | 'pile' | null): Move {
    let move = base
    for (const { act, progress: p } of acts) {
      if (act.do === 'enter') move = entrance(kind, p)
      else if (act.do === 'call') move = blend(move, shell ? eggCalling(shell === 'pile' ? RUSTLE : shapeOf(act.kind), p) : calling(shapeOf(act.kind), p))
      else if (act.do === 'react') move = blend(move, react(act.kind, act.how, p, act.away, act.much))
      else if (act.do === 'lunge') move = blend(move, { ...REST, dx: act.towards * LUNGE * hump(p), lean: act.towards * 0.22 * hump(p) })
      else if (act.do === 'face') move = blend(move, { ...REST, dy: -0.14 * hump(p), wings: hump(p) })
      // Out of breath: it swells up tall and wide with its eyes shut, and lets the air go again.
      else if (act.do === 'gulp') move = blend(move, { ...REST, sx: 1 + 0.14 * hump(p), sy: 1 + 0.3 * hump(p * p), lean: -0.12 * hump(p), blink: hump(p) })
    }
    return move
  }

  private figure(kind: Kind, x: number, y: number, size: number, move: Move, alpha = 1, carrying = false) {
    this.ctx.globalAlpha = alpha
    this.count += this.paper.figures.draw(this.ctx, kind, x + move.dx * size, y + move.dy * size, size, { wings: move.wings, reach: move.reach, turn: move.turn, blink: move.blink, lean: move.lean }, { sx: move.sx * move.face, sy: move.sy }, carrying)
  }

  /** A grown one with its little one riding on it. The little one follows a beat behind. */
  private family(kind: Kind, x: number, y: number, size: number, move: Move, now: number, alpha = 1) {
    this.figure(kind, x, y, size, move, alpha, true)
    const bob = idle(kind, now + 0.2, 3.3)
    this.figure(kind, x + move.dx * size + move.lean * size * RIDER.up, y + (move.dy - RIDER.up * move.sy) * size, size * RIDER.size, blend({ ...move, dx: 0, dy: 0, sx: 1, sy: 1 }, bob), alpha)
  }

  private twins(kind: Kind, x: number, y: number, move: Move, now: number, alpha = 1) {
    const apart = twinApart(kind), size = twinSize(kind)
    this.figure(kind, x - apart, y, size, outward(move, -1), alpha)
    this.figure(kind, x + apart, y, size, outward(blend(move, idle(kind, now + 0.4, 5.1)), 1), alpha)
  }

  /** One egg with its foot at `x`, `y`: whole while its lid is down, and in pieces with two eyes in the dark once it has been heard. */
  private egg(x: number, y: number, move: Move, lid: number, now: number, late: number, size = 1, alpha = 1, turn = 0) {
    const { ctx, paper } = this
    paper.at(ctx, x + move.dx * EGG.h, y + move.dy * EGG.h, { sx: move.sx * size, sy: move.sy * size, turn: move.lean + turn, alpha })
    if (lid < 0.02) { this.stamp('egg'); return }
    this.stamp('dark')
    const open = lid * (1 - 0.9 * blinkOf(now, 3.3 + late * 0.6, late * 1.3)), look = Math.sin(now * 0.9 + late * 2) * 3
    for (const [ex, ey] of PEEK) {
      ctx.save(); ctx.translate(ex, ey); ctx.scale(1, open); this.stamp('white'); ctx.translate(look - 1, 1); this.stamp('pupil'); ctx.restore()
    }
    this.stamp('bottom')
    ctx.translate(CRACK.hinge, CRACK.at - CRACK.lift * lid)
    ctx.rotate(CRACK.tip * lid)
    ctx.translate(-CRACK.hinge, -CRACK.at)
    this.stamp('top')
  }

  /** A heap of leaves with someone in it: once it has been heard, two eyes look out through a gap. */
  private pile(x: number, y: number, move: Move, lid: number, now: number, late: number, size = 1, alpha = 1, turn = 0) {
    const { ctx, paper } = this
    paper.at(ctx, x + move.dx * EGG.h, y + move.dy * EGG.h, { sx: move.sx * size, sy: move.sy * size, turn: move.lean + turn, alpha })
    this.stamp('pile')
    if (lid < 0.02) return
    const open = lid * (1 - 0.9 * blinkOf(now, 3.6 + late * 0.5, late * 1.7)), look = Math.sin(now * 0.8 + late * 2) * 3
    ctx.translate(PILE_PEEK.x, PILE_PEEK.y)
    ctx.save(); ctx.scale(1, lid); this.stamp('slit'); ctx.restore()
    for (const ex of [-15, 15]) {
      ctx.save(); ctx.translate(ex, 0); ctx.scale(0.9, 0.9 * open); this.stamp('white'); ctx.translate(look - 1, 1); this.stamp('pupil'); ctx.restore()
    }
  }

  /** What is left of a hide while it bursts: the halves of a shell, or a heap coming apart, and scraps flying. */
  private burst(x: number, y: number, p: number, leaves: boolean, size: number) {
    const { ctx, paper } = this, alpha = 1 - clamp((p - 0.55) / 0.45)
    if (leaves) {
      paper.at(ctx, x, y, { sx: size * (1 + p * 0.5), sy: size * (1 - p * 0.7), alpha: alpha * (1 - p) })
      this.stamp('pile')
    } else {
      paper.at(ctx, x - 26 * p, y + 8 * p, { turn: -1.1 * ease(p), alpha, sx: size, sy: size })
      this.stamp('bottom')
      paper.at(ctx, x + 70 * p, y - 170 * size * Math.sin(Math.PI * Math.min(1, p * 1.15)) + 90 * p * p, { turn: 3.4 * p, alpha, sx: size, sy: size })
      this.stamp('top')
    }
    for (let i = 0; i < (leaves ? 9 : 6); i++) {
      const out = (i - (leaves ? 4 : 2.5)) / (leaves ? 4 : 2.5), rise = 0.6 + ((i * 7) % 5) * 0.12
      // Scraps of shell tumble each its own way. Leaves are strips, and all turn together and stay side by side:
      // two strips that turn against each other cross, and two bars that cross are a sign.
      paper.at(ctx, x + out * 104 * p + Math.sin(p * 9 + i) * 6, y - 80 * size - rise * 130 * p + 260 * p * p, { turn: leaves ? p * 5 : p * (5 + i) * (i % 2 ? 1 : -1), alpha, sx: 1 + (i % 3) * 0.3, sy: 1 + (i % 2) * 0.3 })
      this.stamp(leaves ? 'leaf' : 'scrap')
    }
  }

  /** The basket with its one egg, or (`nest`) the twig nest a clutch comes in, with `eggs` eggs in it. */
  private bowl(x: number, y: number, eggs: number, size: number, turn = 0, alpha = 1, egg: Move = REST, nest = false) {
    const { ctx, paper } = this
    paper.at(ctx, x, y, { turn, alpha, sx: size, sy: size })
    this.stamp(nest ? 'nestRim' : 'rim')
    for (let i = 0; i < eggs; i++) {
      // One egg alone stands whole in the bowl; several lie in it small, side by side.
      const [ix, iy] = eggs === 1 ? [0, -34] : IN_NEST[i % IN_NEST.length], one = eggs === 1 ? 1 : NEST_EGG
      ctx.save(); ctx.translate(ix + egg.dx * EGG.h, iy + egg.dy * EGG.h); ctx.rotate(egg.lean); ctx.scale(one * egg.sx, one * egg.sy); this.stamp('egg'); ctx.restore()
    }
    this.stamp(nest ? 'nest' : 'bowl')
  }

  /** One thing of the picture, standing, with whatever the play is doing to it. */
  private thing(thing: Thing, show: Show) {
    const now = show.now, acts = show.acting(thing.key), off = show.away(thing.key) * AWAY
    if (thing.key === 'asker') {
      if (thing.what === 'egg') {
        // The egg that asks leans and rocks towards the grown ones in the row.
        const move = this.acted(acts, thing.kind, { ...REST, lean: 0.08 + Math.sin(now * 1.6) * 0.05 }, 'egg')
        this.egg(thing.x, thing.y, move, 0, now, 0, ASKING_EGG)
      } else this.figure(thing.kind, thing.x, thing.y, thing.size, this.acted(acts, thing.kind, reacting(acts) ? idle(thing.kind, now, 0.4) : show.met ? blend(idle(thing.kind, now, 0.4), MEETS) : blend(idle(thing.kind, now, 0.4), { ...ASKS, wings: 1 + Math.sin(now * 1.1) * 0.035 }), null))
    } else if ('slot' in thing) {
      const x = show.xs.get(thing.key) ?? thing.x, lid = show.lids.get(thing.key) ?? 0, pressed = (now - (show.pressed.get(thing.key) ?? -Infinity)) / SQUASH_SECONDS
      if (thing.what === 'grown') {
        let move = idle(thing.kind, now, thing.slot * 1.3)
        if (pressed >= 0 && pressed < 1) move = blend(move, squash(pressed, WEIGHT[thing.kind]))
        // A grown one that has been heard is ready to go, and plainly so: it has stepped out in front of the row and
        // bounces there on its toes, leaning towards the stone with its face right round to it. One that has not
        // been heard stands still in the row. Its wings stay down, so that they never lie across a neighbour's.
        const bounce = Math.abs(Math.sin(now * 4.6 + thing.slot * 1.9)) * lid
        this.figure(thing.kind, x, thing.y + HEARD_STEP * lid, show.sizes.get(thing.key) ?? thing.size, this.acted(acts, thing.kind, blend(move, { ...REST, turn: -0.6 - 0.4 * lid, lean: -0.08 * lid, dy: -0.09 * bounce, sy: 1 + 0.06 * lid + 0.04 * bounce }), null))
        return
      }
      let move = REST
      // Every hide squashes alike, whoever is inside; only the call moves an egg in the shape of a voice.
      if (pressed >= 0 && pressed < 1) move = blend(move, squash(pressed, 0.5))
      // A hide moves under a finger and while the one inside calls, and only then; the ones beside it lean in.
      move = this.acted(acts, thing.kind, { ...move, lean: move.lean + show.leaning(thing.key, x) }, thing.what)
      if (thing.what === 'pile') this.pile(x, thing.y, move, lid, now, thing.slot)
      else this.egg(x, thing.y, move, lid, now, thing.slot)
    } else if ('place' in thing) {
      const one = show.standing.get(thing.place), kind = thing.kind
      let move = idle(kind, now, thing.place * 1.7 + WEIGHT[kind] * 5)
      if (one) {
        const pressed = (now - one.pressedAt) / SQUASH_SECONDS, tricked = (now - one.trickAt) / (TRICKS[kind][one.trick]?.seconds ?? 1), joined = (now - one.joinAt) / JOIN_SECONDS[kind], called = (now - one.callAt) / shapeOf(kind).seconds
        if (pressed >= 0 && pressed < 1) move = blend(move, squash(pressed, WEIGHT[kind]))
        if (tricked >= 0 && tricked < 1) move = blend(move, trick(kind, one.trick, tricked))
        if (joined >= 0 && joined < 1) move = blend(move, join(kind, joined))
        // Its call, or each single note of it when it joins in note by note.
        if (one.notesAt) for (const at of one.notesAt) move = blend(move, joinNote(kind, shapeOf(kind), VOICES[kind].length, now - at))
        else if (called >= 0 && called < 1) move = blend(move, calling(shapeOf(kind), called))
      }
      // While a scene plays down at the row, whoever stands on the hill and has no part in it turns to listen.
      // Once the choir has begun everyone on the hill faces front, between their calls as well.
      if (show.playing && !show.idle && !show.choir && acts.length === 0) move = blend(move, { ...REST, turn: Math.sign(STONE_FEET.x - thing.x) * 0.8 })
      move = this.acted(acts, kind, move, null)
      if (thing.what === 'family') this.family(kind, thing.x, thing.y, thing.size, move, now)
      else if (thing.what === 'twins') this.twins(kind, thing.x, thing.y, move, now)
      else this.figure(kind, thing.x, thing.y, thing.size, move)
    } else if (thing.key === 'basket') {
      // Tapped where its egg cannot be tipped in, the basket rocks while the one inside calls.
      const egg = this.acted(acts, thing.kind, REST, 'egg')
      this.bowl(thing.x + off, thing.y, 1, 1, egg.lean * 0.6, 1, egg)
    } else if (thing.key === 'edge') {
      const x = thing.x + off
      if (thing.what === 'grown' && thing.kind) {
        // The one who waits rocks on its feet at the edge, half in the page, and looks at the row.
        this.figure(thing.kind, x, thing.y, thing.size, this.acted(acts, thing.kind, { ...idle(thing.kind, now, 2), turn: -1, lean: -0.13 + Math.sin(now * 1.5) * 0.03 }, null))
      } else if (thing.what === 'egg') {
        this.bowl(x, thing.y, 1, 0.62, Math.sin(now * 2.1) * 0.04, 1, this.acted(acts, thing.kind ?? 'pip', REST, 'egg'), true)
      } else {
        // The next clutch in its nest, with the grown one who brings it behind, or in `who` the grown ones of its row around it.
        // The grown one stands well in the page here, with the nest before its feet: it is the one thing on the page that wants something.
        const bringer = thing.form === 'seek' && thing.kind !== null
        waitersOf(thing, this.paper.view).forEach((one, i) => this.figure(one.kind, one.x + off, one.y, one.size, bringer ? { ...idle(one.kind, now, 2), turn: -1, lean: -0.08 + Math.sin(now * 1.5) * 0.03, wings: 0.5 + Math.sin(now * 1.5) * 0.1 } : { ...idle(one.kind, now, i * 2.2), turn: -0.8 }))
        const nest = nestOf(this.paper.view, thing.form, thing.kind, thing.roomy), rock = Math.sin(now * 1.5) * 0.03
        this.bowl(nest.x + off - (thing.form === 'seek' ? rock * 180 : 0), nest.y, thing.eggs, nest.size, Math.sin(now * 2.1) * 0.04, 1, REST, true)
      }
    }
  }

  /** Whether one of the cast sits on the head of another: both on stage, and the one exactly where a rider sits. */
  private sits(rider: { x: number; y: number; visible: boolean }, on: { x: number; y: number; size: number; visible: boolean }): boolean {
    return rider.visible && on.visible && Math.abs(rider.x - on.x) < 1 && Math.abs(rider.y - (on.y - on.size * RIDER.up)) < 1
  }

  /** How a figure of the cast moves now: alive as it stands, in the air on a hop, and with whatever it is doing. */
  private moved(cast: Cast, posed: { air: number; x: number }, show: Show): Move {
    let move = idle(cast.kind, show.now, cast.id.length * 1.3)
    // One who asks holds its wings out to the row once it stands at the stone; on its way there from the edge it
    // looks at the row it is coming to. In the choir it has found its own and faces front like everyone else.
    const there = Math.abs(posed.x - STONE_FEET.x) < 1
    if (cast.asks && !there) move = blend(move, { ...REST, turn: -1 })
    // Once someone has come out it has that one to look at: its wings come down, and nothing it held out lies
    // across the one who stands beside it.
    if (cast.asks && there && show.met && !show.choir && !reacting(show.acting(cast.id))) move = blend(move, MEETS)
    if (cast.asks && there && !show.met && !show.choir && !reacting(show.acting(cast.id))) move = blend(move, ASKS)
    // In the air it stretches and its wings come out; coming down it gathers itself.
    if (posed.air > 0) move = blend(move, { ...REST, sx: 1 - posed.air * 0.07, sy: 1 + posed.air * 0.13, wings: posed.air })
    return this.acted(show.acting(cast.id), cast.kind, move, null)
  }

  /** Someone or something that is on stage only while the play runs. */
  private actor(cast: Cast, show: Show) {
    const play = show.play!, posed = poseOf(cast, play, show.progress, show.begun), now = show.now
    if (!posed.visible && posed.burst === null) {
      // A hide that is carried in is on its carrier's head until its own first act: then it is set down from there.
      const carrier = cast.rides && (cast.body === 'egg' || cast.body === 'pile') && !play.acts.some((act, i) => act.who === cast.id && show.begun[i]) ? play.cast.find((one) => one.id === cast.rides) : undefined
      if (!carrier) return
      const on = poseOf(carrier, play, show.progress, show.begun), under = this.moved(carrier, on, show)
      if (!on.visible) return
      const x = on.x + under.dx * on.size + under.lean * on.size * RIDER.up, y = on.y + (under.dy - RIDER.up * under.sy) * on.size
      if (cast.body === 'pile') this.pile(x, y, REST, 0, now, 1, cast.from.size / EGG.h)
      else this.egg(x, y, REST, 0, now, 1, cast.from.size / EGG.h)
      return
    }
    const acts = show.acting(cast.id), body: Body = cast.body
    if (body === 'egg' || body === 'pile') {
      if (posed.burst !== null) { if (posed.burst < 1) this.burst(posed.x, posed.y, posed.burst, body === 'pile', posed.size / EGG.h); return }
      const move = this.acted(acts, cast.kind, REST, body)
      if (body === 'pile') this.pile(posed.x, posed.y, move, posed.lid, now, 1, posed.size / EGG.h, posed.alpha, posed.turn)
      else this.egg(posed.x, posed.y, move, posed.lid, now, 1, posed.size / EGG.h, posed.alpha, posed.turn)
    } else if (body === 'nest' || body === 'bowl') {
      // An egg is in the nest until it has left for its spot.
      const flights = play.acts.map((act, i) => ((act.do === 'fly' || act.do === 'roll') && (act.who.startsWith('in:') || act.who === 'comer') ? show.begun[i] : null)).filter((flown) => flown !== null)
      const left = body === 'bowl' ? 0 : Math.min(cast.eggs ?? 0, flights.filter((flown) => !flown).length)
      this.bowl(posed.x, posed.y, left, posed.size / EGG.h, 0, posed.alpha, REST, body === 'nest')
    } else {
      let move = this.moved(cast, posed, show)
      const carrier = cast.rides ? play.cast.find((one) => one.id === cast.rides) : undefined
      // One of two little ones who have come to stand side by side on the hill opens its wings away from the other.
      const twins = show.picture.things.find((thing) => 'place' in thing && thing.what === 'twins' && Math.abs(posed.y - thing.y) < 1 && Math.abs(Math.abs(posed.x - thing.x) - twinApart(thing.kind)) < 1)
      if (twins && body === 'little') move = outward(move, posed.x < twins.x ? -1 : 1)
      // Whoever has a little one sitting on its head is drawn as one who carries.
      const carries = play.cast.some((one) => one.rides === cast.id && one.body === 'little' && this.sits(poseOf(one, play, show.progress, show.begun), posed))
      if (carrier) {
        // Sitting on the other's head it goes where that head goes, as a little one on the hill does.
        const on = poseOf(carrier, play, show.progress, show.begun)
        if (this.sits(posed, on)) {
          const under = this.moved(carrier, on, show)
          posed.x = on.x + under.dx * on.size + under.lean * on.size * RIDER.up
          posed.y = on.y + (under.dy - RIDER.up * under.sy) * on.size
        }
      }
      if (body === 'family') this.family(cast.kind, posed.x, posed.y, posed.size, move, now, posed.alpha)
      else if (body === 'twins') this.twins(cast.kind, posed.x, posed.y, move, now, posed.alpha)
      else this.figure(cast.kind, posed.x, posed.y, posed.size, move, posed.alpha, carries)
      if (cast.hatched) this.cap(cast.kind, posed.x, posed.y, posed.size, move, posed.alpha)
    }
  }

  /** The top of an eggshell on the head of one who has just come out, tipped like a hat, going where the head goes. */
  private cap(kind: Kind, x: number, y: number, size: number, move: Move, alpha: number) {
    const scale = (size * WIDE[kind] * 0.5) / EGG.w, tall = size * move.sy
    const headX = x + move.dx * size + Math.sin(move.lean) * tall, headY = y + move.dy * size - Math.cos(move.lean) * tall
    this.paper.at(this.ctx, headX, headY - (CRACK.at - 18) * scale, { sx: scale, sy: scale, turn: move.lean + 0.2, alpha })
    this.stamp('top')
  }

  /**
   * Draws the frame and returns how many pieces that took. With no show yet (the slot has not been read) it
   * draws the bare page. `next` is the key of the one thing a child would want to touch next, for the idle ladder.
   */
  draw(width: number, height: number, dpr: number, show: Show | null, guide: Guidance | null, next: string | null): number {
    if (width <= 0 || height <= 0) return 0
    if (this.paper.fit(width, height, dpr)) this.warming = true
    const { ctx, paper } = this, props = paper.props!
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.globalAlpha = 1
    ctx.drawImage(paper.layer, 0, 0)
    this.count = 1
    if (show) {
      const now = show.now, things = show.picture.things.filter((thing) => !show.hidden(thing.key))
      const target = next ? things.find((thing) => thing.key === next) : undefined
      const at = target ? { x: 'slot' in target ? show.xs.get(target.key) ?? target.x : target.x, y: target.y, wide: target.key === 'asker' || target.key === 'edge' } : null
      // What can be touched next rests on a pale piece that breathes: under it, never over it.
      if (guide && at && guide.glow > 0.01) {
        const breath = 1 + Math.sin(now * 2.6) * 0.04
        // Behind a figure it is a pale disc. Under a hide of the row, an egg that asks, an egg that waits and a
        // nest that waits by itself it is a flat patch the thing stands on: laid behind the whole of a plain egg
        // it showed all round it, a closed ring, and a ring reads as a zero.
        const flat = 'slot' in target! || (target!.key === 'asker' && target!.what === 'egg') || (target!.key === 'edge' && (target!.what === 'egg' || (target!.what === 'clutch' && target!.form === 'alike')))
        paper.put(ctx, props.glow, at.x - (target!.key === 'edge' && !target!.roomy ? 24 : 0), at.y + 14, { alpha: guide.glow * 0.9, sx: breath * (target!.key === 'asker' ? 1.3 : at.wide ? 1.2 : 1.12), sy: breath * (flat ? 0.36 : target!.key === 'asker' ? 1.12 : at.wide ? 1.1 : 1.06) })
        this.count++
      }
      if (show.picture.stone) { paper.put(ctx, props.stone, 0, 0); this.count++ }
      // From the back of the page to the front: the hill, the stone, the row, the edge, the basket, and then whoever is
      // on stage. The basket stands in front of whoever waits at the edge, so that what a finger on it reaches is the basket.
      const order = ['hill', 'asker', 'slot', 'edge', 'basket']
      for (const name of order) for (const thing of things) if (thing.key.split(':')[0] === name) this.thing(thing, show)
      if (show.play) for (const cast of [...show.play.cast].sort((a, b) => a.from.y - b.from.y)) this.actor(cast, show)
      for (const scrap of show.scraps) {
        const t = clamp((now - scrap.at) / SCRAP_SECONDS), alpha = 1 - clamp((t - 0.5) / 0.5), up = 40 * Math.sin(Math.PI * Math.min(1, t * 1.4))
        // Two scraps of paper, two leaves or two chips of stone hop up where the finger landed and flutter down, one to each side.
        for (const side of [-1, 1]) {
          paper.put(ctx, scrap.of === 'stone' ? props.chip : scrap.of === 'hill' ? props.blade : props.fleck, scrap.x + side * (10 + Math.abs(Math.sin(scrap.turn)) * 30 * t), scrap.y - up + 50 * t * t, { turn: scrap.turn + side * t * 7, alpha })
          this.count++
        }
      }
      // The ghost hand shows one tap on that same thing.
      if (guide && at && guide.demo !== null) {
        const hand = handPose(guide.demo, false, this.hand)
        // Beside the face of a big one who waits well into the page, not over it.
        const aside = target!.key === 'edge' && target!.roomy ? 58 : 10
        paper.put(ctx, props.hand, at.x + aside, at.y - (at.wide ? 96 : 70) + (1 - hand.press) * 18, { alpha: hand.opacity * 0.95, turn: -0.18 })
        this.count++
      }
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.globalAlpha = 1
    // With the frame drawn, one more figure is cut for later, until every kind is there at every size.
    if (this.warming) this.warming = paper.figures.warm()
    return this.count
  }
}
