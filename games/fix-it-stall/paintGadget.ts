import { type GadgetKind } from './board'
import { type Lid } from './handback'
import { disc, INK, LEAD_COLOURS, roundRect, type Ctx } from './paint'
import { type Box } from './stage'

// A gadget from the outside, shut: what its owner holds out over the counter
// and takes home. What it does there is exactly what its circuit does: how
// bright, how fast and which way, how loud, and how its lid sits.

/** The colour of each gadget's case, so the open one on the mat and the shut one in its owner's hands are the same thing. */
export const CASE: Record<GadgetKind, { body: string; dark: string }> = {
  'lamp-plain': { body: '#b4443b', dark: '#8c312b' },
  lamp: { body: '#b4443b', dark: '#8c312b' },
  'fan-plain': { body: '#3f7fb5', dark: '#2f6394' },
  fan: { body: '#3f7fb5', dark: '#2f6394' },
  'bell-plain': { body: '#d2a21f', dark: '#a67d12' },
  bell: { body: '#d2a21f', dark: '#a67d12' },
  car: { body: '#3d8f58', dark: '#2b6c40' },
  robot: { body: '#7a6f9b', dark: '#5b5278' },
  sign: { body: '#1d7a4c', dark: '#145a37' },
}

/** What the gadget is doing, as its owner tries it. Levels run 0 to 3; `wind` is negative when a blade turns the wrong way. */
export type Doing = { light: number; wind: number; sound: number; popped: boolean; lid: Lid; on: number; shut: number }

export const QUIET: Doing = { light: 0, wind: 0, sound: 0, popped: false, lid: 'flat', on: 0, shut: 1 }

const kindOf = (gadget: GadgetKind) => gadget.replace('-plain', '') as 'lamp' | 'fan' | 'bell' | 'car' | 'robot' | 'sign'

/** A lens that glows by how much its lamp carries. */
function lens(c: Ctx, x: number, y: number, r: number, light: number): void {
  disc(c, x, y, r + 3, INK.steelDark)
  // Dull red for a little current, warm for as much as it was made for, white and far too wide for too much.
  disc(c, x, y, r, light >= 2.5 ? '#ffffff' : light >= 1.5 ? '#fff0b8' : light > 0.2 ? '#e39a52' : 'rgba(214, 236, 244, 0.9)')
  if (light > 0.2) {
    c.save()
    c.globalCompositeOperation = 'lighter'
    const wide = r * (light >= 2.5 ? 5.2 : light >= 1.5 ? 3 : 1.5)
    const glow = c.createRadialGradient(x, y, 0, x, y, wide)
    glow.addColorStop(0, `rgba(255, 228, 160, ${light >= 2.5 ? 0.85 : light >= 1.5 ? 0.5 : 0.22})`)
    glow.addColorStop(1, 'rgba(255, 200, 100, 0)')
    c.fillStyle = glow
    c.fillRect(x - wide, y - wide, wide * 2, wide * 2)
    c.restore()
  }
  disc(c, x - r * 0.3, y - r * 0.3, r * 0.22, INK.white)
}

/** A blade behind a grille, turning by its motor, with the air it moves: out for a fan that blows, in for one that sucks. */
function blade(c: Ctx, x: number, y: number, r: number, wind: number, seconds: number): void {
  disc(c, x, y, r + 3, INK.steelDark)
  disc(c, x, y, r, '#e9eff2')
  c.save()
  c.translate(x, y)
  c.rotate(seconds * wind * 7)
  c.fillStyle = INK.blade
  for (let b = 0; b < 3; b++) {
    c.rotate((Math.PI * 2) / 3)
    c.beginPath()
    c.ellipse(r * 0.48, 0, r * 0.46, r * 0.2, 0.35, 0, Math.PI * 2)
    c.fill()
  }
  c.restore()
  disc(c, x, y, r * 0.16, INK.steel)
  if (wind === 0) return
  c.strokeStyle = 'rgba(255, 255, 255, 0.75)'
  c.lineWidth = 3
  c.lineCap = 'round'
  for (let i = -1; i <= 1; i++) {
    // Streaks of air below the grille, travelling away from it or toward it.
    const t = (((seconds * wind * 1.4 + i * 0.33) % 1) + 1) % 1
    const from = r * (1.2 + t * 1.4), length = r * 0.5
    c.globalAlpha = 1 - t
    c.beginPath()
    c.moveTo(x + i * r * 0.7, y + from)
    c.lineTo(x + i * r * 0.9, y + from + length)
    c.stroke()
  }
  c.globalAlpha = 1
}

