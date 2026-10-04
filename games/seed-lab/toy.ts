import { somePot } from './grid'
import { handPose, type Guidance, type HandPose } from './guidance'
import { dustAt, packetPlaces, potAt, standingOf, targetAt, type Point, type Target } from './hit'
import type { Gesture } from './input'
import { potIndex, type LabState } from './lab'
import { PLANT, type Layout } from './layout'
import { stillLive, type Live } from './live'
import { burst, dab, move, plantById, podOn, sow, swapPots, type PageEvent, type PotRow } from './page'
import { PACKET_IDS, type PacketId } from './plant'
import type { PageView, PlantView } from './spikePage'
import { Effects, type Spot } from './toyFx'
import { CELL_VOICES, GAME_VOICES, TOY_VOICES } from './voices'

// The toy: what a finger does to the page, and what answers.
//
// It holds the page (lab.ts), takes the gestures of one finger, takes the
// page's own steps for them (page.ts) and tells the effects what happened
// (toyFx.ts). The page it holds is always at rest: a plant in the hand still
// stands, in the page, in the pot it came from, so the page can be saved at
// any instant.
//
// The toy holds the cells of the grid that need no visitor and no can: a
// plant poked, dusted and carried; a pod poked, dusted and carried; a packet
// seed poked, dusted and carried; bare soil poked, dusted and carried; the
// beetle poked and dusted. The cells it does not hold are left out.

/** What the finger holds while it drags. */
type Hand =
  | { kind: 'dust'; from: number }
  | { kind: 'plant'; id: number }
  | { kind: 'pot'; row: PotRow; slot: number }
  | { kind: 'pod'; plant: number }
  | { kind: 'seed'; packet: PacketId }

/** How much a change wants saving: not at all, soon, or at once. */
export type Changed = 0 | 1 | 2

/** Seconds a pod carried to a pot lies in it, whole, before it bursts there. */
export const POD_LANDS = 0.18
/** One pod's pop after another's, where a brood landing sends off a plant whose own pod then bursts. */
export const POD_AFTER = 0.25

/** The paper's own seed: the page looks the same whatever the page's chance is. */
const PAPER = 20261003

export class Toy {
  readonly fx: Effects
  /** Set by anything that changes the page; the Mount reads it, hands the page to storage and sets it back to 0. */
  changed: Changed = 0
  protected readonly live: Live = stillLive()
  protected pressed: Target | null = null
  protected hand: Hand | null = null
  protected viewOf: { state: LabState; ghosts: number; view: PageView } | null = null
  protected notes = 0
  /** The plant the child touched last, while it is on the page: its family lines stand out. Not saved. */
  protected focus: number | null = null
  /** A pod that was carried to a pot and lies in it, whole, until it bursts there. */
  protected landing: { on: number; at: Point; in: number } | null = null
  /** The pod that is bursting squirts its seeds in one jet. */
  protected jet = false
  /** The ghost hand carried dust in the last frame. */
  protected shown = false
  protected readonly pose: HandPose = { travel: 0, press: 0, opacity: 0 }

  constructor(public state: LabState, protected layout: Layout, motionSeed: number) {
    this.fx = new Effects(layout, motionSeed)
    // Found as left: every plant grown, and a pod that was set waits for a touch.
    for (const pod of state.pods) this.fx.setPod(pod.on, true)
  }

  /** The surface changed size. Things in motion carry on from where the new layout puts them. */
  resize(layout: Layout): void {
    this.layout = layout
    this.fx.layout = layout
  }

  // --- One finger -------------------------------------------------------------------

  gesture(gesture: Gesture): void {
    switch (gesture.type) {
      case 'press': return this.press(gesture.at)
      case 'tap': return this.tap(gesture.at)
      case 'pressEnd': return this.release()
      case 'dragStart': return this.dragStart(gesture.from)
      case 'dragMove': return this.dragMove(gesture.at)
      case 'dragLift': return
      case 'dragEnd': return this.dragEnd(gesture.at)
    }
  }

