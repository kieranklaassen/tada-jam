import { box, type Box } from './layout'
import { MARGIN, MOST_WINDOWS, PAPERS, copySheet, middleOf, outlineOf, sheetOf, windowAt, type Paper, type SheetWindow } from './sheet'
import type { SoundEvent, SoundKind } from './sounds'

// The table as numbers: the sheet, the scissors, three papers, the candle and
// the pile, and what a finger does with each. There is no scene here, only
// the child's acts in any order. The working pieces do nothing by themselves;
// the cat under the table is the one thing that lives. Time comes in as
// seconds of play, and every sound is an event stamped with it.

export type Made = 'flat' | 'rolled' | 'candle' | 'lit'

/** The sheet as it lies flat on the table. One hundredth of it is 4.2 by 3 stage units. */
export const SHEET = box(360, 286, 780, 586)
const SHEET_W = SHEET.right - SHEET.left, SHEET_H = SHEET.bottom - SHEET.top
/** The edge that is dragged across to roll the sheet: the lip that stands up along its right side, wholly off the sheet, so a finger on the sheet always cuts. */
export const EDGE = box(SHEET.right + 1, SHEET.top, SHEET.right + 65, SHEET.bottom)
/** How wide the lip is drawn. */
export const LIP = 24
export const PAPER_RESTS: Record<Paper, Box> = { red: box(176, 286, 316, 370), blue: box(176, 394, 316, 478), yellow: box(176, 502, 316, 586) }
/** The pile of fresh sheets: more than a finger's width (48 px at the smaller surface) from the scissors below it. */
export const PILE = box(872, 244, 1016, 328)
/** How far towards the sheet's place a fresh sheet must be carried to land: a slip off the pile changes nothing. */
export const LANDS = SHEET.right + 20
/** How far a finger may slip on the rolled lantern and still have tapped it. */
export const SLIP = 60
export const SCISSORS_REST = { x: 944, y: 436 }
export const SCISSORS_BOX = box(884, 396, 1004, 476)
export const CANDLE_REST = { x: 944, y: 566 }
export const CANDLE_BOX = box(904, 506, 984, 616)
/** The rolled lantern as it stands on the table, and its wick. */
export const ROLLED = box(506, 330, 634, 596)
export const WICK = { x: 570, y: 352 }
/** The table top, and the floor under it where the cat keeps. */
export const TOP = box(140, 236, 1040, 640)
export const UNDER = box(200, 668, 980, 800)
/** How far the cat reaches to either side of where it sits, tail and paw and all. */
export const CAT_REACH = 140
/** The furthest a scrap reaches from its own middle. */
export const SCRAP = 26
/** How near the middle of a window a paper may be let go and still go behind it: a small finger's width at the smaller surface. */
export const NEAR = 30

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
const inBox = (b: Box, x: number, y: number, grow = 0) => x >= b.left - grow && x <= b.right + grow && y >= b.top - grow && y <= b.bottom + grow

/** A point of the table in hundredths of the sheet. */
export const toSheet = (x: number, y: number) => ({ x: ((x - SHEET.left) / SHEET_W) * 100, y: ((y - SHEET.top) / SHEET_H) * 100 })
/** A point of the sheet on the table. */
export const fromSheet = (x: number, y: number) => ({ x: SHEET.left + (x / 100) * SHEET_W, y: SHEET.top + (y / 100) * SHEET_H })

export type Hand =
  | { kind: 'cut'; path: number[]; cutSince: number }
  | { kind: 'paper'; paper: Paper; x: number; y: number }
  | { kind: 'roll'; from: number; fromY: number; back: boolean; far: number }
  | { kind: 'candle'; x: number; y: number }
  | { kind: 'fresh'; x: number; y: number }

export type Scrap = { x: number; y: number; spin: number; outline: number[]; landed: number; skid: number }