/** A sounder, with the rings of its rasp. */
function sounder(c: Ctx, x: number, y: number, r: number, sound: number, seconds: number): void {
  disc(c, x, y, r + 3, INK.black)
  disc(c, x, y, r, INK.plastic)
  disc(c, x, y, r * 0.24, INK.black)
  if (sound === 0) return
  c.strokeStyle = 'rgba(40, 46, 54, 0.6)'
  c.lineWidth = 2.6
  for (let i = 0; i < sound; i++) {
    const t = (seconds * 3 + i / sound) % 1
    c.globalAlpha = 1 - t
    c.beginPath()
    c.arc(x, y, r * (1.3 + t * 1.5), -0.9, 0.9)
    c.stroke()
    c.beginPath()
    c.arc(x, y, r * (1.3 + t * 1.5), Math.PI - 0.9, Math.PI + 0.9)
    c.stroke()
  }
  c.globalAlpha = 1
}

/** The gadget, shut, filling `box`. `doing` says what it does; `seconds` moves what turns and rings. */
export function paintGadget(c: Ctx, gadget: GadgetKind, box: Box, doing: Doing, seconds: number): void {
  const kind = kindOf(gadget), ink = CASE[gadget], { x, y, w, h } = box
  const on = doing.on, light = doing.light * on, wind = doing.wind * on, sound = doing.sound * on
  // A buzzer at full rasp shakes its case, and a blade far too fast walks it about.
  const shake = (sound >= 3 || Math.abs(wind) >= 3 ? 3 : sound > 0 ? 1 : 0) * Math.sin(seconds * 60)
  c.save()
  c.translate(shake, 0)
  // Leads that would not fit inside trail out from under the lid.
  if (doing.lid !== 'flat' && doing.shut > 0.5) {
    c.lineCap = 'round'
    c.lineWidth = 5
    const tails = doing.lid === 'banded' ? 3 : 1
    for (let i = 0; i < tails; i++) {
      c.strokeStyle = LEAD_COLOURS[i % LEAD_COLOURS.length]
      c.beginPath()
      c.moveTo(x + w * (0.2 + i * 0.3), y + h * 0.5)
      c.quadraticCurveTo(x + w * (0.1 + i * 0.3), y + h * 1.25, x + w * (0.3 + i * 0.28), y + h * 1.2)
      c.stroke()
    }
  }
  roundRect(c, x + 3, y + 6, w, h, h * 0.2)
  c.fillStyle = 'rgba(28, 36, 44, 0.22)'
  c.fill()
  roundRect(c, x, y, w, h, h * 0.2)
  c.fillStyle = ink.body
  c.fill()
  // The lid: a darker plate that sits flat, or stands proud when the mend bulges under it.
  const proud = doing.lid === 'flat' ? 0 : doing.lid === 'bulging' ? 5 : 9
  roundRect(c, x + w * 0.06, y + h * 0.1 - proud * doing.shut, w * 0.88, h * 0.8, h * 0.14)
  c.fillStyle = ink.dark
  c.fill()
  const cx = x + w / 2, cy = y + h / 2 - proud * doing.shut, r = h * 0.3
  if (kind === 'lamp') lens(c, cx, cy, r, light)
  else if (kind === 'fan') blade(c, cx, cy, r, wind, seconds)
  else if (kind === 'bell') sounder(c, cx, cy, r, sound, seconds)
  else if (kind === 'car') {
    // A headlamp at the front and the motor's wheel at the back.
    lens(c, x + w * 0.76, cy, r * 0.8, light)
    blade(c, x + w * 0.3, cy, r * 0.9, wind, seconds)
  } else if (kind === 'robot') {
    // Two eyes that are one lamp, a mouth that is the buzzer, and an arm on the motor.
    lens(c, x + w * 0.36, cy - h * 0.08, r * 0.5, light)
    lens(c, x + w * 0.64, cy - h * 0.08, r * 0.5, light)
    sounder(c, cx, cy + h * 0.22, r * 0.34, sound, seconds)
    c.save()
    c.translate(x + w * 0.96, cy)
    c.rotate(Math.sin(seconds * wind * 5) * 0.9)
    c.strokeStyle = INK.steel
    c.lineWidth = 7
    c.lineCap = 'round'
    c.beginPath()
    c.moveTo(0, 0)
    c.lineTo(w * 0.16, -h * 0.3)
    c.stroke()
    disc(c, w * 0.16, -h * 0.3, 7, INK.red)
    c.restore()
  }
  if (doing.lid === 'banded' && doing.shut > 0.5) {
    // The rubber band that holds a lid that will not shut.
    c.strokeStyle = '#c99a5b'
    c.lineWidth = 6
    c.beginPath()
    c.moveTo(x + w * 0.5 - 12, y - 4)
    c.lineTo(x + w * 0.5 - 6, y + h + 4)
    c.stroke()
  }
  if (doing.popped && on > 0.5) {
    // The cutout's flag, up through a slot in the case.
    c.fillStyle = INK.red
    c.beginPath()
    c.moveTo(x + w * 0.14, y + 2)
    c.lineTo(x + w * 0.14 + 22, y - 12)
    c.lineTo(x + w * 0.14, y - 26)
    c.closePath()
    c.fill()
  }
  c.restore()
}
