import { Box, TAU, type Pen, type Sprite } from './craft'
import { BROOD, THINGS, type BroodId, type ThingKey } from './layout'
import type { Gait } from './lineage'
import type { Fx } from './yard'

// Everyone in the yard, glued together from the craft box. A figure is one
// cached body and the few parts of it that move. All of them face right, with
// the ground under their middle at the point that is put down.

/** The colour of the yarn, by what a chick copies in the end. */
export const YARN: Record<Gait, [string, string]> = {
  boot: ['#e2403a', '#a3201f'], teapot: ['#3273dc', '#1d4799'], pig: ['#ff86b4', '#cc4f82'], farmer: ['#4fae3d', '#2c7425'], ball: ['#8a4fd0', '#5a2b97'],
  bell: ['#19c2c9', '#0c8288'], hen: ['#ff8a2a', '#bf5a0c'], egg: ['#fffdf4', '#c9c2b0'], self: ['#cfdae2', '#8798a5'], lost: ['#f7dd3e', '#b5960f'],
}

export type Eye = { x: number; y: number; r: number; lid: string }
export type Part = { sprite: Sprite; x: number; y: number }
export type Figure = {
  body: Sprite
  shadow: Sprite
  eyes: readonly Eye[]
  /** Where a mouth opens, and how wide, or null for one that has a beak. */
  mouth: { x: number; y: number; r: number } | null
  parts: Record<string, Part>
  /** The point the whole figure turns about. */
  pivot: { x: number; y: number }
}
export type Cast = {
  things: Record<ThingKey, Figure>
  hen: Figure
  chicks: Record<BroodId, Figure>
  eggs: Record<BroodId, { whole: Sprite; shadow: Sprite; bottom: Sprite; lid: Sprite; beak: Sprite }>
  pupil: Sprite
  mouth: Sprite
  lower: Sprite
  hand: Sprite
  handShadow: Sprite
  glow: Sprite
  contact: Sprite
  nestBack: Sprite
  nestFront: Sprite
  scarf: Record<Gait, Sprite>
  fx: Record<Fx['kind'], Sprite>
}


function figure(box: Box, w: number, h: number, ox: number, oy: number, pivot: { x: number; y: number }, eyes: Eye[], mouth: Figure['mouth'], draw: (g: Pen) => void, parts: Record<string, Part> = {}): Figure {
  const body = box.sprite(w, h, ox, oy, (g) => { draw(g); for (const e of eyes) box.eye(g, e.x, e.y, e.r) })
  return { body, shadow: box.shadow(body), eyes, mouth, parts, pivot }
}

function boot(box: Box): Figure {
  const RED = '#df4038', DARK = '#b92c2c'
  return figure(box, 230, 250, 100, 222, { x: -6, y: 0 }, [{ x: -24, y: -116, r: 23, lid: DARK }, { x: 24, y: -112, r: 28, lid: DARK }], { x: 46, y: -42, r: 17 }, (g) => {
    box.stick(g, 8, -12, 168, 22, 0, '#6a4a3a', 3)
    box.felt(g, RED, [-72, -182, 164, 172], (p) => {
      p.moveTo(-60, -178); p.lineTo(30, -178); p.quadraticCurveTo(26, -120, 36, -86); p.quadraticCurveTo(92, -84, 90, -22); p.lineTo(-66, -22); p.quadraticCurveTo(-50, -90, -60, -178)
    }, { stitch: '#ffc9a8' })
    // Toe cap, heel patch, and the laces: a pipe cleaner through buttons.
    box.felt(g, DARK, [34, -84, 60, 64], (p) => { p.moveTo(89, -22); p.lineTo(60, -22); p.quadraticCurveTo(50, -50, 62, -74); p.quadraticCurveTo(92, -66, 89, -22) }, { lift: 1.5 })
    box.felt(g, DARK, [-68, -74, 40, 54], (p) => { p.moveTo(-64, -22); p.lineTo(-36, -22); p.quadraticCurveTo(-34, -60, -58, -72) }, { lift: 1.5 })
    box.felt(g, '#f6c244', [-22, -82, 60, 34], (p) => p.roundRect(-20, -80, 30, 26, 6), { lift: 1.5, stitch: '#a36a10' })
    g.fillStyle = '#4d1513'; g.beginPath(); g.ellipse(-15, -178, 45, 12, 0, 0, TAU); g.fill()
    for (const y of [-154, -72]) box.button(g, -44, y, 8, '#fff0d0', 2, '#fff', 2)
    box.glue(g, -58, -34, 5); box.glue(g, 88, -60, 5)
  }, {
    // The turned-down top, fluffy, that flops.
    cuff: { x: -15, y: -172, sprite: box.sprite(150, 70, 75, 30, (g) => box.pipe(g, [[-50, -2], [-26, 10], [0, 12], [26, 10], [50, -2]], 24, '#fff4e2', '#d9c6ae')) },
    loop: { x: -58, y: -172, sprite: box.sprite(50, 60, 34, 44, (g) => box.pipe(g, [[0, 0], [-20, -10], [-18, -34], [-2, -20], [2, -4]], 7, '#f6c244', '#b5820f')) },
  })
}

