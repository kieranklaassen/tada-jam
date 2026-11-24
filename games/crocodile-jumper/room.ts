import { METAL, blob, foil, oval, paper, path, poly, stream, twist, type Album, type Ctx, type MetalName, type Picture } from './foil'
import { DOOR, NECK, STRIP, TABLE_Y, TRAY, WINDOW } from './layout'
import { paintPiece } from './pieces'
import { KINDS, STRIP_LENGTH, type Kind } from './row'
import { STAGE } from './stage'

// The shop, painted once for a size of the surface and past the stage's edges:
// dull wrapper lining for walls and table, foil for everything that is wrapped.

const rect = (x: number, y: number, w: number, h: number, r = 0): Path2D => path((p) => p.roundRect(x, y, w, h, r))

function sweet(c: Ctx, x: number, y: number, r: number, m: MetalName, seed: number, turn = 0): void {
  c.save()
  c.translate(x, y)
  c.rotate(turn)
  twist(c, -r * 0.8, 0, Math.PI, r * 1.1, METAL[m][2])
  twist(c, r * 0.8, 0, 0, r * 1.1, METAL[m][2])
  foil(c, oval(0, 0, r, r * 0.8), [-r, -r * 0.8, r * 2, r * 1.6], METAL[m], { seed, size: r * 0.5, round: 0.6, edge: 2 })
  c.restore()
}

