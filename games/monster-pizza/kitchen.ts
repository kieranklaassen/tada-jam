import { layOut, type Pictured } from './card'
import { CHARACTERS, CUSTOMERS, type Customer } from './customers'
import { handPose, type Guidance, type HandPose } from './guidance'
import { chooseHint, glows, type Scene as HintScene } from './hint'
import { countsAsDone } from './input'
import type { Kind } from './kinds'
import { CARD, COUNTER_Y, CUSTOMER, OVEN, OVEN_WAY, PIZZA, SERVE, onPizza } from './layout'
import { MotionDirector, type Delta } from './motion'
import { compare, harder, layOrder, outcomeFor, refillDoor } from './order'
import type { Pose } from './pose'
import { makeRng, type Rng } from './rng'
import type { Save, SavedPiece } from './save'
import { Scene, type Beat } from './scene'
import { baking, bakedAlready, eating, firstShowing, handFed, ovenShowing, rawTasting, steppingUp, tasting, type Stagehand } from './scenes'
import { spring, stepSpring } from './spring'
import { calm, doorSpot, restStaging, type Staging } from './staging'
import { beginCycle, finishCycle } from './state'
import { carry, dropHand, feedHand, flightAt, freeSpot, hopFromTub, jigglePizza, landNow, makeTable, pressPiece, pressTub, releaseHand, restingPieces, spitHome, stepTable, tapHand, tubAt, waitHand, whatIsAt, type Table } from './table'
import { planTasting } from './tasting'
import type { Show } from './view'
import { babble, boing, home, jiggle, knock, pip, plop, pop, type VoiceSpec } from './voices'

// The kitchen as the child plays it: what a touch lands on and what it does,
// one step of game time, and what a frame shows. Framework-free: the Mount
// hands it gestures in stage units and the attended clock's steps, and takes
// back the voices to sound and a hint when something should be saved.
//
// The toy is the table (table.ts): one touch on a tub puts out one piece. The
// game on it is one customer at a time: top the pizza to match the card, bake
// it, serve it. A wrong pizza is tasted and pushed back as it was; a right
// one is eaten, and the next customer comes in on the child's touch.

type Held = 'tub' | 'piece' | 'pizza' | 'customer' | 'oven' | 'card' | 'small' | 'big' | null

/** Seconds a first-time child is left alone before a character shows the tap on a tub, and the way to the oven. */
export const SHOW_TAP_AFTER = 1.2
export const SHOW_OVEN_AFTER = 4

export class Kitchen {
  readonly table: Table
  /** Voices to sound, in order. The Mount plays and empties it every frame. */
  readonly sounds: VoiceSpec[] = []
  /** Something changed that a save should hold: `soon` for a piece set down, `now` for an outcome. The Mount clears it. */
  dirty: 'no' | 'soon' | 'now' = 'no'
  private state: Save
  private readonly st: Staging = restStaging()
  private scene: Scene | null = null
  /** A touch is ending the scene: its beats land where they were going, in silence. */
  private skipping = false
  private readonly rng: Rng
  private readonly directors = new Map<Customer, MotionDirector>()
  private readonly seed: number
  private now = 0
  /** Seconds of game time since the child last touched anything, counted only while no scene plays. */
  private idle = 0
  private held: Held = null
  /** How many pieces the child has put out or taken off with its own finger since this customer stepped up. */
  private own = 0
  private grab: { x: number; y: number } | null = null
  private pictured: Pictured[] = []
  /** The pizza looks baked: set when it comes out of the oven, a moment after the save says so. */
  private bakedLook: boolean
  /** A piece the first showing has promised and not yet put out: a save holds it on its spot. */
  private promised: SavedPiece | null = null
  private readonly hand: HandPose = { travel: 0, press: 0, opacity: 0 }
  private readonly shown: Show
  private readonly ovenShake = spring()
  private readonly cardShake = spring()
  private readonly stagehand: Stagehand = { sound: (spec) => { if (!this.skipping) this.sounds.push(spec) } }

