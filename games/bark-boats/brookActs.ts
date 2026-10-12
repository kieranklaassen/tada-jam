import { GNOME_HAT_TIP, hold, lerp, type Act, type Anchors } from './acts'
import type { Kind } from './build'
import { LINE } from './layout'
import { TAU, bump, ease, span, type Stage } from './rig'

// The brook grid, first two places: what the reeds and the sprite who blows
// do with each trait of a boat. One act a cell. In these acts `at.home` is
// the seat of the thing the act moves, measured from the keel point, and the
// boat's own motion is `stage.boat`: the act leaves it at `moves` when it is
// over, and the rules then move the boat that far.

export type BrookAct = Act & {
  /** How far along the brook the act has carried the boat when it is over, in stage units; below 0 is downstream. */
  moves: number
  /** The thing aboard the act moves about, drawn where the act puts it. */
  uses?: Kind
  /** The boat is held here when the act is over. This is its pose while it waits, and `frees` plays when a ring comes from behind. */
  holds?(stage: Stage, at: Anchors): void
  frees?: BrookAct
}

const act = (id: string, length: number, moves: number, who: Act['who'], cues: Act['cues'], pose: Act['pose'], more: Partial<BrookAct> = {}): BrookAct => ({ id, length, moves, who, cues, pose, leaves: 'arc', ...more })

/** The boat carried evenly from where it is to where the act leaves it. */
const carry = (s: Stage, a: Anchors, moves: number, k: number, from = 0, to = 1): void => {
  s.boat.dx = moves * a.gain * ease(k, from, to)
}

// --- The reeds ----------------------------------------------------------------

/** A broad sail: the leaf catches in the reed tops; the stems bend and whip it free. A swish and a thwap. */
export const reedsBroad = act('reeds:broad', 1.9, -210, ['boat'], [[0.2, 'swish', 0.8], [1.1, 'thwap']], (k, _t, s, _p, a) => {
  const caught = ease(k, 0.05, 0.5), free = span(k, 0.56, 0.6)
  s.place.bend = caught * (1 - free) - 0.5 * bump(k, 0.6, 0.85)
  s.boat.tilt = 0.22 * caught * (1 - free) - 0.16 * bump(k, 0.6, 0.9)
  s.boat.billow = 0.8 * (1 - free) + 0.4
  s.boat.dx = (-50 * caught - 160 * ease(k, 0.58, 1)) * a.gain
  s.gnome.armL = s.gnome.armR = 0.8 * free
})

/** No sail: it drifts in sideways and stops; the frog swims up behind and pushes it through with his nose. A glug and a grunt. */
export const reedsNoSail = act('reeds:nosail', 3.1, -230, ['boat', 'frog'], [[1, 'glug'], [1.9, 'grunt']], (k, _t, s, _p, a) => {
  const turn = ease(k, 0, 0.22), come = ease(k, 0.24, 0.56), push = ease(k, 0.6, 0.94)
  s.boat.face = 1 - 0.75 * turn * (1 - push)
  s.boat.dx = (-30 * turn - 200 * push) * a.gain
  s.frog.under = 0.55
  // His nose stays on the stern while he pushes.
  s.frog.dx = (a.boat.x + s.boat.dx + 150 - a.frog.x) * come * (1 - span(k, 0.94, 1))
  s.frog.dy = -30 * come
  s.frog.squash = 0.2 * bump(k, 0.58, 0.72)
  s.frog.lidL = s.frog.lidR = 1 - 0.7 * bump(k, 0.6, 0.9)
  s.gnome.turn = come * (1 - span(k, 0.9, 1))
})

/** A pea pod with no sail is narrow: it slips between the stems, and the frog is left looking. A zip. */
export const reedsPod = act('reeds:pod', 1.3, -230, ['boat', 'frog'], [[0.2, 'zip', 0.7]], (k, _t, s, _p, a) => {
  s.place.bend = -0.6 * bump(k, 0.1, 0.8)
  s.frog.under = 0.55
  s.frog.lookX = -1
  s.frog.mouth = 0.6 * bump(k, 0.5, 1)
  carry(s, a, -230, k, 0.05, 0.9)
})

