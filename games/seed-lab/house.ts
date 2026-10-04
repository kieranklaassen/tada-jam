import type { Guidance } from './guidance'
import { beetleHome, type Point } from './hit'
import { potIndex, type IdeaId, type LabState } from './lab'
import { stemHeight, type Layout } from './layout'
import { Director, type Actor } from './motion'
import { asksOf, bigAsksOf, shownAsksOf, type KitId } from './order'
import { plantById, type PageEvent } from './page'
import { PACKET_IDS, TRAITS, isPacketId, lookFromCode, lookOf, type Look, type Pairs } from './plant'
import { Scene, type Beat } from './scene'
import { showCompare, showTool } from './shows'
import type { PageView, VisitorView } from './spikePage'
import { Toy, type Changed } from './toy'
import type { Spot } from './toyFx'
import { ideaInBrood, letIn, offer, tellingYoung, turnSketch, type VisitEvent } from './visit'
import { answer, heightMiss, secretOf, wanted, type TraitAnswer, type VisitorId } from './visitors'
import { CELL_VOICES, GAME_VOICES, TOY_VOICES, VISITOR_VOICES, liking } from './voices'
import { BITE, BODY, SAT, SNAIL_BITES, Walker, restingVisitor, visitorSpot, waitingSpot, type Offered } from './walker'

/** How long a visitor takes to sit down, and to get up again. */
export const SIT_SECONDS = 0.5

// The cycle on the toy: the visitors.
//
// One cycle is one visitor. The next one waits at the edge and comes in on
// the child's touch and on nothing else. A plant carried to the visitor is
// answered trait by trait, likes first; one that misses goes back to its
// pot, and the page is as it was. The outcome of anything that changes the
// page (a plant kept, the ending, a showing by the beetle) is taken and saved
// when its scene starts, so a put-away at any moment loses nothing and
// nothing replays on load. A touch ends a scene and is then an ordinary
// touch.

export type Cast = Record<VisitorId, Actor>

/** How much of each like is played when a visitor likes that many traits of a plant: all of it for one or two, six tenths for three or four. */
export function likeShare(likes: number): number {
  return likes > 2 ? 0.6 : 1
}

export class House extends Toy {
  protected readonly director: Director
  /** The visitor on the page, the one waiting at the edge, and one on its way off. */
  protected onPage: Walker | null = null
  protected atEdge: Walker
  protected leaving: Walker | null = null
  protected scene: Scene | null = null
  /** A touch is ending the scene right now: what its last beats do, they do at once. */
  private cut = false
  protected clock = 0
  /** The plant the visitor is answering: where it stands and how long its stem is. */
  protected answering: (Offered & { id: number }) | null = null
  /** A plant that has left the page and still stands in front of the visitor until it is taken. */
  protected standIn: number | null = null
  /** How many of the visitor's kept plants are not shown beside it yet, and whether its ending is still playing. */
  protected hidden = 0
  protected settling = false
  /** How far the visitor on the page has sat down; not yet known before the first frame. */
  private sat = -1
  /** What the visitor carried in and has not set down yet. */
  protected carried: KitId[] = []
  /** The scale the visitor on the page is drawn at: one that has just walked in from the edge grows to its size on the way. */
  private onScale = 0
  protected wishBig = 0
  protected wishShake = 0
  /** The beetle has put this visitor's sketch straight: it hangs true until the next visitor sticks its own in the ground. */
  protected wishTrue = false
  private wishAskew = 1
  protected fence: { x: number; y: number; up: number } | null = null
  /** The runner that tows the beetle in its showing: the bud it grows from, the pot it has reached once it is there, and the copy it roots as. */
  private tow: { from: Point; to: Point | null; copy: number | null; creep?: { goal: Point; t: number; seconds: number }; lead?: number } | null = null
  /** The snail has begun to eat the edge of a leaf of the plant it was given: since when, and the scale of that plant. */
  private eating: { from: number; k: number } | null = null
  /** The ant has what it is answering up over its head. */
  private lifted = false
  /** In the blotter's showing: the pot whose soil has not been dried yet, and the blotter while the beetle presses it there. */
  /** The visitor that was let in is still on its way to its place. */
  private arriving = false
  /** What was carried in is being set down: where it left the visitor's back, and how far it has got. */
  private setting: { from: Point; t: number } | null = null
  /** The can and the blotter while a visitor carries them in or sets them down. The game draws them. */
  protected toolsAt: { can: Point; blotter: Point } | null = null
  private unblotted: number | null = null
  protected blotting: Point | null = null
  /** A plant riding on the visitor: the snail's hat. */
  protected riding: number | null = null
  /** The last brood the child made, until it has grown and been looked at for a new idea. */
  protected brood: { young: number[]; onto: Pairs; dust: Pairs } | null = null
  private readonly onLive = restingVisitor('snail')
  private readonly edgeLive = restingVisitor('snail')
  private houseView: { state: LabState; version: number; key: string; view: PageView } | null = null

  constructor(state: LabState, layout: Layout, motionSeed: number, protected readonly cast: Cast) {
    super(state, layout, motionSeed)
    this.director = new Director(motionSeed ^ 0x5eed)
    // Found as left: a visitor that was on the page stands there, with its sketch as it was, and the next one waits.
    if (state.visitor) {
      this.onPage = this.walker(state.visitor.who, visitorSpot(layout, state.visitor.who))
      this.wishBig = state.visitor.big ? 1 : 0
    }
    this.atEdge = this.walker(state.waiting.who, waitingSpot(layout, state.waiting.who, state.visitor === null))
  }