function teapot(box: Box): Figure {
  const BLUE = '#2f6fd6'
  return figure(box, 290, 200, 140, 172, { x: 10, y: -10 }, [{ x: 4, y: -84, r: 24, lid: '#2358b3' }, { x: 52, y: -80, r: 28, lid: '#2358b3' }], { x: 36, y: -36, r: 14 }, (g) => {
    box.pipe(g, [[-66, -96], [-104, -110], [-118, -70], [-100, -34], [-62, -34]], 17, '#f7d85a', '#b98f14', { lift: 3 })
    box.penne(g, 100, -82, 86, 34, -0.85, 4)
    box.felt(g, BLUE, [-84, -136, 172, 134], (p) => { p.ellipse(0, -68, 84, 64, 0, 0, TAU) })
    box.felt(g, '#f7d85a', [-60, -20, 120, 22], (p) => p.roundRect(-52, -18, 104, 18, 9), { lift: 2 })
    // A band of white felt scallops and button flowers.
    for (let i = 0; i < 7; i++) box.felt(g, '#fdf3e0', [-84 + i * 24, -62, 26, 26], (p) => { p.arc(-72 + i * 24, -42, 13, 0, TAU) }, { lift: 0 })
    for (const [x, y, c] of [[-50, -88, '#ff7aa8'], [-32, -108, '#ffd23f'], [-58, -54, '#ff9f45'], [70, -44, '#ff7aa8']] as const) box.button(g, x, y, 10, c, 4, '#fff', 1.5)
    box.glue(g, 62, -116, 6)
  }, {
    lid: { x: 0, y: -124, sprite: box.sprite(150, 80, 75, 62, (g) => { box.felt(g, '#2358b3', [-52, -26, 104, 30], (p) => { p.moveTo(-50, 2); p.quadraticCurveTo(-40, -24, 0, -26); p.quadraticCurveTo(40, -24, 50, 2); p.closePath() }); box.pom(g, 0, -34, 17, 16, [255, 122, 168]) }) },
  })
}

function pig(box: Box): Figure {
  return figure(box, 300, 210, 140, 180, { x: 0, y: -64 }, [{ x: 44, y: -112, r: 23, lid: '#e77ba3' }, { x: 92, y: -110, r: 26, lid: '#e77ba3' }], { x: 78, y: -34, r: 15 }, (g) => {
    for (const x of [-56, -28, 30, 56]) { box.stick(g, x, -18, 44, 19, Math.PI / 2, '#f3a0b8', 2); box.felt(g, '#8a4a5c', [x - 10, -12, 22, 12], (p) => p.roundRect(x - 10, -10, 20, 11, 4), { lift: 0 }) }
    box.pom(g, -18, -72, 84, 58, [255, 150, 184], { lift: 4 })
    box.pom(g, 52, -80, 58, 52, [255, 164, 194], { lift: 4 })
    for (const s of [-1, 1]) box.felt(g, '#ee7fa6', [30 + s * 40 - 22, -150, 60, 46], (p) => { p.moveTo(54 + s * 22, -124); p.lineTo(54 + s * 56, -156); p.quadraticCurveTo(54 + s * 62, -118, 54 + s * 44, -106); p.closePath() }, { lift: 2 })
    // The snout is a button, and the mud is brown felt.
    box.button(g, 84, -70, 29, '#ff7fa9', 2, '#fff', 4)
    box.felt(g, '#8a5a3c', [-90, -50, 60, 40], (p) => { p.ellipse(-62, -36, 26, 16, 0.3, 0, TAU) }, { lift: 1 })
    box.felt(g, '#8a5a3c', [-40, -110, 30, 24], (p) => { p.ellipse(-34, -112, 13, 9, -0.2, 0, TAU) }, { lift: 1 })
  }, {
    tail: { x: -98, y: -86, sprite: box.sprite(80, 70, 66, 40, (g) => box.pipe(g, [[4, 4], [-14, -14], [-34, -6], [-28, 14], [-12, 6], [-20, -20], [-46, -22]], 10, '#ff9cc0', '#d55f8b')) },
    tongue: { x: 96, y: -38, sprite: box.sprite(60, 50, 10, 14, (g) => box.felt(g, '#e8405a', [-4, -8, 50, 26], (p) => { p.moveTo(0, -9); p.quadraticCurveTo(40, -12, 44, 6); p.quadraticCurveTo(40, 22, 14, 12); p.quadraticCurveTo(0, 8, 0, -9) }, { lift: 2 })) },
  })
}