  constructor(save: Save, seed: number) {
    this.state = save
    this.seed = seed
    this.rng = makeRng(seed ^ 0x9e3779b9)
    if (!save.customer || !save.order) this.seatFirst()
    if (!this.state.waiting) this.state.waiting = refillDoor(null, null, this.state.customer, null, this.rng)
    this.table = makeTable(this.state.tubs, seed)
    if (!this.state.finished) for (const p of this.state.pizza.pieces) this.table.pieces.push({ id: this.table.nextId++, kind: p.kind, x: p.x, y: p.y, turn: p.turn, settle: spring() })
    this.bakedLook = this.state.pizza.baked
    this.layCard()
    // Found as left: after the eating the board is bare, and nothing replays.
    if (this.state.finished) {
      this.st.pizzaHidden = true
      this.st.cardOpen = 0
    }
    this.shown = {
      table: this.table, baked: false, pizza: { x: PIZZA.x, y: PIZZA.y, size: 1, hidden: false, bites: 0, puffed: 0 },
      customer: null, leaving: null, card: null, waiting: [], tubsIn: 1, glow: 0, glows: [], time: 0, ghost: null,
      ovenShake: 0, ovenGlow: 0, effect: null, lick: 0, sizzling: -1, sizzle: 0, soot: 0, crumbs: false,
    }
  }

  /** A first visit, or a save whose counter could not be read: a customer is at the counter already, wanting something. */
  private seatFirst(): void {
    const atDoor = this.state.waiting
    const who = this.rng.pick(CUSTOMERS.filter((c) => c !== atDoor?.small && c !== atDoor?.big))
    // A first order ever holds at least two pieces, so the showing of a tap never completes it.
    const order = layOrder(this.state.position, who, this.rng, this.state.shown.includes('tap-a-tub') ? 1 : 2)
    this.state = { ...this.state, finished: false, customer: who, order: { wanted: order.wanted, picture: order.picture, seed: order.seed }, tubs: order.tubs, bigRoll: false, pizza: { pieces: [], baked: false }, pushedBack: 0 }
    this.dirty = 'now'
  }

  private layCard(): void {
    const order = this.state.order
    this.pictured = order ? layOut(order.wanted, order.picture, order.seed) : []
  }

  private director(who: Customer): MotionDirector {
    let d = this.directors.get(who)
    if (!d) {
      d = new MotionDirector(who, this.seed ^ (CUSTOMERS.indexOf(who) + 1) * 0x51ed, this.now)
      this.directors.set(who, d)
    }
    return d
  }

  /** What a save holds: the outcome of whatever is playing, with every piece at rest. */
  toSave(): Save {
    const pieces = this.state.finished ? [] : restingPieces(this.table)
    if (this.promised && !this.state.finished) pieces.push(this.promised)
    return { ...this.state, pizza: { pieces, baked: this.state.pizza.baked } }
  }

  /** The pieces a save holds: at rest, never in the air. */
  pieces(): SavedPiece[] {
    return this.toSave().pizza.pieces
  }

  /** A scene is playing. The Mount keeps the idle ladder at the bottom for as long as it does. */
  get busy(): boolean {
    return this.scene !== null
  }

  private mark(how: 'soon' | 'now'): void {
    if (this.dirty !== 'now') this.dirty = how
  }

  private play(beats: Beat[], saveOutcome: () => void): void {
    this.endScene()
    this.scene = new Scene(beats)
    this.scene.start(this.now, () => {
      saveOutcome()
      this.mark('now')
    })
    // The beats that start at once are played at once, so the scene's first frame is drawn in this frame.
    this.scene.update(this.now)
  }

  /** A touch ends whatever scene is playing: every beat lands where it was going. */
  private endScene(): void {
    if (!this.scene) return
    this.skipping = true
    this.scene.finish()
    this.skipping = false
    this.scene = null
    calm(this.st)
  }

  // --- The job ------------------------------------------------------------------

  private get pizzaOnBoard(): boolean {
    return !this.state.finished && !this.st.pizzaHidden
  }

