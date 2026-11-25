import { actOf, castOf, nameOf } from './acts'
import { BED, FIVE, copyBed, makeBed, other, parting, resting, rollOver, settle, sideOf, sideOfSheep, stepBed, STEP, type Bed, type Bump, type Side } from './bed'
import { deal as dealMilk, fits, movesTo, straws, thirsty, type Milk, type Straw } from './milk'
import { makeRng, type Rng } from './rng'
import { drunk, settledSave, type Saved } from './save'
import { beginCycle } from './state'

// The rules around the bed: milk comes out, straws come down when the five lie
// still, a parting that fits is drunk, and with no milk out each new parting
// puts on its act. The save is decided when a scene starts; what is on screen
// gets there beat by beat, and any touch ends it.

type SceneNow =
  | { kind: 'deal'; t: number; out: number; worn: boolean }
  | { kind: 'milk'; t: number; milk: Milk; straws: Straw[]; burped: number; act: ActNow }
  | { kind: 'act'; t: number; act: ActNow }
  | { kind: 'show'; t: number; who: number; home: Side; gone: boolean }
/** An act on the bed: who puts it on, who watches, and which cues have been heard. */
type ActNow = { cast: number[]; watch: number[]; t: number; cued: number; bleated: number }

export type Event =
  | { type: 'bump'; bump: Bump; hidden: boolean }
  | { type: 'squash'; who: number; hidden: boolean }
  | { type: 'leap'; who: number; hidden: boolean }
  | { type: 'bottleOut'; index: number; order: number }
  | { type: 'bottlesHome' }
  | { type: 'straws'; joined: number; loose: number }
  | { type: 'misfit' }
  | { type: 'drink' }
  | { type: 'burp'; who: number; hidden: boolean }
  | { type: 'cue'; who: number; what: string; hidden: boolean }
  | { type: 'bleat'; who: number; hidden: boolean }
  | { type: 'quilt'; side: Side; up: boolean; first: boolean }
  | { type: 'caught'; who: number }
  | { type: 'call'; who: number; hidden: boolean }
  | { type: 'worn'; who: number }
  | { type: 'dogIn' } | { type: 'dogOut' }
  | { type: 'asleep' }

const DEAL = { first: 0.35, each: 0.5, rest: 0.75, tail: 0.5, worn: 1.6 } as const
export const MILK = { fill: 0.5, drain: 2.2, burp: 2.45, each: 0.3, rest: 0.55, pause: 0.4, home: 0.9 } as const
/** The watchers' bleats after an act. */
const BLEAT = { first: 0.25, each: 0.32, tail: 0.5 } as const

export type Game = {
  bed: Bed
  save: Saved
  rng: Rng
  scene: SceneNow | null
  /** What joins bottles to sheep, once everything lies still. */
  straws: Straw[] | null
  /** The parting that was last judged or played, as a word. */
  last: string
  dogIn: Side | null
  asleep: boolean
  /** Whoever was uncovered in the middle of an act, and how long they still stare. */
  stare: number
  owedShow: number
  /** Whoever was showing the way over when a touch came, and goes back by themselves unless the child moves them. */
  goHome: { who: number; home: Side } | null
  owed: number
  time: number
  heard: Map<string, number>
  events: Event[]
  changed: boolean
}

const keyOf = (bed: Bed): string => bed.sheep.map((s) => (sideOf(s.x) === 'left' ? 'l' : 'r')).join('')

export function makeGame(save: Saved): Game {
  const bed = makeBed(save.sides)
  return { bed, save, rng: makeRng(save.stream), scene: null, straws: null, last: keyOf(bed), dogIn: null, asleep: false, stare: 0, owedShow: save.shown.includes('ridge') ? 0 : 2.4, goHome: null, owed: 0, time: 0, heard: new Map(), events: [], changed: false }
}

export const hidden = (g: Game, who: number): boolean => g.save.quilt !== null && sideOfSheep(g.bed, who) === g.save.quilt
export const milkOut = (g: Game): Milk | null => (g.scene?.kind === 'milk' ? g.scene.milk : g.save.milk)
/** Nothing is going on: what idleness is measured by. */
export const quiet = (g: Game): boolean => g.scene === null && g.bed.held === null && g.bed.hand === null && resting(g.bed)

