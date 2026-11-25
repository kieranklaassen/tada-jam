import { CORD, CURTAIN } from './layout'
import { BOARD, INK, curve, ground, hatch, mark, oval, smear, trace, type Album, type Ctx, type Picture } from './marker'

// The board itself, painted once: gloss with a window in it, old smears, a
// drawn stage at the left and drawn hills behind; the metal round it; and the
// pieces of the room that move.

export const TRAY_TOP = 660

export function paintBoard(ctx: Ctx, x0: number, y0: number, x1: number, y1: number): void {
  const sheet = ctx.createLinearGradient(0, y0, 0, y1)
  sheet?.addColorStop(0, '#fbfdfd'); sheet?.addColorStop(0.6, BOARD); sheet?.addColorStop(1, '#e8eef1')
  ctx.fillStyle = sheet ?? BOARD
  ctx.fillRect(x0, y0, x1 - x0, y1 - y0)
  // What was drawn here yesterday and wiped off.
  for (const [x, y, w, h, turn] of [[180, 140, 300, 90, 0.1], [920, 250, 330, 120, -0.15], [660, 420, 260, 80, 0.2], [1090, 120, 220, 70, -0.1], [400, 590, 360, 60, 0.05], [x0 + 60, 420, 160, 220, 0.3], [x1 - 70, 420, 150, 240, -0.2], [870, 620, 300, 60, 0]] as const) smear(ctx, x, y, w, h, turn, 0.05)
  for (const [x, y, w, h, turn] of [[560, 90, 180, 40, 0.1], [950, 420, 150, 40, -0.1]] as const) { ctx.save(); ctx.globalAlpha = 0.5; smear(ctx, x, y, w, h, turn, 0.07); ctx.restore() }
  // A day outside, drawn faintly, from edge to edge.
  const pale = 0.34
  mark(ctx, curve([[x0 - 10, 560], [140, 470], [330, 520], [520, 430], [700, 500], [880, 415], [1060, 490], [x1 + 10, 430]]), 'green', 4, pale, 3)
  mark(ctx, curve([[x0 - 10, 620], [200, 585], [480, 610], [700, 570], [930, 606], [x1 + 10, 560]]), 'green', 4, pale, 4)
  for (let x = x0; x < x1; x += 74) { const y = 618 + Math.sin(x * 0.02) * 14; for (const d of [-7, 0, 8]) mark(ctx, curve([[x + d, y + 18], [x + d * 1.8, y]]), 'green', 3.4, pale, Math.round(x + d) + 900) }
  for (const [x, y, s] of [[690, 190, 1], [960, 196, 0.85], [x1 - 60, 250, 0.8], [x0 + 40, 220, 0.7]] as const) mark(ctx, curve([[x - 50 * s, y], [x - 58 * s, y - 22 * s], [x - 34 * s, y - 34 * s], [x - 12 * s, y - 46 * s], [x + 18 * s, y - 40 * s], [x + 42 * s, y - 30 * s], [x + 56 * s, y - 10 * s], [x + 40 * s, y + 2]], true), 'blue', 3.6, 0.3, Math.round(x))
  // A tree with nothing to say, behind the mole.
  mark(ctx, curve([[1128, 400], [1124, 330], [1134, 290]]), 'black', 4, 0.3)
  mark(ctx, curve([[1066, 296], [1052, 240], [1092, 190], [1144, 176], [1194, 208], [1206, 262], [1180, 304], [1130, 316]], true), 'green', 4, pale)
  // The floors the two stand on.
  for (const x of [312, 795]) { mark(ctx, oval(x, 616, 178, 18), 'black', 4, 0.34); ctx.save(); ctx.globalAlpha = 0.5; hatch(ctx, oval(x, 616, 170, 15), 'black', 22, -16, 3, 0.26); ctx.restore() }
  // The drawn stage: a rail on two posts, a lambrequin, a step.
  const { x0: a, x1: b, y0: top } = CURTAIN
  ground(ctx, [{ x: a, y: top }, { x: b, y: top }, { x: b, y: CURTAIN.y1 }, { x: a, y: CURTAIN.y1 }], '#eef3f6')
  hatch(ctx, [{ x: a, y: top }, { x: b, y: top }, { x: b, y: CURTAIN.y1 }, { x: a, y: CURTAIN.y1 }], 'blue', 46, 30, 3.2, 0.13)
  // The window in the gloss.
  ctx.save()
  ctx.fillStyle = '#fff'
  for (const [x, w, al] of [[560, 120, 0.5], [700, 60, 0.4], [1010, 90, 0.34], [240, 70, 0.25]] as const) {
    ctx.globalAlpha = al
    ctx.beginPath(); ctx.moveTo(x + 130, y0); ctx.lineTo(x + 130 + w, y0); ctx.lineTo(x - 90 + w, 660); ctx.lineTo(x - 90, 660); ctx.fill()
  }
  ctx.restore()
  smear(ctx, 320, 640, 420, 26, 0, 0.05)
}