/** `view` is the part of the stage's plane that the surface shows. */
export function paintRoom(c: Ctx, view: { x: number; y: number; w: number; h: number }): void {
  const x0 = Math.min(view.x, 0) - 4, x1 = Math.max(view.x + view.w, STAGE.width) + 4
  const y0 = Math.min(view.y, 0) - 4, y1 = Math.max(view.y + view.h, STAGE.height) + 4, w = x1 - x0
  // The wall: the dull side of a lilac wrapper, with its folds.
  paper(c, rect(x0, y0, w, TABLE_Y - y0), [x0, y0, w, TABLE_Y - y0], '#b6a9c6', 5, 0.07)
  c.globalAlpha = 0.1
  c.fillStyle = '#fff'
  for (let x = Math.floor(x0 / 92) * 92; x < x1; x += 92) c.fillRect(x, y0, 3, TABLE_Y - y0)
  c.globalAlpha = 1
  // A shelf of wrapped sweets and rolls of foil.
  foil(c, rect(372, 214, 452, 16, 4), [372, 214, 452, 16], METAL.gold, { seed: 12, size: 16, round: 0.3 })
  const rolls: [number, MetalName][] = [[410, 'croc'], [468, 'python'], [526, 'shoe']]
  rolls.forEach(([x, m], i) => {
    foil(c, rect(x - 24, 100 + i * 10, 48, 114 - i * 10, 8), [x - 24, 100 + i * 10, 48, 114], METAL[m], { seed: 21 + i, size: 18 })
    c.fillStyle = '#e8dcc6'
    c.fill(oval(x, 102 + i * 10, 24, 9))
    c.fillStyle = METAL[m][0]
    c.fill(oval(x, 102 + i * 10, 9, 4))
  })
  // A glass jar of sweets.
  for (const [jx, seed, ms] of [[630, 3, ['duck', 'sausage', 'mint', 'snail']], [750, 4, ['seal', 'python', 'gold', 'shoe']]] as [number, number, MetalName[]][]) {
    const rand = stream(seed)
    c.fillStyle = 'rgba(255,255,255,.28)'
    c.fill(rect(jx - 48, 96, 96, 118, 18))
    for (let i = 0; i < 11; i++) sweet(c, jx - 28 + (i % 3) * 28, 196 - Math.floor(i / 3) * 26, 15, ms[i % 4], 60 + i + jx, rand() * 2 - 1)
    c.strokeStyle = 'rgba(255,255,255,.8)'
    c.lineWidth = 4
    c.stroke(rect(jx - 48, 96, 96, 118, 18))
    c.lineWidth = 7
    c.stroke(path((p) => { p.moveTo(jx - 34, 120); p.lineTo(jx - 34, 178) }))
    foil(c, rect(jx - 40, 76, 80, 24, 7), [jx - 40, 76, 80, 24], METAL.silver, { seed, size: 14 })
  }
  // A garland of sweets along the top.
  c.strokeStyle = '#7a6790'
  c.lineWidth = 3
  const drape = (x: number): number => 14 + Math.abs(Math.sin((x / 236) * Math.PI)) * 30
  c.stroke(path((p) => { for (let x = x0; x <= x1; x += 12) { if (x === x0) p.moveTo(x, drape(x)); else p.lineTo(x, drape(x)) } }))
  const ms: MetalName[] = ['sausage', 'duck', 'mint', 'python', 'shoe', 'gold']
  for (let i = Math.floor(x0 / 79); i * 79 < x1; i++) if (i * 79 < WINDOW.x - 30 || i * 79 > WINDOW.x + WINDOW.w - 10) if (i * 79 < DOOR.x - 10 || i * 79 > DOOR.x + DOOR.w) sweet(c, i * 79 + 40, drape(i * 79 + 40) + 12, 17, ms[((i % 6) + 6) % 6], 300 + i, (i % 3) * 0.3 - 0.3)
  // Outside the window: dusk and snow hills, in dull paper.
  c.save()
  c.clip(rect(WINDOW.x, WINDOW.y, WINDOW.w, WINDOW.h, 12))
  const sky = c.createLinearGradient(0, WINDOW.y, 0, WINDOW.y + WINDOW.h)
  sky.addColorStop(0, '#33457f')
  sky.addColorStop(1, '#8fa5d6')
  c.fillStyle = sky
  c.fillRect(WINDOW.x, WINDOW.y, WINDOW.w, WINDOW.h)
  c.fillStyle = '#dfe9f7'
  c.fill(blob([[0, 190], [90, 150], [190, 176], [300, 144], [380, 190], [380, 260], [0, 260]]))
  c.fillStyle = '#f7fbff'
  c.fill(blob([[0, 214], [120, 188], [240, 204], [380, 186], [380, 260], [0, 260]]))
  foil(c, oval(292, 66, 22, 22), [268, 42, 48, 48], METAL.silver, { seed: 77, size: 12 })
  c.restore()
  // The doorway.
  c.save()
  c.clip(rect(DOOR.x + 14, DOOR.y + 10, DOOR.w - 28, DOOR.h + 200, 60))
  c.fillStyle = '#5a6ea8'
  c.fillRect(DOOR.x, DOOR.y, DOOR.w, 440)
  c.fillStyle = '#e9f1fb'
  c.fill(blob([[DOOR.x - 10, 250], [DOOR.x + 90, 214], [DOOR.x + 190, 240], [DOOR.x + 300, 210], [DOOR.x + 300, 460], [DOOR.x - 10, 460]]))
  c.restore()
  // The table: brown card with a foil edge.
  const table: [number, number, number, number] = [x0, TABLE_Y, w, 152]
  paper(c, rect(...table), table, '#b98d62', 9, 0.06)
  foil(c, rect(x0, TABLE_Y - 2, w, 10), [x0, TABLE_Y - 2, w, 10], METAL.gold, { seed: 14, size: 18, round: 0.2, edge: 0 })
  // Its front, in plum lining.
  const front: [number, number, number, number] = [x0, 598, w, y1 - 598]
  paper(c, rect(...front), front, '#4b2c4f', 10, 0.07)
  foil(c, rect(x0, 594, w, 9), [x0, 594, w, 9], METAL.gold, { seed: 15, size: 18, round: 0.2, edge: 0 })
  // The strip: plain paper, nothing on it.
  c.fillStyle = 'rgba(40,20,30,.22)'
  c.fill(rect(NECK - 12, STRIP.y + 7, STRIP_LENGTH + 44, STRIP.h, 6))
  c.fillStyle = '#e9eef0'
  c.fill(rect(NECK - 14, STRIP.y, STRIP_LENGTH + 44, STRIP.h, 6))
  c.fillStyle = 'rgba(255,255,255,.7)'
  c.fillRect(NECK - 14, STRIP.y + 4, STRIP_LENGTH + 44, 3)
  // The pincushion where it starts.
  foil(c, blob([[NECK - 64, STRIP.y + 12], [NECK - 34, STRIP.y + 2], [NECK - 6, STRIP.y + 10], [NECK - 1, STRIP.mid], [NECK - 6, STRIP.y + STRIP.h - 10], [NECK - 34, STRIP.y + STRIP.h - 2], [NECK - 64, STRIP.y + STRIP.h - 14], [NECK - 70, STRIP.mid]]), [NECK - 72, STRIP.y, 72, STRIP.h], METAL.plum, { seed: 16, size: 20, round: 0.6 })
  c.lineWidth = 2.4
  for (const [px, py, col] of [[-52, 30, '#ffd23f'], [-34, 22, '#ff6f59'], [-44, 52, '#8ee6ae'], [-26, 60, '#9fd0ff'], [-50, 84, '#ffb3d6']] as [number, number, string][]) {
    c.strokeStyle = '#dfe5ee'
    c.stroke(path((p) => { p.moveTo(NECK + px, STRIP.y + py); p.lineTo(NECK + px - 10, STRIP.y + py - 14) }))
    c.fillStyle = col
    c.fill(oval(NECK + px - 11, STRIP.y + py - 16, 5.5, 5.5))
  }
  for (const k of KINDS) tray(c, k)
}