  /** Whether the one who waits is the first visitor of the page, with nobody let in yet: it waits on the visitors' own ground (walker.ts). */
  protected get firstWaits(): boolean {
    return this.state.visitor === null && !this.onPage && !this.leaving
  }

  private walker(who: VisitorId, at: Point): Walker {
    return new Walker(who, this.cast[who], this.director, at)
  }

  override resize(layout: Layout): void {
    super.resize(layout)
    if (this.onPage && !this.onPage.busy) this.onPage.at = visitorSpot(layout, this.onPage.kind)
    if (!this.atEdge.busy) this.atEdge.at = waitingSpot(layout, this.atEdge.kind, this.firstWaits)
  }

  /** Put away: a brood that has not grown yet is not shown a neat way for (the next such brood is), and a scene midway is found finished. */
  override putAway(): void {
    this.brood = null
    // A scene that was playing is over: its outcome was saved as it started, and it is found finished, as after a load.
    this.endScene()
    super.putAway()
  }

  /** A scene is playing: the idle ladder stays at the bottom. */
  get sceneRunning(): boolean {
    return this.scene?.running === true
  }

  /** A touch ends the scene that is playing, with everything left where the scene was taking it. The Mount calls it first thing in every press. */
  endScene(): void {
    this.cut = true
    // What the scene still had to sound is not sounded all at once: the touch that ends it has its own answer.
    const running = this.scene?.running === true
    this.fx.muted = running
    this.scene?.finish()
    this.fx.muted = false
    // Nor what it had queued for later: a hop's sound with no hop would be heard after the touch.
    if (running) this.fx.hush()
    this.cut = false
  }

  protected play(beats: Beat[], saveOutcome: () => void = () => {}): void {
    this.endScene()
    this.scene = new Scene(beats)
    this.scene.start(this.clock, saveOutcome)
  }

  protected seconds(who: VisitorId, name: string): number {
    return this.cast[who].answer[name]?.seconds ?? 0
  }

  /** One of a visitor's actions as a beat: it starts the action, and if a touch ends the scene early the visitor is at rest. */
  protected act(walker: Walker, name: string, at: number, onStart?: () => void, share = 1): Beat {
    let started = false
    const lasts = this.seconds(walker.kind, name) * share
    return {
      at,
      lasts,
      play: (progress) => {
        if (!started) {
          started = true
          walker.play(name)
          onStart?.()
        }
        if (progress >= 1) walker.rest()
      },
    }
  }

  /** Something that just happens at a moment of a scene, once, whether the scene plays through or a touch ends it. */
  protected cue(at: number, run: () => void): Beat {
    let done = false
    return { at, lasts: 0, play: () => { if (!done) { done = true; run() } } }
  }

  // --- The visitor's sketch --------------------------------------------------------

  /** The larger sketch is unrolled or rolled up again, where the visitor carries one. */
  protected turnWish(): void {
    const step = turnSketch(this.state)
    if (step.events.length === 0) return
    this.state = step.state
    this.changed = Math.max(this.changed, 1) as Changed
    this.wishShake = 1
    this.fx.play(GAME_VOICES.unroll)
  }

  // --- A plant carried to the visitor -----------------------------------------------

  /**
   * A plant let go on the visitor. With nobody to answer it, or a visitor
   * that already has what it asked for, it goes back to its pot. Otherwise
   * it is set down in front of the visitor and answered.
   */
  protected offerPlant(id: number): void {
    const visit = this.state.visitor, walker = this.onPage, plant = plantById(this.state, id)
    const held = this.fx.heldAt(id)
    if (!visit || !walker || !plant || !held || this.leaving) return this.setPlantDown(id, null)
    const who = visit.who, look = lookOf(plant.pairs, plant.dry), k = held.k
    const front: Spot = { x: this.layout.offer.x, y: this.layout.offer.y, k }
    this.fx.holdPod(id, false)
    // A visitor that has what it asked for takes no more, and still answers the plant: its likes, the first miss, a secret, and the plant goes back.
    const step = this.state.finished ? null : offer(this.state, id)
    const answered = step
      ? step.events.find((event): event is Extract<VisitEvent, { type: 'answered' }> => event.type === 'answered')
      : { answers: answer(who, shownAsksOf(visit, this.state.kit), look), meets: false, secret: secretOf(who, look) }
    if (!answered) return this.setPlantDown(id, null)
    const keeps = step !== null && answered.meets
    this.fx.hold(id, front)
    this.fx.play(CELL_VOICES['plant-offer'])
    this.answering = { id, x: front.x, y: front.y, stem: stemHeight(look.joints, k) }
    const beats: Beat[] = []
    let at = 0.25
    // A plant the visitor keeps has left the page when the scene starts, and what stands before it is its stand-in.
    if (answered.secret) at = this.secretBeats(beats, answered.secret, walker, front, at, () => (keeps ? this.standIn : id))
    const likes = answered.answers.filter((one) => one.fits), miss = answered.answers.find((one) => !one.fits)
    // With more than two traits to like, each like is cut short, so that the whole answer stays a short scene.
    const share = likeShare(likes.length)
    for (const like of likes) {
      const index = TRAITS.indexOf(like.trait)
      beats.push(this.act(walker, `like-${like.trait}`, at, () => this.fx.play(liking(who, index)), share))
      at += this.seconds(who, `like-${like.trait}`) * share
    }
    if (!keeps || !step) {
      // The plant goes back: after one small joke on the visitor for the first trait that misses, where one does. Nothing changed.
      if (miss) {
        const name = this.missAction(who, miss)
        beats.push(this.act(walker, name, at, () => this.fx.play(VISITOR_VOICES[who].miss)))
        at += this.seconds(who, name)
      }
      beats.push(this.cue(at, () => this.handBack(id)))
      return this.play(beats)
    }
    // It keeps the plant. The page changes now, and is saved now; the scene is a view of that.
    const ending = step.events.some((event) => event.type === 'ending')
    beats.push(this.act(walker, 'take', at))
    at += this.seconds(who, 'take')
    if (ending) {
      beats.push(this.act(walker, 'use', at, () => {
        // The snail's bites are heard as they are seen: one crunch as each of its four bites comes out of the leaf.
        if (who === 'snail') for (const bite of SNAIL_BITES) this.fx.play(VISITOR_VOICES.snail.use, bite * this.seconds('snail', 'use'))
        else this.fx.play(VISITOR_VOICES[who].use)
        this.eating = who === 'snail' ? { from: this.clock, k } : null
      }))
      at += this.seconds(who, 'use')
      beats.push(this.act(walker, 'settle', at))
      at += this.seconds(who, 'settle')
    }
    beats.push(this.cue(at, () => this.taken()))
    this.play(beats, () => {
      this.fx.letGo(id)
      this.fx.forget(id)
      this.standIn = this.fx.standIn(plant.pairs, plant.dry, front)
      this.answering = { ...this.answering!, id: this.standIn }
      this.hidden = 1
      this.settling = ending
      this.take(step, 2, { x: front.x, y: front.y - stemHeight(look.joints, k) })
    })
  }