/** Two masts: they comb the reeds and the stems sound one after another. A run of plinks. */
export const reedsTwoMasts = act('reeds:twomasts', 1.6, -200, ['boat'], [[0.2, 'plink', 0.9], [0.42, 'plink', 1], [0.64, 'plink', 1.12], [0.86, 'plink', 1.26], [1.08, 'plink', 1.4]], (k, t, s, _p, a) => {
  s.place.bend = 0.5 * Math.abs(Math.sin((t - 0.2) * TAU * 2.27)) * span(k, 0.1, 0.14) * (1 - span(k, 0.7, 0.8))
  s.boat.tilt = 0.05 * Math.sin(t * TAU * 4.5) * (1 - k)
  carry(s, a, -200, k)
})

/** A pebble aboard: the heavy boat parts the stems, and they close behind it with a slap. A low rustle and a slap. */
export const reedsPebble = act('reeds:pebble', 1.8, -200, ['boat'], [[0.2, 'rustle', 0.6], [1.3, 'slap']], (k, _t, s, _p, a) => {
  s.place.bend = -ease(k, 0.05, 0.4) * (1 - span(k, 0.71, 0.74)) + 0.4 * bump(k, 0.74, 0.95)
  s.boat.dy = 5 * bump(k, 0, 1)
  s.gnome.turn = span(k, 0.72, 0.76)
  carry(s, a, -200, k, 0, 0.8)
})

/** A walnut hull: it bobs from stem to stem like a ball. Hollow knocks, each higher. */
export const reedsWalnut = act('reeds:walnut', 1.9, -200, ['boat'], [[0.2, 'knock', 0.9], [0.6, 'knock', 1.05], [1, 'knock', 1.2], [1.4, 'knock', 1.38]], (k, t, s, _p, a) => {
  const hop = Math.abs(Math.sin((t - 0.2) * TAU * 1.25)) * span(k, 0.06, 0.1) * (1 - span(k, 0.9, 1))
  s.boat.dy = -22 * hop
  s.boat.tilt = 0.3 * Math.sin((t - 0.2) * TAU * 1.25) * (1 - k)
  s.gnome.squash = 0.15 * (1 - hop) * (1 - k)
  s.place.bend = 0.3 * Math.sin((t - 0.2) * TAU * 2.5) * (1 - k)
  carry(s, a, -200, k)
})

/** A berry aboard: a stem brushes it off; it floats alongside and the gnome fishes it back with his hat. A plip and a scoop. */
export const reedsBerry = act('reeds:berry', 2.5, -160, ['boat', 'gnome'], [[0.3, 'plip'], [1.5, 'scoop']], (k, t, s, p, a) => {
  const off = ease(k, 0.06, 0.16), scoop = bump(k, 0.46, 0.76), back = ease(k, 0.62, 0.86)
  carry(s, a, -160, k)
  const bx = a.boat.x + s.boat.dx
  const wx = a.boat.x + a.home.x - 30, wy = LINE + 34 + 4 * Math.sin(t * 8)
  const hx = a.gnome.x + s.boat.dx + GNOME_HAT_TIP.x, hy = a.gnome.y + GNOME_HAT_TIP.y
  s.gnome.hatX = (wx - hx) * scoop
  s.gnome.hatY = (wy - hy + 60) * scoop
  s.gnome.hatTilt = 2.6 * scoop
  s.gnome.lean = 0.5 * scoop
  s.gnome.armL = 0.6 * scoop
  s.place.bend = 0.7 * bump(k, 0, 0.2)
  hold(p, lerp(bx + a.home.x, wx, off * (1 - back)), lerp(a.boat.y + a.home.y, wy, off * (1 - back)) - 70 * bump(k, 0.62, 0.86))
}, { uses: 'berry' })

// --- The sprite who blows -----------------------------------------------------

/** A broad sail: one puff fills it and the boat shoots off, the gnome's hat streaming. A whoomp and a rising whistle. */
export const spriteBroad = act('sprite:broad', 1.7, -470, ['boat', 'sprite', 'gnome'], [[0.35, 'whoomp'], [0.6, 'whistle-up']], (k, _t, s, _p, a) => {
  const puff = span(k, 0.2, 0.24), run = ease(k, 0.22, 1)
  s.sprite.cheeks = 0.3 + 0.7 * ease(k, 0, 0.2) * (1 - 0.8 * span(k, 0.2, 0.7))
  s.sprite.mouth = puff * (1 - span(k, 0.7, 0.9))
  s.sprite.breath = span(k, 0.2, 0.7) * (1 - span(k, 0.9, 1))
  s.sprite.lids = 1 - 0.75 * puff
  s.boat.billow = puff * (1 - 0.3 * span(k, 0.8, 1))
  s.boat.tilt = -0.14 * bump(k, 0.2, 0.6)
  s.boat.dx = -470 * run * run * a.gain
  s.gnome.armL = s.gnome.armR = puff
  s.gnome.mouth = puff
  s.gnome.stream = puff * (1 - 0.5 * span(k, 0.85, 1))
})