export class Table {
  private events: SoundEvent[] = []
  made: Made
  sheet: SheetWindow[]
  hand: Hand | null = null
  /** Where the scissors are, how far open, and how they lie. */
  readonly scissors = { x: SCISSORS_REST.x, y: SCISSORS_REST.y, open: 0, turn: 0.5 }
  /** Where the candle is: at rest, in the hand, or in the lantern. */
  readonly candle = { x: CANDLE_REST.x, y: CANDLE_REST.y }
  /** How far the sheet is rolled, 0 flat to 1 rolled: it eases to what `made` says. */
  rolled: number
  /** 1 as the rolled lantern is knocked, falling to 0. */
  wobble = 0
  /** 1 as the candle is picked up, falling to 0: it hops under the finger. */
  hop = 0
  /** A paper sliding back to its place: which, from where, and how far along (1 when none). */
  readonly back = { paper: 'red' as Paper, x: 0, y: 0, along: 1 }
  /** The candle sliding back to its place, 0 to 1 (1 when it is not). */
  readonly candleBack = { x: 0, y: 0, along: 1 }
  /** A fresh sheet let go short of the sheet's place, sliding back onto the pile: from where, and how far along (1 when none). */
  readonly freshBack = { x: 0, y: 0, along: 1 }
  /** 1 as a paper goes behind a window, falling to 0, and which window. */
  readonly tucked = { window: -1, pulse: 0 }
  /** A ninth cut closing again behind the scissors: its path and how far closed (1 when none). */
  readonly closing = { path: [] as number[], along: 1 }
  /** The sheet that was in hand sliding off to the cat, 0 to 1 (1 when none), and the fresh one landing. */
  readonly gone = { sheet: [] as SheetWindow[], along: 1 }
  landing = 0
  readonly scraps: Scrap[] = []
  /** The cat: where it is, where it is going, what it looks at, its paw and its ears. */
  readonly cat = { x: 420, to: 420, lookX: 600, lookY: 400, bat: 0, ear: 0 }
  /** 1 where a bare place was knocked, falling to 0. */
  readonly knock = { x: 0, y: 0, pulse: 0 }
  /** The flame on the wick, 0 to 1: a scene lights it and pinches it out. */
  flame = 0
  /** A scene is showing the roll and the candle: they do not ease by themselves. */
  held = false
  /** Counts every change to the sheet or to how far the lantern is made, so the game knows to save at once. */
  rev = 0

  constructor(made: Made, sheet: readonly SheetWindow[], public time = 0) {
    this.made = made
    this.sheet = copySheet(sheet)
    this.rolled = made === 'flat' ? 0 : 1
    if (made === 'candle' || made === 'lit') { this.candle.x = WICK.x; this.candle.y = WICK.y + 150 }
  }

  takeEvents(): SoundEvent[] {
    const out = this.events
    this.events = []
    return out
  }

  private sound(kind: SoundKind, n = 0): void {
    this.events.push({ kind, at: this.time, n: clamp(n, 0, 1) })
  }

  /** The papers lie on the table once the sheet has a window, and while it is flat. */
  get papersOut(): boolean {
    return this.made === 'flat' && this.sheet.length > 0
  }

  /** Whether a touch at this point would start a carry or a cut, which nothing interrupts. */
  private lookAt(x: number, y: number): void {
    this.cat.lookX = x; this.cat.lookY = y
  }

  // --- The finger --------------------------------------------------------------