  /** The beats of a secret, from `at` on; gives back when they end. `rider` is the plant in front of the visitor when the hat goes on: the plant itself, or its stand-in. */
  private secretBeats(beats: Beat[], secret: 'hat' | 'vanish', walker: Walker, front: Spot, at: number, rider: () => number | null): number {
    const who = walker.kind
    if (secret === 'hat') {
      // A one-joint plant offered to the snail is worn as a hat, every time.
      // The plant is on its head from three tenths of the way through the action to three quarters, and rides every step it takes.
      const hat = this.seconds(who, 'hat')
      beats.push(this.act(walker, 'hat', at), this.cue(at + hat * 0.3, () => { this.riding = rider(); this.fx.play(GAME_VOICES.hat) }), this.cue(at + hat * 0.74, () => { if (this.riding !== null) this.ride(this.riding, front); this.riding = null; this.fx.play(TOY_VOICES.land) }))
      return at + hat
    }
    // A red spotted flower hides the ladybird so well that the beetle walks into it.
    // It holds dead still against the flower until six tenths of the way through: the beetle reaches it just then.
    const vanish = this.seconds(who, 'vanish')
    beats.push(this.act(walker, 'vanish', at, () => this.fx.beetleGo({ x: front.x + 70 * this.layout.k, y: front.y }, vanish * 0.6, () => {
      // It has walked into the plant: the plant rocks, and the beetle starts and looks up.
      const id = rider()
      if (id !== null) this.fx.kick(id, -3.4, -1.2)
      this.fx.beetleDoes('notice')
      this.fx.play(TOY_VOICES.land)
    })))
    beats.push(this.cue(at + vanish, () => this.fx.beetleGo(null, 1.2)))
    return at + vanish
  }

  /** Puts the plant that rides on the visitor, or its stand-in, at a spot. */
  private ride(id: number, at: Spot): void {
    if (id < 0) this.fx.moveStandIn(id, at)
    else this.fx.hold(id, at)
  }

  private missAction(who: VisitorId, miss: TraitAnswer): string {
    if (miss.trait !== 'height') return `miss-${miss.trait}`
    return `miss-height-${heightMiss(who, miss.seen as 1 | 2 | 4) ?? 'higher'}`
  }

  /** The visitor hands a plant back: it hops to the pot it came from. */
  private handBack(id: number): void {
    this.riding = null
    this.answering = null
    const held = this.fx.heldAt(id)
    this.fx.letGo(id)
    const home = this.fx.spotOf(this.state, id)
    if (held && home) this.fx.hopTo(id, held, home, 0, 0.5, 46)
    this.fx.play(TOY_VOICES.back)
  }

  /** The visitor has taken the plant: it stands beside it with the others it has kept. */
  private taken(): void {
    const ghost = this.standIn !== null ? this.fx.standInOf(this.standIn) : undefined
    if (this.standIn !== null) this.fx.dropStandIn(this.standIn)
    this.standIn = null
    this.answering = null
    this.riding = null
    this.settling = false
    const shown = () => { this.hidden = 0; this.fx.play(TOY_VOICES.land) }
    const kept = this.state.visitor?.given.length ?? 0
    // A touch that ends the scene leaves everything where it was going, at once.
    if (!ghost || kept === 0 || this.cut) return shown()
    // It is carried to its place beside the visitor, small as the drawing of it there: the child sees it is the same plant.
    const row = this.layout.given
    this.fx.carry(ghost.pairs, ghost.dry, ghost.from, { x: row.x + (kept - 1) * row.step, y: row.y, k: this.layout.small }, 0.45, shown)
  }