  protected spot(id: number): Spot | null {
    return this.fx.heldAt(id) ?? this.fx.spotOf(this.state, id)
  }

  /** The finger lands: whatever it lands on answers in this frame. */
  protected press(at: Point): void {
    const target = targetAt(this.state, this.layout, at, this.fx.inBloom, this.fx.beetleAt())
    this.pressed = target
    this.hand = null
    if (target.kind === 'flower' || target.kind === 'border' || target.kind === 'pod' || (target.kind === 'pot' && target.plant !== null)) this.focus = target.plant
    if (target.kind === 'flower') this.poke(target.plant, at, true)
    else if (target.kind === 'pot' && target.plant !== null) this.fx.kick(target.plant, 0, -1.6)
    else if (target.kind === 'pot') this.fx.squashPot(potIndex(target.row, target.slot)!, -1.4)
    else if (target.kind === 'border') this.fx.kick(target.plant, at.x < (this.spot(target.plant)?.x ?? at.x) ? 2.4 : -2.4)
    else if (target.kind === 'pod') { this.fx.holdPod(target.plant, true); this.fx.shakePod(target.plant, 5) }
    else if (target.kind === 'packet') this.fx.shakePacket(target.packet, 40)
  }

  /** A plant poked: it bends away from the finger like a spring and plucks its own note, and one in bloom gives up a puff of dust. `flower` says the finger is on the flower itself. */
  protected poke(id: number, at: Point, flower: boolean): void {
    const plant = plantById(this.state, id), spot = this.spot(id)
    if (!plant || !spot) return
    this.fx.kick(id, (at.x <= spot.x ? 2.7 : -2.7) * (flower ? 1 : 0.7), flower ? -2.2 : -1)
    // A plant in bloom gives up a puff of dust wherever it is poked: a full one from its flower, a smaller one shaken off it by a poke lower down.
    if (flower || this.fx.inBloom(id)) {
      this.fx.dust(standingOf(this.layout, plant).flower, flower ? 22 : 12, (flower ? 110 : 70) * this.layout.k)
      this.fx.play(CELL_VOICES['plant-poke'])
    }
    this.fx.play(this.fx.noteFor(plant.pairs, plant.dry, this.notes++))
  }

  protected tap(at: Point): void {
    const target = this.pressed
    this.release()
    if (!target) return
    switch (target.kind) {
      case 'flower': return
      case 'pot':
        if (target.plant !== null) return this.poke(target.plant, at, false)
        // Bare soil poked: the soil puffs and the worm looks out, looks round and goes back in.
        this.fx.puff(this.soilOf(target.row, target.slot), 'soil', 16)
        this.fx.wormDoes(potIndex(target.row, target.slot)!, 'poked')
        return this.fx.play(CELL_VOICES['soil-poke'])
      // A plant in the border answers a poke as any plant in bloom does: it bends, plucks its note and gives up a puff of dust.
      case 'border': return this.poke(target.plant, at, true)
      case 'pod': return this.burstPod(target.plant, 'pod-poke')
      case 'packet': {
        // A packet seed poked: it hops out and sprouts in some pot.
        this.fx.play(CELL_VOICES['seed-poke'])
        return this.sowSeed(target.packet, somePot(this.state), null)
      }
      case 'beetle':
        return this.fx.beetleFlips()
      case 'paper':
        this.fx.beetleDoes('notice')
        return this.fx.play(TOY_VOICES.paper)
      default:
    }
  }

  /** The press is over and nothing is in the hand. */
  protected release(): void {
    if (this.pressed?.kind === 'pod') this.fx.holdPod(this.pressed.plant, false)
    this.pressed = null
  }