  /** The finger lands. True when something was there to take or to answer; false on a bare place, which only knocks. */
  press(x: number, y: number): boolean {
    this.lookAt(x, y)
    if (this.made === 'flat') {
      if (inBox(EDGE, x, y)) {
        this.hand = { kind: 'roll', from: x, fromY: y, back: false, far: 0 }
        // The edge lifts under the finger at once.
        this.rolled = 0.04
        this.sound('slide', 0.9)
        return true
      }
      if (inBox(SHEET, x, y)) {
        // The scissors are at the finger at once, and snap.
        const at = toSheet(x, y)
        this.hand = { kind: 'cut', path: [at.x, at.y], cutSince: 0 }
        this.scissors.x = x; this.scissors.y = y
        this.scissors.open = 1
        this.sound('snip', 0.5)
        return true
      }
      if (this.papersOut) {
        for (const paper of PAPERS) {
          if (!inBox(PAPER_RESTS[paper], x, y, 6)) continue
          this.hand = { kind: 'paper', paper, x, y }
          this.back.along = 1
          this.sound('slide', PAPERS.indexOf(paper) / 2)
          return true
        }
      }
      if (inBox(PILE, x, y, 6)) {
        this.hand = { kind: 'fresh', x, y }
        this.freshBack.along = 1
        this.sound('slide', 0.2)
        return true
      }
    }
    if (this.made !== 'candle' && this.made !== 'lit' && inBox(CANDLE_BOX, x, y, 6)) {
      this.hand = { kind: 'candle', x, y }
      this.candle.x = x; this.candle.y = y
      this.candleBack.along = 1
      this.hop = 1
      this.sound('wobble', 0.8)
      return true
    }
    if (inBox(SCISSORS_BOX, x, y, 6) && this.hand === null) {
      this.scissors.open = 1
      this.sound('snip', 0.2)
      // Picked up where they lie, they go with the finger, and cut from where they come onto a flat sheet.
      if (this.made === 'flat') this.hand = { kind: 'cut', path: [], cutSince: 0 }
      return true
    }
    if (this.made !== 'flat' && inBox(ROLLED, x, y, 10)) {
      this.wobble = 1
      this.sound('wobble', 0.3)
      // The rolled sheet can be dragged back the way it was rolled, and it unrolls.
      if (this.made !== 'lit' && this.hand === null) this.hand = { kind: 'roll', from: x, fromY: y, back: true, far: 0 }
      return true
    }
    this.knock.x = x; this.knock.y = y; this.knock.pulse = 1
    this.cat.ear = 1
    this.sound('tap', x / 1180)
    return false
  }

  /** A finger landed while another is at work: it is not taken on, and it is answered where it landed, as a bare place answers a knock. */
  rap(x: number, y: number): void {
    this.knock.x = x; this.knock.y = y; this.knock.pulse = 1
    this.cat.ear = 1
    this.sound('tap', x / 1180)
  }

  drag(x: number, y: number): void {
    const hand = this.hand
    if (!hand) return
    this.lookAt(x, y)
    if (hand.kind === 'cut') {
      const at = toSheet(x, y)
      if (hand.path.length === 0) {
        // Carried from their place: they follow the finger over the table, and the cut begins where they reach the sheet.
        this.scissors.turn = Math.atan2(y - this.scissors.y, x - this.scissors.x) || this.scissors.turn
        this.scissors.x = x; this.scissors.y = y
        if (!inBox(SHEET, x, y)) return
        hand.path.push(clamp(at.x, MARGIN, 100 - MARGIN), clamp(at.y, MARGIN, 100 - MARGIN))
        this.scissors.open = 1
        this.sound('snip', 0.5)
        return
      }
      at.x = clamp(at.x, MARGIN, 100 - MARGIN); at.y = clamp(at.y, MARGIN, 100 - MARGIN)
      const path = hand.path, n = path.length
      const far = Math.hypot(at.x - path[n - 2], at.y - path[n - 1])
      const to = fromSheet(at.x, at.y)
      this.scissors.turn = Math.atan2(to.y - this.scissors.y, to.x - this.scissors.x) || this.scissors.turn
      this.scissors.x = to.x; this.scissors.y = to.y
      if (far < 1.5) return
      path.push(at.x, at.y)
      hand.cutSince += far
      // The blades close once for every stretch of paper they go through.
      if (hand.cutSince >= 8) {
        hand.cutSince = 0
        this.scissors.open = 1
        this.sound('snip', (path.length % 6) / 5)
      }
    } else if (hand.kind === 'paper' || hand.kind === 'fresh') {
      hand.x = x; hand.y = y
    } else if (hand.kind === 'candle') {
      hand.x = x; hand.y = y
      this.candle.x = x; this.candle.y = y
    } else if (hand.back) {
      // How far the finger has slipped from where it landed, whichever way it went.
      hand.far = Math.max(hand.far, Math.hypot(x - hand.from, y - hand.fromY))
      this.rolled = 1 - clamp((x - hand.from) / (SHEET_W * 0.8), 0, 1) * 0.9
    } else this.rolled = clamp((hand.from - x) / (SHEET_W * 0.8), 0, 1) * 0.9
  }