/** What a save would hold now: everything come to rest, and whatever is in hand back on its side. */
export function saveOf(g: Game): Saved {
  const bed = copyBed(g.bed)
  if (g.bed.held) { const s = bed.sheep[g.bed.held.who]; s.x = g.bed.held.from.x; s.y = g.bed.held.from.y; s.vx = s.vy = 0 }
  settle(bed)
  const sides = bed.sheep.map((s) => sideOf(s.x))
  const back = g.scene?.kind === 'show' ? g.scene : g.goHome
  if (back) sides[back.who] = back.home
  return settledSave({ ...g.save, sides, stream: g.rng.state })
}

/** Any touch: what plays lands where it was going, and the touch is then an ordinary one. */
export function wake(g: Game): void {
  const s = g.scene
  g.scene = null
  if (g.dogIn) { g.dogIn = null; g.events.push({ type: 'dogOut' }) }
  g.asleep = false
  if (s?.kind === 'show') g.goHome = { who: s.who, home: s.home }
  if (s?.kind === 'milk' && s.act.bleated < FIVE) g.events.push({ type: 'bottlesHome' })
}

/** The child has moved one over: there is nothing left to show. */
export function knows(g: Game): void {
  g.owedShow = 0
  if (!g.save.shown.includes('ridge')) g.save = { ...g.save, shown: ['ridge', ...g.save.shown] }
}

export function leap(g: Game, who: number): void {
  if (g.bed.sheep[who].leap) return
  if (g.goHome?.who === who) g.goHome = null
  const was = hidden(g, who)
  knows(g)
  rollOver(g.bed, who)
  g.events.push({ type: 'leap', who, hidden: was })
  g.changed = true
}

export function deal(g: Game): boolean {
  if (g.save.milk || g.scene) return false
  // Whoever is still on the move is taken as lying where they will come to rest.
  const bed = copyBed(g.bed)
  settle(bed)
  if (g.goHome && sideOf(bed.sheep[g.goHome.who].x) !== g.goHome.home) { rollOver(bed, g.goHome.who); settle(bed) }
  const d = dealMilk(bed, g.save.position, g.rng)
  const worn = d.milk.some((b) => b.owner !== null) && !g.save.shown.includes('worn')
  g.save = { ...beginCycle(g.save), milk: d.milk, misfits: 0, needed: movesTo(bed, d.milk) }
  // A deal that asks for no quilt takes off the one that was left on, so that whoever asks is seen.
  if (d.quilt) pull(g, d.quilt, true)
  else if (g.save.quilt) pull(g, g.save.quilt, false)
  g.last = keyOf(bed)
  g.straws = null
  g.scene = { kind: 'deal', t: 0, out: 0, worn }
  g.changed = true
  return true
}

/** The bottle or the straw that has nobody is touched: whoever asks for it answers. */
export function call(g: Game): void {
  const who = asker(g)
  if (who !== null) g.events.push({ type: 'call', who, hidden: hidden(g, who) })
}

/** The quilt over one half, or off. There is one quilt: it comes off the other half first. */
export function pull(g: Game, side: Side, up: boolean): void {
  if (up && g.save.quilt !== side) {
    const first = g.save.quilt !== null
    g.save = { ...g.save, quilt: side }
    g.events.push({ type: 'quilt', side, up, first })
  } else if (!up && g.save.quilt === side) {
    g.save = { ...g.save, quilt: null }
    g.events.push({ type: 'quilt', side, up, first: false })
  } else return
  g.changed = true
}

/** When the bottle of this order hops out; the two shelves stand apart by a rest. */
export function dealAt(milk: Milk, order: number): number {
  const left = milk.filter((b) => b.side === 'left').length
  return DEAL.first + order * DEAL.each + (order >= left && left > 0 ? DEAL.rest - DEAL.each + 0.5 : 0)
}
export function burpAt(order: number, left: number): number {
  return MILK.burp + order * MILK.each + (order >= left && left > 0 ? MILK.rest : 0)
}
const actStart = (left: number) => burpAt(FIVE - 1, left) + MILK.pause
const actLength = (a: ActNow): number => actOf(a.cast).lasts + (a.watch.length ? BLEAT.first + a.watch.length * BLEAT.each + BLEAT.tail : BLEAT.tail)