  protected dragStart(from: Point): void {
    const target = this.pressed
    if (!target) return
    if (target.kind === 'flower') {
      this.hand = { kind: 'dust', from: target.plant }
      this.fx.dustInHand(from)
    }
    else if ((target.kind === 'pot' && target.plant !== null) || target.kind === 'border' || (target.kind === 'pod' && plantById(this.state, target.plant)?.row === 'border')) {
      // A plant of the border is small: the whole of it is one handle. A drag carries it, pod and all; a tap on one that holds a pod bursts the pod.
      if (target.kind === 'pod') this.focus = target.plant
      const id = target.plant!
      // A plant that holds a pod is carried with it; the pod holds its breath in the hand.
      this.hand = { kind: 'plant', id }
      this.fx.holdPod(id, true)
      const spot = this.spot(id)
      if (spot) this.fx.hold(id, { ...spot, y: spot.y - 6 * this.layout.k })
      this.fx.play(TOY_VOICES.lift)
    } else if (target.kind === 'pot') {
      this.hand = { kind: 'pot', row: target.row, slot: target.slot }
      this.fx.play(TOY_VOICES.lift)
    } else if (target.kind === 'pod') this.hand = { kind: 'pod', plant: target.plant }
    else if (target.kind === 'packet') {
      this.hand = { kind: 'seed', packet: target.packet }
      this.fx.seedInHand(from)
    }
  }

  protected dragMove(at: Point): void {
    const hand = this.hand
    if (!hand) return
    if (hand.kind === 'dust') this.fx.trail(at)
    else if (hand.kind === 'plant') {
      const spot = this.spot(hand.id)
      // The pot is under the finger: the soil line a little above it.
      if (spot) this.fx.hold(hand.id, { x: at.x, y: at.y - PLANT.potH * 0.5 * spot.k, k: spot.k })
    } else if (hand.kind === 'pot') this.fx.holdPot(potIndex(hand.row, hand.slot)!, { x: at.x, y: at.y - PLANT.potH * 0.5 * this.layout.k })
    else if (hand.kind === 'seed') this.fx.seedInHand(at)
    else if (hand.kind === 'pod') this.fx.carryPod(hand.plant, { x: at.x, y: at.y - 18 * this.layout.k })
  }

  protected dragEnd(at: Point): void {
    const hand = this.hand
    this.hand = null
    // A drag that picked nothing up (it began on the beetle, or on bare paper) is answered as a tap where it began.
    if (!hand) return this.tap(at)
    this.release()
    if (hand.kind === 'dust') {
      this.fx.dustInHand(null)
      return this.letDustGo(hand.from, at)
    }
    const pot = potAt(this.layout, at)
    if (hand.kind === 'pod') {
      // A pod carried to a pot lands there whole, and its six seeds jump out of that pot into the pots of the tray. Let go anywhere else it bursts where the finger left it.
      if (!pot) {
        this.fx.holdPod(hand.plant, false)
        this.fx.carryPod(hand.plant, null)
        return this.burstPod(hand.plant, 'pod-carry', at)
      }
      // It drops into the pot and sits on its soil, whole, for a moment: the pot gives under it. Then it bursts there.
      const soil = this.soilOf(pot.row, pot.slot)
      // It holds its breath while it lies there, however long it was carried.
      this.fx.holdPod(hand.plant, true)
      this.fx.carryPod(hand.plant, { x: soil.x, y: soil.y + 14 * this.layout.k })
      this.fx.squashPot(potIndex(pot.row, pot.slot)!, -2.6)
      this.fx.play(CELL_VOICES['pod-carry'])
      this.landing = { on: hand.plant, at: soil, in: POD_LANDS }
      return
    }
    if (hand.kind === 'seed') {
      this.fx.seedInHand(null)
      if (pot) {
        this.fx.play(CELL_VOICES['seed-carry'])
        return this.sowSeed(hand.packet, pot, at)
      }
      // Let go over bare paper: the seed is not saved anywhere but in its packet, so it hops back in.
      const home = packetPlaces(this.state, this.layout).find((spot) => spot.packet === hand.packet)
      if (home) this.fx.fly(at, { x: home.x + home.w / 2, y: home.y + home.h / 2 }, 0, 0.3, -1)
      return this.fx.play(TOY_VOICES.back)
    }
    if (hand.kind === 'plant') return this.setPlantDown(hand.id, pot)
    this.setPotDown(hand, pot)
  }

