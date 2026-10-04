import { disc, type Ctx } from './paint'

// What a touch leaves behind it. Every answer to a touch is bigger than the
// touch: a clip that bites throws sparks, a part set down raises dust, a
// short leaves soot on the mat for a while, a blown lamp scatters its glass
// and smokes, a finger on the bare mat leaves its print, and what is the old
// hand's jumps when it is touched. Each is a few figures for a moment, drawn
// from its age alone, the same every time.

type P = { x: number; y: number }
export type EffectKind =
  /** A clip bites: a ring, and sparks. */
  | 'bite'
  /** A finger on the bare mat: a ring, and its print left behind. */
  | 'pat'
  /** A flag pops: a flash, puffs of warm air and sparks; and soot left round it. */
  | 'pop' | 'soot'
  /** A lamp blows: a flash and its glass; and a wisp of smoke after. */
  | 'blow' | 'wisp'
  /** A part is set down. */
  | 'dust'
  /** What is the old hand's, touched: crumbs off her plate, screws out of her clutter, tea out of her mug. */
  | 'crumbs' | 'screws' | 'drops'
  /** A lead winding itself back into the coil. */
  | 'wind'
  /** A finger on something plain that is not the mat: a small ring on wood or steel, a little dust off a wall or out of the awning, motes in the air of the lane. */
  | 'knock' | 'plaster' | 'motes'
  /** The toaster throws up its slice; the radio's speaker throbs and its dial lights. */
  | 'toast' | 'radio'
export type Effect = { type: EffectKind; at: P; age: number }

/** How long each lasts, in seconds. */
export const LASTS: Record<EffectKind, number> = { bite: 0.36, pat: 1.8, pop: 0.7, soot: 7, blow: 0.75, wisp: 1.7, dust: 0.36, crumbs: 0.6, screws: 0.7, drops: 0.6, wind: 0.4, knock: 0.3, plaster: 0.7, motes: 0.9, toast: 0.75, radio: 0.8 }

/** What each thing that happens sets off. */
export const SETS_OFF = {
  bite: ['bite'],
  pat: ['pat'],
  pop: ['pop', 'soot'],
  blow: ['blow', 'wisp'],
  down: ['dust'],
  plate: ['crumbs'],
  clutter: ['screws'],
  mug: ['drops'],
  wind: ['wind'],
  wood: ['knock'],
  steel: ['knock'],
  wall: ['plaster'],
  awning: ['plaster'],
  air: ['motes'],
  toaster: ['toast'],
  radio: ['radio'],
} as const satisfies Record<string, readonly EffectKind[]>

/** A number from 0 to 1 that is always the same for the same `i`: the scatter of a puff or a spray. */
const scatter = (i: number) => {
  const s = Math.sin(i * 127.1 + 311.7) * 43758.5453
  return s - Math.floor(s)
}

/** Things thrown up from a point that fall back: `count` of them, each drawn by `piece` at where it has got to. */
function spray(count: number, at: P, t: number, reach: number, rise: number, piece: (x: number, y: number, i: number) => void): void {
  for (let i = 0; i < count; i++) {
    const a = -Math.PI * (0.15 + 0.7 * scatter(i)), far = reach * (0.5 + 0.5 * scatter(i + 9))
    piece(at.x + Math.cos(a) * far * t, at.y + Math.sin(a) * far * t * 0.6 - rise * 4 * t * (1 - t) * (0.6 + 0.4 * scatter(i + 3)), i)
  }
}

/** Short bright dashes, flung out and gone. */
function sparks(c: Ctx, x: number, y: number, t: number): void {
  c.strokeStyle = `rgba(255, 236, 170, ${1 - t})`
  c.lineWidth = 2.6
  c.lineCap = 'round'
  c.beginPath()
  for (let i = 0; i < 7; i++) {
    const a = scatter(i) * Math.PI * 2, from = 14 + t * 34 * (0.6 + scatter(i + 5)), to = from + 9 * (1 - t)
    c.moveTo(x + Math.cos(a) * from, y + Math.sin(a) * from)
    c.lineTo(x + Math.cos(a) * to, y + Math.sin(a) * to)
  }
  c.stroke()
}