  /** A plant set in the beetle's own corner is squared up, fenced in with tape and guarded, every time; then it goes back. */
  protected guardPlant(id: number, at: Point): void {
    const held = this.fx.heldAt(id)
    if (!held) return
    // Every time: a beetle that is elsewhere comes home to it first, whatever it carries.
    if (this.fx.beetleOut) this.fx.beetleGo(null, 0.5)
    const spot: Spot = { x: at.x, y: beetleHome(this.layout).y, k: held.k }
    this.fx.hold(id, spot)
    this.fx.holdPod(id, false)
    this.fx.play(CELL_VOICES['plant-carry'])
    const seconds = 5
    let begun = false, squared = 0, strips = 0
    this.play([
      { at: 0, lasts: seconds, play: (progress) => {
        if (!begun) { begun = true; this.fx.beetleDoes('guard') }
        // It squares the plant up: two nudges, one from each side, each with a knock, while it leans in.
        while (squared < 2 && progress >= 0.1 + squared * 0.07) {
          this.fx.kick(id, squared ? -2.6 : 2.6, -0.8)
          this.fx.play(TOY_VOICES.land)
          squared++
        }
        const up = Math.min(1, Math.max(0, (progress - 0.24) / 0.26))
        // Each strip of the fence goes up with its own sound: four posts and the rail.
        while (strips < 5 && up * 5 > strips && progress < 1) { this.fx.play(GAME_VOICES.tape); strips++ }
        this.fence = progress >= 1 ? null : { x: spot.x, y: spot.y, up }
      } },
      this.cue(seconds, () => { this.fence = null; this.handBack(id) }),
    ])
  }

  // --- The next visitor comes in -------------------------------------------------------

  /**
   * The child lets the waiting visitor in. One still on the page leaves
   * first: with its plant to the top margin, or with nothing, after a small
   * shrug, off the page. The page is changed and saved at once; the walking
   * is a view of it.
   */
  protected comeIn(): boolean {
    // Not while one is on its way off, nor while the one just let in is still on its way to its place: a second tap is not a second visitor.
    if (this.leaving || this.arriving) return false
    const prev = this.onPage, first = this.firstWaits
    const step = letIn(this.state)
    const left = step.events.find((event): event is Extract<VisitEvent, { type: 'left' }> => event.type === 'left')
    const came = step.events.find((event): event is Extract<VisitEvent, { type: 'came-in' }> => event.type === 'came-in')
    this.state = step.state
    this.changed = 2
    this.carried = came ? [...came.brought] : []
    if (this.standIn !== null) this.fx.dropStandIn(this.standIn)
    this.standIn = null
    this.answering = null
    this.settling = false
    this.wishBig = 0
    this.wishTrue = false
    const enter = () => {
      this.leaving = null
      this.hidden = 0
      const walker = this.atEdge, who = walker.kind
      this.onPage = walker
      this.arriving = true
      this.onScale = waitingSpot(this.layout, who, first).s
      walker.play('come-in')
      walker.walk(visitorSpot(this.layout, who), this.seconds(who, 'come-in') || 1.6, () => this.arrived())
      this.fx.play(VISITOR_VOICES[who].arrive)
      // The next one comes to the edge from off the page, and waits there.
      const next = this.state.waiting.who, spot = waitingSpot(this.layout, next)
      this.atEdge = this.walker(next, { x: this.layout.w + 90 * this.layout.k, y: spot.y })
      this.atEdge.play('come-in')
      this.atEdge.walk(spot, 1.9)
    }
    if (!prev) { enter(); return true }
    this.leaving = prev
    this.onPage = null
    prev.rest()
    const empty = !left || left.withPlants === 0
    const kept = this.layout.kept[0]
    const to = empty ? { x: this.layout.w + 140 * this.layout.k, y: prev.at.y } : { x: kept.x + kept.w / 2, y: kept.y + kept.h }
    const go = () => {
      // It turns round to go.
      prev.away = true
      prev.play('go-off')
      if (empty) return prev.walk(to, 1.4, enter)
      // To the top margin it goes up its own side of the page first and then along the margin: never across the pots.
      prev.walk({ x: prev.at.x, y: kept.y + kept.h }, 0.8, () => prev.walk(to, 0.7, enter))
    }
    // The newest of the kept drawings is the one this visitor becomes: it is not shown until it is there.
    this.hidden = empty ? 0 : 1
    if (empty) {
      this.fx.play(VISITOR_VOICES[prev.kind].shrug)
      prev.play('shrug', go)
    } else go()
    return true
  }

  /** The visitor is at its place: it sets down what it carried in, which goes from over its back to its own place on the page. */
  private arrived(): void {
    this.arriving = false
    if (this.carried.length > 0) this.setting = { from: this.carryPoint(), t: 0 }
  }

  /** Where a visitor on its way in has what it carries: over its back. */
  private carryPoint(): Point {
    const walker = this.onPage, at = walker ? visitorSpot(this.layout, walker.kind) : { x: this.layout.w, y: this.layout.h / 2, s: 1 }
    const feet = walker && this.onLive.kind === walker.kind && this.onLive.x !== 0 ? { x: this.onLive.x, y: this.onLive.y - this.onLive.lift } : { x: at.x, y: at.y }
    return { x: feet.x, y: feet.y - (walker ? BODY[walker.kind].h : 60) * at.s - 20 * this.layout.k }
  }