  /** The pizza goes to the oven. Raw with something on it, it bakes; with nothing on it, it puffs up; baked, it comes straight back. */
  private bake(): void {
    if (!this.pizzaOnBoard) return
    landNow(this.table)
    const kinds = [...new Set(this.table.pieces.map((p) => p.kind))]
    const knowsOven = () => { if (!this.state.shown.includes('to-the-oven')) this.state.shown = [...this.state.shown, 'to-the-oven'] }
    if (this.state.pizza.baked) return this.play(bakedAlready(this.st, this.stagehand), knowsOven)
    const out = () => { this.bakedLook = this.state.pizza.baked }
    this.play([...baking(this.st, kinds, this.stagehand), { at: 2.3, lasts: 0, play: out }], () => {
      knowsOven()
      // Saved as baked the moment it goes in, so a put-away while it bakes loses nothing.
      if (kinds.length > 0) this.state.pizza = { ...this.state.pizza, baked: true }
    })
  }

  /** The pizza goes to the customer. Raw, it is tasted as raw dough; baked, it is paired off with the card, and eaten if it comes out even. */
  private serve(): void {
    const who = this.state.customer, order = this.state.order
    if (!this.pizzaOnBoard || !who || !order) return
    landNow(this.table)
    if (!this.state.pizza.baked) return this.play(rawTasting(this.st, who, CHARACTERS[who].loves, this.stagehand), () => {})
    const off = compare(order.wanted, this.table.pieces)
    if (off.length === 0) {
      const eaten = () => { this.table.pieces.length = 0 }
      return this.play(eating(this.st, who, order.wanted[0].kind, eaten, this.stagehand), () => {
        // The ending is saved when it starts: the cycle is finished and the position has moved.
        const next = finishCycle(this.state, outcomeFor(this.state.pushedBack, this.state.bigRoll))
        this.state = { ...this.state, position: next.position, finished: true, pizza: { pieces: [], baked: false } }
      })
    }
    const plan = planTasting(off)
    // The pieces with no partner on the card are the last ones laid of their kind; the drawn pieces with no partner are the last ones of their kind on the card.
    const extras = (kind: Kind, index: number): number => {
      const ofKind = this.table.pieces.filter((p) => p.kind === kind)
      return ofKind[ofKind.length - 1 - index]?.id ?? -1
    }
    const missing = (kind: Kind, index: number) => {
      const drawn = this.pictured.map((p, i) => ({ ...p, index: i })).filter((p) => p.kind === kind)
      const p = drawn[drawn.length - 1 - index] ?? drawn[0]
      return { index: p.index, x: p.x, y: p.y }
    }
    const tubOf = (kind: Kind) => {
      const i = this.table.tubs.findIndex((t) => t.kind === kind)
      return i < 0 ? null : tubAt(this.table, i)
    }
    this.play(tasting(this.st, plan, who, extras, missing, tubOf, this.stagehand), () => {
      this.state = { ...this.state, pushedBack: Math.min(2, this.state.pushedBack + 1) }
    })
  }

  /** The child touched one of the two at the door, and the customer at the counter has eaten: the next cycle begins. */
  private callIn(which: 'small' | 'big'): void {
    const before = this.state.waiting
    if (!before || !this.state.finished) return
    const who = before[which], leaving = this.state.customer
    // The roll opens now, from the position as it stands now: the big roll is an order one place higher.
    const higher = harder(this.state.position)
    const bigRoll = which === 'big' && higher !== this.state.position
    const order = layOrder(bigRoll ? higher : this.state.position, who, this.rng)
    const waiting = refillDoor(before, which, who, leaving, this.rng)
    const begin = () => {
      this.state = { ...beginCycle(this.state), customer: who, order: { wanted: order.wanted, picture: order.picture, seed: order.seed }, tubs: order.tubs, bigRoll, pizza: { pieces: [], baked: false }, pushedBack: 0, waiting, shown: this.state.shown }
      this.table.tubs = order.tubs.map((kind) => ({ kind, squash: spring() }))
      this.table.pieces.length = 0
      this.table.flights.length = 0
      this.table.hand = null
      this.bakedLook = false
      this.own = 0
      this.st.pizzaHidden = false
      this.st.bites = 0
      this.st.pizzaX = PIZZA.x
      this.st.pizzaSize = 1
      this.layCard()
    }
    // Each drawn piece ticks on its own step: one, two, three within its kind.
    const counts: number[] = []
    for (const want of order.wanted) for (let n = 1; n <= want.count; n++) counts.push(n)
    this.play(steppingUp(this.st, who, which, leaving, order.picture === 'rows' ? counts : counts.map((_, i) => i + 1), this.stagehand), begin)
  }

