// The gnome's crystal cave: a dim, moss-hung corner of the hall. A lantern
// shows a gnome on a log beside a nest of crystals. Touch him or the nest and
// he holds one small crystal out on his palm; it is the child's to take.
// One each visit, always the same kind, and he asks for nothing.

import { clamp, damp, TAU } from '../../kit/math.ts'
import { H, W } from '../../kit/types.ts'
import type { Pointer } from '../../kit/types.ts'
import { blob, brush, candlelit, flame, flicker, glow, grain, makeSprite, mulberry, put, sprig, wobbly } from './art.ts'
import type { G, Rng, Sprite } from './art.ts'
import { lanternBody } from './candle.ts'
import type { Made, Scene, World } from './shared.ts'

const LANTERN = { x: 342, y: 250 }
const GNOME = { x: 742, y: 640 }
const NEST = { x: 516, y: 668 }
// Where his open hand comes to rest when he offers.
const OFFER = { x: 566, y: 520 }
const GROUND = 600

// One small clear crystal standing on (x, y): a tall point and two lesser.
export function drawCrystal(g: G, x: number, y: number, s: number, shine = 0): void {
  g.save()
  g.translate(x, y)
  g.rotate(-0.08)
  for (const [dx, h, w] of [[-s * 0.5, s * 1.0, s * 0.3], [s * 0.46, s * 0.8, s * 0.28], [0, s * 1.7, s * 0.44]] as const) {
    g.beginPath()
    g.moveTo(dx - w, 0)
    g.lineTo(dx - w, -h * 0.7)
    g.lineTo(dx, -h)
    g.lineTo(dx + w, -h * 0.7)
    g.lineTo(dx + w, 0)
    g.closePath()
    g.fillStyle = 'rgba(222,232,248,0.95)'
    g.fill()
    g.beginPath()
    g.moveTo(dx, 0)
    g.lineTo(dx, -h)
    g.lineTo(dx + w, -h * 0.7)
    g.lineTo(dx + w, 0)
    g.closePath()
    g.fillStyle = 'rgba(160,178,224,0.9)'
    g.fill()
    g.beginPath()
    g.moveTo(dx - w, -h * 0.7)
    g.lineTo(dx, -h)
    g.lineTo(dx, -h * 0.55)
    g.closePath()
    g.fillStyle = `rgba(255,255,255,${0.75 + shine * 0.25})`
    g.fill()
  }
  g.restore()
}

function mushroom(g: G, x: number, y: number, s: number): void {
  g.fillStyle = '#eadfc8'
  g.beginPath()
  g.moveTo(x - s * 0.18, y)
  g.quadraticCurveTo(x - s * 0.12, y - s * 0.5, x - s * 0.14, y - s * 0.8)
  g.lineTo(x + s * 0.14, y - s * 0.8)
  g.quadraticCurveTo(x + s * 0.12, y - s * 0.5, x + s * 0.2, y)
  g.closePath()
  g.fill()
  g.fillStyle = '#b43c30'
  g.beginPath()
  g.moveTo(x - s * 0.6, y - s * 0.72)
  g.quadraticCurveTo(x - s * 0.5, y - s * 1.4, x, y - s * 1.42)
  g.quadraticCurveTo(x + s * 0.5, y - s * 1.4, x + s * 0.6, y - s * 0.72)
  g.quadraticCurveTo(x, y - s * 0.86, x - s * 0.6, y - s * 0.72)
  g.fill()
  g.fillStyle = 'rgba(250,240,226,0.9)'
  for (const [dx, dy, r] of [[-0.3, -1.0, 0.07], [0.06, -1.2, 0.08], [0.32, -0.98, 0.06], [-0.06, -0.92, 0.05]] as const) {
    g.beginPath()
    g.arc(x + dx * s, y + dy * s, r * s, 0, TAU)
    g.fill()
  }
}

