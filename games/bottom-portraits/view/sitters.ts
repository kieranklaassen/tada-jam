import * as THREE from 'three'
import type { Id } from '../cast'
import { HOLE } from '../cast'
import { BODY, HEAD, Press, sheetOf, swatch, type Print } from './tin'

// The seven, pressed and printed. The printer saved his ink: in front each is
// dressed for a portrait, and behind each is in its underwear.

export type Parts = {
  body: THREE.BufferGeometry
  head: THREE.BufferGeometry | null
  /** Where the head turns on the body. */
  neck: readonly [number, number, number]
  /** Loose pieces, each on its own pivot; `on` says what it is fixed to. */
  loose: readonly { name: string; on: 'body' | 'head'; at: readonly [number, number, number]; geometry: THREE.BufferGeometry }[]
  /** Pupils and lids turn on the line through both eyes, given in the head's own axes. */
  eyes: { at: readonly [number, number, number]; pupils: THREE.BufferGeometry; lids: THREE.BufferGeometry } | null
  sheet: THREE.CanvasTexture
}

const S = { white: swatch(0), ink: swatch(1), a: swatch(2), b: swatch(3), c: swatch(4), d: swatch(5), steel: swatch(6), red: swatch(7), lid: swatch(8), e: swatch(9) }
const INK = '#2b2430'

/** Two eyes on one line: balls to weld onto the head, pupils and lids to turn. */
function eyes(press: Press, at: readonly [number, number, number], apart: number, r: number, pupil = 0.5, splay = 0.25): NonNullable<Parts['eyes']> {
  const pupils = new Press(), lids = new Press()
  for (const side of [-1, 1]) {
    press.shell(S.white, [at[0] + side * apart, at[1], at[2]], [r, r, r], undefined, 20)
    // A cap of a slightly larger ball, so it lies on the eye from any side.
    const cap = new THREE.SphereGeometry(r * 1.035, 18, 8, 0, Math.PI * 2, 0, pupil * 0.95)
    pupils.add(cap, S.ink, { at: [side * apart, 0, 0], turn: [Math.PI / 2, 0, -side * splay] })
    const glint = new THREE.SphereGeometry(r * 1.06, 10, 5, 0, Math.PI * 2, 0, pupil * 0.28)
    pupils.add(glint, S.white, { at: [side * apart, 0, 0], turn: [Math.PI / 2 - 0.22, 0, -side * splay + 0.2] })
    const lid = new THREE.SphereGeometry(r * 1.09, 18, 9, 0, Math.PI * 2, 0, Math.PI * 0.5)
    lids.add(lid, S.lid, { at: [side * apart, 0, 0], turn: [-0.95, 0, 0] })
  }
  return { at, pupils: pupils.weld(), lids: lids.weld() }
}

/** Two cheeks, printed with the back of the body's sheet. */
function bottom(press: Press, y: number, z: number, r: number, apart: number): void {
  for (const side of [-1, 1]) press.shell(BODY, [side * apart, y, z], [r, r * 0.95, r * 0.9], undefined, 22)
}

const feet = (press: Press, tile: ReturnType<typeof swatch>, x: number, z: number, r: number): void => {
  for (const side of [-1, 1]) press.shell(tile, [side * x, r * 0.62, z], [r * 0.85, r * 0.65, r * 1.25], undefined, 18)
}

const drawers = (p: Print, colour: string, top = 22): Print => p.path([[95, -90], [95, top - 8], [120, top], [180, top - 4], [240, top], [265, top - 8], [265, -90]], colour, undefined, 0, false)
const waistband = (p: Print, colour: string, top = 22): Print => p.path([[95, top - 8], [120, top], [180, top - 4], [240, top], [265, top - 8]], null, colour, 9, false)