  /** A piece reached the customer's mouth: its own answer to that kind plays. */
  private fed(kind: Kind): void {
    const who = this.state.customer
    if (!who) return
    const mouth = this.mouth()
    this.play(handFed(this.st, who, kind, () => spitHome(this.table, kind, mouth), this.stagehand), () => {})
  }

  /** Where the customer's mouth is, in stage units. */
  private mouth(): { x: number; y: number } {
    const c = CHARACTERS[this.state.customer ?? 'grum']
    return { x: CUSTOMER.x, y: CUSTOMER.y - c.mouthAt * c.height + 12 }
  }

  // --- Touch ----------------------------------------------------------------------

  private over(x: number, y: number): Held {
    if (!this.state.finished || this.table.tubs.length > 0) {
      const at = whatIsAt(this.table, x, y)
      if (at?.what === 'tub') return 'tub'
      if (this.pizzaOnBoard && (at?.what === 'piece' || at?.what === 'pizza')) return at.what
    }
    for (const which of ['small', 'big'] as const) {
      const spot = doorSpot(which)
      if (Math.abs(x - spot.x) < 60 && y < COUNTER_Y && y > spot.y - 150) return which
    }
    const who = this.state.customer
    if (who && Math.abs(x - CUSTOMER.x) < CHARACTERS[who].halfWidth && y < COUNTER_Y && y > CUSTOMER.y - CHARACTERS[who].height - 110) return 'customer'
    if (Math.abs(x - OVEN.x) < OVEN.w / 2 && Math.abs(y - OVEN.y) < OVEN.h / 2) return 'oven'
    if (x > CARD.x && x < CARD.x + CARD.w && y > CARD.y && y < CARD.y + CARD.h) return 'card'
    return null
  }

  /** Touch-down. A scene that is playing ends first; then whatever is under the finger answers, in this frame. */
  press(x: number, y: number): void {
    this.endScene()
    this.idle = 0
    this.held = this.over(x, y)
    this.grab = { x, y }
    const who = this.state.customer
    if (this.held === 'tub') {
      const at = whatIsAt(this.table, x, y)
      if (at?.what === 'tub') pressTub(this.table, at.index)
    } else if (this.held === 'piece') {
      const at = whatIsAt(this.table, x, y)
      if (at?.what === 'piece') pressPiece(this.table, at.id)
    } else if (this.held === 'pizza') jigglePizza(this.table)
    else if (this.held === 'customer' && who) {
      this.director(who).trigger('poke', this.now)
      this.sounds.push(babble(CHARACTERS[who].voice, 'giggle'))
    } else if (this.held === 'small' || this.held === 'big') {
      const waiting = this.state.waiting?.[this.held]
      if (waiting) {
        this.director(waiting).trigger('poke', this.now)
        this.sounds.push(babble(CHARACTERS[waiting].voice, this.state.finished ? 'glee' : 'giggle'))
      }
    } else if (this.held === 'oven') {
      this.ovenShake.v += 9
      this.sounds.push(knock)
    } else if (this.held === 'card' && who) {
      this.cardShake.v += 8
      this.sounds.push(babble(CHARACTERS[who].voice, 'ask'))
    }
  }

  /** The finger lifted where it landed. */
  tap(): void {
    const held = this.held
    this.held = null
    if (held === 'tub' && this.state.finished) {
      // The board is bare after the eating: a piece tapped out goes straight to the customer, who is never too full for one more.
      feedHand(this.table, this.mouth())
    } else if (held === 'tub' || held === 'piece') {
      tapHand(this.table)
      this.own += 1
      this.mark('soon')
    } else if (held === 'customer' && this.pizzaOnBoard && this.state.pizza.baked) this.serve()
    else if (held === 'oven' && this.pizzaOnBoard) this.bake()
    else if (held === 'small' || held === 'big') this.callIn(held)
  }

