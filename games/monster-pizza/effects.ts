import { LOOKS, type Kind } from './kinds'
import { INK, PAPER, figure, line, outline, plain, solid, type Pen } from './marker'
import { makeRng, seedFrom } from './rng'
import { ellipse, smooth } from './shapes'
import type { Effect } from './staging'

// The reactions, drawn in the look: a puff of flame, a hiccup, strings of
// cheese, a cloud of sock, a burp. Each is a few marker figures drawn fresh
// every frame from a fixed seed, so it grows and fades without boiling.
// They are consequences on the customer's body and in the air round it;
// nothing here rates the pizza.

export type Anchors = {
  mouth: { x: number; y: number }
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

function many(g: Pen, kind: Kind, t: number, big: boolean, a: Anchors): void {
  const rng = makeRng(seedFrom('many' + kind))
  const size = hump(t)
  switch (kind) {
    case 'pepper':
      // One puff of flame from the mouth; the big one is long and roaring.
      flame(g, a.mouth.x + 20, a.mouth.y + 6, (big ? 440 : 210) * (0.3 + 0.7 * size), (big ? 100 : 62) * (0.45 + 0.55 * size), seedFrom('flame') + Math.floor(t * 9))
      return
    case 'mushroom': {
      // A hiccup: a bubble pops out above the head, with the lines a child draws round a pop.
      const n = big ? 3 : 1
      for (let i = 0; i < n; i++) {
        const u = Math.min(1, Math.max(0, t * n - i))
        if (u <= 0 || u >= 1) continue
        const x = a.head.x + 56 + i * 58, y = a.head.y - 10 - u * 96
        const r = 18 + u * 30
        plain(g, ellipse(x, y, r, r, 16), '#fff4d6', 6, INK)
        if (u > 0.7) for (let k = 0; k < 7; k++) line(g, [x + Math.cos(k * 0.9) * (r + 12), y + Math.sin(k * 0.9) * (r + 12), x + Math.cos(k * 0.9) * (r + 34), y + Math.sin(k * 0.9) * (r + 34)], rng, 7, '#b98a5e')
      }
      return
    }
    case 'olive':
      // Dizzy: loops in the air over the head as an eye goes right round.
      for (let i = 0; i < (big ? 3 : 1); i++) {
        const cx = a.head.x + (i - (big ? 1 : 0)) * 96, cy = a.head.y - 52
        const turn = t * Math.PI * 2
        line(g, [cx + Math.cos(turn) * 44, cy + Math.sin(turn) * 18, cx + Math.cos(turn + 1.4) * 44, cy + Math.sin(turn + 1.4) * 18, cx + Math.cos(turn + 2.8) * 44, cy + Math.sin(turn + 2.8) * 18, cx + Math.cos(turn + 4.2) * 32, cy + Math.sin(turn + 4.2) * 13, cx + Math.cos(turn + 5.4) * 18, cy + Math.sin(turn + 5.4) * 8], rng, 8, '#4d7a2a')
      }
      return
    case 'cheese': {
      // A string of cheese from the mouth to the pizza: it stretches, sags, and twangs back.
      const n = big ? 4 : 1
      for (let i = 0; i < n; i++) {
        const sx = a.mouth.x + (i - (n - 1) / 2) * 20, px = a.pizza.x + (i - (n - 1) / 2) * 46, py = a.pizza.y - a.pizza.r * 0.4
        const reach = t < 0.7 ? 1 : 1 - (t - 0.7) / 0.3
        const ex = sx + (px - sx) * reach, ey = a.mouth.y + (py - a.mouth.y) * reach
        const sag = 26 * Math.sin(t * Math.PI * 6) * (1 - t)
        line(g, [sx, a.mouth.y + 10, (sx + ex) / 2 + sag, (a.mouth.y + ey) / 2, ex, ey], rng, 11, '#f2b90f')
      }
      return
    }
    case 'sock': {
      // A stink cloud rises from the pizza to the nose.
      const n = big ? 5 : 2
      for (let i = 0; i < n; i++) {
        const u = Math.min(1, t * 1.3 + i * 0.08)
        const x = a.pizza.x + (i - (n - 1) / 2) * 44 + Math.sin(t * 8 + i) * 10, y = a.pizza.y - a.pizza.r * 0.6 - u * (a.pizza.y - a.mouth.y - 20)
        cloud(g, x, y, (big ? 58 : 42) * (0.5 + 0.5 * size), '#a9c44a', seedFrom('stink') + i)
      }
      return
    }
    case 'worm':
      // A wriggle runs down its body.
      for (let i = 0; i < (big ? 4 : 2); i++) {
        const y = a.mouth.y + 26 + ((t + i * 0.27) % 1) * (a.belly.y - a.mouth.y + 50)
        const w = a.halfWidth * 0.82
        line(g, [a.mouth.x - w, y, a.mouth.x - w * 0.5, y - 24, a.mouth.x, y, a.mouth.x + w * 0.5, y + 24, a.mouth.x + w, y], rng, 11, '#ff8fb4')
      }
  }
}

/** A rumbling tummy: wavy lines over the belly, one set a beat. */
function few(g: Pen, kind: Kind, t: number, big: boolean, a: Anchors): void {
  const rng = makeRng(seedFrom('few' + kind))
  const n = big ? 5 : 3
  for (let i = 0; i < n; i++) {
    const shake = Math.sin(t * Math.PI * 8 + i) * 12
    const y = a.belly.y - 30 + i * 24, w = a.halfWidth * 0.52
    line(g, [a.belly.x - w + shake, y, a.belly.x - w * 0.33 + shake, y - 15, a.belly.x + w * 0.33 + shake, y + 15, a.belly.x + w + shake, y], rng, 9, LOOKS[kind].fill)
  }
}

/** What a piece fed by hand does, by kind. */
function fed(g: Pen, kind: Kind, t: number, a: Anchors): void {
  const rng = makeRng(seedFrom('fed' + kind))
  const look = LOOKS[kind]
  switch (kind) {
    case 'pepper':
      // The cheeks glow, and one spark pops out of an ear.
      for (const side of [-1, 1]) figure(g, ellipse(a.mouth.x + side * a.halfWidth * 0.62, a.mouth.y - 8, 20, 14, 12), '#ff5a4a', rng, 0.3, 4, 8)
      if (t > 0.5) {
        const u = (t - 0.5) / 0.5, x = a.head.x + a.halfWidth * 0.8 + u * 50, y = a.head.y + 40 - u * 40
        for (let k = 0; k < 4; k++) line(g, [x, y, x + Math.cos(k * 1.6) * 16, y + Math.sin(k * 1.6) * 16], rng, 5, '#ff8a1f')
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
      // Swallowed whole: the lump travels down to the belly.
      const y = a.mouth.y + 24 + t * (a.belly.y - a.mouth.y)
      outline(g, ellipse(a.mouth.x + Math.sin(t * 9) * 6, y, 20, 17, 14), rng, 6)
      return
    }
    case 'cheese': {
      // A long string, plucked like a harp.
      const x0 = a.mouth.x - 10, x1 = a.mouth.x + a.halfWidth + 60
      for (let i = 0; i < 3; i++) {
        const y = a.mouth.y + i * 12, pluck = Math.sin(t * Math.PI * (5 + i)) * 12 * (1 - t)
        line(g, [x0, y, (x0 + x1) / 2, y + pluck + 10, x1, a.mouth.y - 40 + i * 6], rng, 5, '#f2b90f')
      }
      return
    }
    case 'sock': {
      // It wears the sock.
      drawWorn(g, a, Math.min(1, t * 2.5))
      return
    }
    case 'worm': {
      // Slurped like spaghetti: the tail flicks its nose.
      const left = 1 - t
      line(g, [a.mouth.x, a.mouth.y + 6, a.mouth.x + 20 * left, a.mouth.y + 30 * left + Math.sin(t * 20) * 8, a.mouth.x + 6 * left, a.mouth.y + 60 * left], rng, 9, look.fill)
    }
  }
}

export function drawEffect(g: Pen, effect: Effect, a: Anchors): number {
  if (effect.way === 'many') many(g, effect.kind, effect.t, effect.big, a)
  else if (effect.way === 'few') few(g, effect.kind, effect.t, effect.big, a)
  else if (effect.way === 'fed') fed(g, effect.kind, effect.t, a)
  else if (effect.way === 'burp') cloud(g, a.mouth.x + 70 + effect.t * 90, a.mouth.y - effect.t * 80, 34 + effect.t * 40, LOOKS[effect.kind].fill, seedFrom('burp'))
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

/** A sock pulled onto the head and worn there: `on` 0 off to 1 right on. */
export function drawWorn(g: Pen, a: Anchors, on = 1): void {
  if (on <= 0.02) return
  plain(g, LOOKS.sock.ring.map((v, i) => (i % 2 === 0 ? a.head.x + a.halfWidth * 0.5 + v * 28 * on : a.head.y - 8 + v * 28 * on)), LOOKS.sock.fill, 4)
}

/** The tongue, reaching from the mouth down to the pizza: `out` 0 in to 1 on it. */
export function drawTongue(g: Pen, a: Anchors, out: number): void {
  if (out <= 0.02) return
  const tip = { x: a.mouth.x + (a.pizza.x - a.mouth.x) * out, y: a.mouth.y + 16 + (a.pizza.y - a.pizza.r * 0.45 - a.mouth.y - 16) * out }
  const w = 24
  const tongue = smooth([a.mouth.x - w, a.mouth.y + 14, tip.x - w * 0.9, tip.y - 10, tip.x, tip.y + 16, tip.x + w * 0.9, tip.y - 10, a.mouth.x + w, a.mouth.y + 14], 5)
  plain(g, tongue, '#ff7d9c', 6)
}

/** Soot on the face after one big flame: a grey scribble that fades. */
export function drawSoot(g: Pen, a: Anchors, amount: number): void {
  if (amount <= 0.02) return
  g.save()
  g.globalAlpha = Math.min(1, amount) * 0.75
  const rng = makeRng(seedFrom('soot'))
  cloud(g, a.mouth.x, a.mouth.y - 30, a.halfWidth * 0.62, '#6f6a72', seedFrom('soot'))
  for (let i = 0; i < 3; i++) line(g, [a.head.x - 30 + i * 30, a.head.y - 10, a.head.x - 24 + i * 30, a.head.y - 44 - i * 6], rng, 5, '#6f6a72')
  g.restore()
}