function elephant(): Parts {
  const skin = '#7f9fb8', dark = '#57768f'
  const sheet = sheetOf((p) => {
    p.fill(skin).screen(dark, 20, -80, 0.5)
    // In front: an admiral's coat.
    p.path([[-95, -90], [-95, 60], [-40, 72], [0, 40], [40, 72], [95, 60], [95, -90]], '#c8362c', undefined, 0, false)
    p.path([[-30, -90], [-26, 62], [0, 36], [26, 62], [30, -90]], '#f6ecd2', undefined, 0, false)
    for (const s of [-1, 1]) {
      p.path([[s * 34, -80], [s * 30, 58]], null, '#e8b33c', 8)
      for (let n = 0; n < 5; n++) p.oval(s * 46, 44 - n * 22, 4.5, 4.5, '#f0c24a', '#8a5a14', 3)
      p.scallops(62, s > 0 ? 50 : -94, s > 0 ? 94 : -50, 11, 6, '#f0c24a', '#8a5a14')
    }
    p.oval(16, 22, 7, 7, '#2f8f93', INK, 2).oval(16, 38, 4, 8, '#e8b33c').oval(16, 22, 3, 3, '#f6ecd2')
    p.screen('#7d1d1a', -10, -80, 0.35)
    // Behind: spotted bloomers.
    drawers(p, '#fbf3df')
    p.dots(100, 262, -70, 12, 17, 4.2, '#d8443a')
    waistband(p, '#f09a9a')
    p.path([[180, 12], [180, -80]], null, '#b9a98a', 4)
  }, (p) => {
    p.fill(skin).screen(dark, 0, -80, 0.4)
    for (const s of [-1, 1]) p.oval(s * 46, -12, 15, 12, '#e98f86')
    for (let n = 0; n < 3; n++) p.path([[-24 + n * 3, 46 + n * 7], [0, 52 + n * 7], [24 - n * 3, 46 + n * 7]], null, dark, 3)
    p.path([[120, 10], [180, 2], [240, 10]], null, dark, 4)
  }, ['#fffaf0', INK, skin, '#e9a7a0', '#f3ead4', dark, '#cfcac0', '#c8362c', '#6a8ba5', '#e8b33c'])
  const body = new Press().shell(BODY, [0, 1.2, 0], [0.92, 0.96, 0.82]).seam(S.steel, [0, 1.2, 0], [0.92, 0.97, 0.83])
  bottom(body, 0.74, -0.5, 0.52, 0.4)
  feet(body, S.a, 0.5, 0.62, 0.42)
  for (const s of [-1, 1]) body.tube(S.red, [[s * 0.78, 1.6, 0.2], [s * 0.98, 1.2, 0.5], [s * 0.72, 0.98, 0.78]], () => 0.2, 8, 8).shell(S.a, [s * 0.68, 0.95, 0.82], [0.22, 0.2, 0.22], undefined, 14)
  // The tail, with its tuft.
  body.tube(S.a, [[0, 1.12, -0.82], [0.05, 0.9, -1.06], [0.16, 0.62, -1.1]], (t) => 0.075 - t * 0.03, 8, 6).shell(S.d, [0.18, 0.54, -1.1], [0.1, 0.15, 0.1], undefined, 10)
  // A cocked hat, on the side of its head.
  const head = new Press().shell(HEAD, [0, 0.5, 0.1], [0.74, 0.7, 0.66])
  head.tube(S.e, [[-0.52, 1.14, 0.1], [0, 1.3, 0.14], [0.52, 1.14, 0.1]], (t) => 0.1 + 0.12 * Math.sin(Math.PI * t), 9, 8)
  head.shell(S.red, [0, 1.22, 0.1], [0.46, 0.2, 0.26], undefined, 18)
  for (const s of [-1, 1]) head.tube(S.white, [[s * 0.28, 0.2, 0.62], [s * 0.36, 0.08, 0.86], [s * 0.34, 0.16, 1.0]], (t) => 0.085 - t * 0.06, 6, 6)
  const e = eyes(head, [0, 0.64, 0.58], 0.27, 0.19)
  const ear = (s: number): THREE.BufferGeometry => new Press().shell(S.a, [s * 0.26, -0.04, 0], [0.34, 0.5, 0.07], undefined, 22).shell(S.b, [s * 0.25, -0.05, 0.035], [0.25, 0.39, 0.06], undefined, 20).weld()
  const trunk = new Press().tube(S.a, [[0, 0, 0], [0, -0.16, 0.26], [0, -0.5, 0.36], [0, -0.82, 0.3], [0, -0.96, 0.46]], (t) => 0.23 - t * 0.12, 15, 10)
  for (let n = 1; n < 6; n++) trunk.add(new THREE.TorusGeometry(0.235 - n * 0.016, 0.018, 5, 18), S.d, { at: [0, -0.1 - n * 0.115, 0.24 + Math.sin(n * 0.6) * 0.1], turn: [1.15 + n * 0.06, 0, 0] })
  return {
    body: body.weld(), head: head.weld(), neck: [0, 2.0, 0.06], eyes: e, sheet,
    loose: [
      { name: 'ear-left', on: 'head', at: [-0.6, 0.58, 0.02], geometry: ear(-1) },
      { name: 'ear-right', on: 'head', at: [0.6, 0.58, 0.02], geometry: ear(1) },
      { name: 'trunk', on: 'head', at: [0, 0.4, 0.64], geometry: trunk.weld() },
    ],
  }
}