function paintCave(g: G): void {
  const rng = mulberry(1907)
  // The back of the cave: dark, damp colours laid over each other.
  g.fillStyle = '#2c3a36'
  g.fillRect(0, 0, W, H)
  for (let i = 0; i < 150; i++) {
    blob(g, rng() * W, rng() * H, 80 + rng() * 180, [[52, 74, 62], [38, 52, 58], [70, 80, 56], [60, 48, 44]][Math.floor(rng() * 4)] as [number, number, number], 0.12 + rng() * 0.12)
  }
  brush(g, 0, 0, W, H, rng, 200, 1.1, 0.5, 110)
  // Rock: big rounded shoulders closing the cave in on both sides and above.
  const rock = (x: number, y: number, rx: number, ry: number, tone: string) => {
    wobbly(g, x, y, rx, ry, rng, 0.12, 14)
    g.fillStyle = tone
    g.fill()
  }
  rock(-40, 300, 240, 420, '#3d3a36')
  rock(60, 60, 300, 170, '#46423c')
  rock(1220, 280, 250, 440, '#3a3834')
  rock(1080, 30, 320, 160, '#45413b')
  rock(600, -40, 520, 130, '#3f3c37')
  rock(1010, 470, 110, 200, '#4a4640')
  g.save()
  g.globalAlpha = 0.5
  brush(g, 0, 0, W, 260, rng, 150, 0.4, 1, 80)
  brush(g, 0, 0, 240, H, rng, 90, 1.3, 1, 80)
  brush(g, 960, 0, 220, H, rng, 90, 1.7, 1, 80)
  g.restore()

  // The ground: soft moss in mounds.
  const moss = (x: number, y: number, rx: number, ry: number, c: string) => {
    wobbly(g, x, y, rx, ry, rng, 0.1, 14)
    g.fillStyle = c
    g.fill()
  }
  moss(300, 790, 520, 200, '#52683a')
  moss(900, 800, 520, 210, '#4a6038')
  moss(600, 820, 420, 170, '#5d7440')
  moss(120, 700, 220, 110, '#4d6238')
  moss(1090, 690, 200, 100, '#546a3c')
  g.save()
  g.beginPath()
  g.rect(0, GROUND - 30, W, H)
  g.clip()
  for (let i = 0; i < 1400; i++) {
    const x = rng() * W
    const y = GROUND + rng() * (H - GROUND)
    g.strokeStyle = rng() < 0.5 ? `rgba(120,150,80,${0.25 + rng() * 0.3})` : `rgba(40,60,34,${0.25 + rng() * 0.3})`
    g.lineWidth = 1.6
    g.beginPath()
    g.moveTo(x, y)
    g.lineTo(x + (rng() - 0.5) * 6, y - 4 - rng() * 7)
    g.stroke()
  }
  g.restore()

  // Moss and roots hanging from the roof.
  for (let i = 0; i < 70; i++) {
    const x = rng() * W
    const y0 = 20 + rng() * 90 + Math.abs(x - 590) * 0.06
    const len = 40 + rng() * 120
    g.strokeStyle = `rgba(${70 + rng() * 50},${100 + rng() * 50},${60 + rng() * 30},${0.6 + rng() * 0.3})`
    g.lineWidth = 2 + rng() * 3
    g.beginPath()
    g.moveTo(x, y0)
    g.quadraticCurveTo(x + (rng() - 0.5) * 30, y0 + len * 0.6, x + (rng() - 0.5) * 20, y0 + len)
    g.stroke()
  }
  for (let i = 0; i < 16; i++) sprig(g, 40 + rng() * 1100, 30 + rng() * 60, 60 + rng() * 40, Math.PI / 2 + (rng() - 0.5) * 0.8, rng, 0.9 + rng() * 0.3, true)
  for (const [rx, ry, len] of [[220, 40, 190], [520, 10, 120], [870, 30, 170]] as const) {
    g.strokeStyle = '#5a4030'
    g.lineWidth = 7
    g.beginPath()
    g.moveTo(rx, ry)
    g.bezierCurveTo(rx + 30, ry + len * 0.4, rx - 20, ry + len * 0.7, rx + 14, ry + len)
    g.stroke()
  }

  // The lantern hangs from a root.
  g.strokeStyle = 'rgba(30,20,16,0.9)'
  g.lineWidth = 2.5
  g.beginPath()
  g.moveTo(LANTERN.x, 110)
  g.lineTo(LANTERN.x, LANTERN.y - 50)
  g.stroke()

  // Stones, mushrooms, and crystals growing where they will.
  for (const [x, y, rx, ry] of [[250, 650, 60, 34], [960, 660, 76, 40], [396, 716, 34, 18], [1090, 730, 48, 24]] as const) {
    wobbly(g, x, y, rx, ry, rng, 0.12, 10)
    g.fillStyle = '#6a6862'
    g.fill()
    g.save()
    g.clip()
    g.fillStyle = 'rgba(255,240,210,0.16)'
    g.fillRect(x - rx, y - ry, rx * 2, ry * 0.8)
    g.restore()
  }
  mushroom(g, 304, 640, 44)
  mushroom(g, 348, 656, 28)
  mushroom(g, 980, 636, 36)
  mushroom(g, 1100, 716, 26)
  for (const [x, y, s] of [[214, 628, 12], [1016, 648, 14], [900, 742, 11], [432, 746, 10]] as const) drawCrystal(g, x, y, s)

  // The log he sits on.
  g.fillStyle = 'rgba(20,14,10,0.35)'
  g.beginPath()
  g.ellipse(GNOME.x + 20, GNOME.y + 26, 170, 20, 0, 0, TAU)
  g.fill()
  g.fillStyle = '#6e4a30'
  g.beginPath()
  g.roundRect(GNOME.x - 130, GNOME.y - 40, 300, 66, 30)
  g.fill()
  g.save()
  g.clip()
  brush(g, GNOME.x - 130, GNOME.y - 40, 300, 66, rng, 40, 0, 1, 80)
  g.restore()
  g.fillStyle = '#b98852'
  g.beginPath()
  g.ellipse(GNOME.x - 122, GNOME.y - 7, 16, 32, 0, 0, TAU)
  g.fill()
  g.strokeStyle = 'rgba(110,66,34,0.5)'
  g.lineWidth = 1.5
  for (const r of [0.35, 0.7]) {
    g.beginPath()
    g.ellipse(GNOME.x - 122, GNOME.y - 7, 16 * r, 32 * r, 0, 0, TAU)
    g.stroke()
  }

  // The nest: a hollow of moss lined with a scrap of wool.
  moss(NEST.x, NEST.y + 6, 92, 34, '#40552e')
  g.fillStyle = '#e6dcc6'
  g.beginPath()
  g.ellipse(NEST.x, NEST.y, 66, 20, 0, 0, TAU)
  g.fill()

  candlelit(
    g,
    W,
    H,
    [
      { x: LANTERN.x, y: LANTERN.y, r: 470 },
      { x: 640, y: 600, r: 420, lift: 0.85 },
      { x: 160, y: 680, r: 240, lift: 0.6 },
    ],
    'rgba(14,16,30,0.62)',
    0.16,
  )
  grain(g, 0, 0, W, H, 2600, rng, 0.04, 0.03)
}