  /**
   * The game is put away with a finger still on it. Whatever was in the hand
   * goes back where it came from and no move is made: a plant stands in the
   * pot it came from, a pot in its place, a pod on its plant, a seed in its
   * packet, and dust is not kept.
   */
  putAway(): void {
    // A pod that has not burst waits for a touch, as one found on load does; one that was landing in a pot is on its plant again.
    this.landing = null
    this.fx.podsWait()
    // Nor is anything heard afterwards that was queued for a move no longer made.
    this.fx.hush()
    const hand = this.hand
    this.hand = null
    this.release()
    if (!hand) return
    if (hand.kind === 'dust') this.fx.dustInHand(null)
    else if (hand.kind === 'plant') { this.fx.letGo(hand.id); this.fx.holdPod(hand.id, false) }
    else if (hand.kind === 'pot') this.fx.holdPot(potIndex(hand.row, hand.slot)!, null)
    else if (hand.kind === 'pod') { this.fx.holdPod(hand.plant, false); this.fx.carryPod(hand.plant, null) }
    else this.fx.seedInHand(null)
  }

  // --- What the finger's moves do to the page ---------------------------------------

  /** Dust let go: on a flower it sets a pod, on a pod it is blown back, and so on down the dust column of the grid. */
  protected letDustGo(from: number, at: Point): void {
    const target = dustAt(this.state, this.layout, at, this.fx.inBloom, this.fx.beetleAt())
    if (target.kind === 'flower' || target.kind === 'pod') {
      const step = dab(this.state, from, target.plant)
      const onto = plantById(this.state, target.plant)
      if (onto && step.events.some((event) => event.type === 'pod-set')) {
        // The cross. The flower nods under the dust and a pod sets behind it with a rising creak.
        this.take(step, 2)
        this.fx.setPod(target.plant)
        this.fx.kick(target.plant, 0, -2.6)
        this.fx.dust(standingOf(this.layout, onto).flower, 8, 50 * this.layout.k)
        return this.fx.play(CELL_VOICES['plant-dust'])
      }
      if (onto && step.events.some((event) => event.type === 'pod-full')) {
        // Already set: the pod puffs up and blows the dust back out.
        this.fx.puffPod(target.plant)
        this.fx.shakePod(target.plant, 14)
        this.fx.dust(standingOf(this.layout, onto).pod, 16, 150 * this.layout.k)
        return this.fx.play(CELL_VOICES['pod-dust'])
      }
    }
    if (target.kind === 'pot' && target.plant === null) {
      // On bare soil nothing grows, and the worm comes up wearing a gold cap.
      const soil = this.soilOf(target.row, target.slot)
      this.fx.dust({ x: soil.x, y: soil.y - 30 * this.layout.k }, 10, 30 * this.layout.k, soil.y)
      this.fx.wormDoes(potIndex(target.row, target.slot)!, 'capped', true)
      return this.fx.play(CELL_VOICES['soil-dust'])
    }
    if (target.kind === 'beetle') {
      this.fx.beetleGold()
      this.fx.beetleSneezes('walk-off')
      return this.fx.play(CELL_VOICES['beetle-dust'])
    }
    if (target.kind === 'packet') {
      // The dust slides off the packet: it falls from where it was let go to the packet's foot.
      const spot = packetPlaces(this.state, this.layout).find((one) => one.packet === target.packet)
      this.fx.dust(at, 14, 46 * this.layout.k, spot ? spot.y + spot.h : Infinity)
      this.fx.shakePacket(target.packet, 0, Math.PI * 4)
      return this.fx.play(CELL_VOICES['seed-dust'])
    }
    // Over bare paper the dust drifts down, and the beetle sneezes it off the page.
    this.fx.dust(at, 12, 40 * this.layout.k)
    this.fx.beetleSneezes()
  }