function hen(): Parts {
  const white = '#fbf6ea', line = '#c99b62'
  const sheet = sheetOf((p) => {
    p.fill(white)
    for (let lat = 60, row = 0; lat > -80; lat -= 13, row++) for (let lon = -180; lon < 180; lon += 20) p.path([[lon - 9 + (row % 2) * 10, lat + 6], [lon + (row % 2) * 10, lat - 12], [lon + 9 + (row % 2) * 10, lat + 6]], null, line, 2.5)
    // In front: a lace fichu and a string of pearls.
    p.path([[-70, 30], [-60, 66], [0, 76], [60, 66], [70, 30], [0, -26]], '#9b6bb0', undefined, 0, false)
    p.scallops(30, -70, 0, 14, 6, '#fff').scallops(30, 0, 70, 14, 6, '#fff')
    p.path([[-70, 32], [0, -22], [70, 32]], null, '#fff', 9, false)
    for (let n = -4; n <= 4; n++) p.oval(n * 10, 44 - (16 - n * n) * 1.1, 4, 4, '#fdf3d0', '#b58a3c', 2)
    // Behind: frilled drawers in pink stripes.
    drawers(p, '#f7c6c8', 14)
    for (let lon = 100; lon < 264; lon += 16) p.patch(lon, lon + 7, -90, 8, '#e0707c')
    p.scallops(8, 96, 264, 14, 6, '#fff', '#d7909a')
  }, (p) => {
    p.fill(white)
    for (const s of [-1, 1]) p.oval(s * 58, -8, 16, 18, '#f2a08f')
    p.screen(line, -30, -80, 0.5)
  }, ['#fffaf0', INK, white, '#e8a13a', '#d33a32', '#b98a4e', '#cfcac0', '#d33a32', '#f2dcc0', '#e9cfa2'])
  const body = new Press().shell(BODY, [0, 1.12, 0], [0.74, 0.72, 0.8]).seam(S.steel, [0, 1.12, 0], [0.74, 0.73, 0.81])
  bottom(body, 0.8, -0.42, 0.44, 0.31)
  // A fan of tail plates standing up behind.
  for (let n = -2; n <= 2; n++) body.add(new THREE.SphereGeometry(1, 16, 10), n % 2 ? S.b : S.a, { at: [n * 0.15, 1.72 - Math.abs(n) * 0.06, -0.76], size: [0.16, 0.44, 0.06], turn: [-0.35, 0, -n * 0.24] })
  for (const s of [-1, 1]) body.tube(S.b, [[s * 0.3, 0.5, 0.18], [s * 0.32, 0.1, 0.26]], () => 0.09, 3, 6).shell(S.b, [s * 0.32, 0.07, 0.42], [0.2, 0.075, 0.3], undefined, 14)
  const head = new Press().tube(S.a, [[0, -0.1, -0.12], [0, 0.18, 0.02], [0, 0.4, 0.06]], (t) => 0.36 - t * 0.08, 8, 10).shell(HEAD, [0, 0.5, 0.08], [0.36, 0.38, 0.36])
  for (let n = 0; n < 4; n++) head.shell(S.c, [0, 0.86 + [0, 0.1, 0.08, -0.02][n], 0.3 - n * 0.18], [0.075, 0.17, 0.12], undefined, 12)
  head.add(new THREE.ConeGeometry(0.15, 0.36, 14), S.b, { at: [0, 0.42, 0.55], turn: [Math.PI / 2, 0, 0] })
  for (const s of [-1, 1]) head.shell(S.c, [s * 0.09, 0.22, 0.44], [0.08, 0.15, 0.06], undefined, 12)
  const e = eyes(head, [0, 0.62, 0.3], 0.2, 0.145, 0.42, 0.45)
  const wing = (s: number): THREE.BufferGeometry => new Press().shell(S.e, [s * 0.03, -0.22, -0.1], [0.09, 0.36, 0.46], [0.5, 0, 0], 20).shell(S.b, [s * 0.06, -0.3, -0.2], [0.07, 0.22, 0.3], [0.5, 0, 0], 16).weld()
  return {
    body: body.weld(), head: head.weld(), neck: [0, 1.6, 0.26], eyes: e, sheet,
    loose: [
      { name: 'wing-left', on: 'body', at: [-0.74, 1.4, 0.06], geometry: wing(-1) },
      { name: 'wing-right', on: 'body', at: [0.74, 1.4, 0.06], geometry: wing(1) },
    ],
  }
}

function hippo(): Parts {
  const skin = '#b489b8', dark = '#8a5f93'
  const sheet = sheetOf((p) => {
    p.fill(skin).screen(dark, 24, -80, 0.5)
    // In front: a tea gown with a lace yoke and a rose.
    p.path([[-95, -90], [-95, 50], [-50, 66], [0, 58], [50, 66], [95, 50], [95, -90]], '#2f8f86', undefined, 0, false)
    p.path([[-46, 64], [-40, 24], [0, 10], [40, 24], [46, 64], [0, 56]], '#fbf0dc', undefined, 0, false)
    p.scallops(18, -46, 46, 11.5, 6, '#fbf0dc', '#bfa57c')
    for (let row = 0; row < 4; row++) p.scallops(-14 - row * 18, -94, 94, 18, 9, row % 2 ? '#2a7f77' : '#38a096', '#1d615b')
    p.oval(0, 34, 9, 9, '#e0566a', '#8b2238', 3).oval(0, 34, 4.5, 4.5, '#f4a0a8', '#8b2238', 2).oval(12, 27, 7, 3.5, '#5f9a3d').oval(-12, 27, 7, 3.5, '#5f9a3d')
    // Behind: a striped bathing costume with a patch.
    drawers(p, '#fdf6e4', 52).stripes(95, 265, -88, 46, 9, '#2d5fa8')
    p.path([[95, -90], [95, 44]], null, '#2d5fa8', 6).path([[265, -90], [265, 44]], null, '#2d5fa8', 6)
    p.path([[204, -22], [228, -18], [230, -44], [206, -46], [204, -22]], '#f2b84b', INK, 3, false)
    for (let n = 0; n < 4; n++) { p.path([[207 + n * 6, -18], [207 + n * 6, -25]], null, INK, 3); p.path([[207 + n * 6, -42], [207 + n * 6, -49]], null, INK, 3) }
  }, (p) => {
    p.fill(skin).screen(dark, -8, -80, 0.4)
    for (const s of [-1, 1]) p.oval(s * 60, 0, 16, 14, '#e389a0')
    p.path([[120, 4], [180, -4], [240, 4]], null, dark, 4)
  }, ['#fffaf0', INK, skin, '#e3a3b4', '#d4556f', dark, '#cfcac0', '#2f8f86', '#9a6ea0', '#f2b84b'])
  const body = new Press().shell(BODY, [0, 1.12, 0], [1.02, 0.94, 0.86]).seam(S.steel, [0, 1.12, 0], [1.02, 0.95, 0.87])
  bottom(body, 0.78, -0.48, 0.6, 0.46)
  feet(body, S.a, 0.5, 0.62, 0.42)
  for (const s of [-1, 1]) body.tube(S.red, [[s * 0.84, 1.5, 0.2], [s * 1.04, 1.1, 0.48], [s * 0.74, 0.94, 0.74]], () => 0.2, 8, 8).shell(S.a, [s * 0.7, 0.92, 0.78], [0.23, 0.2, 0.22], undefined, 14)
  body.shell(S.a, [0, 1.12, -1.0], [0.1, 0.16, 0.1], [0.5, 0, 0], 12)
  const head = new Press().shell(HEAD, [0, 0.42, 0.06], [0.64, 0.5, 0.52]).shell(S.a, [0, 0.36, 0.5], [0.62, 0.26, 0.36], undefined, 24)
  for (const s of [-1, 1]) {
    head.shell(S.d, [s * 0.2, 0.54, 0.72], [0.075, 0.06, 0.06], undefined, 10)
    head.shell(S.a, [s * 0.5, 0.86, -0.08], [0.15, 0.18, 0.09], undefined, 14).shell(S.b, [s * 0.5, 0.86, -0.03], [0.09, 0.12, 0.07], undefined, 12)
  }
  // Curl papers.
  for (let n = -1; n <= 1; n++) head.disc(S.e, [n * 0.2, 0.9, 0.04 - Math.abs(n) * 0.04], 0.1, 0.16, [0, 0, Math.PI / 2]).disc(S.white, [n * 0.2, 0.9, 0.04 - Math.abs(n) * 0.04], 0.06, 0.19, [0, 0, Math.PI / 2])
  const e = eyes(head, [0, 0.76, 0.34], 0.27, 0.17)
  const jaw = new Press().shell(S.a, [0, -0.1, 0.3], [0.58, 0.2, 0.42], undefined, 24).shell(S.c, [0, 0.0, 0.3], [0.46, 0.12, 0.32], undefined, 18)
  for (const s of [-1, 1]) jaw.shell(S.white, [s * 0.3, 0.08, 0.5], [0.085, 0.13, 0.085], undefined, 12)
  return { body: body.weld(), head: head.weld(), neck: [0, 1.76, 0.22], eyes: e, sheet, loose: [{ name: 'jaw', on: 'head', at: [0, 0.22, 0.16], geometry: jaw.weld() }] }
}