/** The aluminium round the board, over whatever is drawn at its edge. */
export function paintFrame(ctx: Ctx, x0: number, y0: number, x1: number, y1: number): void {
  const bar = (x: number, y: number, w: number, h: number, flat: boolean) => {
    const g = flat ? ctx.createLinearGradient(0, y, 0, y + h) : ctx.createLinearGradient(x, 0, x + w, 0)
    g?.addColorStop(0, '#eef2f4'); g?.addColorStop(0.35, '#c3ccd2'); g?.addColorStop(0.7, '#a5b0b8'); g?.addColorStop(1, '#7d8992')
    ctx.fillStyle = g ?? '#b3bdc4'
    ctx.fillRect(x, y, w, h)
  }
  bar(x0, y0, x1 - x0, 18, true)
  bar(x0, y0, 16, y1 - y0, false)
  bar(x1 - 16, y0, 16, y1 - y0, false)
  ctx.fillStyle = 'rgba(40,52,66,.16)'
  ctx.fillRect(x0 + 16, y0 + 18, x1 - x0 - 32, 5)
  ctx.fillRect(x0 + 16, y0 + 18, 5, TRAY_TOP - y0)
  // Two screws a side, with a dot in each.
  for (const x of [x0 + 8, x1 - 8]) for (const y of [y0 + 120, (y0 + TRAY_TOP) / 2 + 80]) {
    ctx.fillStyle = '#8b979f'; ctx.beginPath(); ctx.arc(x, y, 5, 0, 7); ctx.fill()
    ctx.fillStyle = '#e6ecef'; ctx.beginPath(); ctx.arc(x - 1, y - 1.4, 2.4, 0, 7); ctx.fill()
  }
}