  dragMove(x: number, y: number): void {
    if (this.held === 'tub' || this.held === 'piece') carry(this.table, x, y)
    else if (this.held === 'pizza' && this.grab) {
      // The pizza slides under the finger, with everything on it: towards the oven or up to the customer, and never over a tub.
      this.st.pizzaX = PIZZA.x + Math.max(0, Math.min(OVEN_WAY.x - PIZZA.x, x - this.grab.x))
      this.st.pizzaY = PIZZA.y + Math.max(SERVE.y - PIZZA.y, Math.min(0, y - this.grab.y))
    }
  }

  /** The finger let go mid-carry and may come back. */
  dragLift(): void {
    if (this.held === 'tub' || this.held === 'piece') waitHand(this.table)
  }

  dragEnd(): void {
    const held = this.held
    this.held = null
    if (held === 'tub' || held === 'piece') {
      const hand = this.table.hand, who = this.state.customer
      // Let go over the customer, a piece is fed to it by hand.
      if (hand && who && Math.abs(hand.x - CUSTOMER.x) < CHARACTERS[who].halfWidth && hand.y < COUNTER_Y) feedHand(this.table, this.mouth())
      else if (this.pizzaOnBoard) {
        dropHand(this.table)
        this.own += 1
      }
      else {
        // No pizza to lay it on: it goes home.
        carry(this.table, -999, -999)
        dropHand(this.table)
      }
      this.mark('soon')
    } else if (held === 'pizza') {
      // A slide counts when partly done: half the way to the oven bakes, half the way to the customer serves.
      const at = { x: this.st.pizzaX, y: this.st.pizzaY }
      if (countsAsDone(PIZZA, at, OVEN_WAY)) this.bake()
      else if (countsAsDone(PIZZA, at, SERVE)) this.serve()
    }
  }

  /** The press ended and was not a tap: everything in hand goes back where it came from. */
  pressEnd(): void {
    if (this.held === 'tub' || this.held === 'piece') releaseHand(this.table)
    this.held = null
  }

  // --- Time -----------------------------------------------------------------------

  /** Where the customer's eyes go when no scene says: the piece in the air, the piece in the hand, or the pizza. */
  private watched(): { x: number; y: number } {
    const flight = this.table.flights[this.table.flights.length - 1]
    if (flight) return flightAt(flight)
    if (this.table.hand) return this.table.hand
    return { x: this.st.pizzaX, y: this.st.pizzaY }
  }

  /** The new ideas a character shows once ever, to a child who has paused. */
  private showings(): void {
    const who = this.state.customer
    if (this.scene || this.held || this.state.finished || !who || this.state.pizza.baked) return
    const laid = this.table.pieces.length + this.table.flights.length
    if (!this.state.shown.includes('tap-a-tub') && laid === 0 && this.idle >= SHOW_TAP_AFTER) {
      const index = Math.max(0, this.table.tubs.findIndex((t) => t.kind === CHARACTERS[who].loves))
      const spot = freeSpot(this.table)
      if (!spot) return
      const kind = this.table.tubs[index].kind
      this.play(firstShowing(this.st, tubAt(this.table, index), () => {
        this.promised = null
        hopFromTub(this.table, index, spot)
      }), () => {
        // Saved at the start: the idea as shown, and the piece on the spot it will land on.
        this.state = { ...this.state, shown: [...this.state.shown, 'tap-a-tub'] }
        this.promised = { kind, x: spot.x, y: spot.y, turn: 0 }
      })
    } else if (this.state.shown.includes('tap-a-tub') && !this.state.shown.includes('to-the-oven') && this.own > 0 && laid > 0 && this.table.flights.length === 0 && this.idle >= SHOW_OVEN_AFTER) {
      // Only once the child has laid a piece with its own finger: the way to the oven is not shown to a child who is still watching.
      this.play(ovenShowing(this.st, this.stagehand), () => {
        this.state = { ...this.state, shown: [...this.state.shown, 'to-the-oven'] }
      })
    }
  }