function makeAct(g: Game): ActNow {
  const parts = parting(g.bed)
  const cast = castOf(parts)
  return { cast, watch: [...parts.left, ...parts.right].filter((i) => !cast.includes(i)), t: 0, cued: 0, bleated: 0 }
}

function playAct(g: Game, a: ActNow, dt: number): boolean {
  a.t += dt
  const act = actOf(a.cast)
  const cues = [...act.cues].sort((x, y) => x.at - y.at)
  while (a.cued < cues.length && a.t >= cues[a.cued].at) {
    const c = cues[a.cued++], who = a.cast[c.who]
    g.events.push({ type: 'cue', who, what: c.what, hidden: hidden(g, who) })
  }
  while (a.bleated < a.watch.length && a.t >= act.lasts + BLEAT.first + a.bleated * BLEAT.each) {
    const who = a.watch[a.bleated++]
    g.events.push({ type: 'bleat', who, hidden: hidden(g, who) })
  }
  return a.t >= actLength(a)
}

/** The left part first, each from left to right. */
function inOrder(g: Game): number[] {
  const parts = parting(g.bed)
  const byX = (l: number[]) => [...l].sort((a, b) => g.bed.sheep[a].x - g.bed.sheep[b].x)
  return [...byX(parts.left), ...byX(parts.right)]
}

/** A sound of one kind from one sheep is not made again at once. */
function due(g: Game, key: string, gap: number): boolean {
  if ((g.heard.get(key) ?? -9) > g.time - gap) return false
  g.heard.set(key, g.time)
  return true
}

export function advance(g: Game, seconds: number): void {
  g.time += seconds
  g.owed += seconds
  while (g.owed >= STEP) {
    g.owed -= STEP
    stepBed(g.bed)
    for (const b of g.bed.bumps) if (due(g, `${b.what}${b.who}`, b.what === 'ridge' ? 0.3 : 0.14)) g.events.push({ type: 'bump', bump: b, hidden: hidden(g, b.who) })
    g.bed.bumps = []
  }
  g.stare = Math.max(0, g.stare - seconds)
  if (g.goHome && !g.bed.sheep[g.goHome.who].leap) {
    if (g.bed.held?.who !== g.goHome.who && sideOfSheep(g.bed, g.goHome.who) !== g.goHome.home) rollOver(g.bed, g.goHome.who)
    g.goHome = null
  }
  join(g)
  const s = g.scene
  if (s) scene(g, s, seconds)
  else if (resting(g.bed)) {
    rest(g)
    if (g.owedShow > 0 && !g.scene && g.save.milk) {
      g.owedShow -= seconds
      if (g.owedShow <= 0) show(g)
    }
  }
}

function show(g: Game): void {
  // From the half of the straw that nobody has, so that the spare straw gets no sheep by it and nothing is solved.
  const milk = g.save.milk!
  const from: Side = parting(g.bed).left.length > milk.filter((b) => b.side === 'left').length ? 'right' : 'left'
  const who = parting(g.bed)[from].find((i) => !hidden(g, i))
  if (who === undefined || g.save.quilt) { g.owedShow = 0; return }
  g.save = { ...g.save, shown: [...g.save.shown, 'ridge'] }
  g.scene = { kind: 'show', t: 0, who, home: from, gone: false }
  g.changed = true
}

/** Straws follow who lies where, at once: one that comes over gets its straw as it lands. */
function join(g: Game): void {
  const milk = g.save.milk
  if (!milk || g.scene?.kind === 'deal') { g.straws = null; return }
  const before = g.straws
  g.straws = straws(g.bed, milk, before)
  const fresh = g.straws.filter((s) => s.who !== null && before?.[s.bottle].who !== s.who).length
  if (fresh > 0 && due(g, 'straws', 0.25)) g.events.push({ type: 'straws', joined: fresh, loose: before ? 0 : g.straws.filter((s) => s.who === null).length })
}