/** No sail: she blows and nothing catches; she blows till her cheeks go dark, then pokes it on with one finger. A thin whistle and a pop. */
export const spriteNoSail = act('sprite:nosail', 3, -200, ['boat', 'sprite'], [[0.3, 'whistle-thin'], [1.2, 'whistle-thin', 1.25], [2.2, 'pop']], (k, t, s, _p, a) => {
  const again = ease(k, 0.36, 0.5), near = ease(k, 0.56, 0.7), poke = span(k, 0.72, 0.74), home = ease(k, 0.82, 1)
  s.sprite.cheeks = 1
  s.sprite.dark = again * (1 - near)
  s.sprite.mouth = (1 - near) * (0.7 + 0.3 * Math.sin(t * 30))
  s.sprite.breath = 0.6 * bump(k, 0.08, 0.3) + 0.75 * bump(k, 0.38, 0.56)
  s.sprite.dx = (a.boat.x + 290 - a.sprite.x) * near * (1 - home)
  s.sprite.arm = near * (1 - home)
  s.sprite.lids = 1 - 0.6 * again * (1 - near)
  s.boat.tilt = -0.04 * Math.sin(t * 14) * (1 - near)
  s.boat.dx = -200 * ease(k, 0.73, 1) * a.gain
  s.boat.dy = 6 * bump(k, 0.73, 0.82) * poke
  if (near >= 1) s.sprite.cheeks = 0.3
})

/** Two masts: the front sail takes the puff and the back sail gives it back, so the boat turns in circles and the gnome sways, dizzy. A whirr that goes round. */
export const spriteTwoMasts = act('sprite:twomasts', 2.5, -180, ['boat', 'sprite', 'gnome'], [[0.4, 'whirr', 0.9], [1, 'whirr', 1.05], [1.6, 'whirr', 1.2]], (k, _t, s, _p, a) => {
  const round = ease(k, 0.14, 0.86)
  s.sprite.cheeks = 0.3 + 0.7 * bump(k, 0, 0.6)
  s.sprite.mouth = bump(k, 0.1, 0.7)
  s.sprite.breath = 0.8 * bump(k, 0.1, 0.7)
  s.boat.face = Math.cos(round * TAU * 2)
  s.boat.billow = 0.6 * Math.sin(round * TAU * 2)
  s.gnome.lean = 0.3 * Math.sin(round * TAU * 2 + 1) * (1 - span(k, 0.9, 1))
  s.gnome.lids = 1 - 0.5 * bump(k, 0.2, 1)
  s.gnome.hatTilt = 0.5 * Math.sin(round * TAU * 2)
  carry(s, a, -180, k, 0.5, 1)
})

/**
 * Two masts that do not both carry a sail: her breath has nothing to turn the boat with, and sings in the bare
 * mast like a flute instead; the boat only nods from side to side, and the gnome claps his hands over his ears.
 * A hollow fluting, twice, the second higher.
 */
export const spriteBareMast = act('sprite:baremast', 2.3, -180, ['boat', 'sprite', 'gnome'], [[0.35, 'flute', 1], [1.05, 'flute', 1.19]], (k, t, s, _p, a) => {
  const blown = bump(k, 0.08, 0.34) + bump(k, 0.4, 0.66)
  s.sprite.cheeks = 0.3 + 0.7 * blown
  s.sprite.mouth = blown
  s.sprite.breath = 0.7 * blown
  s.sprite.lids = 1 - 0.3 * bump(k, 0.66, 0.9)
  s.boat.tilt = 0.09 * Math.sin(t * 11) * blown
  s.boat.dy = 3 * Math.sin(t * 11 + 1) * blown
  s.gnome.armL = s.gnome.armR = 0.95 * ease(k, 0.12, 0.2) * (1 - ease(k, 0.72, 0.84))
  s.gnome.hatTilt = -0.3 * blown
  s.gnome.lids = 1 - 0.8 * blown
  carry(s, a, -180, k, 0.55, 1)
})

