import { layOut, type Pictured } from './card'
import { CHARACTERS, CUSTOMERS, type Customer } from './customers'
import { CLOUD_LASTS, PUFF_LASTS } from './ambient'
import { handPose, type Guidance, type HandPose } from './guidance'
import { chooseHint, glows, type Scene as HintScene } from './hint'
import { countsAsDone } from './input'
import type { Kind } from './kinds'
import { BITES, CARD, CARD_HOLD, COUNTER_Y, CUSTOMER, DOOR_SIZE, OVEN, OVEN_WAY, PIZZA, ROLL, SERVE, biteOf, onPizza } from './layout'
import { MotionDirector, type Delta } from './motion'
import { compare, harder, layOrder, outcomeFor, refillDoor } from './order'
import { handAt, type Pose } from './pose'
import { STREET_ANSWER, streetAt, type StreetHit } from './street'
import { makeRng, type Rng } from './rng'
import type { Save, SavedPiece } from './save'
import { Scene, type Beat } from './scene'
import { baking, bakedAlready, eating, firstShowing, handFed, ovenShowing, rawTasting, steppingUp, tasting, type Pair, type Stagehand } from './scenes'
import { spring, stepSpring } from './spring'
import { calm, doorSpot, restStaging, type Staging } from './staging'
import { beginCycle, finishCycle } from './state'
import { AT_REST, carry, dropHand, feedHand, feeding, sendHome, stillAtTub, takeBack, flightAt, freeSpot, hopFromTub, jigglePizza, landNow, makeTable, pressPiece, pressTub, releaseHand, restingPieces, spitHome, stepTable, tapHand, tubAt, turnAt, waitHand, whatIsAt, type Table } from './table'
import { planTasting } from './tasting'
import type { Show } from './view'
import { babble, boing, home, jiggle, knock, lick, pip, plop, pop, streetVoice, tap, type VoiceSpec } from './voices'

// The kitchen as the child plays it: what a touch lands on and what it does,
// one step of game time, and what a frame shows. Framework-free: the Mount
// hands it gestures in stage units and the attended clock's steps, and takes
// back the voices to sound and a hint when something should be saved.
//
// The toy is the table (table.ts): one touch on a tub puts out one piece. The
// game on it is one customer at a time: top the pizza to match the card, bake
// it, serve it. A wrong pizza is tasted and pushed back as it was; a right
// one is eaten, and the next customer comes in on the child's touch.

type Held = 'tub' | 'piece' | 'pizza' | 'customer' | 'oven' | 'card' | 'small' | 'big' | 'street' | null