function pig(): Parts {
  const skin = '#f2a9a4', dark = '#d4736f'
  const sheet = sheetOf((p) => {
    p.fill(skin).screen(dark, 10, -80, 0.5)
    // In front: a checked waistcoat and a watch chain.
    p.path([[-100, -90], [-100, 46], [-34, 70], [0, 34], [34, 70], [100, 46], [100, -90]], '#e3a130', undefined, 0, false)
    for (let lon = -96; lon < 98; lon += 16) p.path([[lon, -90], [lon, 40]], null, '#a9601d', 3)
    for (let lat = -70; lat < 42; lat += 16) p.path([[-98, lat], [98, lat]], null, '#a9601d', 3)
    p.path([[-30, 70], [0, 34], [30, 70]], '#fff8e8', undefined, 0, false)
    p.path([[0, 36], [0, -90]], null, '#7a3f12', 4)
    for (let n = 0; n < 4; n++) p.oval(0, 22 - n * 20, 4.5, 4.5, '#2f7f86', INK, 2)
    p.path([[-44, -4], [-20, -26], [0, -6]], null, '#fff0b0', 6).oval(-46, -4, 7, 8, '#fff0b0', '#8a5a14', 3)
    // Behind: red long johns, buttoned flap half undone.
    drawers(p, '#d23b34', 60)
    p.path([[134, 14], [226, 14], [222, -52], [138, -52], [134, 14]], '#e25048', '#7d1612', 5, false)
    p.oval(140, 9, 5, 5, '#fff4d8', INK, 2).oval(220, 9, 5, 5, '#fff4d8', INK, 2).oval(180, 9, 5, 5, '#fff4d8', INK, 2)
    p.screen('#7d1612', -20, -80, 0.3)
  }, (p) => {
    p.fill(skin).screen(dark, -14, -80, 0.4)
    for (const s of [-1, 1]) p.oval(s * 48, -8, 16, 14, '#ea7077')
    p.path([[-22, -38], [0, -46], [22, -38]], null, '#a13e44', 5)
  }, ['#fffaf0', INK, skin, '#e98a8a', '#b5474b', dark, '#cfcac0', '#e3a130', '#e08d89', '#2f7f86'])
  const body = new Press().shell(BODY, [0, 1.0, 0], [0.8, 0.8, 0.74]).seam(S.steel, [0, 1.0, 0], [0.8, 0.81, 0.75])
  bottom(body, 0.66, -0.42, 0.46, 0.35)
  feet(body, S.d, 0.42, 0.52, 0.34)
  for (const s of [-1, 1]) body.tube(S.red, [[s * 0.66, 1.34, 0.16], [s * 0.84, 1.02, 0.42], [s * 0.6, 0.84, 0.64]], () => 0.16, 8, 8).shell(S.d, [s * 0.57, 0.82, 0.68], [0.18, 0.16, 0.18], undefined, 12)
  const head = new Press().shell(HEAD, [0, 0.4, 0.08], [0.58, 0.54, 0.5]).disc(S.b, [0, 0.3, 0.6], 0.24, 0.2, [Math.PI / 2, 0, 0], 0.22)
  for (const s of [-1, 1]) head.shell(S.c, [s * 0.09, 0.3, 0.7], [0.045, 0.07, 0.03], undefined, 10)
  // A bowler that is too small.
  head.disc(S.e, [0.1, 0.93, 0], 0.34, 0.05, [0, 0, -0.14]).shell(S.e, [0.12, 0.98, 0], [0.24, 0.24, 0.24], undefined, 18)
  const e = eyes(head, [0, 0.58, 0.46], 0.21, 0.155)
  const ear = (s: number): THREE.BufferGeometry => new Press().shell(S.a, [s * 0.08, 0.16, 0], [0.16, 0.24, 0.07], [0, 0, -s * 0.5], 16).shell(S.b, [s * 0.08, 0.15, 0.04], [0.1, 0.16, 0.05], [0, 0, -s * 0.5], 14).weld()
  const curl: [number, number, number][] = []
  for (let n = 0; n <= 14; n++) curl.push([Math.cos(n * 1.25) * (0.13 - n * 0.004), Math.sin(n * 1.25) * (0.13 - n * 0.004), -n * 0.026])
  return {
    body: body.weld(), head: head.weld(), neck: [0, 1.56, 0.18], eyes: e, sheet,
    loose: [
      { name: 'ear-left', on: 'head', at: [-0.38, 0.74, 0.1], geometry: ear(-1) },
      { name: 'ear-right', on: 'head', at: [0.4, 0.74, 0.1], geometry: ear(1) },
      { name: 'tail', on: 'body', at: [0, 0.9, -0.74], geometry: new Press().tube(S.a, curl, () => 0.045, 40, 8).weld() },
    ],
  }
}