/** An open wrapper with a heap of one kind in it. */
function tray(c: Ctx, k: Kind): void {
  const { x, y, w, h } = TRAY[k]
  c.fillStyle = 'rgba(15,5,20,.35)'
  c.fill(rect(x + 2, y + 16, w, h - 6, 26))
  const wrap = blob([[x, y + 18], [x + 22, y + 2], [x + w * 0.3, y + 12], [x + w * 0.5, y], [x + w * 0.75, y + 13], [x + w - 18, y + 1], [x + w, y + 22], [x + w - 8, y + h * 0.5], [x + w, y + h - 18], [x + w - 26, y + h], [x + w * 0.5, y + h - 8], [x + 24, y + h], [x, y + h - 16], [x + 9, y + h * 0.5]], 0.5)
  foil(c, wrap, [x, y, w, h], METAL[k], { seed: 200 + w, size: 20, round: 0.3 })
  paper(c, rect(x + 13, y + 14, w - 26, h - 30, 18), [x, y, w, h], '#f1e8d6', 30 + w, 0.05)
  c.fillStyle = 'rgba(60,40,60,.12)'
  c.fill(rect(x + 13, y + 14, w - 26, 14, 8))
  const at: [number, number, number][] = k === 'sausage' ? [[-52, -14, 0.1], [58, -20, -0.14], [-66, 26, -0.08], [62, 24, 0.1], [0, 6, 0]]
    : k === 'shoe' ? [[-58, -12, -0.1], [52, -14, 0.12], [-50, 22, 0.06], [46, 22, -0.05]]
      : [[-60, -10, 0.1], [0, -16, -0.1], [58, -8, 0.05], [-32, 22, -0.06], [32, 22, 0.08]]
  at.forEach(([dx, dy, turn], i) => {
    c.save()
    c.translate(x + w / 2 + dx, y + h / 2 + dy)
    c.rotate(turn)
    c.scale(0.8, 0.8)
    paintPiece(c, k, i % 3)
    c.restore()
  })
}

/** The window's frame with its cellophane curtains, drawn over what passes outside. */
export const windowFrame = (album: Album): Picture => album.get('window', [WINDOW.x - 26, WINDOW.y - 22, WINDOW.w + 52, WINDOW.h + 50], (c) => {
  const { x, y, w, h } = WINDOW
  for (const s of [0, 1]) {
    c.save()
    c.translate(s ? x + w - 4 : x + 4, y)
    c.scale(s ? -1 : 1, 1)
    for (let i = 0; i < 5; i++) {
      c.globalAlpha = i % 2 ? 0.4 : 0.6
      c.fillStyle = i % 2 ? '#fff' : '#ff9fc0'
      c.fill(poly([[i * 12, 0], [i * 12 + 14, 0], [i * 7 + 8, h * 0.62], [i * 7, h * 0.62]]))
      c.fill(poly([[i * 7, h * 0.62], [i * 7 + 8, h * 0.62], [i * 10 + 12, h - 4], [i * 10, h - 4]]))
    }
    c.restore()
  }
  const frame = (bx: number, by: number, bw: number, bh: number, seed: number): void => foil(c, rect(bx, by, bw, bh, 5), [bx, by, bw, bh], METAL.gold, { seed, size: 18, round: 0.3 })
  frame(x - 16, y - 16, w + 32, 18, 41); frame(x - 16, y - 16, 18, h + 32, 42); frame(x + w - 2, y - 16, 18, h + 32, 43); frame(x - 24, y + h - 2, w + 48, 22, 44)
  frame(x + w / 2 - 5, y, 10, h, 45)
})

/** The sides of the door and its sill, over whoever waits there. */
export const doorFrame = (album: Album): Picture => album.get('door', [DOOR.x - 26, DOOR.y - 30, DOOR.w + 52, 470], (c) => {
  const { x, y, w } = DOOR
  for (const [bx, s] of [[x - 12, 51], [x + w - 16, 52]]) foil(c, rect(bx, y + 6, 28, 424, 6), [bx, y, 28, 424], METAL.mint, { seed: s, size: 18, round: 0.3 })
  foil(c, rect(x - 22, y - 14, w + 44, 30, 8), [x - 22, y - 14, w + 44, 30], METAL.mint, { seed: 53, size: 20, round: 0.3 })
  // A half door that the next one leans over.
  foil(c, rect(x + 14, 236, w - 28, 196, 10), [x + 14, 236, w - 28, 196], METAL.gold, { seed: 54, size: 30, round: 0.3 })
  c.fillStyle = METAL.mint[1]
  c.fill(rect(x + 8, 226, w - 16, 20, 8))
  c.strokeStyle = METAL.mint[0]
  c.lineWidth = 2
  c.stroke(rect(x + 8, 226, w - 16, 20, 8))
})

export const hand = (album: Album): Picture => album.get('hand', [-30, -20, 80, 96], (c) => {
  const p = blob([[0, -8], [10, -2], [11, 26], [22, 22], [34, 28], [38, 50], [28, 70], [6, 72], [-12, 56], [-20, 36], [-8, 34], [-8, 2]], 0.8)
  c.fillStyle = 'rgba(255,255,255,.94)'
  c.strokeStyle = '#4b2c4f'
  c.lineWidth = 3.4
  c.fill(p)
  c.stroke(p)
})