function farmer(box: Box): Figure {
  return figure(box, 400, 260, 196, 226, { x: 0, y: -8 }, [{ x: -92, y: -136, r: 17, lid: '#e8b48c' }, { x: -56, y: -138, r: 19, lid: '#e8b48c' }], { x: -70, y: -92, r: 13 }, (g) => {
    // Legs first, over the far end of the barrow, in odd socks.
    box.stick(g, 106, -100, 90, 22, -0.35, '#4d6fb0', 3); box.stick(g, 112, -86, 90, 22, -0.2, '#5a7fc4', 3)
    box.felt(g, '#6a4a3a', [134, -156, 40, 52], (p) => p.roundRect(138, -150, 26, 46, 11)); box.felt(g, '#7d5a46', [146, -134, 40, 52], (p) => p.roundRect(150, -130, 26, 46, 11))
    box.button(g, 120, -118, 9, '#f25c54', 2, '#fff', 1); box.button(g, 128, -94, 9, '#ffd23f', 2, '#fff', 1)
    // The head: felt, a cotton beard, a button nose, a straw hat of card and raffia.
    box.felt(g, '#f2c39b', [-118, -170, 90, 90], (p) => p.ellipse(-74, -126, 43, 44, 0, 0, TAU))
    box.cotton(g, [[-102, -92, 17], [-80, -80, 20], [-54, -82, 19], [-38, -96, 15]], '#ffffff', 3)
    box.felt(g, '#f3a37c', [-78, -124, 24, 26], (p) => p.ellipse(-70, -114, 13, 12, 0, 0, TAU), { lift: 2 })
    box.felt(g, '#e9bb57', [-150, -190, 150, 40], (p) => p.ellipse(-76, -164, 66, 13, -0.08, 0, TAU))
    box.felt(g, '#f3cf74', [-120, -216, 90, 52], (p) => { p.moveTo(-114, -168); p.quadraticCurveTo(-108, -216, -76, -216); p.quadraticCurveTo(-42, -216, -38, -170); p.closePath() })
    for (let i = 0; i < 5; i++) { g.strokeStyle = 'rgba(150,96,16,0.4)'; g.lineWidth = 2; g.beginPath(); g.moveTo(-110 + i * 3, -176 - i * 8); g.quadraticCurveTo(-76, -182 - i * 8, -42 - i * 3, -178 - i * 8); g.stroke() }
    g.strokeStyle = '#d8423c'; g.lineWidth = 9; g.beginPath(); g.moveTo(-112, -174); g.quadraticCurveTo(-76, -184, -40, -175); g.stroke()
    // The barrow: lolly sticks, with a button for a wheel.
    box.stick(g, -128, -44, 110, 12, 0.22, '#c48a4a', 3)
    for (const [y, l] of [[-72, 252], [-50, 234], [-29, 210]] as const) box.stick(g, 8, y, l, 25, 0, y === -50 ? '#e2b06a' : '#d49f58', 3)
    for (const x of [-84, 92]) box.stick(g, x, -50, 78, 17, Math.PI / 2 + (x < 0 ? 0.2 : -0.2), '#c48a4a', 2)
    box.stick(g, -78, -14, 40, 13, Math.PI / 2, '#b87f40', 2)
    box.button(g, 86, -22, 25, '#3c5c9a', 4, '#ffd23f', 3)
    box.glue(g, -84, -24, 6); box.glue(g, 60, -60, 5)
  }, {
    // His belly goes up and down behind the barrow's side.
    belly: { x: 22, y: -66, sprite: box.sprite(170, 110, 85, 92, (g) => { box.felt(g, '#4d6fb0', [-76, -70, 152, 72], (p) => { p.moveTo(-74, 2); p.quadraticCurveTo(-70, -70, 0, -70); p.quadraticCurveTo(70, -70, 74, 2); p.closePath() }, { stitch: '#b9d0ff' }); box.felt(g, '#e2564a', [-20, -62, 40, 40], (p) => p.roundRect(-18, -56, 36, 32, 6), { lift: 1.5, stitch: '#ffe3c0' }); box.button(g, -44, -34, 9, '#ffd23f', 4, '#b5820f', 1.5); box.button(g, 44, -34, 9, '#ffd23f', 4, '#b5820f', 1.5) }) },
    arm: { x: -18, y: -88, sprite: box.sprite(120, 110, 30, 90, (g) => { box.pipe(g, [[0, 0], [24, -22], [34, -52]], 22, '#e2564a', '#a8322a'); box.felt(g, '#f2c39b', [22, -82, 36, 36], (p) => p.ellipse(38, -62, 15, 16, 0, 0, TAU), { lift: 2 }) }) },
  })
}