/** Seconds a first-time child is left alone before a character shows the tap on a tub, and the way to the oven. */
/** For this long after a tap on the customer that ended a scene, further taps on it only poke it. */
export const POKES_FOR = 1
/** How long the customer shows that it is still busy when a pizza is served to it too soon. */
export const BUSY_FOR = 0.9
export const SHOW_TAP_AFTER = 1.2
export const SHOW_OVEN_AFTER = 4
/** While the child is idle the customer glances at its card this often, for this long, in seconds. */
export const GLANCE_EVERY = 4
export const GLANCE_LASTS = 0.9

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
  /** Each roll at the door, waved by its holder when it is touched. */
  private readonly rollWave = { small: spring(), big: spring() }
  /** Puffs of flour that landings have left, youngest last. Only drawn: nothing reads them. */
  private readonly puffs: { x: number; y: number; age: number; cloud?: boolean }[] = []
  /** How far the customer's free hand has reached for a baked pizza, 0 to 1. */
  private readonly reach = spring()
  /** The oven's fire flares when it is poked. */
  private readonly flare = spring()
  /** Where on the pizza the piece lies that the customer laid in its first showing, until the child takes a piece of its own. Not saved: found again, that piece is one of the pizza's. */
  private shownAt: { x: number; y: number } | null = null
  /** When a pizza was last served to a customer that was still tasting the one before. */
  private busyAt = -Infinity
  /** How strongly, 0 to 1, the customer is showing that it is still busy with the last taste: it rises fast and is gone in under a second. */
  private stillBusy(now: number): number {
    const u = (now - this.busyAt) / BUSY_FOR
    return u < 0 || u >= 1 ? 0 : Math.sin(Math.min(1, u * 3) * Math.PI / 2) * (1 - Math.max(0, (u - 0.6) / 0.4))
  }

  /** The thing in the street that was last touched, where, and when: its answer plays for a moment. Never saved. */
  private street: (StreetHit & { at: number }) | null = null
  /** The customer has stood still since it pulled a sock on. */
  private wornStill = false
  /** Until when, in game time, the customer is still tasting the pizza it last pushed back. Not saved: found again, it is ready. */
  private tastingUntil = -Infinity
  /** When the customer was last only poked by a tap that would otherwise have served. */
  private pokedAt = -Infinity
  /** The press that is down ended a scene as it landed. */
  private cut = false
  /** The finger has lifted in the middle of a carry or a slide, and may come back within the moment the input allows. */
  private lifted = false
  /** Where the child's finger is while it is down, in stage units: every eye in the room follows it. */
  private finger: { x: number; y: number } | null = null
  private readonly stagehand: Stagehand = {
    sound: (spec) => { if (!this.skipping) this.sounds.push(spec) },
    // The two at the door see what happens at the counter and react, each in its own way and a moment apart.
    crowd: () => {
      const waiting = this.state.waiting
      if (this.skipping || !waiting) return
      this.director(waiting.small).trigger('react', this.now)
      this.director(waiting.big).trigger('poke', this.now)
    },
    puff: (at) => { if (!this.skipping) this.puffs.push({ ...at, age: 0, cloud: true }) },
  }

  constructor(save: Save, seed: number) {
    this.state = save
    this.seed = seed
    this.rng = makeRng(seed ^ 0x9e3779b9)
    if (!save.customer || !save.order) this.seatFirst()
    if (!this.state.waiting) this.state.waiting = refillDoor(null, null, this.state.customer, null, this.rng)
    this.table = makeTable(this.state.tubs, seed)
    if (!this.state.finished) for (const p of this.state.pizza.pieces) this.table.pieces.push({ id: this.table.nextId++, kind: p.kind, x: p.x, y: p.y, turn: turnAt(p.x, p.y, p.kind), settle: spring(), age: AT_REST })
    this.bakedLook = this.state.pizza.baked
    this.layCard()
    // Found as left: after the eating the pizza is gone, its crumbs lie on the board, and nothing replays.
    if (this.state.finished) {
      this.st.pizzaHidden = true
      this.st.bites = 3
      this.st.cardOpen = 0
    }
    this.shown = {
      table: this.table, baked: false, pizza: { x: PIZZA.x, y: PIZZA.y, size: 1, hidden: false, bites: 0, puffed: 0 },
      customer: null, leaving: null, card: null, waiting: [], tubsIn: 1, glow: 0, glows: [], time: 0, ghost: null,
      ovenShake: 0, ovenGlow: 0, effect: null, lick: 0, roll: null, street: null, boardX: 0, sizzling: [], pairing: false, door: 0, sizzle: 0, soot: 0, baking: 0, wearing: false, puffs: [], crumbs: false,
    }
  }

  /** A first visit, or a save whose counter could not be read: a customer is at the counter already, wanting something. */
  private seatFirst(): void {
    const atDoor = this.state.waiting
    const who = this.rng.pick(CUSTOMERS.filter((c) => c !== atDoor?.small && c !== atDoor?.big))
    // A first order ever holds at least two pieces, so the showing of a tap never completes it.
    const order = layOrder(this.state.position, who, this.rng, this.state.shown.includes('tap-a-tub') ? 1 : 2)
    this.state = { ...this.state, finished: false, customer: who, order: { wanted: order.wanted, picture: order.picture, seed: order.picture === 'scattered' ? order.seed : 1 }, tubs: order.tubs, bigRoll: false, pizza: { pieces: [], baked: false }, pushedBack: 0 }
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
    this.unwear()
    this.scene = new Scene(beats)
    this.scene.start(this.now, () => {
      saveOutcome()
      this.mark('now')
    })
    // The beats that start at once are played at once, so the scene's first frame is drawn in this frame.
    this.scene.update(this.now)
  }

  /** A sock that is being worn drops back into its tub: the customer has moved. */
  private unwear(): void {
    if (!this.st.wearing) return
    this.st.wearing = false
    const who = this.state.customer
    if (who) spitHome(this.table, 'sock', { x: CUSTOMER.x + CHARACTERS[who].halfWidth * 0.5, y: CUSTOMER.y - CHARACTERS[who].height })
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

  /** Whether the big roll is the longer, fatter one. At the last place there is no harder order, and both rolls are the same. */
  private get fatRoll(): boolean {
    return harder(this.state.position) !== this.state.position
  }

  private get pizzaOnBoard(): boolean {
    return !this.state.finished && !this.st.pizzaHidden
  }

  /** The pizza goes to the oven. Raw with something on it, it bakes; with nothing on it, it puffs up; baked, it comes straight back. */
  private bake(): void {
    // A piece on its way to the customer's mouth is answered first: its scene would otherwise take the place of this one.
    if (!this.pizzaOnBoard || feeding(this.table)) return
    landNow(this.table)
    const kinds = [...new Set(this.table.pieces.map((p) => p.kind))]
    const knowsOven = () => { if (!this.state.shown.includes('to-the-oven')) this.state.shown = [...this.state.shown, 'to-the-oven'] }
    if (this.state.pizza.baked) return this.play(bakedAlready(this.st, this.stagehand), knowsOven)
    // It looks baked from the moment the door opens; each kind's baking move plays in the scene as it slides out.
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
    if (!this.pizzaOnBoard || !who || !order || feeding(this.table)) return
    // A customer that has just pushed a pizza back is still tasting it, however soon a touch ended the tasting's
    // show: until that tasting would have ended it takes no other, and a serving is only a poke. So a try never
    // takes less time than its tasting, and adding one piece and serving again is slower than counting.
    if (this.state.pizza.baked && this.now < this.tastingUntil) {
      // Answered as a poke, in its own manner, and in a way that says why: it turns its shut eyes away, holds its free hand up flat and smacks its lips, still busy with the last taste.
      this.director(who).trigger('poke', this.now)
      this.busyAt = this.now
      this.sounds.push(lick)
      return
    }
    landNow(this.table)
    // Raw, the kind it cannot stand still gets its own answer, as it does every time it is on the pizza.
    if (!this.state.pizza.baked) return this.play(rawTasting(this.st, who, CHARACTERS[who].loves, this.stagehand, this.table.pieces.some((p) => p.kind === CHARACTERS[who].cannotStand)), () => {})
    const off = compare(order.wanted, this.table.pieces)
    if (off.length === 0) {
      const eaten = () => { this.table.pieces.length = 0 }
      // Each bite has the crunch of the kinds that lie in the third it takes.
      const byBite = BITES.map((_, n) => [...new Set(this.table.pieces.filter((p) => biteOf(p.x, p.y) === n).map((p) => p.kind))])
      return this.play(eating(this.st, who, order.wanted.map((want) => want.kind), eaten, this.stagehand, byBite, this.pairs()), () => {
        // The ending is saved when it starts: the cycle is finished and the position has moved.
        const next = finishCycle(this.state, outcomeFor(this.state.pushedBack, this.state.bigRoll))
        this.state = { ...this.state, position: next.position, finished: true, pizza: { pieces: [], baked: false } }
      })
    }
    // The kind this customer cannot stand is always among the kinds played, however many others are off.
    const plan = planTasting(off, CHARACTERS[who].cannotStand)
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
    this.play(tasting(this.st, plan, who, extras, missing, tubOf, this.stagehand, this.pairs()), () => {
      this.state = { ...this.state, pushedBack: Math.min(2, this.state.pushedBack + 1) }
    })
    this.tastingUntil = this.now + plan.seconds
  }

  /**
   * Every piece on the pizza that has a partner on the card, with that partner: for each kind, the first pieces
   * laid pair off with the first ones drawn, in the card's order. The ones left over on either side have none.
   */
  private pairs(): Pair[] {
    const out: Pair[] = []
    const taken = new Map<Kind, number>()
    this.pictured.forEach((picture, index) => {
      const nth = taken.get(picture.kind) ?? 0
      const piece = this.table.pieces.filter((p) => p.kind === picture.kind)[nth]
      taken.set(picture.kind, nth + 1)
      if (piece) out.push({ id: piece.id, index })
    })
    return out
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
      this.state = { ...beginCycle(this.state), customer: who, order: { wanted: order.wanted, picture: order.picture, seed: order.picture === 'scattered' ? order.seed : 1 }, tubs: order.tubs, bigRoll, pizza: { pieces: [], baked: false }, pushedBack: 0, waiting, shown: this.state.shown }
      this.table.tubs = order.tubs.map((kind) => ({ kind, squash: spring() }))
      this.table.pieces.length = 0
      this.table.flights.length = 0
      this.table.hand = null
      this.bakedLook = false
      this.own = 0
      this.shownAt = null
      this.st.pizzaHidden = false
      this.st.bites = 0
      this.st.pizzaX = PIZZA.x
      this.st.pizzaSize = 1
      this.layCard()
    }
    // Each drawn piece ticks one step higher than the one before it, as each piece that lands on the pizza will:
    // the card's tune is the tune of the pizza that pairs with it.
    const total = order.wanted.reduce((n, want) => n + want.count, 0)
    this.play(steppingUp(this.st, who, which, leaving, Array.from({ length: total }, (_, i) => i + 1), this.stagehand, bigRoll), begin)
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
    const waiting = this.state.waiting
    for (const which of ['small', 'big'] as const) {
      const spot = doorSpot(which)
      // One at the door is touched on itself, up to a little over its head: the street behind it is not it.
      const tall = waiting ? CHARACTERS[waiting[which]].height * DOOR_SIZE + 64 : 200
      if (Math.abs(x - spot.x) < 76 && y < COUNTER_Y && y > spot.y - tall) return which
    }
    // The street through the doorway: each thing in it has a small answer of its own.
    if (streetAt(x, y, this.now)) return 'street'
    const who = this.state.customer
    if (who && Math.abs(x - CUSTOMER.x) < CHARACTERS[who].halfWidth && y < COUNTER_Y && y > CUSTOMER.y - CHARACTERS[who].height - 170) return 'customer'
    if (Math.abs(x - OVEN.x) < OVEN.w / 2 && Math.abs(y - OVEN.y) < OVEN.h / 2) return 'oven'
    // The card answers a touch while it hangs there: after the eating it has been rolled away.
    if (!this.state.finished && x > CARD.x && x < CARD.x + CARD.w && y > CARD.y && y < CARD.y + CARD.h) return 'card'
    return null
  }

  /**
   * Touch-down. A scene that is playing ends first; then whatever is under the finger answers, in this frame.
   * `corner` is a touch in the corner the grown-up overlay listens in: nothing under it answers, so a grown-up's
   * three taps move nothing in the kitchen, however small the surface.
   */
  press(x: number, y: number, corner = false): void {
    this.cut = this.scene !== null
    this.lifted = false
    // The first showing was still on its way to the tub: this touch ends it, and its piece hops now.
    const showed = this.promised !== null
    this.endScene()
    this.unwear()
    this.idle = 0
    this.held = corner ? null : this.over(x, y)
    // On a tub, that hop is this touch's one piece: the tub gives no second one, so one touch is still one piece.
    if (showed && this.held === 'tub') {
      this.held = null
      // That piece is this touch's own, so it stays, and the child has laid a piece.
      this.shownAt = null
      this.laidOwn()
    }
    // The customer takes back the piece it showed with as the child takes its own first piece from a tub: the child
    // then has as many pieces on the pizza as it has tapped, and one tap for each picture on the card makes the
    // first pizza right.
    if (this.held === 'tub' && this.shownAt) {
      if (takeBack(this.table, this.shownAt) && this.state.customer) this.director(this.state.customer).trigger('react', this.now)
      this.shownAt = null
      this.mark('soon')
    }
    this.grab = { x, y }
    this.finger = { x, y }
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
        // And it waves its roll.
        this.rollWave[this.held].v += 11
        this.sounds.push(babble(CHARACTERS[waiting].voice, this.state.finished ? 'glee' : 'giggle'))
      }
    } else if (this.held === 'street') {
      const hit = streetAt(x, y, this.now)
      if (hit) {
        this.street = { ...hit, at: this.now }
        this.sounds.push(streetVoice(hit.what))
      }
    } else if (this.held === 'oven') {
      this.ovenShake.v += 9
      this.flare.v += 7
      this.sounds.push(knock)
    } else if (this.held === 'card' && who) {
      this.cardShake.v += 8
      this.sounds.push(babble(CHARACTERS[who].voice, 'ask'))
    }
    this.hear()
  }

  /** The finger lifted where it landed. */
  tap(): void {
    const held = this.held
    this.held = null
    this.finger = null
    if (held === 'tub' && this.state.finished) {
      // The board is bare after the eating: a piece tapped out has nowhere to lie, so it drops by its tub, bounces and rolls back in. Carried to the customer it is still fed by hand.
      sendHome(this.table)
    } else if (held === 'tub' || held === 'piece') {
      tapHand(this.table)
      this.laidOwn()
      this.mark('soon')
    // A tap on the customer serves the pizza, baked or raw. One that ended a scene is only the poke it began as, and so is any that follows it within a second, so a child drumming on the customer does not serve the same pizza again and again.
    } else if (held === 'customer' && (this.cut || this.now - this.pokedAt < POKES_FOR)) this.pokedAt = this.now
    else if (held === 'customer' && this.pizzaOnBoard) this.serve()
    else if (held === 'oven' && this.pizzaOnBoard) this.bake()
    else if (held === 'small' || held === 'big') this.callIn(held)
    this.hear()
  }

  /** The child moved a piece with its own finger: a child who does that is not shown how. */
  private laidOwn(): void {
    this.own += 1
    if (!this.state.shown.includes('tap-a-tub')) this.state = { ...this.state, shown: [...this.state.shown, 'tap-a-tub'] }
  }

  dragMove(x: number, y: number): void {
    this.finger = { x, y }
    this.lifted = false
    if (this.held === 'tub' || this.held === 'piece') carry(this.table, x, y)
    else if (this.held === 'pizza' && this.grab) {
      // The pizza slides under the finger, with everything on it: towards the oven or up to the customer, and never over a tub.
      this.st.pizzaX = PIZZA.x + Math.max(0, Math.min(OVEN_WAY.x - PIZZA.x, x - this.grab.x))
      this.st.pizzaY = PIZZA.y + Math.max(SERVE.y - PIZZA.y, Math.min(0, y - this.grab.y))
    }
  }

  /** The finger let go mid-carry and may come back. */
  dragLift(): void {
    this.lifted = true
    if (this.held === 'tub' || this.held === 'piece') waitHand(this.table)
  }

  dragEnd(): void {
    const held = this.held
    this.held = null
    this.finger = null
    this.lifted = false
    // A tap on a tub that slid a little is still a tap: its piece hops on as a tap's does, and is not rolled home as a carry let go beside the pizza.
    if (held === 'tub' && stillAtTub(this.table)) {
      this.held = held
      return this.tap()
    }
    if (held === 'tub' || held === 'piece') {
      const hand = this.table.hand, who = this.state.customer
      // Let go over the customer, a piece is fed to it by hand.
      if (hand && who && Math.abs(hand.x - CUSTOMER.x) < CHARACTERS[who].halfWidth && hand.y < COUNTER_Y) {
        feedHand(this.table, this.mouth())
        // A piece carried to the customer is a piece the child moved itself.
        this.laidOwn()
      }
      else if (this.pizzaOnBoard) {
        dropHand(this.table)
        this.laidOwn()
      }
      else {
        // No pizza to lay it on: it drops where it was let go, bounces and rolls home.
        sendHome(this.table)
      }
      this.mark('soon')
    } else if (held === 'pizza') {
      // A slide counts when partly done: half the way to the oven bakes, half the way to the customer serves.
      const at = { x: this.st.pizzaX, y: this.st.pizzaY }
      if (countsAsDone(PIZZA, at, OVEN_WAY)) this.bake()
      else if (countsAsDone(PIZZA, at, SERVE)) this.serve()
    } else if (held !== null) {
      // A touch on something that is not carried is a touch wherever the finger slid before it lifted: one at the door is called in, the oven bakes, the customer is served.
      this.held = held
      return this.tap()
    }
    this.hear()
  }

  /** The press ended and was not a tap: everything in hand goes back where it came from. */
  pressEnd(): void {
    if (this.held === 'tub' || this.held === 'piece') releaseHand(this.table)
    this.held = null
    this.finger = null
    this.hear()
  }

  /**
   * Put away, or left unattended, with the finger still down: the lift will
   * never come. Whatever is in hand goes back where it came from, a piece to
   * its tub or its spot and the pizza to its board, and nothing is baked,
   * served, laid or fed by it.
   */
  putAway(): void {
    // A finger that had already let go made its move: the piece is laid, or fed, where it was let go, and a pizza slid past half way goes where it was sent.
    if (this.held && this.lifted) return this.dragEnd()
    if (this.held === 'tub' || this.held === 'piece') releaseHand(this.table)
    else if (this.held === 'pizza' && !this.scene) {
      this.st.pizzaX = PIZZA.x
      this.st.pizzaY = PIZZA.y
    }
    this.held = null
    this.finger = null
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
        this.shownAt = spot
      }), () => {
        // Saved at the start: the idea as shown, and the piece on the spot it will land on.
        this.state = { ...this.state, shown: [...this.state.shown, 'tap-a-tub'] }
        this.promised = { kind, x: spot.x, y: spot.y }
      })
    } else if (this.state.shown.includes('tap-a-tub') && !this.state.shown.includes('to-the-oven') && this.own > 0 && laid > 0 && this.table.flights.length === 0 && this.idle >= SHOW_OVEN_AFTER) {
      // Only once the child has laid a piece with its own finger: the way to the oven is not shown to a child who is still watching.
      this.play(ovenShowing(this.st, this.stagehand), () => {
        this.state = { ...this.state, shown: [...this.state.shown, 'to-the-oven'] }
      })
    }
  }

  /**
   * What the table did is heard, and seen by the customer. Called in the handler that caused it, so the pop of a
   * pressed tub sounds in the frame the finger lands, and again in every step for what the flights did.
   */
  private hear(): void {
    const who = this.state.customer
    for (const event of this.table.events) {
      if (event.type === 'pop') this.sounds.push(pop)
      else if (event.type === 'plop') {
        this.sounds.push(plop(event.kind, event.count))
        // A landing leaves a puff of flour behind for a moment.
        const last = this.table.pieces[this.table.pieces.length - 1]
        if (last) this.puffs.push({ ...onPizza(last.x, last.y), age: 0 })
        if (who && !this.scene && !this.director(who).busy) this.director(who).trigger('react', this.now)
      } else if (event.type === 'pip') this.sounds.push(pip(event.kind, event.count))
      else if (event.type === 'home') this.sounds.push(home)
      else if (event.type === 'boing') this.sounds.push(boing)
      else if (event.type === 'bounce') this.sounds.push(tap)
      else if (event.type === 'fed') this.fed(event.kind)
      else this.sounds.push(jiggle)
    }
    this.table.events.length = 0
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
    stepSpring(this.rollWave.small, 0, dt, 150, 7)
    stepSpring(this.rollWave.big, 0, dt, 150, 7)
    stepSpring(this.flare, 0, dt, 60, 7)
    this.hear()
    // A pizza let go short of the oven or the customer slides back to the board.
    if (!this.scene && this.held !== 'pizza') {
      const back = Math.min(1, dt * 12)
      this.st.pizzaX += (PIZZA.x - this.st.pizzaX) * back
      this.st.pizzaY += (PIZZA.y - this.st.pizzaY) * back
      this.st.pizzaSize += (1 - this.st.pizzaSize) * back
    }
    if (!this.st.effect) this.st.soot = Math.max(0, this.st.soot - dt / 5)
    for (const p of this.puffs) p.age += dt
    while (this.puffs.length > 0 && (this.puffs[0].age >= (this.puffs[0].cloud ? CLOUD_LASTS : PUFF_LASTS) || this.puffs.length > 6)) this.puffs.shift()
    this.showings()
    this.move(dt)
    // A sock is worn until the customer next moves by itself: once it has stood still, the next of its own small actions drops it.
    const who = this.state.customer
    if (!this.st.wearing) this.wornStill = false
    else if (!this.scene && who) {
      if (!this.director(who).moving) this.wornStill = true
      else if (this.wornStill) this.unwear()
    }
  }

  /** Every customer's motion for this frame: its own life, and what a scene adds to it. */
  private move(dt: number): void {
    const who = this.state.customer
    if (who) {
      const c = CHARACTERS[who], director = this.director(who)
      const eye = { x: CUSTOMER.x, y: CUSTOMER.y - c.height * 0.8 }
      // Its want is in its body, while the child is idle: before the bake it glances from the pizza to its card
      // and back, and at a baked pizza it reaches with its free hand. It points with its body and never hurries.
      const idling = !this.scene && !this.held && !this.state.finished && this.idle > 1.5
      const glancing = idling && !this.bakedLook && this.now % GLANCE_EVERY < GLANCE_LASTS
      const reaching = idling && this.bakedLook && this.pizzaOnBoard && this.now >= this.tastingUntil
      const look = this.st.lookAt ?? this.finger ?? (glancing ? { x: CARD.x + CARD.w / 2, y: CARD.y + CARD.h / 2 } : this.watched())
      // Its mouth waters at a pizza: a little as it fills, wide at a baked one. Full, it only smiles.
      director.want = this.state.finished ? 0.15 : this.bakedLook ? 1 : Math.min(0.6, this.table.pieces.length / 8)
      const pose = director.update(this.now, dt, { x: Math.max(-1, Math.min(1, (look.x - eye.x) / 360)), y: Math.max(-1, Math.min(1, (look.y - eye.y) / 260)) }, this.scene !== null)
      add(pose, this.st.act)
      pose.upset = this.st.upset
      if (this.state.finished && !this.scene) add(pose, { squash: 0.06, part: 0.5, blink: 0.12 })
      // Still tasting the pizza it pushed back, after a touch ended the show of it: eyes up, lips working. It is not ready for another yet.
      if (!this.scene && this.now < this.tastingUntil) add(pose, { lookY: -0.7, pucker: 0.5 + 0.3 * Math.sin(this.now * 9), brow: 0.4, squash: 0.02 * Math.sin(this.now * 9), blink: 0.3, tongue: 0.25 * Math.max(0, Math.sin(this.now * 4.5)) })
      // A pizza served to it meanwhile: for a moment it turns away from it, eyes shut tight, lips going faster.
      const busy = this.stillBusy(this.now)
      if (busy > 0) add(pose, { lean: -0.09 * busy, blink: busy, pucker: 0.3 * busy, squash: 0.03 * Math.sin(this.now * 22) * busy })
      // One hand holds the card up, and pats it in a tasting; the other is the scene's to move.
      const walking = this.st.customer !== null
      const holding = !walking && this.st.cardOpen > 0.5 ? this.st.cardHand ?? CARD_HOLD : null
      stepSpring(this.reach, reaching ? 1 : 0, dt, 40, 9)
      const reach = Math.max(0, Math.min(1, this.reach.x))
      if (reach > 0.02) add(pose, { lean: 0.03 * reach })
      // What it wants shows on its face: keen while the pizza is being made, and hungry at a baked one, down to the drool.
      // Its mouth waters: a little as it looks from its card to the pizza, and a long drop at a baked one.
      pose.drool = this.scene ? 0 : Math.max(reach, glancing ? 0.3 : 0)
      if (!this.scene && !this.state.finished) add(pose, this.bakedLook ? { smile: 0.5, brow: 0.4, pupil: 0.25 } : { brow: 0.2, smile: 0.15 })
      // The hands last, when the body's pose for this frame is settled: a hand that has a place on the stage is
      // put exactly there, so the one that holds the card stays at the card's corner while the customer sways,
      // and never drifts over a picture.
      pose.handR = holding ? handAt(pose, holding.x - CUSTOMER.x, holding.y - CUSTOMER.y) : null
      // On its way from the door it carries its roll in that hand.
      const walker = this.st.customer, roll = this.st.roll
      if (walker && roll) pose.handR = handAt(pose, (roll.x - walker.x) / walker.size, (roll.y - walker.y) / walker.size)
      pose.handL = this.st.hand ? handAt(pose, this.st.hand.x - CUSTOMER.x, this.st.hand.y - CUSTOMER.y) : busy > 0 ? { x: -(c.halfWidth + 24), y: -64 - busy * (c.height * 0.5) } : reach > 0.02 ? { x: -(c.halfWidth + 30) + reach * (c.halfWidth - 70), y: -64 + reach * 124 } : null
    }
    const waiting = this.state.waiting
    if (waiting) {
      for (const which of ['small', 'big'] as const) {
        // The two at the door watch the kitchen. They never hurry anyone.
        // The two at the door watch the finger too, and otherwise the kitchen.
        const spot = doorSpot(which)
        const at = this.finger ?? { x: PIZZA.x, y: PIZZA.y - 60 }
        const pose = this.director(waiting[which]).update(this.now, dt, { x: Math.max(-1, Math.min(1, (at.x - spot.x) / 300)), y: Math.max(-1, Math.min(1, (at.y - spot.y + 100) / 240)) })
        // The small roll is held in one hand; the big roll takes both arms, whichever monster holds it.
        const fat = which === 'big' && this.fatRoll
        const roll = fat ? ROLL.big : ROLL.small
        pose.handR = fat ? { x: (roll.x + 56) / DOOR_SIZE, y: roll.y / DOOR_SIZE } : { x: roll.x / DOOR_SIZE, y: roll.y / DOOR_SIZE }
        pose.handL = fat ? { x: (roll.x - 56) / DOOR_SIZE, y: roll.y / DOOR_SIZE } : null
      }
    }
    const leaving = this.st.leaving
    if (leaving) {
      const pose = this.director(leaving.who).update(this.now, dt, { x: 1, y: 0 }, true)
      add(pose, leaving.act)
      pose.upset = 0
      // It pats its belly with one hand before it goes; the other hangs.
      pose.handL = leaving.hand
      pose.handR = null
    }
  }

  // --- The frame --------------------------------------------------------------------

  /** Where the tub of the kind this customer loves stands: the one tub a customer or the ghost hand ever shows a tap on. */
  private lovedTub(): { x: number; y: number } | null {
    const who = this.state.customer
    if (!who || this.table.tubs.length === 0) return null
    return tubAt(this.table, Math.max(0, this.table.tubs.findIndex((t) => t.kind === CHARACTERS[who].loves)))
  }

  private hintScene(): HintScene {
    const s = this.state
    return {
      finished: s.finished,
      baked: s.pizza.baked,
      tasting: this.now < this.tastingUntil,
      own: this.own > 0,
      tubs: this.table.tubs.map((_, i) => tubAt(this.table, i)),
      handTub: this.lovedTub(),
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
    show.waiting = s.waiting ? (['small', 'big'] as const).map((which) => ({ who: s.waiting![which], big: which === 'big', fat: which === 'big' && this.fatRoll, wave: this.rollWave[which].x, pose: this.director(s.waiting![which]).pose, up: st.arriving?.which === which ? st.arriving.up : 1 })) : []
    show.tubsIn = st.tubsIn
    show.ovenShake = this.ovenShake.x
    // The fire stands taller while it bakes, and jumps when the oven is poked.
    show.ovenGlow = Math.max(st.ovenGlow, Math.min(1, Math.max(0, this.flare.x)))
    show.effect = st.effect
    show.lick = st.lick
    show.roll = st.roll
    const street = this.street && this.now - this.street.at < STREET_ANSWER ? this.street : null
    show.street = street ? { what: street.what, x: street.x, y: street.y, index: street.index, t: (this.now - street.at) / STREET_ANSWER } : null
    show.boardX = st.boardX
    show.sizzling = st.sizzling
    show.pairing = st.pairing
    show.door = st.door
    show.sizzle = st.sizzle
    show.soot = st.soot
    show.wearing = st.wearing
    show.puffs = this.puffs
    show.baking = st.baking
    // Crumbs lie on the board from the last bite until the next customer is called, whatever else plays.
    show.crumbs = s.finished && st.bites >= 3
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
  if (d.rollX) pose.rollX += d.rollX
  if (d.rollY) pose.rollY += d.rollY
  if (d.lookX) pose.lookX = Math.max(-1, Math.min(1, pose.lookX + d.lookX))
  if (d.lookY) pose.lookY = Math.max(-1, Math.min(1, pose.lookY + d.lookY))
  if (d.blink) pose.blink = Math.max(0, Math.min(1, pose.blink + d.blink))
  if (d.brow) pose.brow = Math.max(-1, Math.min(1, pose.brow + d.brow))
  if (d.frown) pose.frown = Math.max(-1, Math.min(1, pose.frown + d.frown))
  if (d.smile) pose.smile = Math.max(-1, Math.min(1, pose.smile + d.smile))
  if (d.pucker) pose.pucker = Math.max(0, Math.min(1, pose.pucker + d.pucker))
  if (d.cheeks) pose.cheeks = Math.max(0, Math.min(1, pose.cheeks + d.cheeks))
  if (d.pupil) pose.pupil = Math.max(0.5, Math.min(1.5, pose.pupil + d.pupil))
}