  /** The place on the page of a thing a visitor brings: a packet's own place, the can's, or for the runner bud the bud of the first pot. */
  private homeOf(thing: KitId): Point {
    if (isPacketId(thing)) {
      const box = this.layout.packets[Math.max(0, PACKET_IDS.filter((id) => this.state.kit.includes(id)).indexOf(thing))] ?? this.layout.packets[0]
      return { x: box.x + box.w / 2, y: box.y + box.h / 2 }
    }
    if (thing === 'water') { const can = this.layout.tools.can; return { x: can.x + can.w * 0.39, y: can.y + can.h * 0.58 } }
    const bud = this.layout.shelf[0].bud
    return { x: bud.x, y: bud.y }
  }

  /** The runner buds have arrived on every plant. The game makes them spring. */
  protected budsArrive(): void {}

  /** What a visitor carries in is drawn with it, over its back, and then on its way to its own place as it is set down. */
  private stepCarried(dt: number): void {
    const live = this.live, k = this.layout.k
    this.toolsAt = null
    if (this.carried.length === 0) { this.setting = null; return }
    if (this.setting && (this.setting.t += dt / 0.45) >= 1) {
      // Set down: each thing is in its place, with a shake and its sound.
      for (const thing of this.carried) if (isPacketId(thing)) this.fx.shakePacket(thing, 70)
      if (this.carried.includes('runner')) this.budsArrive()
      this.fx.play(GAME_VOICES.setDown)
      this.carried = []
      this.setting = null
      return
    }
    const from = this.setting?.from ?? this.carryPoint(), t = this.setting?.t ?? 0, u = t * t * (3 - 2 * t)
    this.carried.forEach((thing, place) => {
      const home = this.homeOf(thing), hop = 50 * k * Math.sin(Math.PI * u)
      const at = { x: from.x + place * 22 * k * (1 - u) + (home.x - from.x) * u, y: from.y + (home.y - from.y) * u - hop }
      if (isPacketId(thing)) live.packets.set(thing, { shake: 0, spin: 0, at: { ...at, z: 0.5 + 0.5 * u } })
      else if (thing === 'water') this.toolsAt = { can: at, blotter: { x: at.x + (34 * k) * (1 - u) + (this.layout.tools.blotter.x + this.layout.tools.blotter.w / 2 - home.x) * u, y: at.y + (this.layout.tools.blotter.y + this.layout.tools.blotter.h * 0.56 - home.y) * u } }
      // A runner is carried as a sprig: a short piece of stem with its scale leaf.
      else if (!this.tow) live.tow = { from: { x: at.x - 16 * k, y: at.y - 6 * k }, to: { x: at.x + 16 * k, y: at.y + 6 * k } }
    })
  }

  // --- The beetle's two showings --------------------------------------------------------

  /** Whether the child is doing nothing and nothing is playing: only then does the beetle start a showing. */
  protected get quiet(): boolean {
    return !this.sceneRunning && this.pressed === null && this.hand === null && !this.leaving && !(this.onPage?.busy ?? false) && this.carried.length === 0 && !this.fx.busy && !this.fx.beetleOut
  }

  /** The showing of a new tool, once a tool, when a pot stands free for it. */
  private showNewTool(): boolean {
    if (!this.onPage) return false
    for (const tool of ['runner', 'water'] as const) {
      if (!this.state.kit.includes(tool) || this.state.shown.includes(tool)) continue
      const step = showTool(this.state, tool)
      const grew = step.events.flatMap((event) => (event.type === 'grew' ? [event] : []))
      const copy = grew.find((event) => event.how === 'runner')
      if (!copy) continue
      const copyPlant = plantById(step.state, copy.id)!
      const parent = copyPlant.from.how === 'runner' ? plantById(step.state, copyPlant.from.of) : undefined
      // The soil the blotter will dry is drawn as it was until the beetle has pressed the blotter on it.
      this.unblotted = tool === 'water' && copyPlant.row !== 'border' ? potIndex(copyPlant.row, copyPlant.slot) : null
      this.play(this.toolBeats(tool, copy.id, parent?.id ?? null), () => {
        this.state = step.state
        this.changed = 2
        // The copy, and a packet plant sown for the beetle to work on, are on the page from now; they draw themselves when the scene reaches them.
        for (const event of grew) this.fx.sprout(event.id, event.how === 'runner' ? 60 : 0, 1.1, this.fx.noteFor(plantById(step.state, event.id)!.pairs, plantById(step.state, event.id)!.dry, 0))
      })
      return true
    }
    return false
  }