  /** A pod bursts: by itself when its breath is out, or under a finger. */
  protected burstPod(on: number, how: 'pod-poke' | 'pod-carry' | 'pod-wet' | 'pod-offer' | null, where?: Point, jet = false): void {
    const plant = plantById(this.state, on)
    if (!plant || !podOn(this.state, on)) return
    const from = this.fx.heldAt(on), at = standingOf(this.layout, plant)
    // It bursts where it is: on its plant, wherever that is, or where it was carried to.
    const pod = where ?? (from ? { x: from.x + (at.pod.x - at.x), y: from.y - (at.y - at.pod.y) } : at.pod)
    this.fx.puff(pod, 'pop', 20, 0.35)
    if (how) this.fx.play(CELL_VOICES[how])
    // In a jet all six leave at once and fly flat out; otherwise one after another.
    this.jet = jet
    // A plant in the hand is never the one a brood sends off the page.
    this.popped = true
    this.take(burst(this.state, on, this.inHand), 2, pod)
    this.popped = false
    this.jet = false
  }

  /** A packet seed goes to a pot and grows there. `from` is where it leaves the hand, or none when it hops out of its packet. */
  protected sowSeed(packet: PacketId, pot: { row: PotRow; slot: number }, from: Point | null): void {
    const home = packetPlaces(this.state, this.layout).find((spot) => spot.packet === packet)
    const start = from ?? (home ? { x: home.x + home.w / 2, y: home.y + home.h * 0.3 } : this.soilOf(pot.row, pot.slot))
    this.fx.shakePacket(packet, from ? 20 : 90)
    this.take(sow(this.state, packet, pot.row, pot.slot, this.inHand), 2, start)
  }

  protected setPlantDown(id: number, pot: { row: PotRow; slot: number } | null): void {
    const held = this.fx.heldAt(id)
    this.fx.letGo(id)
    this.fx.holdPod(id, false)
    const plant = plantById(this.state, id)
    if (!plant || !held) return
    const step = pot ? move(this.state, id, pot.row, pot.slot) : null
    if (step && step.events.length > 0) {
      this.take(step, 1, undefined, id)
      this.fx.play(CELL_VOICES['plant-carry'])
      if (step.events.some((event) => event.type === 'shouldered')) this.fx.play(GAME_VOICES.scrape, 0.1)
    } else this.fx.play(TOY_VOICES.back)
    const home = this.fx.spotOf(this.state, id)
    if (home) this.fx.hopTo(id, held, home, 0, 0.22, 14, true)
  }

  protected setPotDown(hand: { row: PotRow; slot: number }, pot: { row: PotRow; slot: number } | null): void {
    const index = potIndex(hand.row, hand.slot)!
    this.fx.holdPot(index, null)
    const step = pot ? swapPots(this.state, hand, pot) : null
    if (!step || step.events.length === 0) return this.fx.play(TOY_VOICES.back)
    this.take(step, 1)
    this.fx.squashPot(index)
    this.fx.squashPot(potIndex(pot!.row, pot!.slot)!)
    this.fx.play(CELL_VOICES['soil-carry'])
  }

  /** The plant the finger holds, if it holds one. What lands later than the finger's own move never takes it out of the hand. */
  /** Whether the pod that is bursting has popped already, where a finger burst it. */
  private popped = false

  protected get inHand(): number | undefined {
    return this.hand?.kind === 'plant' ? this.hand.id : undefined
  }

  protected soilOf(row: PotRow, slot: number): Point {
    const place = this.layout[row][slot]
    return { x: place.x, y: place.soil }
  }