/** Draw every effect. Returns how many it drew. */
export function paintEffects(c: Ctx, effects: readonly Effect[]): number {
  for (const effect of effects) {
    const t = Math.min(1, effect.age / LASTS[effect.type]), { x, y } = effect.at
    switch (effect.type) {
      case 'bite': {
        const ring = Math.min(1, effect.age / 0.26)
        if (ring < 1) {
          c.strokeStyle = `rgba(255, 255, 255, ${0.9 * (1 - ring)})`
          c.lineWidth = 5 * (1 - ring) + 1
          c.beginPath()
          c.arc(x, y, 16 + ring * 30, 0, Math.PI * 2)
          c.stroke()
        }
        sparks(c, x, y, t)
        break
      }
      case 'pat': {
        const ring = Math.min(1, effect.age / 0.28)
        if (ring < 1) {
          c.strokeStyle = `rgba(120, 130, 140, ${0.55 * (1 - ring)})`
          c.lineWidth = 3
          c.beginPath()
          c.arc(x, y, 10 + ring * 30, 0, Math.PI * 2)
          c.stroke()
        }
        // The print of a finger on the mat, fading: a soft smudge the shape of a fingertip, with no line in it.
        c.fillStyle = `rgba(236, 240, 243, ${0.3 * (1 - t) * (1 - t)})`
        c.beginPath()
        c.ellipse(x, y, 10, 13, 0.3, 0, Math.PI * 2)
        c.fill()
        c.beginPath()
        c.ellipse(x + 1, y - 2, 6, 8, 0.3, 0, Math.PI * 2)
        c.fill()
        break
      }
      case 'pop': {
        const flash = effect.age / 0.16
        if (flash < 1) disc(c, x, y, 30 + flash * 50, `rgba(255, 240, 200, ${0.7 * (1 - flash)})`)
        for (let i = 0; i < 7; i++) {
          const a = (i / 7) * Math.PI * 2 + 0.4
          disc(c, x + Math.cos(a) * (22 + t * 84), y + Math.sin(a) * (16 + t * 62) - t * 14, 15 * (1 - t) + 5, `rgba(244, 246, 248, ${0.85 * (1 - t)})`)
        }
        if (effect.age < 0.4) sparks(c, x, y, effect.age / 0.4)
        break
      }
      case 'soot': {
        // Soot thrown out round where it popped, on whatever it landed on. It is a long time going.
        const fade = t < 0.6 ? 1 : (1 - t) / 0.4
        c.strokeStyle = `rgba(40, 36, 34, ${0.34 * fade})`
        c.lineWidth = 4
        c.lineCap = 'round'
        c.beginPath()
        for (let i = 0; i < 9; i++) {
          const a = (i / 9) * Math.PI * 2 + scatter(i) * 0.5, from = 40 + scatter(i + 2) * 12, to = from + 10 + scatter(i + 4) * 18
          c.moveTo(x + Math.cos(a) * from, y + Math.sin(a) * from * 0.8)
          c.lineTo(x + Math.cos(a) * to, y + Math.sin(a) * to * 0.8)
        }
        c.stroke()
        break
      }
      case 'blow': {
        const flash = effect.age / 0.35
        if (flash < 1) disc(c, x, y, 24 + flash * 60, `rgba(255, 250, 230, ${0.9 * (1 - flash)})`)
        c.fillStyle = `rgba(232, 244, 248, ${1 - t * t})`
        spray(6, effect.at, t, 62, 26, (px, py, i) => {
          c.beginPath()
          c.moveTo(px, py - 5)
          c.lineTo(px + 4 + scatter(i) * 3, py + 3)
          c.lineTo(px - 4, py + 2)
          c.closePath()
          c.fill()
        })
        break
      }
      case 'wisp':
        c.strokeStyle = `rgba(90, 92, 96, ${0.4 * (1 - t)})`
        c.lineWidth = 3 + t * 7
        c.lineCap = 'round'
        c.beginPath()
        c.moveTo(x, y - 8 - t * 20)
        c.bezierCurveTo(x + 12, y - 24 - t * 40, x - 12, y - 40 - t * 60, x + 6 * Math.sin(t * 5), y - 56 - t * 80)
        c.stroke()
        break
      case 'dust':
        // A ring of dust from under a thing set down, and a few motes with it.
        c.strokeStyle = `rgba(236, 240, 243, ${0.6 * (1 - t)})`
        c.lineWidth = 3 * (1 - t) + 1
        c.beginPath()
        c.ellipse(x, y + 4, 24 + t * 30, 14 + t * 16, 0, 0, Math.PI * 2)
        c.stroke()
        for (let i = 0; i < 4; i++) disc(c, x + (scatter(i) - 0.5) * (60 + t * 50), y + 6 + (scatter(i + 7) - 0.5) * 30 - t * 10, 2.4 * (1 - t) + 0.6, `rgba(236, 240, 243, ${0.7 * (1 - t)})`)
        break
      case 'wind':
        // Three turns of a lead drawing in on the coil, each smaller than the last.
        c.lineWidth = 5 * (1 - t) + 1
        for (let turn = 0; turn < 3; turn++) {
          c.strokeStyle = ['rgba(214, 69, 60, ', 'rgba(239, 192, 47, ', 'rgba(60, 127, 208, '][turn] + `${0.8 * (1 - t)})`
          c.beginPath()
          c.ellipse(x, y, (62 - turn * 9) * (1 - t * 0.7), (50 - turn * 8) * (1 - t * 0.7), t * 5 + turn, 0.4, Math.PI * 1.7)
          c.stroke()
        }
        break
      case 'knock':
        // Knuckles on wood or steel: a small pale ring that is gone at once. No print: only the mat takes one.
        c.strokeStyle = `rgba(255, 255, 255, ${0.6 * (1 - t)})`
        c.lineWidth = 3 * (1 - t) + 1
        c.beginPath()
        c.ellipse(x, y, 9 + t * 20, 7 + t * 15, 0, 0, Math.PI * 2)
        c.stroke()
        break
      case 'plaster':
        // A little dust shaken off the boards, or out of the awning's canvas, falling.
        for (let i = 0; i < 5; i++) disc(c, x + (scatter(i) - 0.5) * 34, y + 4 + t * (18 + scatter(i + 4) * 26), 1.4 + scatter(i + 2) * 1.6, `rgba(244, 246, 244, ${0.9 * (1 - t)})`)
        break
      case 'motes':
        // Dust in the sun of the lane, stirred, drifting up.
        for (let i = 0; i < 5; i++) disc(c, x + (scatter(i) - 0.5) * 40 + Math.sin(t * 4 + i) * 4, y + (scatter(i + 5) - 0.5) * 26 - t * 18, 1.2 + scatter(i + 2) * 1.4, `rgba(255, 252, 236, ${0.85 * Math.sin(t * Math.PI)})`)
        break
      case 'toast': {
        // The slice it has had in it all this time: up out of the slot, a turn in the air, and back down the same slot.
        // `at` is where it sits inside the toaster, a little below the slot: only what is above the slot shows.
        const up = Math.sin(t * Math.PI), py = y - up * 24
        c.save()
        c.beginPath()
        c.rect(x - 20, y - 90, 40, 80)
        c.clip()
        c.translate(x, py)
        c.rotate(Math.sin(t * Math.PI * 2) * 0.25 * up)
        c.fillStyle = '#c99657'
        c.beginPath()
        c.moveTo(-7, 9)
        c.lineTo(-7, -4)
        c.quadraticCurveTo(-8, -10, 0, -10)
        c.quadraticCurveTo(8, -10, 7, -4)
        c.lineTo(7, 9)
        c.closePath()
        c.fill()
        c.fillStyle = '#e9c58c'
        c.fillRect(-4.5, -5.5, 9, 12)
        c.restore()
        break
      }
      case 'radio': {
        // Its speaker throbs, and the dial beside it lights for as long as it has the tune.
        const throb = Math.abs(Math.sin(effect.age * 26)) * (1 - t)
        disc(c, x, y, 11 + throb * 4, `rgba(176, 124, 104, ${0.75 * (1 - t) + 0.2})`)
        disc(c, x, y, 4 + throb * 3, `rgba(120, 82, 68, ${0.8 * (1 - t)})`)
        disc(c, x + 25, y - 6, 5, `rgba(255, 226, 130, ${1 - t * t})`)
        break
      }
      case 'crumbs':
        spray(7, effect.at, t, 46, 22, (px, py, i) => disc(c, px, py, 1.6 + scatter(i) * 1.6, `rgba(201, 143, 76, ${1 - t * t})`))
        break
      case 'drops':
        spray(6, effect.at, t, 44, 30, (px, py, i) => disc(c, px, py, 2 + scatter(i) * 2, `rgba(168, 103, 47, ${1 - t * t})`))
        break
      case 'screws':
        // A few screws jump out of whatever was touched, turn over, and are gone under something.
        c.fillStyle = `rgba(183, 190, 196, ${1 - t * t * t})`
        spray(5, effect.at, t, 58, 34, (px, py, i) => {
          // Six-sided heads, tumbling.
          const turn = t * 9 + i
          c.beginPath()
          for (let side = 0; side < 6; side++) c.lineTo(px + Math.cos(turn + (side * Math.PI) / 3) * 4.4, py + Math.sin(turn + (side * Math.PI) / 3) * 4.4)
          c.closePath()
          c.fill()
        })
        break
    }
  }
  return effects.length
}