  /**
   * The finger let go: the thing in hand is set down where it is, and taken there if that is its place. `fresh`
   * when a fresh sheet landed, and the game lays the sheet its position names; `light` when the finger was on the
   * lantern with the candle in and only slipped, which lights the wick as a tap does.
   */
  release(): 'fresh' | 'light' | null {
    const hand = this.hand
    this.hand = null
    if (!hand) return null
    if (hand.kind === 'cut') {
      const outline = outlineOf(hand.path)
      if (!outline) return null
      if (this.sheet.length >= MOST_WINDOWS) {
        // A ninth cut closes again behind the scissors.
        this.closing.path = outline
        this.closing.along = 0
        this.sound('back', 0.9)
        return null
      }
      this.sheet.push({ outline, paper: null, cut: true })
      this.rev++
      const middle = middleOf(outline), at = fromSheet(middle.x, middle.y)
      if (this.scraps.length >= 6) this.scraps.shift()
      // The scrap is the window's own shape, small enough to lie under the table.
      const shape = outline.map((v, i) => (i % 2 ? (v - middle.y) * 3 : (v - middle.x) * 4.2))
      const small = Math.min(1, SCRAP / shape.reduce((most, v) => Math.max(most, Math.abs(v)), 1))
      this.scraps.push({ x: at.x, y: at.y, spin: 0, outline: shape.map((v) => v * small), landed: -1, skid: 0 })
      this.sound('scrap')
    } else if (hand.kind === 'paper') {
      const at = toSheet(hand.x, hand.y)
      let window = inBox(SHEET, hand.x, hand.y) ? windowAt(this.sheet, at.x, at.y) : -1
      if (window < 0) {
        // A window too small for a finger still takes a paper let go right beside it.
        let nearest = NEAR
        this.sheet.forEach((cut, i) => {
          const middle = middleOf(cut.outline), on = fromSheet(middle.x, middle.y)
          const far = Math.hypot(on.x - hand.x, on.y - hand.y)
          if (far <= nearest) { nearest = far; window = i }
        })
      }
      if (window >= 0) {
        this.sheet[window].paper = hand.paper
        this.rev++
        this.tucked.window = window; this.tucked.pulse = 1
        this.sound('tuck', PAPERS.indexOf(hand.paper) / 2)
      } else this.slideBack(hand.paper, hand.x, hand.y)
    } else if (hand.kind === 'roll' && hand.back) {
      if (this.rolled <= 0.55) {
        // Unrolled: the sheet lies flat again as it was cut, and a candle that stood in it slides back to its place.
        if (this.made === 'candle') { this.candleBack.x = this.candle.x; this.candleBack.y = this.candle.y; this.candleBack.along = 0 }
        this.made = 'flat'
        this.rev++
        this.sound('unroll')
      } else if (this.made === 'candle' && hand.far <= SLIP) return 'light'
    } else if (hand.kind === 'roll') {
      if (this.rolled >= 0.45) {
        this.made = 'rolled'
        this.rev++
        this.sound('roll')
      }
    } else if (hand.kind === 'candle') {
      const flat = this.made === 'flat'
      if (inBox(flat ? SHEET : ROLLED, hand.x, hand.y, flat ? 0 : 30)) {
        // Set on the flat sheet, it is rolled into the lantern.
        this.made = 'candle'
        this.rev++
        this.candle.x = WICK.x; this.candle.y = WICK.y + 150
        if (flat) this.sound('roll')
        this.sound('set')
      } else {
        this.candleBack.x = hand.x; this.candleBack.y = hand.y; this.candleBack.along = 0
        this.sound('back', 0.4)
      }
    } else if (inBox(TOP, hand.x, hand.y) && hand.x <= LANDS) {
      // The fresh sheet lands; the one that lay there slides off to the cat and is gone.
      this.gone.sheet = this.sheet
      this.gone.along = 0
      this.landing = 1
      this.sound('off')
      this.sound('land')
      this.cat.to = UNDER.left + CAT_REACH + 20
      return 'fresh'
    } else {
      // Let go short of the sheet's place, the fresh sheet slides back onto the pile, and nothing has changed.
      this.freshBack.x = hand.x; this.freshBack.y = hand.y; this.freshBack.along = 0
      this.sound('back', 0.6)
    }
    return null
  }