function ball(box: Box): Figure {
  const R = 60
  const spin = box.sprite(150, 150, 75, 75, (g) => {
    const cs = ['#8a4fd0', '#ffd23f', '#8a4fd0', '#ff7aa8', '#8a4fd0', '#5fd0c0']
    cs.forEach((c, i) => box.felt(g, c, [-R, -R, R * 2, R * 2], (p) => { p.moveTo(0, 0); p.arc(0, 0, R, (i / 6) * TAU, ((i + 1) / 6) * TAU); p.closePath() }, { lift: 0 }))
    g.strokeStyle = 'rgba(255,255,255,0.75)'; g.lineWidth = 2.4; g.setLineDash([6, 5])
    for (let i = 0; i < 6; i++) { g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos((i / 6) * TAU) * (R - 3), Math.sin((i / 6) * TAU) * (R - 3)); g.stroke() }
    g.setLineDash([])
    box.button(g, 0, 0, 15, '#fff0d0', 4, '#8a4fd0', 2)
  })
  const f = figure(box, 180, 160, 80, 144, { x: 0, y: -R }, [{ x: -8, y: -76, r: 24, lid: '#6e39b4' }, { x: 36, y: -72, r: 27, lid: '#6e39b4' }], { x: 18, y: -32, r: 14 }, (g) => { g.fillStyle = '#8a4fd0'; g.beginPath(); g.arc(0, -R, R - 1, 0, TAU); g.fill() }, { spin: { x: 0, y: -R, sprite: spin } })
  return f
}

function bell(box: Box): Figure {
  return figure(box, 200, 220, 94, 190, { x: 0, y: -128 }, [{ x: -8, y: -88, r: 22, lid: '#0e979d' }, { x: 36, y: -84, r: 26, lid: '#0e979d' }], { x: 18, y: -46, r: 13 }, (g) => {
    box.pipe(g, [[-18, -138], [-22, -168], [0, -178], [22, -168], [18, -138]], 13, '#f25c54', '#a8322a', { lift: 3 })
    box.felt(g, '#17b4bb', [-66, -146, 132, 130], (p) => { p.moveTo(-62, -22); p.quadraticCurveTo(-40, -50, -40, -92); p.quadraticCurveTo(-38, -142, 0, -144); p.quadraticCurveTo(38, -142, 40, -92); p.quadraticCurveTo(40, -50, 62, -22); p.closePath() }, {})
    box.stick(g, 0, -22, 142, 20, 0, '#f2c14a', 3)
    box.felt(g, '#f2c14a', [-40, -126, 90, 14], (p) => p.roundRect(-34, -124, 68, 9, 4), { lift: 1 })
    for (const x of [-46, -24, 0, 24, 46]) box.button(g, x, -22, 6, '#fff0d0', 2, '#fff', 1)
    box.glue(g, -44, -40, 5)
  }, {
    clapper: { x: 0, y: -24, sprite: box.sprite(60, 60, 30, 10, (g) => { box.stick(g, 0, 8, 30, 9, Math.PI / 2, '#a9713a', 2); g.fillStyle = '#c98a44'; g.beginPath(); g.arc(0, 20, 15, 0, TAU); g.fill(); g.strokeStyle = 'rgba(90,40,10,0.5)'; g.lineWidth = 2; g.beginPath(); g.arc(0, 20, 14, -0.3, 2); g.stroke(); g.fillStyle = 'rgba(255,255,255,0.6)'; g.beginPath(); g.arc(-5, 14, 4, 0, TAU); g.fill() }) },
  })
}