  /** Plays `dt` seconds of game time. */
  step(dt: number): void {
    this.now += dt
    if (this.scene) {
      this.scene.update(this.now)
      if (!this.scene.running) {
        this.scene = null
        calm(this.st)
      }
    } else if (!this.held) this.idle += dt
    stepTable(this.table, dt)
    stepSpring(this.ovenShake, 0, dt, 240, 10)
    stepSpring(this.cardShake, 0, dt, 200, 9)
    const who = this.state.customer
    for (const event of this.table.events) {
      if (event.type === 'pop') this.sounds.push(pop)
      else if (event.type === 'plop') {
        this.sounds.push(plop(event.kind, event.count))
        if (who && !this.scene && !this.director(who).busy) this.director(who).trigger('react', this.now)
      } else if (event.type === 'pip') this.sounds.push(pip(event.kind, event.count))
      else if (event.type === 'home') this.sounds.push(home)
      else if (event.type === 'boing') this.sounds.push(boing)
      else if (event.type === 'fed') this.fed(event.kind)
      else this.sounds.push(jiggle)
    }
    this.table.events.length = 0
    // A pizza let go short of the oven or the customer slides back to the board.
    if (!this.scene && this.held !== 'pizza') {
      const back = Math.min(1, dt * 12)
      this.st.pizzaX += (PIZZA.x - this.st.pizzaX) * back
      this.st.pizzaY += (PIZZA.y - this.st.pizzaY) * back
      this.st.pizzaSize += (1 - this.st.pizzaSize) * back
    }
    if (!this.st.effect) this.st.soot = Math.max(0, this.st.soot - dt / 5)
    this.showings()
    this.move(dt)
  }

  /** Every customer's motion for this frame: its own life, and what a scene adds to it. */
  private move(dt: number): void {
    const who = this.state.customer
    if (who) {
      const c = CHARACTERS[who], director = this.director(who)
      const eye = { x: CUSTOMER.x, y: CUSTOMER.y - c.height * 0.8 }
      const look = this.st.lookAt ?? this.watched()
      // Its mouth waters at a pizza: a little as it fills, wide at a baked one. Full, it only smiles.
      director.want = this.state.finished ? 0.15 : this.bakedLook ? 1 : Math.min(0.6, this.table.pieces.length / 8)
      const pose = director.update(this.now, dt, { x: Math.max(-1, Math.min(1, (look.x - eye.x) / 360)), y: Math.max(-1, Math.min(1, (look.y - eye.y) / 260)) }, this.scene !== null)
      add(pose, this.st.act)
      if (this.state.finished && !this.scene) add(pose, { squash: 0.06, part: 0.5, blink: 0.12 })
      // One hand holds the card up, and pats it in a tasting; the other is the scene's to move.
      const walking = this.st.customer !== null
      const holding = this.st.cardHand ?? { x: CARD.x + 4, y: CARD.y + CARD.h * 0.6 }
      pose.handR = !walking && this.st.cardOpen > 0.5 ? { x: holding.x - CUSTOMER.x, y: holding.y - CUSTOMER.y } : null
      pose.handL = this.st.hand ? { x: this.st.hand.x - CUSTOMER.x, y: this.st.hand.y - CUSTOMER.y } : null
    }
    const waiting = this.state.waiting
    if (waiting) {
      for (const which of ['small', 'big'] as const) {
        // The two at the door watch the kitchen. They never hurry anyone.
        const pose = this.director(waiting[which]).update(this.now, dt, { x: 0.7, y: 0.5 })
        pose.handL = null
        pose.handR = null
      }
    }
    const leaving = this.st.leaving
    if (leaving) add(this.director(leaving.who).update(this.now, dt, { x: 1, y: 0 }, true), leaving.act)
  }

  // --- The frame --------------------------------------------------------------------