  /**
   * The beats of a tool's showing. The beetle hooks a back leg in a runner bud of the plant it works on, and the
   * runner, creeping to the free pot, tows it there and roots a copy. With the blotter it dries that pot first.
   */
  private toolBeats(tool: 'runner' | 'water', copy: number, parent: number | null): Beat[] {
    // The plant it works on may be one sown for the showing: it is on the page when the scene has started.
    const origin = () => (parent !== null ? this.fx.spotOf(this.state, parent) : null)
    const k = this.layout.k
    const beside = (spot: Spot | null): Point | null => (spot ? { x: spot.x + 62 * k, y: spot.y + 48 * k } : null)
    // The bud beside a pot, and the back leg of a beetle that stands beside that pot.
    const budOf = (spot: Spot | null): Point | null => (spot ? { x: spot.x + 53 * k, y: spot.y + 22 * k } : null)
    let to: Spot | null = null
    const target = () => (to ??= this.fx.spotOf(this.state, copy))
    const dry = tool === 'water' ? 1.6 : 0
    return [
      // With the blotter it goes to the free pot first and dries its soil.
      ...(tool === 'water' ? [
        this.cue(0, () => { const at = beside(target()); if (at) this.fx.beetleGo(at, 1.2) }),
        this.cue(1.2, () => {
          const end = target()
          if (end) this.blotting = { x: end.x, y: end.y - 18 * k }
          if (this.unblotted !== null) this.fx.squashPot(this.unblotted, -2)
          this.unblotted = null
          this.fx.play(GAME_VOICES.blot)
        }),
        this.cue(1.6, () => { this.blotting = null }),
      ] : []),
      // It walks to the plant it will work on,
      this.cue(dry, () => { const at = beside(origin()); if (at) this.fx.beetleGo(at, 1.3) }),
      // hooks a back leg in its runner bud,
      this.cue(dry + 1.3, () => { this.fx.beetleDoes('towed'); this.fx.play(CELL_VOICES['bud-poke']) }),
      // and is towed across to the free pot as the runner creeps there,
      this.cue(dry + 1.6, () => {
        const bud = budOf(origin()), at = beside(target())
        if (bud) this.tow = { from: bud, to: null, copy }
        if (at) this.fx.beetleGo(at, 1.4)
        this.fx.play(CELL_VOICES['bud-wet'])
      }),
      // where the copy roots. It stays by it while it comes up, looking from the copy to its parent, one way and then the other,
      this.cue(dry + 3.1, () => {
        const end = target()
        if (this.tow && end) this.tow.to = { x: end.x, y: end.y }
        this.fx.sproutNow(copy)
        this.fx.play(CELL_VOICES['bud-carry'])
        this.fx.beetleDoes('look-over')
      }),
      // and goes home.
      this.cue(dry + 5.5, () => { this.fx.grown(copy); this.tow = null; this.fx.beetleGo(null, 1.2) }),
    ]
  }

  /** The neat way to compare, once an idea, after the child's own brood has grown. */
  private showNeatWay(idea: Extract<IdeaId, 'sort' | 'hidden'>, brood: { young: number[]; onto: Pairs; dust: Pairs }): void {
    const step = showCompare(this.state, idea, brood.young)
    // The young the loupe is held over: for the hidden factor, one that shows what neither parent shows; otherwise the first.
    const telling = idea === 'hidden' ? tellingYoung(brood.onto, brood.dust, brood.young.map((id) => plantById(this.state, id)?.pairs ?? brood.onto)) : 0
    const under = brood.young[Math.max(0, telling)]
    const k = this.layout.k, tray = this.layout.tray
    const along = (slot: number): Point => ({ x: tray[slot].x + 62 * k, y: tray[slot].foot + 0 * k })
    const stood = new Map(this.state.plants.filter((plant) => plant.row === 'tray').map((plant) => [plant.id, plant.slot]))
    const WALK = 2.2
    this.play([
      // The beetle walks to the tray and along it, nudging like to like: each young hops to its group as the beetle comes past the pot it stood in.
      this.cue(0, () => this.fx.beetleGo(along(0), 1.4)),
      this.cue(1.5, () => { this.fx.beetleGo(along(tray.length - 1), WALK); this.fx.play(GAME_VOICES.shuffle, 0.2) }),
      // Then it goes to one of the young and rolls the loupe over it: the game's own loupe shows its note (game.ts).
      this.cue(3.9, () => {
        const one = plantById(this.state, under)
        if (one && one.row === 'tray') this.fx.beetleGo(along(one.slot), 0.6)
      }),
      this.cue(4.5, () => { for (const id of stood.keys()) this.fx.land(id); this.loupeOver(under) }),
      this.cue(6.6, () => { this.loupeOver(null); this.fx.beetleGo(null, 1.3) }),
    ], () => {
      // The outcome is taken and saved now. The hops it sets off wait for the beetle, and their own sounds with them.
      this.fx.muted = true
      this.take(step, 2)
      this.fx.muted = false
      let heard = 0
      for (const [id, slot] of stood) {
        const wait = 1.5 + WALK * (0.15 + 0.85 * (slot / Math.max(1, tray.length - 1)))
        this.fx.delayHop(id, wait)
        if (this.fx.hopping(id) && heard++ < 3) this.fx.play(TOY_VOICES.hop, wait)
      }
    })
  }

  /** A runner creeps by itself from a bud to the pot its copy will root in: it stretches there over some seconds, and stays until the copy has grown. */
  protected creep(from: Point, copy: number, seconds: number): void {
    const goal = this.fx.spotOf(this.state, copy)
    if (goal) this.tow = { from: { ...from }, to: { ...from }, copy, creep: { goal: { x: goal.x, y: goal.y }, t: 0, seconds: Math.max(0.01, seconds) } }
  }

  /** A runner drawn out of its bud by a finger: a stem from the bud to where the finger has it. None lets it go. */
  protected runnerInHand(from: Point, to: Point | null): void {
    this.tow = to ? { from: { ...from }, to: { ...to }, copy: null } : null
  }

  /** A runner set on a pot: the stem stays from the bud to the copy until the copy has grown and its own runner is drawn. */
  protected runnerRoots(from: Point, copy: number): void {
    const end = this.fx.spotOf(this.state, copy)
    this.tow = end ? { from: { ...from }, to: { x: end.x, y: end.y }, copy } : null
  }