function hen(box: Box): Figure {
  const feather = (g: Pen, x: number, y: number, l: number, w: number, a: number, c: string) => {
    g.save(); g.translate(x, y); g.rotate(a)
    box.felt(g, c, [-w, -4, w * 2, l + 8], (p) => { p.moveTo(0, -2); p.quadraticCurveTo(w, l * 0.35, w * 0.7, l * 0.8); p.quadraticCurveTo(0, l * 1.16, -w * 0.7, l * 0.8); p.quadraticCurveTo(-w, l * 0.35, 0, -2) }, { lift: 2, fibre: 0.7 })
    g.strokeStyle = 'rgba(255,255,255,0.4)'; g.lineWidth = 2; g.beginPath(); g.moveTo(0, 4); g.lineTo(0, l * 0.8); g.stroke()
    g.restore()
  }
  return figure(box, 400, 340, 190, 300, { x: 0, y: -20 }, [{ x: 62, y: -196, r: 28, lid: '#e07a2c' }, { x: 116, y: -192, r: 32, lid: '#e07a2c' }], null, (g) => {
    for (const [i, c] of ['#c8442f', '#f2b134', '#2f8f86', '#e86a2f'].entries()) feather(g, -96 + i * 6, -130 + i * 8, 100 - i * 4, 22, 2.25 - i * 0.34, c)
    box.felt(g, '#ef8a35', [-136, -190, 260, 190], (p) => { p.moveTo(-128, -86); p.quadraticCurveTo(-90, -124, -10, -130); p.quadraticCurveTo(30, -140, 36, -190); p.lineTo(120, -182); p.quadraticCurveTo(136, -60, 96, -24); p.quadraticCurveTo(0, 14, -96, -22); p.quadraticCurveTo(-130, -44, -128, -86) })
    for (let row = 0; row < 3; row++) for (let i = 0; i < 7 - row; i++) feather(g, -84 + i * 30 + row * 12, -100 + row * 26, 36, 17, 0.1 - i * 0.03, ['#f6a64f', '#ffd08a', '#f29a3e'][(i + row) % 3])
    box.felt(g, '#f39a42', [22, -252, 130, 120], (p) => p.ellipse(84, -188, 62, 60, 0, 0, TAU))
    // Comb, wattle and cheek.
    for (const [x, y, r] of [[52, -250, 17], [80, -262, 21], [110, -252, 17]] as const) box.pom(g, x, y, r, r * 1.2, [226, 52, 48])
    box.felt(g, '#e2342f', [90, -152, 40, 50], (p) => { p.ellipse(108, -130, 14, 24, 0, 0, TAU) }, { lift: 2 })
    box.button(g, 46, -162, 13, '#ff7d5c', 4, '#fff0d0', 1)
    box.glue(g, -110, -40, 6)
  }, {
    wing: { x: 26, y: -96, sprite: box.sprite(200, 150, 160, 40, (g) => { for (let i = 0; i < 5; i++) feather(g, -6 - i * 4, -6 + i * 6, 124 - i * 14, 22, 1.95 - i * 0.3, ['#d8622a', '#f2b134', '#c8442f', '#f6a64f', '#e86a2f'][i]) }) },
    top: { x: 140, y: -178, sprite: box.sprite(90, 60, 16, 34, (g) => box.felt(g, '#ffc02e', [-10, -26, 64, 34], (p) => { p.moveTo(-6, 6); p.quadraticCurveTo(0, -24, 22, -20); p.lineTo(56, 4); p.closePath() })) },
    under: { x: 140, y: -172, sprite: box.sprite(80, 50, 16, 14, (g) => box.felt(g, '#e8961a', [-8, -6, 56, 28], (p) => { p.moveTo(-6, -2); p.lineTo(42, 2); p.quadraticCurveTo(22, 22, -4, 14); p.closePath() })) },
    skirt: { x: 92, y: -46, sprite: box.sprite(120, 110, 60, 20, (g) => { for (let i = 0; i < 4; i++) feather(g, -36 + i * 24, -4, 58, 19, 0.14 - i * 0.1, i % 2 ? '#ffd08a' : '#f6a64f') }) },
  })
}