  /** Lays the sheet the position names on the table. */
  lay(position: string): void {
    this.sheet = sheetOf(position)
    this.rev++
  }

  /** The finger was taken away, which is not the child letting go: the thing in hand goes back where it came from, and a cut is no cut. */
  cancel(): void {
    const hand = this.hand
    this.hand = null
    if (!hand) return
    if (hand.kind === 'candle') { this.candle.x = CANDLE_REST.x; this.candle.y = CANDLE_REST.y }
  }

  /** Whether a tap here lights the wick: the candle is in, and the tap is on the lantern. */
  lights(x: number, y: number): boolean {
    return this.made === 'candle' && inBox(ROLLED, x, y, 24)
  }

  private slideBack(paper: Paper, x: number, y: number): void {
    this.back.paper = paper; this.back.x = x; this.back.y = y; this.back.along = 0
    this.sound('back', 0.1)
    // The cat goes after it, under the table. A cat already there stays as it is and makes no sound.
    const to = clamp(x, UNDER.left + CAT_REACH, UNDER.right - CAT_REACH)
    if (Math.abs(to - this.cat.x) > 1) {
      this.cat.to = to
      this.sound('scamper')
    }
  }

  // --- Time ----------------------------------------------------------------------

  tick(dt: number): void {
    this.time += dt
    const ease = (v: number, by: number) => Math.max(0, v - dt * by)
    this.scissors.open = ease(this.scissors.open, 7)
    this.wobble = ease(this.wobble, 2)
    this.hop = ease(this.hop, 5)
    this.tucked.pulse = ease(this.tucked.pulse, 2.5)
    this.knock.pulse = ease(this.knock.pulse, 3)
    this.landing = ease(this.landing, 2.2)
    this.back.along = Math.min(1, this.back.along + dt * 2.4)
    this.candleBack.along = Math.min(1, this.candleBack.along + dt * 2.6)
    this.freshBack.along = Math.min(1, this.freshBack.along + dt * 2.6)
    this.closing.along = Math.min(1, this.closing.along + dt * 2)
    this.gone.along = Math.min(1, this.gone.along + dt * 1.3)
    if (this.held) {
      // A scene holds them.
    } else if (this.candleBack.along < 1) {
      this.candle.x = this.candleBack.x + (CANDLE_REST.x - this.candleBack.x) * this.candleBack.along
      this.candle.y = this.candleBack.y + (CANDLE_REST.y - this.candleBack.y) * this.candleBack.along
    } else if (this.hand?.kind !== 'candle' && this.made !== 'candle' && this.made !== 'lit') { this.candle.x = CANDLE_REST.x; this.candle.y = CANDLE_REST.y }
    // With no cut in hand the scissors lie in their place.
    if (this.hand?.kind !== 'cut') {
      this.scissors.x += (SCISSORS_REST.x - this.scissors.x) * Math.min(1, dt * 9)
      this.scissors.y += (SCISSORS_REST.y - this.scissors.y) * Math.min(1, dt * 9)
      this.scissors.turn += (0.5 - this.scissors.turn) * Math.min(1, dt * 9)
    }
    const want = this.hand?.kind === 'roll' ? this.rolled : this.made === 'flat' ? 0 : 1
    if (!this.held) {
      this.rolled += (want - this.rolled) * Math.min(1, dt * 7)
      if (Math.abs(want - this.rolled) < 0.002) this.rolled = want
    }

    // Scraps fall off the front of the table to the floor, and the cat bats each one once.
    const cat = this.cat
    for (const scrap of this.scraps) {
      if (scrap.landed < 0 && scrap.y < TOP.bottom + SCRAP) {
        // It lies flat on the table and slides to the front edge: nothing falls through the table top.
        scrap.y += 300 * dt
      } else if (scrap.landed < 0) {
        // Off the edge, it falls in front of the table and turns as it goes.
        scrap.y += 420 * dt
        scrap.spin += dt * 5
        if (scrap.y >= UNDER.bottom - 26) {
          scrap.y = UNDER.bottom - 26
          scrap.landed = 0
          cat.to = clamp(scrap.x - 76, UNDER.left + CAT_REACH, UNDER.right - CAT_REACH)
          cat.lookX = scrap.x; cat.lookY = scrap.y
        }
      } else {
        const before = scrap.landed
        scrap.landed += dt
        if (before < 0.5 && scrap.landed >= 0.5 && Math.abs(cat.x - clamp(scrap.x - 76, UNDER.left + CAT_REACH, UNDER.right - CAT_REACH)) < 12) {
          cat.bat = 1
          scrap.skid = 1
          this.sound('bat')
        } else if (before < 0.5 && scrap.landed >= 0.5) scrap.landed = 0.4
        if (scrap.skid > 0) {
          scrap.skid = ease(scrap.skid, 2.4)
          scrap.x = clamp(scrap.x + 190 * scrap.skid * dt, UNDER.left + SCRAP, UNDER.right - SCRAP)
          scrap.spin += dt * 9 * scrap.skid
        }
      }
    }
    cat.bat = ease(cat.bat, 3)
    cat.ear = ease(cat.ear, 2.5)
    const step = 460 * dt
    cat.x = Math.abs(cat.to - cat.x) <= step ? cat.to : cat.x + Math.sign(cat.to - cat.x) * step
  }