/** The ledge everything lies on, in front of whoever stands behind it. */
export function paintTray(ctx: Ctx, x0: number, x1: number, y1: number): void {
  const g = ctx.createLinearGradient(0, TRAY_TOP, 0, y1)
  for (const [at, colour] of [[0, '#f7f9fa'], [0.05, '#d5dce0'], [0.5, '#c2cbd1'], [0.68, '#b3bdc5'], [0.7, '#eef2f4'], [0.78, '#a9b4bc'], [1, '#75818a']] as const) g?.addColorStop(at, colour)
  ctx.fillStyle = g ?? '#c5ced4'
  ctx.fillRect(x0, TRAY_TOP, x1 - x0, y1 - TRAY_TOP)
  ctx.fillStyle = 'rgba(255,255,255,.8)'
  ctx.fillRect(x0, TRAY_TOP, x1 - x0, 2.5)
  ctx.fillStyle = 'rgba(30,42,56,.2)'
  ctx.fillRect(x0, TRAY_TOP + 2.5, x1 - x0, 2)
  // Brushed along its length.
  ctx.strokeStyle = '#fff'
  ctx.lineWidth = 1
  for (let i = 0; i < 46; i++) {
    const y = TRAY_TOP + 8 + ((i * 37) % 96), x = x0 + ((i * 211) % 1000) / 1000 * (x1 - x0)
    ctx.globalAlpha = 0.1 + (i % 4) * 0.05
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 90 + (i % 7) * 40, y); ctx.stroke()
  }
  ctx.globalAlpha = 1
  // Marker dust and a pen that has rolled into the corner.
  for (let i = 0; i < 40; i++) { ctx.fillStyle = [INK.red, INK.blue, INK.green, INK.black][i % 4]; ctx.globalAlpha = 0.22; ctx.beginPath(); ctx.arc(x0 + 30 + ((i * 173) % 1120) / 1120 * (x1 - x0 - 60), 752 + (i * 7) % 12, 1 + (i % 3) * 0.6, 0, 7); ctx.fill() }
  ctx.globalAlpha = 1
  // Four pens along the lip.
  ;[INK.black, INK.red, INK.blue, INK.green].forEach((colour, i) => {
    const x = 340 + i * 172
    ctx.fillStyle = 'rgba(30,42,56,.22)'; ctx.beginPath(); ctx.roundRect(x + 4, 786, 130, 17, 8); ctx.fill()
    ctx.fillStyle = '#fafbfb'; ctx.beginPath(); ctx.roundRect(x, 780, 130, 17, 8); ctx.fill()
    ctx.fillStyle = colour; ctx.beginPath(); ctx.roundRect(x, 780, 44, 17, 8); ctx.fill(); ctx.fillRect(x + 118, 781, 8, 15)
    ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.fillRect(x + 6, 783, 116, 3)
  })
}

export class Room {
  constructor(private readonly album: Album) {}