const CHICK_WOOL: readonly [number, number, number][] = [[255, 214, 64], [255, 190, 70], [255, 232, 120], [250, 204, 104], [255, 222, 84]]

function chick(box: Box, i: number): Figure {
  return figure(box, 130, 160, 64, 138, { x: 0, y: -46 }, [{ x: -2, y: -80, r: 17, lid: '#eab52c' }, { x: 29, y: -78, r: 20, lid: '#eab52c' }], null, (g) => {
    for (const x of [-12, 12]) box.pipe(g, [[x, -14], [x + 1, -4], [x + 12, -2]], 6, '#ff8a2a', '#c25a0c', { lift: 1.5 })
    box.pom(g, 0, -38, 37, 33, CHICK_WOOL[i], { lift: 3 })
    box.pom(g, 6, -74, 33, 31, CHICK_WOOL[i], { lift: 2 })
    // Each has a tuft of its own.
    const tufts: (() => void)[] = [
      () => box.pipe(g, [[4, -102], [2, -114], [10, -124]], 6, '#ffd23f', '#c99a1a', { lift: 1 }),
      () => { for (const a of [-0.5, 0, 0.5]) box.pipe(g, [[4, -100], [4 + a * 14, -112], [4 + a * 26, -118]], 5, '#ff9f45', '#c96d1c', { lift: 1 }) },
      () => box.pom(g, 4, -108, 10, 10, [255, 250, 226], { lift: 1 }),
      () => box.pipe(g, [[0, -102], [-12, -112], [-4, -122], [6, -114], [2, -106]], 5, '#f7dd7a', '#bb9a2c', { lift: 1 }),
      () => { for (const x of [-4, 10]) box.felt(g, '#ffb02e', [x - 8, -126, 18, 28], (p) => { p.moveTo(x, -100); p.quadraticCurveTo(x - 9, -114, x, -126); p.quadraticCurveTo(x + 9, -114, x, -100) }, { lift: 1 }) },
    ]
    tufts[i]()
  }, {
    wing: { x: -12, y: -48, sprite: box.sprite(60, 50, 40, 14, (g) => box.felt(g, '#f5b226', [-32, -8, 38, 34], (p) => { p.moveTo(4, -6); p.quadraticCurveTo(-26, -8, -32, 14); p.quadraticCurveTo(-12, 28, 4, 10); p.closePath() }, { lift: 2 })) },
    top: { x: 40, y: -68, sprite: box.sprite(40, 30, 6, 16, (g) => box.felt(g, '#ff8a2a', [-4, -10, 28, 16], (p) => { p.moveTo(-3, 4); p.quadraticCurveTo(4, -13, 12, -8); p.lineTo(26, 2); p.closePath() }, { lift: 1 })) },
    under: { x: 40, y: -65, sprite: box.sprite(36, 24, 6, 6, (g) => box.felt(g, '#e06c12', [-4, -2, 24, 14], (p) => { p.moveTo(-3, -1); p.lineTo(19, 0); p.quadraticCurveTo(8, 13, -2, 7); p.closePath() }, { lift: 1 })) },
  })
}

const EGG_DOTS: readonly [string, string][] = [['#f25c54', '#ffd23f'], ['#3273dc', '#8fd0ea'], ['#4fae3d', '#ff9f45'], ['#8a4fd0', '#ff9cc0'], ['#19b4b9', '#ffd23f']]
const shell = (p: Pen) => { p.moveTo(0, 0); p.bezierCurveTo(-44, 0, -50, -44, -38, -76); p.bezierCurveTo(-28, -106, -12, -114, 0, -114); p.bezierCurveTo(12, -114, 28, -106, 38, -76); p.bezierCurveTo(50, -44, 44, 0, 0, 0) }
const zig = (p: Pen, up: boolean) => {
  const y = up ? -200 : 20
  p.moveTo(-60, y); p.lineTo(-60, -62)
  for (let i = 0; i < 8; i++) p.lineTo(-60 + (i + 0.5) * 15, -62 + (i % 2 ? 11 : -11))
  p.lineTo(60, -62); p.lineTo(60, y); p.closePath()
}

