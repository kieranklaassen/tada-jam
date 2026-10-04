import { LOOKS, type Kind } from './kinds'
import { INK, PAPER, figure, line, plain, solid, type Pen } from './marker'
import { makeRng, seedFrom } from './rng'
import { ellipse, smooth } from './shapes'
import { MANNERS, PLAIN, through, type Manner } from './manner'
import type { Effect } from './staging'

// The reactions, drawn in the look: a puff of flame, a hiccup, strings of
// cheese, a cloud of sock, a burp. Each is a few marker figures drawn fresh
// every frame from a fixed seed, so it grows and fades without boiling.
// They are consequences on the customer's body and in the air round it;
// nothing here rates the pizza.

export type Anchors = {
  mouth: { x: number; y: number }
  /** The eye on the tubs' side, and its radius. */
  eye: { x: number; y: number; r: number }
  /** Where its two hands are drawn, when a scene has them somewhere: the free one, on the tubs' side, and the one that holds the card. */
  hands: { free: { x: number; y: number } | null; card: { x: number; y: number } | null }
  /** The lowest point of its eyes, in stage units: soot lies below it, so a sooty face can still be seen to blink. */
  eyesLow: number
  /** How tall it stands just now, in stage units. */
  height: number
  /** The customer's own colour, for a hand or a foot drawn with a reaction. */
  body: string
  /** The line of the counter's far edge: what comes up from behind it starts there. */
  counter: number
  /** The top of the head. */
  head: { x: number; y: number }
  belly: { x: number; y: number }
  /** Where the pizza is, and its radius as drawn. */
  pizza: { x: number; y: number; r: number }
  halfWidth: number
}

const hump = (t: number): number => Math.sin(Math.min(1, Math.max(0, t)) * Math.PI)

function flame(g: Pen, x: number, y: number, long: number, wide: number, seed: number): void {
  const rng = makeRng(seed)
  if (wide > long * 0.62) {
    // A ball of fire: round and lumpy, with a round heart. As wide as it is long, the tongue below would be a star.
    const cx = x + long / 2, lump: number[] = [], heart = ellipse(cx - long * 0.06, y, long * 0.24, wide * 0.42, 12)
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2, far = 0.92 + 0.1 * Math.sin(i * 2.3 + seed)
      lump.push(cx + Math.cos(a) * (long / 2) * far, y + Math.sin(a) * wide * far)
    }
    const ball = smooth(lump, 3)
    solid(g, ball, PAPER)
    figure(g, ball, '#ff8a1f', rng, 0.5, 6, 11)
    solid(g, heart, '#ffe14d')
    return
  }
  const body = smooth([x, y - wide * 0.4, x + long * 0.4, y - wide, x + long * 0.74, y - wide * 0.34, x + long, y - wide * 0.1, x + long * 0.8, y + wide * 0.3, x + long * 0.5, y + wide, x + long * 0.2, y + wide * 0.5, x, y + wide * 0.4], 4)
  // Paper under the marker, so the colour stays its own over a customer's body.
  solid(g, body, PAPER)
  figure(g, body, '#ff8a1f', rng, 0.5, 6, 11)
  const core = smooth([x + long * 0.06, y, x + long * 0.34, y - wide * 0.4, x + long * 0.66, y, x + long * 0.34, y + wide * 0.4], 4)
  solid(g, core, '#ffe14d')
}

function cloud(g: Pen, x: number, y: number, r: number, color: string, seed: number): void {
  const rng = makeRng(seed)
  const puff = smooth([x - r, y, x - r * 0.6, y - r * 0.8, x, y - r * 0.6, x + r * 0.5, y - r, x + r, y - r * 0.2, x + r * 0.7, y + r * 0.6, x, y + r * 0.5, x - r * 0.6, y + r * 0.7], 4)
  solid(g, puff, PAPER)
  figure(g, puff, color, rng, -0.4, 5, 10)
}

/** A puff of flame in its owner's manner, `t` through it: how long, how wide, and how far it has rolled out from the mouth. */
export function flameShape(m: Manner, t: number, big: boolean): { long: number; wide: number; out: number } {
  const size = hump(t)
  return {
    long: (big ? 440 : 210) * (0.3 + 0.7 * size) * m.size * (1 - 0.4 * m.round),
    wide: (big ? 100 : 62) * (0.45 + 0.55 * size) * m.size * (0.7 + 0.8 * m.round),
    out: t * 60 * m.round,
  }
}

