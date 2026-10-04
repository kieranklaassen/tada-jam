// A contact sheet to look at, never shipped and wired to nothing: the six
// figures at table size with their ten faces, the extras, the glow on the
// three grounds it must read on, the care things lifted, the parts of a sign
// laid on every animal, and the dark under the table, the carriers, the den
// and the foam.

import { SPECIES, type Species } from '../cast'
import { CARES } from '../needs'
import { EXTRAS } from './extras'
import { FACES, FIGURES, type Face } from './figures'
import type { Ctx } from './paint'
import { PAL } from './palette'
import { CARRIER, PARTS } from './parts'
import { TABLE_BOUNDS, table } from './room'
import { LIFT, Sheet, drawGloss, drawSticker, type Bounds, type Paint, type Pose, type Sticker } from './sticker'
import { THINGS } from './things'

const FRAME = { w: 1300, h: 2570 } as const
/** Where each figure sits in a row, left to right, and the scale of the small faces under it. */
const COLUMNS: readonly number[] = [156, 366, 596, 806, 996, 1176]
const SMALL = 0.42
const sheet = new Sheet()

type Part = { paint: Paint; bounds: Bounds; bare?: boolean }

export function drawFigureSheet(g: Ctx, width: number, height: number, dpr: number, seconds: number): number {
  const scale = Math.min(width / FRAME.w, height / FRAME.h), k = dpr * scale, t = seconds
  sheet.use(k)
  g.setTransform(dpr, 0, 0, dpr, 0, 0)
  g.fillStyle = PAL.sheet
  g.fillRect(0, 0, width, height)
  g.setTransform(k, 0, 0, k, (dpr * (width - FRAME.w * scale)) / 2, (dpr * (height - FRAME.h * scale)) / 2)
  let draws = 0, n = 0
  const put = (sticker: Sticker, pose: Pose, gloss = true) => {
    drawSticker(g, sticker, pose)
    if (gloss) drawGloss(g, sticker, pose, 0.5 + 0.34 * Math.sin(t * 0.5 + n++ * 1.7))
    draws += gloss ? 2 : 1
  }
  const figure = (species: Species, face: Face, shut = false) =>
    sheet.get(`${species} ${face} ${shut}`, FIGURES[species].bounds, (pen) => FIGURES[species].paint(pen, face, shut))
  const part = (name: string, made: Part, pose: Pose, gloss = true) =>
    put(sheet.get(name, made.bounds, made.paint, 0, '', made.bare ?? false), pose, gloss && !made.bare)
  const swatch = (x: number, y: number, w: number, h: number, color: string) => {
    g.fillStyle = color
    g.beginPath()
    g.roundRect(x, y, w, h, 18)
    g.fill()
  }

  // The six, calm, with their anchors as small dots; under each, its nine other faces and its blink, small.
  SPECIES.forEach((species, i) => {
    const x = COLUMNS[i], breath = Math.sin(t * 1.3 + i)
    put(figure(species, 'calm'), { x, y: 290, sx: 1 - breath * 0.012, sy: 1 + breath * 0.02 })
    const small: [Face, boolean][] = [...FACES.filter((face) => face !== 'calm').map((face): [Face, boolean] => [face, false]), ['calm', true]]
    small.forEach(([face, shut], j) => {
      put(figure(species, face, shut), { x: x - 52 + (j % 2) * 104, y: 422 + Math.floor(j / 2) * 112, sx: SMALL, sy: SMALL }, false)
    })
    g.fillStyle = '#00a3a3'
    for (const spot of Object.values(FIGURES[species].anchors)) {
      g.beginPath()
      g.arc(x + spot.x, 290 + spot.y, 2.6, 0, Math.PI * 2)
      g.fill()
    }
  })

  // The extras.
  const extra = (name: keyof typeof EXTRAS, pose: Pose, gloss = true) => part(name, EXTRAS[name], pose, gloss)
  extra('blanketOpen', { x: 170, y: 1110, sx: 0.8, sy: 0.8 })
  extra('plasterOne', { x: 372, y: 1010 })
  extra('drop', { x: 350, y: 1080 })
  extra('drop', { x: 392, y: 1072, sx: 2, sy: 2 })
  extra('hand', { x: 450, y: 1105 })
  // The glow on the three grounds it has to read on, alone and behind a thing.
  ;[PAL.cart.tray, PAL.sheet, PAL.floor].forEach((color, i) => {
    const x = 600 + i * 240, pulse = 1 + 0.05 * Math.sin(t * 3), care = CARES[i]
    swatch(x, 950, 220, 180, color)
    extra('halo', { x: x + 60, y: 1040, sx: 0.6 * pulse, sy: 0.6 * pulse })
    extra('halo', { x: x + 150, y: 1040, sx: pulse, sy: pulse })
    part(care, THINGS[care], { x: x + 150, y: 1040 })
  })
  // The five care things, lying and lifted off the cart with a corner curled.
  swatch(60, 1150, 1180, 130, PAL.cart.tray)
  CARES.forEach((care, i) => {
    part(care, THINGS[care], { x: 150 + i * 220, y: 1215 })
    put(sheet.get(`${care} lifted`, THINGS[care].bounds, THINGS[care].paint, LIFT), { x: 150 + i * 220 + 110, y: 1215, sy: 1.04, sx: 0.98 })
  })

  // The parts of a sign, laid on every animal. Sore and itchy: the paw held up at its side, three burrs in the fur.
  SPECIES.forEach((species, i) => {
    const x = COLUMNS[i], a = FIGURES[species].anchors, burr = (dx: number, dy: number, rot: number) => part('burr', PARTS.burr, { x: x + dx, y: dy, rot })
    // The paw is laid over the figure: under it, only its tip would show past the body.
    put(figure(species, i % 2 ? 'bothered' : 'hurting'), { x, y: 1590, rot: -0.04 })
    part(`paw ${species}`, PARTS.paw(species), { x: x + a.side.x, y: 1590 + a.side.y, rot: -0.75 })
    burr((a.back.x + a.lap.x) / 2, 1590 + (a.back.y + a.lap.y) / 2, 0.3)
    burr(a.side.x * 0.45, 1590 + a.lap.y - 6, -0.4)
    burr(a.back.x * 0.5, 1590 + a.head.y * 0.86, 0.9)

    // Cold: the arms hugged round its chest, and its breath showing.
    const chest = 1890 + a.lap.y + (a.mouth.y - a.lap.y) * 0.5
    put(figure(species, 'miserable'), { x, y: 1890, sy: 0.97 })
    part(`arms ${species}`, PARTS.arms(species), { x, y: chest })
    part('puff', PARTS.puff, { x: x + a.mouth.x + 16, y: 1890 + a.mouth.y - 6 })
  })
  // Thirsty: the tongue hanging a little, and down to the table, on a large animal and on small ones.
  const thirsty: [Species, 1 | 2][] = [['bear', 1], ['bear', 2], ['hedgehog', 1], ['hedgehog', 2], ['dog', 2], ['duck', 2]]
  thirsty.forEach(([species, length], i) => {
    const x = COLUMNS[i], a = FIGURES[species].anchors, sag = length === 2 ? 0.9 : 0.96
    put(figure(species, 'worn'), { x, y: 2190, sy: sag, sx: 2 - sag })
    part(`tongue ${length}`, PARTS.tongue(length), { x: x + a.mouth.x, y: 2190 + (a.mouth.y + 3) * sag })
  })

  // The dark under the table, behind the table and over it, with the eyes of the one who hides.
  const tableSticker = sheet.get('table', TABLE_BOUNDS, table)
  ;[false, true].forEach((over, i) => {
    const x = 190 + i * 380, y = 2330
    if (!over) part('shade', PARTS.shade, { x, y: y + 50 })
    put(tableSticker, { x, y })
    if (over) part('shade', PARTS.shade, { x, y: y + 50 })
    part(`eyes ${over}`, PARTS.eyes(over), { x: x + 18, y: y + 142 })
  })
  // The carrier shut, with someone's eyes at its window, and open and empty; the den; foam on the bowl; a foam beard.
  part('carrier shut', PARTS.carrier(false), { x: 870, y: 2545 })
  part('eyes false', PARTS.eyes(false), { x: 870 + CARRIER.window.x, y: 2545 + CARRIER.window.y, sx: 0.8, sy: 0.8 })
  part('carrier open', PARTS.carrier(true), { x: 1090, y: 2545 })
  part('den', PARTS.den, { x: 1190, y: 2300 })
  part('bowl', THINGS.bowl, { x: 1010, y: 2310 })
  part('foam', PARTS.foam, { x: 1010, y: 2310 - 14 })
  put(figure('cat', 'wow'), { x: 850, y: 2370, sx: 0.8, sy: 0.8 }, false)
  part('beard', PARTS.beard, { x: 850, y: 2370 + (FIGURES.cat.anchors.mouth.y + 8) * 0.8, sx: 0.8, sy: 0.8 })
  g.setTransform(1, 0, 0, 1, 0, 0)
  return draws
}