function giraffe(): Parts {
  const skin = '#f4c75c', spot = '#b8652a'
  const spots = (p: Print, seed: number): void => {
    let s = seed
    const next = (): number => ((s = (s * 16807) % 2147483647) / 2147483647)
    for (let lat = -70; lat < 80; lat += 24) for (let lon = -180; lon < 170; lon += 36) {
      const a = lon + next() * 14, b = lat + next() * 8
      p.path([[a - 13, b - 4], [a - 5, b + 9], [a + 9, b + 8], [a + 13, b - 2], [a + 3, b - 10], [a - 13, b - 4]], spot, undefined, 0, false)
    }
  }
  const sheet = sheetOf((p) => {
    p.fill(skin)
    spots(p, 11)
    // In front: a dinner jacket and a bow tie.
    p.path([[-100, -90], [-100, 60], [-40, 74], [0, 60], [40, 74], [100, 60], [100, -90]], '#28324e', undefined, 0, false)
    p.path([[-36, 74], [-24, 0], [0, -60], [24, 0], [36, 74], [0, 62]], '#fffaf0', undefined, 0, false)
    p.path([[-2, 50], [-26, 62], [-26, 38], [-2, 50]], '#d33a32', INK, 2, false).path([[2, 50], [26, 62], [26, 38], [2, 50]], '#d33a32', INK, 2, false).oval(0, 50, 5, 5, '#f0675e', INK, 2)
    for (let n = 0; n < 3; n++) p.oval(0, 26 - n * 24, 3.4, 3.4, INK)
    // Behind: long drawers printed with fish.
    drawers(p, '#8fd0cf', 48)
    for (let lat = -62, row = 0; lat < 36; lat += 26, row++) for (let lon = 112 + (row % 2) * 18; lon < 256; lon += 36) {
      p.path([[lon - 14, lat + 6], [lon - 8, lat], [lon - 14, lat - 6], [lon - 14, lat + 6]], '#ef7a3a', undefined, 0, false).oval(lon, lat, 9, 6, '#ef7a3a').oval(lon + 4, lat + 1, 1.4, 1.4, INK)
    }
    waistband(p, '#ef7a3a', 48)
  }, (p) => {
    p.fill(skin)
    for (const s of [-1, 1]) p.oval(s * 50, -4, 15, 13, '#f19a6b')
    p.oval(0, 60, 22, 10, spot).oval(120, 30, 15, 10, spot).oval(200, 10, 18, 11, spot).oval(-100, 26, 14, 10, spot).screen(spot, -40, -80, 0.3)
  }, ['#fffaf0', INK, skin, '#f7e0b0', '#8a4a22', spot, '#cfcac0', '#28324e', '#d99a3c', '#5e3718'])
  const body = new Press().shell(BODY, [0, 1.04, 0], [0.72, 0.86, 0.68]).seam(S.steel, [0, 1.04, 0], [0.72, 0.87, 0.69])
  bottom(body, 0.68, -0.4, 0.42, 0.32)
  for (const s of [-1, 1]) {
    body.tube(S.a, [[s * 0.4, 0.5, 0.3], [s * 0.56, 0.75, 0.72], [s * 0.5, 0.12, 0.86]], () => 0.12, 9, 8).shell(S.e, [s * 0.5, 0.1, 0.88], [0.15, 0.1, 0.18], undefined, 12)
    body.tube(S.red, [[s * 0.58, 1.46, 0.1], [s * 0.74, 1.12, 0.34], [s * 0.4, 0.92, 0.66]], () => 0.13, 8, 8).shell(S.e, [s * 0.37, 0.9, 0.68], [0.13, 0.12, 0.14], undefined, 12)
  }
  body.tube(S.a, [[0, 0.98, -0.72], [0.08, 0.8, -0.98], [0.14, 0.44, -1.0]], () => 0.045, 8, 6).shell(S.e, [0.15, 0.38, -1.0], [0.09, 0.15, 0.09], undefined, 10)
  // The neck and head are one piece that turns low on the body.
  const head = new Press().tube(S.a, [[0, -0.1, -0.1], [0, 0.5, 0.02], [0, 1.2, 0.04], [0, 2.0, 0.12]], (t) => 0.3 - t * 0.11, 16, 12)
  for (let n = 0; n < 11; n++) {
    const y = 0.14 + n * 0.17, a = n * 2.2, r = 0.29 - (y / 2.1) * 0.11
    head.shell(S.d, [Math.sin(a) * r * 0.72, y, 0.02 + Math.cos(a) * r * 0.72], [0.1, 0.085, 0.1], undefined, 10)
  }
  for (let n = 0; n < 9; n++) head.shell(S.e, [0, 0.4 + n * 0.19, -0.2 + n * 0.014], [0.05, 0.12, 0.09], undefined, 8)
  head.shell(HEAD, [0, 2.2, 0.22], [0.36, 0.36, 0.4]).shell(S.b, [0, 2.06, 0.58], [0.27, 0.21, 0.3], undefined, 20)
  for (const s of [-1, 1]) {
    head.shell(S.c, [s * 0.1, 2.13, 0.85], [0.04, 0.05, 0.03], undefined, 8)
    head.tube(S.e, [[s * 0.14, 2.48, 0.12], [s * 0.18, 2.74, 0.06]], () => 0.05, 3, 6).shell(S.e, [s * 0.18, 2.76, 0.06], [0.09, 0.09, 0.09], undefined, 10)
    head.shell(S.a, [s * 0.47, 2.3, 0.06], [0.2, 0.1, 0.06], [0, 0, s * 0.35], 14)
  }
  const e = eyes(head, [0, 2.36, 0.46], 0.2, 0.15)
  return { body: body.weld(), head: head.weld(), neck: [0, 1.66, 0.06], eyes: e, sheet, loose: [] }
}