/**
 * Where a wriggle runs down a body: from below its open mouth to just above
 * the counter, never past it onto the pizza and never across an eye or the
 * mouth. One customer has its eye up on a stalk and its mouth low, with a
 * bare body between: on it the wriggle runs down the body above the mouth.
 */
export function wriggleRun(a: Anchors): { from: number; to: number } {
  const stalked = a.eye.y + a.eye.r <= a.head.y + 10
  if (stalked) return { from: a.head.y + 22, to: a.mouth.y - 34 }
  return { from: Math.max(a.mouth.y + 26, a.eyesLow + 34, a.belly.y - 20), to: a.counter - 16 }
}

function many(g: Pen, kind: Kind, t: number, big: boolean, a: Anchors, m: Manner): void {
  const rng = makeRng(seedFrom('many' + kind))
  const size = hump(t), k = m.size
  if (t <= 0 || t >= 1) return
  switch (kind) {
    case 'pepper': {
      // One puff of flame from the mouth, in its owner's manner: a thin quick spark, or a slow ball that rolls out. The big one is long and roaring.
      const shape = flameShape(m, t, big)
      flame(g, a.mouth.x + 20 + shape.out, a.mouth.y + 6, shape.long, shape.wide, seedFrom('flame') + Math.floor(t * 9))
      return
    }
    case 'mushroom': {
      // A hiccup: one lumpy puff pops out above the head, and bursts into specks.
      const n = big ? 3 : 1
      for (let i = 0; i < n; i++) {
        const u = Math.min(1, Math.max(0, t * n - i))
        if (u <= 0 || u >= 1) continue
        const x = a.head.x + 56 + i * 58, y = a.head.y - 10 - u * 96
        const r = (20 + u * 30) * k
        cloud(g, x, y, r, '#ffe9a8', seedFrom('hiccup') + i)
        // As it pops, specks fly off it: filled dots, and no strokes fanning out.
        if (u > 0.7) for (let j = 0; j < 5; j++) solid(g, ellipse(x + Math.cos(j * 1.3 + 0.4) * (r + 14 + (u - 0.7) * 60), y + Math.sin(j * 1.3 + 0.4) * (r + 14 + (u - 0.7) * 60), 6 - (j % 2) * 2, 5, 8), '#e0b24a')
      }
      return
    }
    case 'olive':
      // Dizzy: three olive-green dots go round over the head as an eye goes right round. Filled dots, and no line that could curl into a sign.
      for (let i = 0; i < (big ? 3 : 1); i++) {
        const cx = a.head.x + (i - (big ? 1 : 0)) * 96, cy = a.head.y - 52, w = 44 * k, h = 18 * k
        for (let d = 0; d < 3; d++) {
          const turn = t * Math.PI * 2 + d * 2.1
          solid(g, ellipse(cx + Math.cos(turn) * w, cy + Math.sin(turn) * h, 9 - d * 2, 9 - d * 2, 10), '#4d7a2a')
        }
      }
      return
    case 'cheese': {
      // A string of cheese from the mouth to the pizza: it stretches, sags, and twangs back.
      const n = big ? 4 : 1
      for (let i = 0; i < n; i++) {
        // Far too many is a harp of strings: all from one spot at the mouth, fanning out wide over the pizza, and no two side by side.
        const sx = a.mouth.x, px = a.pizza.x + (i - (n - 1) / 2) * 84, py = a.pizza.y - a.pizza.r * (0.5 - 0.12 * Math.abs(i - (n - 1) / 2))
        const reach = t < 0.7 ? 1 : 1 - (t - 0.7) / 0.3
        const ex = sx + (px - sx) * reach, ey = a.mouth.y + (py - a.mouth.y) * reach
        const sag = 26 * k * Math.sin(t * Math.PI * 6 + i * 1.3) * (1 - t)
        // It hangs in a bow to one side and swings: a string, and never a straight bar. The bow is drawn through many
        // points and goes slack with the string as it twangs back, so it is a curve to the end and never folds into a corner.
        const bow = (34 * k + sag) * reach, string: number[] = []
        for (let s = 0; s <= 6; s++) {
          const q = s / 6
          string.push(sx + (ex - sx) * q + bow * Math.sin(q * Math.PI), a.mouth.y + 10 + (ey - a.mouth.y - 10) * q + 10 * reach * Math.sin(q * Math.PI))
        }
        line(g, string, rng, 11 * (0.6 + 0.4 * k), '#f2b90f')
      }
      return
    }
    case 'sock': {
      // One stink cloud rises from the pizza to the nose. The big one is a cloud that hides the monster.
      const u = Math.min(1, t * 1.3)
      const x = a.pizza.x + Math.sin(t * 8) * 10, y = a.pizza.y - a.pizza.r * 0.6 - u * (a.pizza.y - a.mouth.y - 20)
      cloud(g, x, y, (big ? 190 : 50) * (0.5 + 0.5 * size) * (big ? 1 : k), '#a9c44a', seedFrom('stink'))
      return
    }
    case 'worm': {
      // One wriggle runs down its body, fat and pink as the worm that caused it. The big one is three, one after another and never two at once.
      const n = big ? 3 : 1, u = (t * n) % 1
      const run = wriggleRun(a)
      const y = run.from + u * (run.to - run.from)
      const w = a.halfWidth * 0.82, up = 24 * k
      const wriggle = [a.mouth.x - w, y, a.mouth.x - w * 0.66, y - up, a.mouth.x - w * 0.33, y + up, a.mouth.x, y - up, a.mouth.x + w * 0.33, y + up, a.mouth.x + w * 0.66, y - up, a.mouth.x + w, y]
      line(g, wriggle, rng, 16, INK)
      line(g, wriggle, rng, 9, '#ff8fb4')
    }
  }
}