  /**
   * What the idle guidance points at now: one thing, and one move with it. `showing` is which showing of the idle
   * stretch this is. The hand shows a move and never where a thing should go: a cut that closes into a window,
   * a paper carried to a window that has none, the edge rolled, the candle set in, the wick tapped; and one
   * showing in each stretch, the third, is the candle set on the flat sheet, which rolls it in one move.
   */
  aim(out: { fromX: number; fromY: number; toX: number; toY: number; tap: boolean; glow: Box; path: number[] | null }, showing = 0): typeof out {
    out.tap = false
    out.path = null
    if (this.made === 'candle') {
      out.fromX = out.toX = WICK.x; out.fromY = out.toY = WICK.y + 60
      out.tap = true
      out.glow = ROLLED
    } else if (this.made === 'rolled') {
      out.fromX = CANDLE_REST.x; out.fromY = CANDLE_REST.y
      out.toX = WICK.x; out.toY = WICK.y + 90
      out.glow = CANDLE_BOX
    } else if (showing === 2) {
      out.fromX = CANDLE_REST.x; out.fromY = CANDLE_REST.y
      out.toX = SHEET.right - 90; out.toY = (SHEET.top + SHEET.bottom) / 2 + 30
      out.glow = CANDLE_BOX
    } else if (this.sheet.length === 0) {
      // Round and back to where it began: the cut closes, and what it closes is a window.
      out.path = CUT_SHOWN
      out.fromX = out.toX = CUT_SHOWN[0]; out.fromY = out.toY = CUT_SHOWN[1]
      out.glow = SCISSORS_BOX
    } else {
      const bare = this.sheet.findIndex((window) => window.paper === null)
      if (bare >= 0) {
        const middle = middleOf(this.sheet[bare].outline), at = fromSheet(middle.x, middle.y)
        // A different paper each time it is shown, all three in the four showings of one stretch (the third showing is the candle's): any of them goes behind a window.
        const turn = Math.max(0, showing > 2 ? showing - 1 : showing)
        const rest = PAPER_RESTS[PAPERS[(turn + 2) % PAPERS.length]]
        out.fromX = (rest.left + rest.right) / 2; out.fromY = (rest.top + rest.bottom) / 2
        out.toX = at.x; out.toY = at.y
        out.glow = rest
      } else {
        out.fromX = EDGE.left + 30; out.fromY = (EDGE.top + EDGE.bottom) / 2
        out.toX = SHEET.left + 110; out.toY = out.fromY
        out.glow = EDGE
      }
    }
    return out
  }
}

/** The cut the hand shows on a sheet with no window: a loop on the sheet that ends where it began. */
export const CUT_SHOWN: number[] = (() => {
  const out: number[] = []
  const cx = SHEET.left + 150, cy = SHEET.top + 150
  for (let i = 0; i <= 12; i++) {
    const angle = -Math.PI / 2 + (i / 12) * Math.PI * 2
    out.push(Math.round(cx + Math.cos(angle) * 62), Math.round(cy + Math.sin(angle) * 52))
  }
  return out
})()