function eggs(box: Box, i: number): Cast['eggs'][BroodId] {
  const [a, b] = EGG_DOTS[i]
  const paint = (g: Pen) => {
    box.felt(g, '#fff3df', [-46, -114, 92, 114], shell, { lift: 0, fibre: 0.5 })
    g.save(); g.beginPath(); shell(g); g.clip()
    // Dots from the hole punch, and a strip of patterned tape.
    g.fillStyle = b; g.fillRect(-60, -38, 120, 15)
    g.fillStyle = a; for (let k = 0; k < 7; k++) { g.beginPath(); g.arc(-48 + k * 16, -30.5, 4.6, 0, TAU); g.fill() }
    for (const [x, y, r] of [[-20, -76, 9], [6, -96, 6], [27, -62, 7], [-30, -54, 5], [4, -12, 7], [-26, -12, 6]] as const) { g.fillStyle = a; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill() }
    g.fillStyle = 'rgba(255,255,255,0.55)'; g.beginPath(); g.ellipse(-20, -88, 7, 13, 0.5, 0, TAU); g.fill()
    g.fillStyle = 'rgba(90,50,30,0.13)'; g.beginPath(); g.ellipse(24, -18, 26, 56, 0.5, 0, TAU); g.fill()
    g.restore()
  }
  const whole = box.sprite(120, 140, 60, 126, (g) => {
    paint(g)
    // The hole a beak comes out of.
    g.fillStyle = '#5a3524'; g.beginPath(); g.moveTo(8, -62); g.lineTo(16, -71); g.lineTo(24, -66); g.lineTo(33, -60); g.lineTo(26, -51); g.lineTo(14, -52); g.closePath(); g.fill()
  })
  const half = (up: boolean) => box.sprite(120, 140, 60, 126, (g) => { g.beginPath(); zig(g, up); g.clip(); paint(g) })
  return { whole, shadow: box.shadow(whole), bottom: half(false), lid: half(true), beak: box.sprite(40, 30, 8, 14, (g) => { box.felt(g, '#ff8a2a', [-4, -8, 28, 16], (p) => { p.moveTo(-2, -7); p.lineTo(22, 0); p.lineTo(-2, 8); p.closePath() }, { lift: 1 }) }) }
}