// The gnome, sitting, drawn round his seat at (x, y). `reach` 0..1 holds his
// near hand out; `nod` tips his head; `look` -1..1 turns his eyes.
function drawGnome(g: G, x: number, y: number, breathe: number, reach: number, nod: number, look: number, blink: number): void {
  // Boots.
  g.fillStyle = '#3a2a22'
  g.beginPath()
  g.ellipse(x - 52, y + 22, 30, 15, -0.1, 0, TAU)
  g.ellipse(x + 26, y + 26, 30, 15, 0.1, 0, TAU)
  g.fill()
  // Legs.
  g.fillStyle = '#51623c'
  g.beginPath()
  g.roundRect(x - 68, y - 34, 40, 58, 14)
  g.roundRect(x + 6, y - 30, 40, 58, 14)
  g.fill()
  // The tunic: a soft brown bell.
  const by = y - 40
  g.fillStyle = '#8a5c38'
  g.beginPath()
  g.moveTo(x - 60, by - 150 - breathe)
  g.quadraticCurveTo(x - 4, by - 176 - breathe, x + 54, by - 150 - breathe)
  g.quadraticCurveTo(x + 96, by - 60, x + 86, by + 12)
  g.quadraticCurveTo(x - 4, by + 34, x - 92, by + 12)
  g.quadraticCurveTo(x - 100, by - 60, x - 60, by - 150 - breathe)
  g.fill()
  g.save()
  g.clip()
  g.fillStyle = 'rgba(40,20,12,0.2)'
  g.fillRect(x + 20, by - 190, 120, 240)
  g.restore()
  // A belt.
  g.strokeStyle = '#4a3022'
  g.lineWidth = 9
  g.beginPath()
  g.moveTo(x - 88, by - 36)
  g.quadraticCurveTo(x - 4, by - 14, x + 86, by - 36)
  g.stroke()

  // The far arm rests on his knee.
  g.strokeStyle = '#7a5030'
  g.lineWidth = 30
  g.lineCap = 'round'
  g.beginPath()
  g.moveTo(x + 58, by - 120 - breathe)
  g.quadraticCurveTo(x + 84, by - 70, x + 44, by - 26)
  g.stroke()
  g.fillStyle = '#e8bf9a'
  g.beginPath()
  g.arc(x + 42, by - 22, 15, 0, TAU)
  g.fill()

  // The head: hat, face and beard, tipped a little as he nods.
  g.save()
  g.translate(x - 4, by - 160 - breathe)
  g.rotate(nod * 0.12 - reach * 0.06)
  g.fillStyle = '#e8bf9a'
  g.beginPath()
  g.arc(0, -30, 50, 0, TAU)
  g.fill()
  // Beard: white wool.
  g.fillStyle = '#f2ece0'
  g.beginPath()
  g.moveTo(-52, -26)
  g.quadraticCurveTo(-64, 40, -22, 84)
  g.quadraticCurveTo(-4, 104, 12, 84)
  g.quadraticCurveTo(58, 44, 52, -26)
  g.quadraticCurveTo(30, 6, 0, -4)
  g.quadraticCurveTo(-30, 6, -52, -26)
  g.fill()
  g.strokeStyle = 'rgba(170,160,150,0.4)'
  g.lineWidth = 2
  for (const k of [-0.5, -0.1, 0.3]) {
    g.beginPath()
    g.moveTo(k * 50, 10)
    g.quadraticCurveTo(k * 56, 44, k * 30 + 2, 76)
    g.stroke()
  }
  // Nose, eyes, a hint of cheek.
  g.fillStyle = '#dca482'
  g.beginPath()
  g.arc(0, -14, 12, 0, TAU)
  g.fill()
  g.fillStyle = 'rgba(214,112,92,0.25)'
  g.beginPath()
  g.arc(-28, -16, 10, 0, TAU)
  g.arc(28, -16, 10, 0, TAU)
  g.fill()
  g.fillStyle = '#3c2a22'
  const open = 1 - blink
  g.beginPath()
  g.ellipse(-18 + look * 3, -34, 4.4, 4.4 * Math.max(0.15, open), 0, 0, TAU)
  g.ellipse(18 + look * 3, -34, 4.4, 4.4 * Math.max(0.15, open), 0, 0, TAU)
  g.fill()
  // The hat: tall red felt, its tip nodding over.
  g.fillStyle = '#a8382e'
  g.beginPath()
  g.moveTo(-58, -48)
  g.quadraticCurveTo(-30, -150, 16, -214)
  g.quadraticCurveTo(44, -238, 56, -206)
  g.quadraticCurveTo(40, -210, 36, -180)
  g.quadraticCurveTo(52, -100, 58, -48)
  g.quadraticCurveTo(0, -72, -58, -48)
  g.fill()
  g.fillStyle = 'rgba(60,14,12,0.22)'
  g.beginPath()
  g.moveTo(10, -200)
  g.quadraticCurveTo(52, -100, 58, -48)
  g.quadraticCurveTo(30, -60, 14, -62)
  g.closePath()
  g.fill()
  g.restore()

  // The near arm, held out with an open hand.
  const sx = x - 62
  const sy = by - 122 - breathe
  const hx = sx - 30 + (OFFER.x - (sx - 30)) * reach
  const hy = by - 30 + (OFFER.y + 14 - (by - 30)) * reach
  g.strokeStyle = '#8a5c38'
  g.lineWidth = 32
  g.beginPath()
  g.moveTo(sx, sy)
  g.quadraticCurveTo((sx + hx) / 2 - 10, (sy + hy) / 2 + 46 - reach * 30, hx + 8, hy)
  g.stroke()
  g.fillStyle = '#e8bf9a'
  g.beginPath()
  g.ellipse(hx, hy + 2, 20, 12 + (1 - reach) * 4, -0.2 * reach, 0, TAU)
  g.fill()
}