  /**
   * Takes a step of the page and sets everything it moved in motion: young
   * fly from `from` to their pots and draw themselves, plants that changed
   * place hop there, and a plant that left the page slides off it. `carried`
   * is a plant the hand has just set down, which the caller lands itself.
   */
  protected take(step: { state: LabState; events: readonly (PageEvent | { type: string })[] }, changed: Changed, from?: Point, carried?: number): void {
    const before = new Map(this.state.plants.map((plant) => [plant.id, { spot: this.spot(plant.id), plant }]))
    this.state = step.state
    this.changed = Math.max(this.changed, changed) as Changed
    const events = step.events as readonly PageEvent[]
    const fresh = new Set<number>(), main = events.find((event) => event.type === 'burst')
    let hops = 0, more = 0
    for (const event of events) {
      if (event.type === 'burst') {
        // The pod that burst throws its seeds from where it was. One that burst because its plant was leaving the page throws them from where that plant stood.
        const start = (event === main ? from : undefined) ?? before.get(event.on)?.spot ?? null
        // Every pod that bursts pops, seen and heard: the one a finger burst has popped already (`burstPod`); one whose
        // plant is leaving the page pops here, each a beat after the one before it.
        const after = event === main ? 0 : POD_AFTER * ++more
        if (event !== main || !this.popped) {
          if (start) this.fx.puff(start, 'pop', 20, 0.35)
          this.fx.play(CELL_VOICES['pod-poke'], after)
        }
        event.young.forEach((id, index) => {
          fresh.add(id)
          const plant = plantById(this.state, id), spot = this.fx.spotOf(this.state, id)
          if (!plant || !spot) return
          const wait = after + (this.jet ? 0 : index * 0.07), air = this.jet ? 0.3 + 0.015 * index : 0.36 + 0.05 * index
          // Each seed has its tick wherever it lands: a brood that another brood has sent on to the border ticks like any.
          if (start) this.fx.fly(start, { x: spot.x, y: spot.y }, wait, air, index)
          this.fx.sprout(id, start ? wait + air : wait, plant.row === 'border' ? 0.7 : 1.25 + 0.1 * index, this.fx.noteFor(plant.pairs, plant.dry, this.notes++))
        })
      } else if (event.type === 'grew') {
        fresh.add(event.id)
        const plant = plantById(this.state, event.id), spot = this.fx.spotOf(this.state, event.id)
        if (!plant || !spot) continue
        if (from) this.fx.fly(from, { x: spot.x, y: spot.y }, 0, 0.32, 0)
        this.fx.sprout(event.id, from ? 0.32 : 0, 1.2, this.fx.noteFor(plant.pairs, plant.dry, this.notes++))
      } else if (event.type === 'carried-off') {
        const gone = before.get(event.id)
        if (gone?.spot) this.fx.leave(gone.plant.pairs, gone.plant.dry, gone.spot)
        this.fx.forget(event.id)
      }
    }
    // Every plant that stands somewhere else now hops there.
    // All but one in the hand: its place on the page may be another now, and it stays in the hand all the same.
    for (const plant of this.state.plants) {
      if (fresh.has(plant.id) || plant.id === carried || plant.id === this.inHand) continue
      const was = before.get(plant.id), now = this.fx.spotOf(this.state, plant.id)
      if (!was?.spot || !now || (was.plant.row === plant.row && was.plant.slot === plant.slot)) continue
      this.fx.letGo(plant.id)
      // The first few are heard; a whole tray hopping at once would be a clatter.
      this.fx.hopTo(plant.id, was.spot, now, 0.05 * hops, 0.42, 46, hops >= 3)
      hops++
    }
  }

  // --- Time, and what the view draws ---------------------------------------------------

  /** Plays `dt` seconds of the page: springs, flights, the beetle and the worm, and pods whose breath is out. */
  step(dt: number, guidance: Guidance | null = null): void {
    if (this.landing && (this.landing.in -= dt) <= 0) {
      const { on, at } = this.landing
      this.landing = null
      this.fx.holdPod(on, false)
      this.fx.carryPod(on, null)
      this.burstPod(on, null, at)
    }
    for (const on of this.fx.step(dt, this.state)) if (this.hand?.kind !== 'pod' || this.hand.plant !== on) this.burstPod(on, 'pod-poke')
    this.fx.fill(this.live, this.state)
    this.guide(guidance)
  }