  /** The rail, with its rings, over the curtain's top. */
  rail(): Picture {
    return this.album.get('rail', [30, 24, 540, 60], (ctx) => {
      const bar = [{ x: 40, y: 34 }, { x: 560, y: 34 }, { x: 560, y: 46 }, { x: 40, y: 46 }]
      ground(ctx, bar, '#fff')
      mark(ctx, [...curve([[40, 34], [300, 33], [560, 34], [562, 46], [300, 47], [40, 46]], true)], 'black', 4.4)
      for (const x of [40, 560]) { ground(ctx, oval(x, 40, 10, 11)); mark(ctx, oval(x, 40, 10, 11), 'black', 4.4); hatch(ctx, oval(x, 40, 9, 10), 'black', 5, 0, 3, 0.7) }
    })
  }
  curtain(): Picture {
    const { x0, x1, y0, y1 } = CURTAIN
    return this.album.get('curtain', [x0 - 14, y0 - 20, x1 - x0 + 30, y1 - y0 + 40], (ctx) => {
      const hem: [number, number][] = [], folds = 9, w = (x1 - x0) / folds
      for (let i = 0; i <= folds; i++) { hem.push([x1 - i * w, y1 - 2]); if (i < folds) hem.push([x1 - (i + 0.5) * w, y1 + 12]) }
      const shape = [...curve([[x0, y0 - 10], [x0 + 200, y0 - 13], [x1, y0 - 10]]), ...curve([[x1 + 3, y0 + 200], [x1 - 2, y1 - 120], ...hem, [x0 - 4, y1 - 130], [x0 + 2, y0 + 180], [x0, y0 - 10]])]
      ground(ctx, shape, '#fbe3e3')
      ctx.save()
      trace(ctx, shape); ctx.closePath(); ctx.clip()
      for (let i = 0; i < folds; i++) {
        const g = ctx.createLinearGradient(x0 + i * w, 0, x0 + (i + 1) * w, 0)
        g?.addColorStop(0, 'rgba(205,40,52,.5)'); g?.addColorStop(0.4, 'rgba(230,80,86,.18)'); g?.addColorStop(1, 'rgba(195,30,44,.42)')
        ctx.fillStyle = g ?? '#f0a0a4'
        ctx.fillRect(x0 + i * w - 1, y0 - 20, w + 2, y1 - y0 + 50)
      }
      ctx.restore()
      hatch(ctx, shape, 'red', 13, 5, 5, 0.42)
      for (let i = 1; i < folds; i++) mark(ctx, curve([[x0 + i * w, y0 - 8], [x0 + i * w + 5, (y0 + y1) / 2], [x0 + i * w - 2, y1 - 2]]), 'red', 5, 0.95, i + 40)
      mark(ctx, shape, 'red', 6)
      for (let i = 0; i <= folds; i++) { const x = x0 + 4 + i * ((x1 - x0 - 8) / folds); mark(ctx, oval(x, y0 - 12, 7, 9), 'black', 4) }
    })
  }
  /** The cloth that is rolled up, as a bolster. */
  roll(): Picture {
    const { x0, x1 } = CURTAIN, w = x1 - x0
    return this.album.get('roll', [-12, -32, w + 24, 64], (ctx) => {
      const shape = curve([[0, -22], [w / 2, -26], [w, -22], [w + 6, 0], [w, 23], [w / 2, 27], [0, 23], [-6, 0]], true)
      ground(ctx, shape, '#f0a3a6')
      hatch(ctx, shape, 'red', 12, 18, 5, 0.5)
      mark(ctx, shape, 'red', 6)
      for (const x of [2, w - 2]) { ground(ctx, oval(x, 0, 12, 23), '#fff'); mark(ctx, oval(x, 0, 12, 23), 'red', 5); mark(ctx, oval(x, 0, 5, 11, 0, 5), 'red', 4) }
    })
  }
  /** The cloth over a head that is in behind it. */
  lump(): Picture {
    return this.album.get('lump', [-64, -64, 128, 128], (ctx) => {
      const shape = curve([[0, -52], [38, -38], [52, 0], [40, 38], [0, 50], [-40, 40], [-54, 0], [-38, -40]], true)
      ground(ctx, shape, '#f3a9ac'); hatch(ctx, shape, 'red', 13, 16, 5, 0.42)
      mark(ctx, oval(0, 0, 52, 50, -2.4, 1.1), 'red', 5.5); mark(ctx, oval(-4, -2, 34, 34, -2.2, -0.7), 'red', 4, 0.6)
    })
  }
  toe(): Picture {
    return this.album.get('toe', [-34, -26, 70, 54], (ctx) => {
      ctx.fillStyle = 'rgba(40,50,66,.2)'; ctx.beginPath(); ctx.ellipse(3, 9, 28, 15, 0, 0, 7); ctx.fill()
      ctx.fillStyle = '#4c2f88'; ctx.beginPath(); ctx.ellipse(0, 5, 27, 16, 0, 0, 7); ctx.fill()
      ctx.fillStyle = '#8560c8'; ctx.beginPath(); ctx.ellipse(0, 0, 27, 16, 0, 0, 7); ctx.fill()
      ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.beginPath(); ctx.ellipse(-9, -6, 8, 3, -0.3, 0, 7); ctx.fill()
    })
  }
  /** The knob on the cord. */
  knob(): Picture {
    return this.album.get('knob', [-34, -34, 68, 104], (ctx) => {
      const ball = oval(0, 0, 23, 23)
      ground(ctx, ball, '#fbe3e3'); hatch(ctx, ball, 'red', 7, 5, 5, 0.6); mark(ctx, ball, 'red', 5)
      for (const x of [-11, -4, 4, 11]) mark(ctx, curve([[x * 0.6, 22], [x, 42], [x * 1.4, 58]]), 'red', 4.4, 0.95, x + 60)
      mark(ctx, curve([[-8, 24], [0, 27], [8, 24]]), 'black', 4)
    })
  }
  cordTop(): { x: number; y: number } { return { x: CORD.x, y: CORD.top } }
  wiper(): Picture {
    return this.album.get('wiper', [-66, -34, 134, 76], (ctx) => {
      ctx.fillStyle = 'rgba(40,50,66,.22)'; ctx.beginPath(); ctx.roundRect(-54, -10, 116, 44, 10); ctx.fill()
      ctx.fillStyle = '#3b4652'; ctx.beginPath(); ctx.roundRect(-58, 6, 116, 24, 6); ctx.fill()
      ctx.fillStyle = '#57636f'; for (let x = -54; x < 54; x += 8) ctx.fillRect(x, 10, 3, 18)
      ctx.fillStyle = '#1f7a4b'; ctx.beginPath(); ctx.roundRect(-60, -26, 120, 38, 12); ctx.fill()
      ctx.fillStyle = '#34a56c'; ctx.beginPath(); ctx.roundRect(-58, -27, 116, 30, 11); ctx.fill()
      ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.beginPath(); ctx.roundRect(-46, -23, 70, 7, 4); ctx.fill()
    })
  }
  can(): Picture {
    return this.album.get('can', [-32, -34, 64, 68], (ctx) => {
      const shape = curve([[-20, -24], [0, -20], [20, -24], [18, 22], [0, 27], [-18, 22]], true)
      ground(ctx, shape); hatch(ctx, shape, 'green', 8, 0, 4, 0.45)
      mark(ctx, shape, 'black', 4.4); mark(ctx, oval(0, -22, 20, 6), 'black', 4)
      for (const y of [-4, 8]) mark(ctx, curve([[-19, y], [0, y + 4], [19, y]]), 'black', 3.2, 0.8, y + 80)
    })
  }
  /** A sack with one lump for each thing in it; the small one is smooth. */
  sack(lumps: number): Picture {
    return this.album.get(`sack:${lumps}`, [-84, -100, 168, 176], (ctx) => {
      const pts: [number, number][] = [], r = lumps ? 58 : 46
      const n = lumps ? lumps * 6 : 10
      for (let i = 0; i < n; i++) { const t = Math.PI * 0.5 + (i / n) * (Math.PI * 2), k = lumps ? 0.78 + 0.3 * Math.abs(Math.sin(t * lumps / 2)) ** 0.7 : 1; pts.push([Math.cos(t) * r * k, 8 + Math.sin(t) * r * 0.86 * k]) }
      const shape = curve(pts, true)
      ctx.fillStyle = 'rgba(40,50,66,.16)'; ctx.beginPath(); ctx.ellipse(4, 6 + r * 0.9, r * 0.9, 10, 0, 0, 7); ctx.fill()
      ground(ctx, shape, '#dfe8f8'); hatch(ctx, shape, 'blue', 13, -12, 4.4, 0.35); mark(ctx, shape, 'blue', 5.4)
      for (let i = 0; i < lumps; i++) { const t = Math.PI * (2 * i + 1) / lumps; mark(ctx, oval(Math.cos(t) * r * 0.62, 8 + Math.sin(t) * r * 0.54, 13, 11, t - 1.2, t + 1.2), 'blue', 3.6, 0.7, i + 20) }
      const neck = curve([[-14, -r * 0.7], [-20, -r * 0.7 - 26], [0, -r * 0.7 - 18], [20, -r * 0.7 - 28], [14, -r * 0.7]], true)
      ground(ctx, neck, '#dfe8f8'); mark(ctx, neck, 'blue', 5)
      mark(ctx, curve([[-18, -r * 0.7], [0, -r * 0.7 + 5], [18, -r * 0.7]]), 'black', 6)
    })
  }
  ghost(): Picture {
    return this.album.get('ghost', [-40, -14, 92, 112], (ctx) => {
      const shape = curve([[-8, 2], [0, -8], [9, 2], [10, 36], [22, 30], [30, 36], [40, 36], [46, 46], [44, 72], [30, 92], [2, 92], [-16, 74], [-28, 52], [-22, 44], [-8, 54]], true)
      ground(ctx, shape, 'rgba(255,255,255,.96)'); mark(ctx, shape, 'black', 5)
      for (const x of [12, 25]) mark(ctx, curve([[x, 40], [x + 1, 54]]), 'black', 3.6, 0.8, x)
    })
  }
}