function crocodile(): Parts {
  const skin = '#5fa052', dark = '#2f6b3b'
  const sheet = sheetOf((p) => {
    p.fill(skin)
    for (let lat = 80, row = 0; lat > 0; lat -= 14, row++) for (let lon = -180; lon < 180; lon += 18) p.oval(lon + (row % 2) * 9, lat, 7.5, 6, row % 2 ? '#6fb45f' : '#559348', dark, 2)
    p.patch(-180, 180, -90, -20, '#f1dd8c')
    for (let lon = -180; lon < 180; lon += 12) p.path([[lon, -20], [lon, -80]], null, '#c9a94e', 3)
    // Behind: a frilled skirt of a tutu, which fools nobody.
    drawers(p, '#f5a7c0', 40)
    for (let row = 0; row < 4; row++) p.scallops(30 - row * 24, 96, 264, 14, 9, row % 2 ? '#f5a7c0' : '#fbd3de', '#cf6f90')
    // In front: a starched bib.
    p.path([[-44, 40], [44, 40], [36, -60], [0, -76], [-36, -60], [-44, 40]], '#fffaf0', '#b9ab90', 3)
    p.dots(-30, 30, -50, 26, 18, 3.6, '#d33a32')
  }, (p) => {
    p.fill(skin).screen(dark, 60, -30, 0.35)
    p.patch(-180, 180, -90, -30, '#f1dd8c')
  }, ['#fffaf0', INK, skin, '#f1dd8c', '#c94f55', dark, '#cfcac0', '#f5a7c0', '#4d8a44', '#86c272'])
  const body = new Press().shell(BODY, [0, 0.8, -0.02], [0.54, 0.46, 0.74]).seam(S.steel, [0, 0.8, -0.02], [0.54, 0.47, 0.75])
  bottom(body, 0.72, -0.5, 0.34, 0.26)
  for (let n = 0; n < 5; n++) for (const s of [-1, 1]) body.add(new THREE.ConeGeometry(0.09, 0.2, 4), S.d, { at: [s * 0.16, 1.24 - Math.abs(n - 2) * 0.05, 0.34 - n * 0.2], turn: [-0.1 * (n - 2), 0, -s * 0.3] })
  for (const s of [-1, 1]) for (const z of [0.36, -0.42]) body.tube(S.a, [[s * 0.42, 0.66, z], [s * 0.68, 0.5, z + 0.06], [s * 0.62, 0.12, z + 0.14]], () => 0.13, 6, 8).shell(S.e, [s * 0.62, 0.09, z + 0.22], [0.17, 0.09, 0.22], undefined, 12)
  const head = new Press().shell(HEAD, [0, 0.14, 0.14], [0.42, 0.32, 0.4]).tube(S.a, [[0, 0.1, 0.3], [0, 0.08, 0.7], [0, 0.1, 0.92]], (t) => 0.27 - t * 0.09, 10, 10)
  for (const s of [-1, 1]) {
    head.shell(S.d, [s * 0.09, 0.28, 1.0], [0.06, 0.05, 0.06], undefined, 8)
    for (let n = 0; n < 5; n++) head.add(new THREE.ConeGeometry(0.05, 0.14, 8), S.white, { at: [s * (0.23 - n * 0.018), -0.07 + n * 0.008, 0.46 + n * 0.12], turn: [Math.PI, 0, s * 0.15] })
  }
  for (const s of [-1, 0, 1]) head.add(new THREE.ConeGeometry(0.05, 0.16, 8), S.white, { at: [s * 0.09, -0.04, 1.06], turn: [Math.PI + 0.2, 0, 0] })
  const e = eyes(head, [0, 0.42, 0.2], 0.2, 0.18)
  const jaw = new Press().tube(S.b, [[0, -0.02, 0], [0, -0.04, 0.4], [0, -0.02, 0.74]], (t) => 0.23 - t * 0.08, 10, 10)
  const tail = new Press().tube(S.a, [[0, 0, 0], [0.1, 0.12, -0.24], [0.36, 0.5, -0.3], [0.3, 0.86, -0.12], [0.14, 0.94, 0.06]], (t) => 0.26 - t * 0.2, 14, 9)
  for (let n = 0; n < 4; n++) tail.add(new THREE.ConeGeometry(0.07, 0.16, 4), S.d, { at: [[0.06, 0.2, 0.42, 0.44][n], [0.3, 0.48, 0.66, 0.9][n] - 0.02, [-0.36, -0.44, -0.36, -0.14][n]], turn: [-0.9 + n * 0.35, 0, -0.2 * n] })
  return {
    body: body.weld(), head: head.weld(), neck: [0, 0.98, 0.3], eyes: e, sheet,
    loose: [
      { name: 'jaw', on: 'head', at: [0, -0.1, 0.22], geometry: jaw.weld() },
      { name: 'tail', on: 'body', at: [0, 0.78, -0.68], geometry: tail.weld() },
    ],
  }
}