  /**
   * The idle ladder's first form. The glow is a ring on every flower that can
   * be dabbed. The ghost hand shows one dab, from one flower to another,
   * picked by turn and never by what would be worth crossing; with fewer than
   * two flowers it taps the packet instead.
   */
  protected guide(guidance: Guidance | null): void {
    const live = this.live, k = this.layout.k
    live.glow.rings.length = 0
    live.glow.strength = guidance?.glow ?? 0
    live.hand = null
    // The ghost hand's dust goes when the hand does; a real finger's dust is not the ladder's to clear.
    if (this.shown && this.hand?.kind !== 'dust') this.fx.dustInHand(null)
    this.shown = false
    if (!guidance || (guidance.glow <= 0 && guidance.demo === null)) return
    const flowers = this.state.plants.filter((plant) => plant.row !== 'border' && this.fx.inBloom(plant.id)).sort((a, b) => a.id - b.id).map((plant) => standingOf(this.layout, plant).flower)
    for (const flower of flowers) live.glow.rings.push({ x: flower.x, y: flower.y, r: (PLANT.flower + 9) * k })
    const turn = guidance.demo === null ? null : this.dabTurn(guidance.demoIndex)
    if (guidance.demo === null || turn === null) return
    const packet = packetPlaces(this.state, this.layout)[0]
    if (flowers.length >= 2) {
      const from = flowers[turn % flowers.length], to = flowers[(turn + 1) % flowers.length]
      const pose = handPose(guidance.demo, true, this.pose)
      const at = { x: from.x + (to.x - from.x) * pose.travel, y: from.y + (to.y - from.y) * pose.travel - 30 * k * Math.sin(pose.travel * Math.PI) }
      live.hand = { ...at, press: pose.press, opacity: pose.opacity }
      // The hand carries dust as a finger would.
      if (pose.press > 0.5 && pose.travel > 0 && pose.travel < 1) {
        this.fx.trail(at)
        this.shown = true
      }
    } else if (packet) {
      const pose = handPose(guidance.demo, false, this.pose)
      live.hand = { x: packet.x + packet.w / 2, y: packet.y + packet.h / 2, press: pose.press, opacity: pose.opacity }
    }
  }

  /** Which dab the ghost hand shows in its `index`th showing of an idle stretch, or none when that showing is for something else. */
  protected dabTurn(index: number): number | null {
    return index
  }

  /** What is in motion, for the view. The same object every frame. */
  get motion(): Live {
    return this.live
  }

  /** The page as the view draws it. Made again only when the page or the plants leaving it change. */
  view(): PageView {
    if (this.focus !== null && !this.state.plants.some((plant) => plant.id === this.focus)) this.focus = null
    if (this.viewOf && this.viewOf.state === this.state && this.viewOf.ghosts === this.fx.version && this.viewOf.view.focus === this.focus) return this.viewOf.view
    const state = this.state
    const plants: PlantView[] = state.plants.map((plant) => ({
      id: plant.id, pairs: plant.pairs, dry: plant.dry, row: plant.row, slot: plant.slot,
      origin: plant.from.how === 'seed' ? { kind: 'seed', onto: plant.from.onto, dust: plant.from.dust } : plant.from.how === 'runner' ? { kind: 'runner', from: plant.from.of } : { kind: 'packet', packet: plant.from.packet },
    }))
    for (const ghost of this.fx.ghosts) plants.push({ id: ghost.id, pairs: ghost.pairs, dry: ghost.dry, row: 'border', slot: 0, origin: { kind: 'packet', packet: 'pink' } })
    const view: PageView = {
      seed: PAPER, plants, dry: state.dry, packets: PACKET_IDS.filter((id) => state.kit.includes(id)), buds: false,
      pods: state.pods.map((pod) => pod.on), visitor: null, waiting: null, kept: [], beetle: { at: 'corner' }, worm: null, focus: this.focus,
    }
    this.viewOf = { state, ghosts: this.fx.version, view }
    return view
  }
}