  /** A runner in a visitor's grip, taut as a lead from its bud to the visitor, for some seconds. */
  protected runnerLead(from: Point, seconds: number): void {
    this.tow = { from: { ...from }, to: null, copy: null, lead: this.clock + seconds }
  }

  /** The beetle holds the loupe over a plant, or puts it back. The game draws it. */
  protected loupeOver(_plant: number | null): void {}

  // --- Time, and what the view draws -------------------------------------------------------

  protected override take(step: { state: LabState; events: readonly (PageEvent | { type: string })[] }, changed: Changed, from?: Point, carried?: number): void {
    // The child's own brood is remembered until it has grown: the parents' pairs are read now, while both are on the page.
    const events = step.events as readonly PageEvent[]
    const main = events.find((event): event is Extract<PageEvent, { type: 'burst' }> => event.type === 'burst')
    if (main) {
      const sample = plantById(step.state, main.young[0])
      const origin = sample?.from.how === 'seed' ? sample.from : null
      const onto = origin ? plantById(this.state, origin.onto) : undefined, dust = origin ? plantById(this.state, origin.dust) : undefined
      this.brood = onto && dust ? { young: [...main.young], onto: onto.pairs, dust: dust.pairs } : null
    }
    const sketched = this.state.sketched
    super.take(step, changed, from, carried)
    // A plant has left the page: the beetle draws its sketch, once it is home from carrying the plant out.
    const left = events.filter((event) => event.type === 'carried-off').length
    if (left > 0 || step.state.sketched !== sketched) this.fx.sketch(GAME_VOICES.pencil, Math.max(1, left))
  }

  override step(dt: number, guidance: Guidance | null = null): void {
    this.clock += dt
    this.scene?.update(this.clock)
    this.leaving?.step(dt)
    this.onPage?.step(dt)
    this.atEdge.step(dt)
    super.step(dt, guidance)
    const live = this.live, layout = this.layout
    this.wishBig += ((this.state.visitor?.big ? 1 : 0) - this.wishBig) * Math.min(1, dt * 9)
    this.wishShake = Math.max(0, this.wishShake - dt * 2.5)
    this.wishAskew += ((this.wishTrue ? 0 : 1) - this.wishAskew) * Math.min(1, dt * 8)
    live.wish.big = this.wishBig
    live.wish.askew = this.wishAskew
    live.wish.shake = Math.sin(this.clock * 26) * this.wishShake * 0.5
    live.fence = this.fence
    // The runner that tows the beetle: to its back leg while it is towed, to the pot once it is there, and gone when the copy has grown and its own runner is drawn.
    const creep = this.tow?.creep
    if (this.tow && creep) {
      creep.t = Math.min(1, creep.t + dt / creep.seconds)
      const u = creep.t * creep.t * (3 - 2 * creep.t)
      this.tow.to = { x: this.tow.from.x + (creep.goal.x - this.tow.from.x) * u, y: this.tow.from.y + (creep.goal.y - this.tow.from.y) * u }
    }
    if (this.tow && this.tow.copy !== null && this.tow.to && (!creep || creep.t >= 1) && this.fx.inBloom(this.tow.copy)) this.tow = null
    // A lead ends when the visitor lets go, or is no longer there to hold it.
    if (this.tow?.lead !== undefined && (this.clock >= this.tow.lead || !this.onPage || this.leaving)) this.tow = null
    if (this.tow?.lead !== undefined && this.onPage) {
      const who = this.onPage.kind, at = visitorSpot(layout, who), body = BODY[who]
      const grip = this.onLive.kind === who && live.visitor === this.onLive ? { x: this.onLive.x, y: this.onLive.y - this.onLive.lift } : { x: at.x, y: at.y }
      live.tow = { from: this.tow.from, to: { x: grip.x - body.w * at.s * 0.36, y: grip.y - body.h * at.s * 0.4 } }
    } else if (this.tow) {
      const feet = this.fx.beetleAt(), s = beetleHome(layout).s
      live.tow = { from: this.tow.from, to: this.tow.to ?? { x: feet.x + 34 * s, y: feet.y - 14 * s } }
    } else live.tow = null
    const shown = this.leaving ?? this.onPage
    const full = shown ? visitorSpot(layout, shown.kind).s : 0
    this.onScale = shown === this.onPage && this.onScale > 0 ? this.onScale + (full - this.onScale) * Math.min(1, dt * 2.6) : full
    live.visitor = shown ? shown.fill(this.onLive, this.onScale, shown === this.onPage ? this.answering : null, this.clock) : null
    // One that has what it asked for sits by its plant: it sits down when its ending is over, is found sitting on a page that opens so, and gets up to answer a plant or to leave.
    const sits = live.visitor !== null && shown !== null && shown === this.onPage && this.state.finished && !this.settling && !shown.busy
    this.sat = this.sat < 0 ? (sits ? 1 : 0) : Math.max(0, Math.min(1, this.sat + (sits ? dt : -dt) / SIT_SECONDS))
    if (live.visitor) {
      const u = this.sat * this.sat * (3 - 2 * this.sat)
      live.visitor.sat = u
      live.visitor.pose.lean += SAT.lean * u
      live.visitor.pose.look += SAT.look * u
    }
    live.waiting = this.atEdge.fill(this.edgeLive, waitingSpot(layout, this.atEdge.kind, this.firstWaits).s, null, this.clock)
    // The snail's hat: the plant rides on its head.
    if (this.riding !== null && live.visitor) {
      const body = BODY[live.visitor.kind], s = visitorSpot(layout, live.visitor.kind).s
      const held = this.riding < 0 ? this.fx.standInOf(this.riding)?.from : this.fx.heldAt(this.riding)
      if (held) this.ride(this.riding, { x: live.visitor.x - body.w * 0.34 * s, y: live.visitor.y - live.visitor.lift - body.h * 0.62 * s, k: held.k })
    }
    live.offered = this.answering?.id ?? null
    // The ant lifts what it is answering over its head, in its use of the plant and in its miss of one that is too high:
    // the plant, or its stand-in, goes up with its arms and comes down with them. Its arms go up at other times too, and the plant stays down.
    const lifting = this.onPage?.doing === 'use' || this.onPage?.doing === 'miss-height-higher' || this.lifted
    if (this.riding === null && this.answering && live.visitor?.kind === 'ant' && lifting) {
      const id = this.answering.id, up = Math.max(0, Math.min(1, live.visitor.part))
      const held = id < 0 ? this.fx.standInOf(id)?.from : this.fx.heldAt(id)
      if (held && (up > 0.02 || this.lifted)) {
        const s = visitorSpot(layout, 'ant').s, over = { x: live.visitor.x, y: live.visitor.y - live.visitor.lift - BODY.ant.h * s - 16 * held.k }
        this.ride(id, { x: layout.offer.x + (over.x - layout.offer.x) * up, y: layout.offer.y + (over.y - layout.offer.y) * up, k: held.k })
        this.lifted = up > 0.02
      }
    } else this.lifted = false
    // The snail's four bites, each a little more out of the edge of the lowest leaf on its side of the plant, while the plant still stands in front of it.
    live.nibble = null
    if (this.eating && this.standIn !== null && this.onPage?.kind === 'snail') {
      const whole = this.seconds('snail', 'use'), since = (this.clock - this.eating.from) / Math.max(0.01, whole)
      const bites = SNAIL_BITES.filter((at) => since >= at).length, at = this.fx.standInOf(this.standIn)?.from
      if (at && bites > 0) live.nibble = { x: at.x + BITE.x * at.k, y: at.y + BITE.y * at.k, r: BITE.r * at.k * (bites / SNAIL_BITES.length) }
    } else this.eating = null
    this.stepCarried(dt)
    if (!this.quiet) return
    // The beetle's showings wait until the page is quiet.
    if (this.showNewTool()) return
    if (this.brood && this.brood.young.every((id) => this.fx.inBloom(id))) {
      const brood = this.brood
      this.brood = null
      const young = brood.young.flatMap((id) => { const plant = plantById(this.state, id); return plant ? [plant.pairs] : [] })
      const idea = ideaInBrood(this.state, brood.onto, brood.dust, young)
      if (idea === 'sort' || idea === 'hidden') this.showNeatWay(idea, brood)
    }
  }