function rest(g: Game): void {
  const key = keyOf(g.bed)
  const milk = g.save.milk
  if (milk) {
    if (!g.straws) return
    if (fits(g.straws)) {
      const drinks = g.straws
      g.save = drunk(g.save)
      g.last = key
      g.scene = { kind: 'milk', t: 0, milk, straws: drinks, burped: 0, act: makeAct(g) }
      g.straws = null
      g.events.push({ type: 'drink' })
      g.changed = true
    } else if (key !== g.last) {
      g.last = key
      g.save = { ...g.save, misfits: g.save.misfits + 1 }
      g.events.push({ type: 'misfit' })
      g.changed = true
    }
    return
  }
  if (key === g.last || g.stare > 0) return
  g.last = key
  g.scene = { kind: 'act', t: 0, act: makeAct(g) }
  g.changed = true
}

function scene(g: Game, s: SceneNow, dt: number): void {
  s.t += dt
  switch (s.kind) {
    case 'deal': {
      const milk = g.save.milk!
      while (s.out < milk.length && s.t >= dealAt(milk, s.out)) {
        g.events.push({ type: 'bottleOut', index: s.out, order: s.out })
        s.out++
      }
      const end = dealAt(milk, FIVE - 1) + DEAL.tail
      if (s.worn && s.t >= end) {
        s.worn = false
        g.save = { ...g.save, shown: [...g.save.shown, 'worn'] }
        g.changed = true
        for (const b of milk) if (b.owner !== null) g.events.push({ type: 'worn', who: b.owner })
        s.t = end - DEAL.worn
      } else if (s.t >= end && s.out === milk.length) g.scene = null
      break
    }
    case 'milk': {
      const order = inOrder(g), left = parting(g.bed).left.length
      while (s.burped < FIVE && s.t >= burpAt(s.burped, left)) {
        const who = order[s.burped++]
        g.events.push({ type: 'burp', who, hidden: hidden(g, who) })
      }
      if (s.t >= actStart(left)) {
        const a = s.act
        // The watchers' bleats were their burps; the bottles go home when the act is over.
        if (a.t < actOf(a.cast).lasts) playAct(g, a, dt)
        else {
          if (a.bleated === 0) { a.bleated = FIVE; g.events.push({ type: 'bottlesHome' }) }
          a.t += dt
          if (a.t >= actOf(a.cast).lasts + MILK.home) {
            g.scene = null
            g.asleep = true
            g.events.push({ type: 'asleep' })
          }
        }
      }
      break
    }
    case 'act':
      if (playAct(g, s.act, dt)) {
        g.scene = null
        const room = other(sideOf(g.bed.sheep[0].x))
        if (nameOf(s.act.cast) === 'all' && g.save.quilt !== room) {
          g.dogIn = room
          g.events.push({ type: 'dogIn' })
        }
      }
      break
    case 'show':
      if (s.t > 0.6 && !s.gone) { s.gone = true; rollOver(g.bed, s.who); g.events.push({ type: 'leap', who: s.who, hidden: false }) }
      else if (s.gone && s.t > 2.4 && sideOfSheep(g.bed, s.who) !== s.home && !g.bed.sheep[s.who].leap) { rollOver(g.bed, s.who); g.events.push({ type: 'leap', who: s.who, hidden: false }) }
      else if (s.t > 2.6 && resting(g.bed) && sideOfSheep(g.bed, s.who) === s.home) g.scene = null
      break
    default:
      s satisfies never
  }
}

/** The act that is playing, if one is, on its own or after the milk. */
export function actNow(g: Game): ActNow | null {
  const s = g.scene
  if (s?.kind === 'act') return s.act
  if (s?.kind === 'milk' && s.act.t > 0) return s.act
  return null
}

/** Of all who have no straw, the one who asks: nearest the ridge, and not one whose own bottle is on its own side. */
export function asker(g: Game): number | null {
  const all = askers(g)
  const milk = g.save.milk
  const own = all.find((i) => milk?.some((b) => b.owner === i && b.side !== sideOfSheep(g.bed, i)))
  if (own !== undefined) return own
  return all.reduce<number | null>((best, i) => (best === null || Math.abs(g.bed.sheep[i].x - BED.crest) < Math.abs(g.bed.sheep[best].x - BED.crest) ? i : best), null)
}
export const askers = (g: Game): number[] => (g.straws && !fits(g.straws) ? thirsty(g.straws).filter((i) => !g.bed.sheep[i].leap) : [])