/**
 * A piece that is missing: the tummy rumbles, which is heard and shakes its
 * funniest part, and the customer mimes the kind it has not got, towards
 * that kind's tub, in its own manner. The hand and the body are moved by the
 * scene (`fewHand`, `fewAct` in
 * scenes.ts); what the mime needs drawn is drawn here.
 */
function few(g: Pen, kind: Kind, t: number, a: Anchors, m: Manner): void {
  // Nothing of a mime is left standing before its beat or after it.
  if (t <= 0 || t >= 1) return
  const rng = makeRng(seedFrom('few' + kind))
  const k = m.size
  const size = hump(t), beat = Math.sin(t * Math.PI * 10)
  switch (kind) {
    case 'pepper':
      // It fans its open mouth: small puffs of moved air blow off the fanning hand, each smaller than the last.
      for (let i = 0; i < 3; i++) {
        const u = (t * 4 + i * 0.33) % 1
        g.save()
        g.globalAlpha = (1 - u) * size
        solid(g, ellipse(a.mouth.x - 112 - u * 70 * k - beat * 4, a.mouth.y - 12 + i * 22 - u * 10, (15 - i * 3) * k, (10 - i * 2) * k, 10), '#bfdcee')
        g.restore()
      }
      return
    case 'mushroom':
      // It sniffs the board like a pig after truffles: motes off the board are drawn up into its nose, one after another.
      for (let i = 0; i < 4; i++) {
        const u = (t * 5 + i * 0.25) % 1
        const x = a.mouth.x + (i - 1.5) * 26 * (1 - u * 0.7), y = a.mouth.y + 84 - u * 62
        g.save()
        g.globalAlpha = Math.max(0, 1 - u) * size
        solid(g, ellipse(x, y, (7 - u * 3) * k, (6 - u * 2) * k, 8), '#c9a27a')
        g.restore()
      }
      return
    case 'olive': {
      // It peers through an olive-sized ring of its fingers: five knuckles round the eye, never a drawn circle.
      const r = a.eye.r * 0.8 + 6
      for (let i = 0; i < 5; i++) {
        const turn = 2.2 + i * 1.08
        plain(g, ellipse(a.eye.x + Math.cos(turn) * r * size, a.eye.y + Math.sin(turn) * r * size, 13, 11, 10), a.body, 4)
      }
      return
    }
    case 'cheese': {
      // It plucks a string that is not there: a row of dots that bows with the pull and shivers when the hand lets go.
      const pull = (t * 3) % 1, shiver = pull > 0.7 ? Math.sin((pull - 0.7) * 70) * 10 * (1 - pull) / 0.3 : (pull / 0.7) * 14
      const x = a.mouth.x - a.halfWidth * 0.3 - 40, top = a.mouth.y - 10, low = a.counter - 8
      g.save()
      g.globalAlpha = 0.8 * size + 0.1
      for (let i = 0; i < 8; i++) {
        const y = top + ((low - top) * (i + 0.5)) / 8, bow = shiver * Math.sin(((i + 0.5) / 8) * Math.PI)
        solid(g, ellipse(x + bow, y, 5, 5, 8), '#f2b90f')
      }
      g.restore()
      return
    }
    case 'sock': {
      // It lifts one bare foot over the counter and wiggles its toes at the tub.
      const up = Math.min(1, size * 1.5)
      const x = a.belly.x - a.halfWidth - 34, y = a.counter - 26 - up * 84 * (0.7 + 0.3 * k)
      // The leg is a fat limb in its own colour, wide enough that nothing behind it shows as a line across it: an arm and a leg must never make two bars that cross.
      const rx = a.belly.x - a.halfWidth * 0.62
      plain(g, smooth([rx - 20, a.counter + 10, x + 6, y + 30, x + 8, y + 2, x + 38, y + 6, x + 44, y + 40, rx + 22, a.counter + 10], 4), a.body, 6)
      plain(g, smooth([x + 30, y + 16, x + 26, y - 12, x - 20, y - 20, x - 46, y - 6, x - 44, y + 14, x - 10, y + 22], 4), a.body, 6)
      for (let i = 0; i < 4; i++) {
        const wiggle = Math.sin(t * Math.PI * 14 + i * 1.7) * 6 * up
        plain(g, ellipse(x - 46 + i * 11 - 4, y - 15 - i * 3 + wiggle, 8 - i * 0.6, 9, 10), a.body, 4)
      }
      return
    }
    case 'worm': {
      // Its tongue wriggles like a worm towards the tub.
      const long = 150 * size * (0.7 + 0.3 * k), tongue: number[] = []
      for (let i = 0; i <= 6; i++) {
        const k = i / 6
        tongue.push(a.mouth.x - 10 - k * long, a.mouth.y + 18 + k * long * 0.34 + Math.sin(t * Math.PI * 12 - k * 7) * 15 * k)
      }
      line(g, tongue, rng, 15, INK)
      line(g, tongue, rng, 9, '#ff7d9c')
    }
  }
}