  private hintScene(): HintScene {
    const s = this.state
    return {
      finished: s.finished,
      baked: s.pizza.baked,
      own: this.own > 0,
      tubs: this.table.tubs.map((_, i) => tubAt(this.table, i)),
      pieces: this.pizzaOnBoard ? this.table.pieces.map((p) => onPizza(p.x, p.y)) : [],
      door: s.waiting ? [doorSpot('small'), doorSpot('big')] : [],
    }
  }

  /** What this frame shows, with the idle ladder's glow and its ghost hand. The same object every frame. */
  show(guidance: Guidance): Show {
    const show = this.shown, st = this.st, s = this.state
    show.time = this.now
    show.baked = this.bakedLook
    show.pizza.x = st.pizzaX
    show.pizza.y = st.pizzaY
    show.pizza.size = st.pizzaSize
    show.pizza.hidden = st.pizzaHidden || s.finished && !this.scene
    show.pizza.bites = st.bites
    show.pizza.puffed = st.puffed
    show.customer = s.customer ? { who: s.customer, pose: this.director(s.customer).pose, x: st.customer?.x ?? CUSTOMER.x, y: st.customer?.y ?? CUSTOMER.y, size: st.customer?.size ?? 1 } : null
    show.leaving = st.leaving ? { who: st.leaving.who, pose: this.director(st.leaving.who).pose, x: st.leaving.x, y: st.leaving.y, size: st.leaving.size } : null
    show.card = s.order ? { pictured: this.pictured, count: st.cardCount, open: st.cardOpen, patted: st.patted, pat: st.pat, shake: this.cardShake.x } : null
    show.waiting = s.waiting ? (['small', 'big'] as const).map((which) => ({ who: s.waiting![which], big: which === 'big', pose: this.director(s.waiting![which]).pose, up: st.arriving?.which === which ? st.arriving.up : 1 })) : []
    show.tubsIn = st.tubsIn
    show.ovenShake = this.ovenShake.x
    show.ovenGlow = st.ovenGlow
    show.effect = st.effect
    show.lick = st.lick
    show.sizzling = st.sizzling
    show.sizzle = st.sizzle
    show.soot = st.soot
    show.crumbs = s.finished && !this.scene
    show.glow = this.scene ? 0 : guidance.glow
    show.glows = show.glow > 0.01 ? glows(this.hintScene()) : []
    show.ghost = null
    if (guidance.demo !== null && !this.scene) {
      // One move a child could make now, never the answer. A tap is shown as one press: here one press is one piece.
      const hint = chooseHint(this.hintScene(), guidance.demoIndex)
      if (hint) {
        const pose = handPose(guidance.demo, hint.move === 'drag', this.hand, 1)
        const from = hint.move === 'tap' ? hint.at : hint.from, to = hint.move === 'tap' ? hint.at : hint.to
        show.ghost = { x: from.x + (to.x - from.x) * pose.travel + 18, y: from.y + (to.y - from.y) * pose.travel - 4, press: pose.press, opacity: pose.opacity }
      }
    }
    return show
  }
}

/** Adds what a scene asks of a body to its own motion. */
function add(pose: Pose, d: Delta): void {
  if (d.lift) pose.lift = Math.max(0, pose.lift + d.lift)
  if (d.squash) {
    const squash = Math.max(-0.4, Math.min(0.5, 1 - pose.sy + d.squash))
    pose.sy = 1 - squash
    pose.sx = 1 + squash * 0.7
  }
  if (d.lean) pose.lean += d.lean
  if (d.mouth) pose.mouth = Math.max(0, Math.min(1, pose.mouth + d.mouth))
  if (d.tongue) pose.tongue = Math.max(0, Math.min(1, pose.tongue + d.tongue))
  if (d.part) pose.part += d.part
  if (d.lookX) pose.lookX = Math.max(-1, Math.min(1, pose.lookX + d.lookX))
  if (d.lookY) pose.lookY = Math.max(-1, Math.min(1, pose.lookY + d.lookY))
  if (d.blink) pose.blink = Math.max(0, Math.min(1, pose.blink + d.blink))
}