/** A pebble aboard: she blows and it only nods; she sits on the bow to look at the stone. A puff and a thud. */
export const spritePebble = act('sprite:pebble', 3.1, -150, ['boat', 'sprite'], [[0.3, 'puff'], [1.5, 'thud']], (k, _t, s, _p, a) => {
  const go = ease(k, 0.22, 0.46), sat = span(k, 0.48, 0.5) * (1 - span(k, 0.74, 0.78)), home = ease(k, 0.78, 1)
  s.sprite.cheeks = 0.3 + 0.7 * bump(k, 0, 0.24)
  s.sprite.breath = 0.6 * bump(k, 0.06, 0.24)
  s.sprite.mouth = bump(k, 0.06, 0.24)
  s.sprite.dx = (a.boat.x - 100 - a.sprite.x) * go * (1 - home)
  s.sprite.sink = -50 * sat
  s.sprite.lookY = sat
  s.boat.tilt = -0.05 * bump(k, 0.08, 0.2) - 0.2 * sat
  s.boat.dy = 8 * sat
  s.gnome.armL = s.gnome.armR = -sat
  carry(s, a, -150, k, 0.8, 1)
})

/** A walnut hull: it spins like a top under her breath. A hum that rises. */
export const spriteWalnut = act('sprite:walnut', 2.3, -160, ['boat', 'sprite', 'gnome'], [[0.3, 'hum', 0.8], [0.9, 'hum', 1.1], [1.5, 'hum', 1.4]], (k, _t, s, _p, a) => {
  const spin = ease(k, 0.1, 0.95)
  s.sprite.cheeks = 0.3 + 0.7 * bump(k, 0, 0.8)
  s.sprite.mouth = bump(k, 0.08, 0.8)
  s.sprite.breath = 0.8 * bump(k, 0.08, 0.8)
  s.sprite.lids = 1
  s.boat.face = Math.cos(spin * spin * TAU * 5)
  s.gnome.armL = s.gnome.armR = 0.5 * bump(k, 0.1, 0.95)
  s.gnome.lean = -0.2 * bump(k, 0.1, 0.95)
  s.gnome.hatX = 12 * Math.sin(spin * spin * TAU * 5)
  carry(s, a, -160, k, 0.3, 1)
})

/** A berry aboard: she smells it, blows it off the deck by mistake, catches it and puts it back, pink in the cheeks. A sniff, a puff, a plip. */
export const spriteBerry = act('sprite:berry', 2.7, -120, ['boat', 'sprite'], [[0.5, 'sniff'], [1.1, 'puff', 1.3], [1.9, 'plip']], (k, _t, s, p, a) => {
  const near = ease(k, 0, 0.16), puff = span(k, 0.4, 0.43), caught = span(k, 0.56, 0.6), put = ease(k, 0.62, 0.72), home = ease(k, 0.78, 1)
  const sx = a.boat.x + a.home.x + 170
  s.sprite.dx = (sx - a.sprite.x) * near * (1 - home)
  s.sprite.lids = 1 - 0.8 * bump(k, 0.12, 0.38)
  s.sprite.mouth = bump(k, 0.4, 0.5)
  s.sprite.breath = 0.2 * bump(k, 0.4, 0.5)
  s.sprite.arm = caught * (1 - span(k, 0.74, 0.8))
  s.sprite.cheeks = 0.3 + 0.5 * span(k, 0.6, 0.66)
  const fly = puff * (1 - put)
  carry(s, a, -120, k, 0.82, 1)
  hold(p, a.boat.x + s.boat.dx + a.home.x - 110 * fly, a.boat.y + a.home.y - 60 * fly * (1 - 0.6 * caught))
}, { uses: 'berry' })

/** A feather sail takes half a puff, and it tickles her: she sneezes. A puff and a burst. */
export const spriteFeather = act('sprite:feather', 1.5, -90, ['boat', 'sprite'], [[0.3, 'puff', 1.3], [0.9, 'burst', 1.4]], (k, _t, s, _p, a) => {
  const sneeze = span(k, 0.58, 0.62) * (1 - span(k, 0.62, 1))
  s.sprite.cheeks = 0.3 + 0.5 * bump(k, 0, 0.4)
  s.sprite.breath = 0.4 * bump(k, 0.1, 0.4)
  s.sprite.mouth = bump(k, 0.1, 0.4) + sneeze
  s.sprite.lids = 1 - ease(k, 0.3, 0.56) * (1 - span(k, 0.8, 1))
  s.sprite.sink = 30 * sneeze
  s.sprite.sway = 0.3 * sneeze
  s.boat.billow = 0.5 * bump(k, 0.16, 0.6)
  carry(s, a, -90, k, 0.2, 0.8)
})