/** What a piece fed by hand does, by kind. */
function fed(g: Pen, kind: Kind, t: number, a: Anchors, k = 1): void {
  if (t <= 0 || t >= 1) return
  const rng = makeRng(seedFrom('fed' + kind))
  const look = LOOKS[kind]
  switch (kind) {
    case 'pepper':
      // The cheeks glow, and one spark pops out of an ear.
      for (const side of [-1, 1]) figure(g, ellipse(a.mouth.x + side * a.halfWidth * 0.62, a.mouth.y - 8, 20, 14, 12), '#ff5a4a', rng, 0.3, 4, 8)
      if (t > 0.5) {
        const u = (t - 0.5) / 0.5, x = a.head.x + a.halfWidth * 0.8 + u * 50, y = a.head.y + 40 - u * 40
        // A spark: one small filled tongue of flame that flies off and shrinks, with no rays.
        flame(g, x, y, 34 * k * (1 - u * 0.5), 18 * k * (1 - u * 0.5), seedFrom('spark'))
      }
      return
    case 'mushroom': {
      // A tiny mushroom pops up on its head, then drops off.
      const up = t < 0.7 ? Math.min(1, t / 0.3) : 1, drop = t < 0.7 ? 0 : (t - 0.7) / 0.3
      const x = a.head.x + drop * 60, y = a.head.y - 16 * up + drop * drop * 140
      plain(g, smooth([x - 20, y, x - 14, y - 16, x, y - 22, x + 14, y - 16, x + 20, y, x + 7, y + 2, x + 6, y + 16, x - 6, y + 16, x - 7, y + 2], 3), look.fill, 4)
      return
    }
    case 'olive': {
      // Swallowed whole: the lump travels down to the belly. A filled bump with a line over its top, not a ring.
      const y = a.mouth.y + 24 + t * (a.belly.y - a.mouth.y), x = a.mouth.x + Math.sin(t * 9) * 6
      solid(g, ellipse(x, y, 26 * k, 20 * k, 14), look.fill)
      line(g, [x - 26 * k, y + 4, x - 16 * k, y - 16 * k, x + 16 * k, y - 16 * k, x + 26 * k, y + 4], rng, 6)
      return
    }
    case 'cheese': {
      // One long string, from its mouth to the hand that pulls it out, bent where the other hand plucks it.
      const end = a.hands.free ?? { x: a.mouth.x - a.halfWidth - 60, y: a.mouth.y + 40 }
      const mid = a.hands.card ?? { x: (a.mouth.x + end.x) / 2, y: (a.mouth.y + end.y) / 2 + 10 }
      line(g, [a.mouth.x - 6, a.mouth.y + 8, mid.x, mid.y - 16, end.x, end.y - 6], rng, 7, '#f2b90f')
      return
    }
    case 'sock': {
      // It wears the sock.
      drawWorn(g, a, Math.min(1, t * 2.5))
      return
    }
    case 'worm': {
      // Slurped like spaghetti: it hangs from the mouth and gets shorter, and as the last of it goes in the tail whips up and flicks the nose.
      const left = 1 - Math.min(1, t / 0.7), flick = t < 0.68 ? 0 : hump((t - 0.68) / 0.26)
      const nose = { x: a.mouth.x + 4, y: a.mouth.y - 30 }
      // The flick is the last of the worm as a wavy tail that curls up from the corner of the mouth to the nose: several bends, and no single corner.
      const tail: number[] = []
      for (let i = 0; i <= 7; i++) {
        const s = i / 7, bend = Math.sin(s * Math.PI * 3) * 7 * (1 - s * 0.5)
        tail.push(a.mouth.x + 16 + (nose.x + 4 - a.mouth.x - 16) * s * flick + Math.sin(s * Math.PI) * 26 * flick + bend, a.mouth.y + 4 + (nose.y - a.mouth.y - 4) * s * flick + bend * 0.4)
      }
      const worm = flick > 0
        ? tail
        : [a.mouth.x + 10, a.mouth.y + 6, a.mouth.x + 30 * left + 10, a.mouth.y + 34 * left + Math.sin(t * 20) * 8, a.mouth.x + 14 * left + 10, a.mouth.y + 70 * left]
      line(g, worm, rng, 15, INK)
      line(g, worm, rng, 9, look.fill)
    }
  }
}