export function cutCast(box: Box): Cast {
  const makers: Record<ThingKey, (b: Box) => Figure> = { boot, teapot, pig, farmer, ball, bell }
  const hand = box.sprite(110, 150, 44, 14, (g) => {
    // A cut-out hand with one finger out.
    box.felt(g, '#fffdf6', [-44, -10, 100, 130], (p) => { p.moveTo(-9, 0); p.quadraticCurveTo(0, -12, 9, 0); p.lineTo(11, 46); p.quadraticCurveTo(36, 40, 50, 54); p.quadraticCurveTo(58, 96, 36, 122); p.lineTo(-16, 122); p.quadraticCurveTo(-38, 96, -40, 72); p.quadraticCurveTo(-28, 60, -9, 74); p.closePath() }, { lift: 0, stitch: '#e5a3b6' })
  })
  return {
    things: Object.fromEntries(THINGS.map((k) => [k, makers[k](box)])) as Record<ThingKey, Figure>,
    hen: hen(box),
    chicks: Object.fromEntries(BROOD.map((id, i) => [id, chick(box, i)])) as Record<BroodId, Figure>,
    eggs: Object.fromEntries(BROOD.map((id, i) => [id, eggs(box, i)])) as Cast['eggs'],
    pupil: box.sprite(44, 44, 22, 22, (g) => { g.fillStyle = '#151318'; g.beginPath(); g.arc(0, 0, 20, 0, TAU); g.fill(); g.fillStyle = 'rgba(255,255,255,0.9)'; g.beginPath(); g.ellipse(-7, -8, 5, 4, -0.6, 0, TAU); g.fill() }),
    mouth: box.sprite(50, 50, 25, 25, (g) => { g.fillStyle = '#5a1620'; g.beginPath(); g.ellipse(0, 0, 20, 20, 0, 0, TAU); g.fill(); g.fillStyle = '#f06a7c'; g.beginPath(); g.ellipse(0, 11, 12, 8, 0, 0, TAU); g.fill() }),
    lower: box.sprite(60, 20, 30, 10, (g) => { g.strokeStyle = '#5a1620'; g.lineWidth = 5; g.beginPath(); g.moveTo(-18, -4); g.quadraticCurveTo(0, 8, 18, -4); g.stroke() }),
    hand, handShadow: box.shadow(hand),
    glow: box.sprite(240, 240, 120, 120, (g) => { const r = g.createRadialGradient(0, 0, 30, 0, 0, 118); r.addColorStop(0, 'rgba(255,247,190,0.95)'); r.addColorStop(0.55, 'rgba(255,240,150,0.55)'); r.addColorStop(1, 'rgba(255,240,150,0)'); g.fillStyle = r; g.fillRect(-120, -120, 240, 240) }, 1),
    contact: box.sprite(200, 80, 100, 40, (g) => { g.fillStyle = 'rgba(8,40,44,0.42)'; g.beginPath(); g.ellipse(0, 0, 96, 34, 0, 0, TAU); g.fill() }, 1),
    nestBack: box.sprite(360, 130, 180, 80, (g) => { box.felt(g, '#7a5226', [-160, -60, 320, 100], (p) => p.ellipse(0, -8, 156, 44, 0, 0, TAU), { lift: 5 }); g.fillStyle = '#4d3013'; g.beginPath(); g.ellipse(0, -12, 128, 30, 0, 0, TAU); g.fill() }),
    nestFront: box.sprite(380, 120, 190, 46, (g) => { box.scatter(150, (u, v, w) => { const a = 0.1 + u * 2.94, x = Math.cos(a) * 156, y = 2 + Math.sin(a) * 38 + (v - 0.5) * 20; g.strokeStyle = ['#e8c06a', '#c99642', '#f2d694', '#a9752c', '#f25c54', '#8fd0ea'][w < 0.06 ? 4 : w < 0.12 ? 5 : Math.floor(w * 4)]; g.lineWidth = 4; g.beginPath(); g.moveTo(x - 24, y + (v - 0.5) * 14); g.quadraticCurveTo(x, y + 10 * (w - 0.3), x + 24, y - (v - 0.5) * 16); g.stroke() }) }),
    scarf: Object.fromEntries((Object.keys(YARN) as Gait[]).map((k) => [k, box.sprite(80, 60, 38, 22, (g) => { box.pipe(g, [[-28, 22], [-22, 8], [-20, 2]], 9, ...YARN[k], { lift: 1 }); box.pipe(g, [[-30, -4], [-12, 6], [8, 7], [28, -2]], 10, ...YARN[k], { lift: 2 }) })])) as Record<Gait, Sprite>,
    fx: {
      tea: box.sprite(20, 20, 10, 10, (g) => { g.fillStyle = '#8f4f1e'; g.beginPath(); g.arc(0, 0, 7, 0, TAU); g.fill(); g.fillStyle = 'rgba(255,220,170,0.8)'; g.beginPath(); g.arc(-2, -2.4, 2.2, 0, TAU); g.fill() }),
      steam: box.sprite(60, 60, 30, 30, (g) => box.cotton(g, [[-8, 4, 14], [8, 0, 16], [0, -8, 13]], '#ffffff', 1)),
      water: box.sprite(22, 22, 11, 11, (g) => { g.fillStyle = '#d9effa'; g.beginPath(); g.arc(0, 0, 8, 0, TAU); g.fill(); g.strokeStyle = '#7fb2cf'; g.lineWidth = 2; g.stroke(); g.fillStyle = '#7fb2cf'; g.beginPath(); g.arc(0, 0, 2, 0, TAU); g.fill() }),
      shell: box.sprite(30, 30, 15, 15, (g) => box.felt(g, '#fff3df', [-12, -10, 24, 20], (p) => { p.moveTo(-11, 5); p.lineTo(-2, -10); p.lineTo(11, -2); p.lineTo(4, 9); p.closePath() }, { lift: 1.5 })),
      fluff: box.sprite(24, 24, 12, 12, (g) => box.pom(g, 0, 0, 8, 8, [255, 220, 90], { lift: 1 })),
      feather: box.sprite(30, 40, 15, 20, (g) => box.felt(g, '#f6a64f', [-8, -16, 16, 32], (p) => { p.moveTo(0, -15); p.quadraticCurveTo(10, 0, 0, 15); p.quadraticCurveTo(-10, 0, 0, -15) }, { lift: 1.5 })),
      bubble: box.sprite(30, 30, 15, 15, (g) => { g.strokeStyle = 'rgba(255,255,255,0.9)'; g.lineWidth = 2.5; g.beginPath(); g.arc(0, 0, 11, 0, TAU); g.stroke(); g.fillStyle = 'rgba(200,236,255,0.4)'; g.fill() }),
      dust: box.sprite(20, 20, 10, 10, (g) => { g.fillStyle = '#d8b078'; g.beginPath(); g.arc(0, 0, 6, 0, TAU); g.fill() }),
    },
  }
}