/** The board's outline: a rounded arch, with the hole for a face. */
function boardShape(): THREE.Shape {
  const shape = new THREE.Shape()
  shape.moveTo(-1.0, 0.28)
  shape.lineTo(1.0, 0.28)
  shape.lineTo(1.0, 1.86)
  shape.absarc(0, 1.86, 0.98, 0, Math.PI, false)
  shape.lineTo(-1.0, 0.28)
  const hole = new THREE.Path()
  hole.absarc(0, HOLE.y, HOLE.r, 0, Math.PI * 2, true)
  shape.holes.push(hole)
  return shape
}

function board(): Parts {
  // The whole sheet's upper half is the painted lady, laid flat; its right half is her back.
  const { geometry, sheet } = boardFace()
  return { body: geometry, head: null, neck: [0, 0, 0], eyes: null, sheet, loose: [] }
}

function boardFace(): { geometry: THREE.BufferGeometry; sheet: THREE.CanvasTexture } {
  const sheet = sheetOf((p) => {
    p.fill('#8ccbd0')
  }, (p) => { p.fill('#c9a878') }, ['#fffaf0', INK, '#b98d5a', '#f5a7c0', '#d33a32', '#7d5a34', '#cfcac0', '#e8b33c', '#b98d5a', '#f3c9a4'])
  const pen = (sheet.image as HTMLCanvasElement).getContext('2d')!
  // Board space: x from -1 to 1, y from 0.28 to 3.36, laid on the left 512 px of the upper half.
  let left = 0
  const X = (x: number): number => left + 256 + x * 250, Y0 = (y: number): number => 506 - ((y - 0.28) / 3.1) * 500, Y = (y: number): number => Y0(y < 1.95 ? 0.28 + (y - 0.28) * 0.66 : y === HOLE.y ? y : y < 2.15 ? 1.38 + (y - 1.95) * 0.6 : y - 0.62)
  const blob = (points: readonly (readonly [number, number])[], colour: string, line: string | null = INK, width = 4): void => {
    pen.beginPath()
    points.forEach(([x, y], i) => {
      if (i === 0) { pen.moveTo(X(x), Y(y)); return }
      const [nx, ny] = points[(i + 1) % points.length]
      pen.quadraticCurveTo(X(x), Y(y), X((x + nx) / 2), Y((y + ny) / 2))
    })
    pen.closePath()
    pen.fillStyle = colour
    pen.fill()
    if (line) { pen.strokeStyle = line; pen.lineWidth = width; pen.stroke() }
  }
  const oval = (x: number, y: number, rx: number, ry: number, colour: string): void => { pen.beginPath(); pen.ellipse(X(x), Y(y), rx * 250, ry * 161, 0, 0, 7); pen.fillStyle = colour; pen.fill() }
  const sky = pen.createLinearGradient(0, 0, 0, 512)
  sky.addColorStop(0, '#7cc4cf')
  sky.addColorStop(0.75, '#d8ecdc')
  sky.addColorStop(0.76, '#e9b75b')
  sky.addColorStop(1, '#d38f3a')
  pen.fillStyle = sky
  pen.fillRect(0, 0, 512, 512)
  for (let n = 0; n < 9; n++) { pen.fillStyle = 'rgba(255,255,255,0.28)'; pen.save(); pen.translate(X(0), Y0(HOLE.y)); pen.rotate((n / 9) * Math.PI * 2); pen.beginPath(); pen.moveTo(0, 0); pen.lineTo(-26, -460); pen.lineTo(26, -460); pen.fill(); pen.restore() }
  // A strong lady in a tutu, arms up, with hair piled round the hole.
  blob([[-0.68, 2.5], [-0.72, 3.0], [-0.2, 3.3], [0.2, 3.3], [0.72, 3.0], [0.68, 2.5], [0.5, 2.16], [-0.5, 2.16]], '#7a3f1c')
  for (const s of [-1, 1]) {
    blob([[s * 0.2, 1.72], [s * 0.5, 1.86], [s * 0.9, 2.16], [s * 0.97, 2.75], [s * 0.86, 2.85], [s * 0.76, 2.3], [s * 0.3, 1.5]], '#f3c9a4')
    blob([[s * 0.1, 0.95], [s * 0.34, 0.95], [s * 0.36, 0.5], [s * 0.3, 0.34], [s * 0.12, 0.34]], '#f3c9a4')
    blob([[s * 0.08, 0.4], [s * 0.4, 0.44], [s * 0.46, 0.32], [s * 0.08, 0.3]], '#d33a32')
  }
  blob([[-0.28, 1.95], [0.28, 1.95], [0.32, 1.5], [0.22, 1.2], [-0.22, 1.2], [-0.32, 1.5]], '#d33a32')
  blob([[-0.2, 1.32], [0.2, 1.32], [0.6, 1.2], [0.9, 0.96], [0.6, 0.84], [0.3, 0.92], [0, 0.82], [-0.3, 0.92], [-0.6, 0.84], [-0.9, 0.96], [-0.6, 1.2]], '#f5a7c0')
  for (let n = -3; n <= 3; n++) oval(n * 0.12, 1.86 - Math.abs(n) * 0.012, 0.035, 0.04, '#fff6d8')
  for (const s of [-1, 1]) oval(s * 0.36, 3.06, 0.09, 0.08, '#e8b33c')
  pen.strokeStyle = '#e8b33c'
  pen.lineWidth = 12
  pen.beginPath(); pen.ellipse(X(0), Y0(HOLE.y), HOLE.r * 250 + 5, HOLE.r * 161 + 5, 0, 0, 7); pen.stroke()
  // The back: the same lady from behind, and what she wears under it.
  left = 512
  pen.save()
  pen.beginPath()
  pen.rect(512, 0, 512, 512)
  pen.clip()
  pen.fillStyle = '#e3cfa6'
  pen.fillRect(512, 0, 512, 512)
  pen.strokeStyle = 'rgba(150,110,60,0.35)'
  pen.lineWidth = 3
  for (let n = 0; n < 16; n++) { pen.beginPath(); pen.moveTo(512 + n * 34, 0); pen.lineTo(512 + n * 34 + ((n * 37) % 11) - 5, 512); pen.stroke() }
  blob([[-0.68, 2.5], [-0.72, 3.0], [-0.2, 3.3], [0.2, 3.3], [0.72, 3.0], [0.68, 2.5], [0.5, 2.16], [-0.5, 2.16]], '#7a3f1c')
  for (const s of [-1, 1]) {
    blob([[s * 0.2, 1.72], [s * 0.5, 1.86], [s * 0.9, 2.16], [s * 0.97, 2.75], [s * 0.86, 2.85], [s * 0.76, 2.3], [s * 0.3, 1.5]], '#f3c9a4')
    blob([[s * 0.1, 0.95], [s * 0.34, 0.95], [s * 0.36, 0.5], [s * 0.3, 0.34], [s * 0.12, 0.34]], '#f3c9a4')
    blob([[s * 0.08, 0.4], [s * 0.4, 0.44], [s * 0.46, 0.32], [s * 0.08, 0.3]], '#d33a32')
  }
  blob([[-0.28, 1.95], [0.28, 1.95], [0.32, 1.5], [0.22, 1.2], [-0.22, 1.2], [-0.32, 1.5]], '#d33a32')
  pen.strokeStyle = '#fff6d8'
  pen.lineWidth = 5
  for (let n = 0; n < 4; n++) { pen.beginPath(); pen.moveTo(X(-0.1), Y(1.86 - n * 0.13)); pen.lineTo(X(0.1), Y(1.78 - n * 0.13)); pen.moveTo(X(0.1), Y(1.86 - n * 0.13)); pen.lineTo(X(-0.1), Y(1.78 - n * 0.13)); pen.stroke() }
  // Her skirt stands straight up behind, over striped drawers.
  blob([[-0.95, 1.36], [-0.5, 1.62], [0, 1.5], [0.5, 1.62], [0.95, 1.36], [0.5, 1.2], [-0.5, 1.2]], '#f5a7c0')
  for (const s of [-1, 1]) {
    blob([[s * 0.01, 1.26], [s * 0.44, 1.28], [s * 0.58, 1.02], [s * 0.48, 0.74], [s * 0.1, 0.7], [s * 0.01, 0.86]], '#fbf3df')
    for (let n = 0; n < 4; n++) { pen.strokeStyle = '#2f8f93'; pen.lineWidth = 7; pen.beginPath(); pen.moveTo(X(s * (0.12 + n * 0.11)), Y(1.2)); pen.lineTo(X(s * (0.14 + n * 0.11)), Y(0.8)); pen.stroke() }
  }
  blob([[-0.16, 1.02], [0.1, 1.06], [0.14, 0.84], [-0.12, 0.82]], '#e8b33c', INK, 3)
  pen.strokeStyle = '#e8b33c'
  pen.lineWidth = 12
  pen.beginPath(); pen.ellipse(X(0), Y0(HOLE.y), HOLE.r * 250 + 5, HOLE.r * 161 + 5, 0, 0, 7); pen.stroke()
  pen.restore()
  sheet.needsUpdate = true

  const face = (front: boolean): THREE.BufferGeometry => {
    const flat = new THREE.ShapeGeometry(boardShape(), 24), at = flat.getAttribute('position'), uv = flat.getAttribute('uv') as THREE.BufferAttribute
    for (let i = 0; i < at.count; i++) uv.setXY(i, (256 + at.getX(i) * 250) / 512, ((at.getY(i) - 0.28) / 3.1) * (500 / 512) + 6 / 512)
    flat.translate(0, 0, front ? 0.1 : 0.02)
    if (!front) {
      const index = flat.index!
      for (let i = 0; i < index.count; i += 3) { const a = index.getX(i); index.setX(i, index.getX(i + 1)); index.setX(i + 1, a) }
      flat.computeVertexNormals()
    }
    return flat
  }
  const edge = new THREE.ExtrudeGeometry(boardShape(), { depth: 0.078, bevelEnabled: false, curveSegments: 24 })
  edge.translate(0, 0, 0.021)
  const press = new Press().add(face(true), [0, 0, 512, 512]).add(face(false), [512, 0, 512, 512]).add(edge, S.steel)
  for (const s of [-1, 1]) press.tube(S.a, [[s * 0.62, 1.5, 0.0], [s * 0.6, 0.06, -0.52]], () => 0.05, 2, 6)
  press.tube(S.a, [[-0.56, 0.62, -0.32], [0.56, 0.62, -0.32]], () => 0.045, 2, 6)
  press.tube(S.a, [[-0.7, 0.2, 0.06], [0.7, 0.2, 0.06]], () => 0.09, 2, 8)
  return { geometry: press.weld(), sheet }
}

export const MAKERS: Readonly<Record<Id, () => Parts>> = { elephant, hen, hippo, pig, giraffe, crocodile, board }