/** A bite: crumbs fly from both sides of the mouth and fall. */
function crumbs(g: Pen, t: number, a: Anchors): void {
  const rng = makeRng(seedFrom('crumbs'))
  for (let i = 0; i < 12; i++) {
    const side = i % 2 === 0 ? -1 : 1, out = rng.range(0.5, 1.2), up = rng.range(0.2, 1)
    const x = a.mouth.x + side * (a.halfWidth * 0.3 + t * 150 * out), y = a.mouth.y + 20 - up * 90 * Math.sin(t * Math.PI) + t * t * 120
    g.save()
    g.globalAlpha = 1 - t * t
    solid(g, ellipse(x, y, 6 + (i % 3) * 2, 5 + (i % 2) * 2, 8), i % 3 === 0 ? '#d98b3a' : '#f0c98a')
    g.restore()
  }
}

export function drawEffect(g: Pen, effect: Effect, a: Anchors): number {
  // A puff, a cloud or a wriggle comes when its owner's manner has it come: early and quick, or late and slow. A
  // mime lasts its whole beat for everyone, since the scene moves the hands all through it; its owner's manner is
  // in its size, its body and its voice. A piece fed by hand is quick or slow in its owner's manner by the length
  // of its scene, which is the length of its sound (`handFed` in scenes.ts), and is drawn at its owner's size.
  const m = effect.who ? MANNERS[effect.who] : PLAIN
  if (effect.way === 'many') many(g, effect.kind, through(m, effect.t), effect.big, a, m)
  else if (effect.way === 'few') few(g, effect.kind, effect.t, a, m)
  else if (effect.way === 'fed') fed(g, effect.kind, effect.t, a, m.size)
  else if (effect.way === 'crumbs') crumbs(g, effect.t, a)
  else if (effect.way === 'burp') {
    // A burp in the colours of what it ate: one puff for each kind, each a little further out than the last.
    const kinds = effect.kinds && effect.kinds.length > 0 ? effect.kinds : [effect.kind]
    kinds.forEach((kind, i) => {
      const u = Math.max(0, effect.t - i * 0.12) / (1 - i * 0.12)
      if (u > 0) cloud(g, a.mouth.x + 70 + u * 90 + i * 46, a.mouth.y - u * 80 - i * 34, (34 + u * 40) * (1 - i * 0.14), LOOKS[kind].fill, seedFrom('burp') + i)
    })
  }
  else {
    // Raw dough stuck to the tongue: a band from the pizza that thins as it stretches.
    const rng = makeRng(seedFrom('raw'))
    const w = 30 * (1 - effect.t * 0.75)
    const band = [a.pizza.x - w, a.pizza.y - a.pizza.r * 0.5, a.pizza.x + w, a.pizza.y - a.pizza.r * 0.5, a.mouth.x + w * 0.5, a.mouth.y + 40, a.mouth.x - w * 0.5, a.mouth.y + 40]
    plain(g, band, '#fff4d6', 5, '#d6a85e')
    line(g, [a.pizza.x, a.pizza.y - a.pizza.r * 0.5, a.mouth.x, a.mouth.y + 40], rng, 3, '#d6a85e')
  }
  return 3
}