export function createCave(world: World): Scene {
  const { stage, snd } = world
  let backdrop: Sprite | null = null
  // waiting -> offering (hand out, crystal on it) -> taken (the child has it).
  let state: 'waiting' | 'offering' | 'taken' = 'waiting'
  let reach = 0
  let nod = 0
  let look = 0
  let held = -1
  let cx = OFFER.x
  let cy = OFFER.y
  let settle = 0
  let nest = 5
  const motes: { x: number; y: number; ph: number; sp: number }[] = []
  const rng: Rng = mulberry(55)
  for (let i = 0; i < 14; i++) motes.push({ x: 200 + rng() * 780, y: 180 + rng() * 380, ph: rng() * TAU, sp: 0.2 + rng() * 0.3 })

  const fresh = (): void => {
    state = 'waiting'
    reach = 0
    held = -1
    nest = 5
  }

  const made = (): Made[] => {
    if (state !== 'taken') return []
    return [
      {
        kind: 'crystal',
        from: 'cave',
        x: cx,
        y: cy,
        h: 44,
        draw(g, x, y, scale) {
          drawCrystal(g, x, y, 24 * scale)
        },
      },
    ]
  }

  return {
    enter() {
      if (!backdrop) backdrop = makeSprite(W, H, world.bg, paintCave)
      held = -1
    },
    reset: fresh,
    made,
    update(dt) {
      reach = damp(reach, state === 'offering' ? 1 : 0, 3.2, dt)
      nod = damp(nod, 0, 3, dt)
      settle = damp(settle, 0, 7, dt)
      if (state === 'taken' && held !== -1) {
        const p = stage.pointers.get(held)
        if (p && p.down) {
          cx = damp(cx, p.x, 24, dt)
          cy = damp(cy, clamp(p.y - 8, 120, H - 70), 24, dt)
          look = damp(look, clamp((cx - GNOME.x) / 300, -1, 1), 4, dt)
        } else {
          held = -1
        }
      } else {
        look = damp(look, state === 'offering' ? -0.8 : 0, 3, dt)
        // Set down on the moss, it comes to rest on the ground.
        if (state === 'taken') cy = damp(cy, Math.max(cy, GROUND + 30), 9, dt)
      }
    },
    draw(g) {
      const t = stage.time
      if (backdrop) put(g, backdrop, 0, 0)
      const lf = flicker(t, 13)
      glow(g, world.haloDark, LANTERN.x, LANTERN.y, 150 + lf * 14, 0.8)
      flame(g, LANTERN.x, LANTERN.y + 8, 24, lf)
      lanternBody(g, LANTERN.x, LANTERN.y, 1.1)

      // Dust in the lantern light.
      g.fillStyle = 'rgba(255,226,170,0.5)'
      g.beginPath()
      for (const m of motes) {
        const x = m.x + Math.sin(t * m.sp + m.ph) * 26
        const y = m.y + Math.cos(t * m.sp * 0.7 + m.ph) * 18
        g.moveTo(x + 2, y)
        g.arc(x, y, 1.6, 0, TAU)
      }
      g.fill()

      // The crystals in their nest; each glints in its own time.
      for (let i = 0; i < nest; i++) {
        const x = NEST.x - 44 + i * 22
        const y = NEST.y + 4 + (i % 2) * 5
        const shine = Math.max(0, Math.sin(t * 0.9 + i * 1.9)) ** 8
        drawCrystal(g, x, y, 13 + (i % 3) * 2, shine)
        if (shine > 0.3) glow(g, world.halo, x, y - 14, 26, shine * 0.6)
      }

      const breathe = Math.sin(t * 1.2) * 2
      const blink = (t + 1.3) % 4.6 < 0.13 ? 1 : 0
      drawGnome(g, GNOME.x, GNOME.y, breathe, reach, nod, look, blink)

      // The crystal he offers, and then the one the child has.
      if (state === 'offering') {
        const hx = GNOME.x - 92 + (OFFER.x - (GNOME.x - 92)) * reach
        const hy = GNOME.y - 70 + (OFFER.y + 14 - (GNOME.y - 70)) * reach
        const shine = Math.max(0, Math.sin(t * 1.4)) ** 6
        glow(g, world.halo, hx, hy - 24, 60 + shine * 14, 0.5 + shine * 0.3)
        drawCrystal(g, hx, hy - 4, 22, shine)
      } else if (state === 'taken') {
        const shine = Math.max(0, Math.sin(t * 1.4)) ** 6
        g.fillStyle = 'rgba(10,10,14,0.25)'
        g.beginPath()
        g.ellipse(cx + 3, cy + 4, 22, 6, 0, 0, TAU)
        g.fill()
        glow(g, world.halo, cx, cy - 22, 56 + shine * 12, 0.45 + shine * 0.3)
        drawCrystal(g, cx, cy, 22 * (1 + settle * 0.12), shine)
      }
    },
    down(p: Pointer) {
      // The crystal on his palm: it is taken with a touch.
      if (state === 'offering' && reach > 0.6 && Math.hypot(p.x - OFFER.x, p.y - (OFFER.y - 10)) < 96) {
        state = 'taken'
        held = p.id
        cx = OFFER.x
        cy = OFFER.y + 10
        snd.chime(4, 0.8)
        nod = 1
        return
      }
      if (state === 'taken' && Math.hypot(p.x - cx, p.y - (cy - 20)) < 80) {
        held = p.id
        snd.chime(2, 0.5)
        return
      }
      const onGnome = Math.abs(p.x - GNOME.x) < 130 && p.y > GNOME.y - 420 && p.y < GNOME.y + 50
      const onNest = Math.hypot(p.x - NEST.x, (p.y - NEST.y) * 1.6) < 120
      if (onGnome || onNest) {
        if (state === 'waiting') {
          // He takes one from the nest and holds it out.
          state = 'offering'
          nest--
          snd.chime(1, 0.6)
          stage.after(0.5, () => snd.chime(3, 0.4))
        } else {
          nod = 1
          snd.chime(0, 0.35)
        }
        return
      }
      if (Math.hypot(p.x - LANTERN.x, p.y - LANTERN.y) < 80) {
        snd.clink()
        return
      }
      world.quiet(p.x, p.y)
    },
    up(p: Pointer) {
      if (p.id !== held) return
      held = -1
      settle = 1
      snd.pat()
    },
  }
}