  private visitorView(who: VisitorId, wish: Partial<Look>, extra: Partial<VisitorView>): VisitorView {
    return { kind: who, wish, count: 1, ...extra }
  }

  override view(): PageView {
    const state = this.state
    const base = super.view()
    const key = `${this.hidden}|${this.settling}|${this.carried.join()}|${this.leaving?.kind ?? ''}|${this.onPage?.kind ?? ''}|${base.focus ?? ''}|${this.unblotted ?? ''}`
    if (this.houseView && this.houseView.state === state && this.houseView.version === this.fx.version && this.houseView.key === key) return this.houseView.view
    const visit = state.visitor
    let visitor: VisitorView | null = null
    if (this.leaving) {
      // The one on its way off carries no sketch any more.
      visitor = this.visitorView(this.leaving.kind, {}, { settled: true, given: [] })
    } else if (visit && this.onPage) {
      const big = bigAsksOf(visit, state.kit)
      const given = visit.given.slice(0, Math.max(0, visit.given.length - this.hidden)).map(lookFromCode)
      visitor = this.visitorView(visit.who, wanted(visit.who, asksOf(visit)), { count: visit.count, big: big ? wanted(visit.who, big) : null, given, settled: state.finished && !this.settling })
    }
    const kept = state.kept.slice(0, Math.max(0, state.kept.length - (this.leaving ? this.hidden : 0))).map((one) => ({ kind: one.who, look: lookFromCode(one.look) })).reverse()
    const view: PageView = {
      ...base,
      dry: this.unblotted === null ? state.dry : state.dry.map((dry, pot) => dry && pot !== this.unblotted),
      // A packet that is being carried in is on the page already: it is drawn with the visitor, and in its place when it is set down.
      packets: PACKET_IDS.filter((id) => state.kit.includes(id)),
      buds: state.kit.includes('runner') && !this.carried.includes('runner'),
      tools: state.kit.includes('water') && !this.carried.includes('water'),
      visitor,
      // The one who waits holds its wish open: what it will ask for when it is let in.
      waiting: this.visitorView(this.atEdge.kind, wanted(state.waiting.who, asksOf(state.waiting)), { count: state.waiting.count }),
      kept,
      // A sketch the beetle has not begun yet is not on the page.
      sketched: state.sketched.slice(0, Math.max(0, state.sketched.length - this.fx.sketchesHeld)).map(lookFromCode),
    }
    this.houseView = { state, version: this.fx.version, key, view }
    return view
  }
}