/** Where a sock is worn: how far to the tubs' side of the middle, as a share of the customer's half width, and how high, as a share of its height; and how far clear of the eye on that side its middle stays, so it never covers an eye. */
export const WORN = { x: 0.8, y: 0.8, clear: 30 } as const

/** A sock pulled onto the head and worn there: `on` 0 off to 1 right on. */
export function drawWorn(g: Pen, a: Anchors, on = 1): void {
  if (on <= 0.02) return
  // Worn on the tubs' side of its head, up where an ear or a horn is: the hand that pulls it on goes up that side and never across the face.
  const x = Math.min(a.head.x - a.halfWidth * WORN.x, a.eye.x - a.eye.r - WORN.clear)
  plain(g, LOOKS.sock.ring.map((v, i) => (i % 2 === 0 ? x + v * 28 * on : a.head.y + a.height * (1 - WORN.y) + v * 28 * on)), LOOKS.sock.fill, 4)
}

/** The tongue, reaching from the mouth down to the pizza: `out` 0 in to 1 on it. */
export function drawTongue(g: Pen, a: Anchors, out: number): void {
  if (out <= 0.02) return
  const tip = { x: a.mouth.x + (a.pizza.x - a.mouth.x) * out, y: a.mouth.y + 16 + (a.pizza.y - a.pizza.r * 0.45 - a.mouth.y - 16) * out }
  const w = 24
  const tongue = smooth([a.mouth.x - w, a.mouth.y + 14, tip.x - w * 0.9, tip.y - 10, tip.x, tip.y + 16, tip.x + w * 0.9, tip.y - 10, a.mouth.x + w, a.mouth.y + 14], 5)
  plain(g, tongue, '#ff7d9c', 6)
}

/** How big each smudge of soot is and how high it sits: round the mouth, and wholly below the eyes. */
export function sootSpot(a: Anchors): { y: number; r: number } {
  const r = a.halfWidth * 0.3
  return { r, y: Math.max(a.mouth.y + 6, a.eyesLow + r + 4) }
}

/** Soot on the face after one big flame: a grey scribble that fades. */
export function drawSoot(g: Pen, a: Anchors, amount: number): void {
  if (amount <= 0.02) return
  g.save()
  g.globalAlpha = Math.min(1, amount) * 0.75
  // Round the mouth and over the cheeks, and never over the eyes: a sooty face still has to blink.
  const spot = sootSpot(a)
  cloud(g, a.mouth.x - a.halfWidth * 0.42, spot.y, spot.r, '#6f6a72', seedFrom('soot'))
  cloud(g, a.mouth.x + a.halfWidth * 0.42, spot.y, spot.r, '#6f6a72', seedFrom('soot') + 1)
  g.restore()
}
