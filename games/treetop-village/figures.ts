import { C, INK, PAPER, blob, card, curve, line, poly, print, round, type G, type SpriteDef } from './paint'

// The five tree folk as printed cards, each drawn from its feet and facing
// right. They carry the look and the comedy: large in the frame, with a face
// that does something. The whites of their eyes are printed here; the pupils
// are drawn live, so every walker looks at what is happening. Each has one
// part on a pin of its own: the squirrel's tail, the owl's head, the beetle's
// hat, and the twins are two cards.

const shadow = (g: G, rx: number): void => print(g, blob(0, 2, rx, 5), 'rgba(58, 40, 22, 0.2)')
const white = (g: G, x: number, y: number, r: number): void => { print(g, blob(x, y, r + 1.5), 'rgba(58, 40, 22, 0.35)'); print(g, blob(x, y, r), PAPER) }

const RUSSET = '#e2733a', RUSSET_DARK = '#c4582a'

export const squirrelTail: SpriteDef = {
  x: -78, y: -116, w: 104, h: 144,
  draw: (g) => {
    card(g, (g2) => {
      g2.beginPath()
      g2.moveTo(4, 8)
      g2.bezierCurveTo(-46, 16, -70, -30, -44, -66)
      g2.bezierCurveTo(-34, -84, -58, -92, -50, -104)
      g2.bezierCurveTo(-18, -112, 0, -76, -14, -52)
      g2.bezierCurveTo(-24, -30, -6, -14, 10, -8)
      g2.closePath()
    }, RUSSET)
    curve(g, -22, -6, -52, -34, -34, -70, C.cream, 7)
    curve(g, -34, -70, -24, -90, -40, -98, C.cream, 6)
  },
}

export const squirrel: SpriteDef = {
  x: -52, y: -122, w: 126, h: 136,
  draw: (g) => {
    shadow(g, 26)
    card(g, blob(-7, -4, 13, 6), RUSSET_DARK, 1)
    card(g, blob(13, -4, 13, 6), RUSSET_DARK, 1)
    card(g, blob(0, -36, 25, 34), RUSSET)
    print(g, blob(6, -32, 14, 24), C.cream)
    // The postman's bag on its strap.
    line(g, [[-16, -60], [18, -22]], '#6b4a2b', 4)
    card(g, round(-30, -34, 20, 18, 4), '#8c5a2e', 1)
    // The head, with the cap.
    card(g, poly([[-10, -92], [-4, -112], [6, -96]]), RUSSET, 1)
    card(g, poly([[12, -98], [22, -114], [28, -94]]), RUSSET, 1)
    card(g, blob(10, -76, 25, 23), RUSSET)
    print(g, blob(20, -66, 15, 11), C.cream)
    card(g, round(-10, -104, 42, 13, 6), C.blue, 1)
    card(g, round(20, -96, 24, 6, 3), '#2c4f8c', 1)
    white(g, 6, -78, 7)
    white(g, 25, -78, 7)
    print(g, blob(34, -70, 4, 3.2), INK)
    curve(g, 22, -62, 28, -57, 34, -63, INK, 2.2)
    // One paw is held out: the letter in it is a card of its own, since he drops it.
    line(g, [[12, -48], [42, -50]], RUSSET, 9)
  },
}

/** The squirrel's letter: a leaf folded in half, with nothing on it. Pinned at its middle. */
export const letter: SpriteDef = {
  x: -20, y: -16, w: 42, h: 32,
  draw: (g) => {
    card(g, (g2) => { g2.beginPath(); g2.moveTo(-13, -8); g2.quadraticCurveTo(2, -13, 14, -7); g2.lineTo(13, 8); g2.quadraticCurveTo(0, 11, -13, 8); g2.closePath() }, C.leafC, 1)
    // The leaf's own rib, and the stalk at its corner.
    curve(g, -11, 5, 0, -3, 12, -5, C.leafD, 1.8)
    line(g, [[12, -6], [17, -10]], C.leafD, 2.4)
  },
}

const TAWNY = '#cf9150', TAWNY_DARK = '#a86a34'

export const owl: SpriteDef = {
  x: -54, y: -92, w: 110, h: 106,
  draw: (g) => {
    shadow(g, 32)
    card(g, round(-21, -8, 15, 9, 4), '#f0a03a', 1)
    card(g, round(6, -8, 15, 9, 4), '#f0a03a', 1)
    card(g, blob(0, -42, 38, 42), TAWNY)
    print(g, blob(0, -34, 24, 30), C.cream)
    // Breast feathers: a few soft flecks of no two sizes, scattered.
    for (const [x, y, rx, ry, turn] of [[-11, -47, 5, 3, 0.3], [7, -43, 6.5, 3.4, -0.2], [-3, -31, 4, 2.6, 0.1], [11, -24, 5.5, 3, 0.4], [-13, -19, 6, 3.2, -0.3]] as const) print(g, blob(x, y, rx, ry, turn), TAWNY_DARK)
    card(g, blob(-34, -40, 11, 28, 0.12), TAWNY_DARK, 2)
    card(g, blob(34, -40, 11, 28, -0.12), TAWNY_DARK, 2)
  },
}

export const owlHead: SpriteDef = {
  x: -50, y: -54, w: 104, h: 82,
  draw: (g) => {
    card(g, poly([[-34, -22], [-30, -46], [-14, -30]]), TAWNY_DARK, 1)
    card(g, poly([[34, -22], [30, -46], [14, -30]]), TAWNY_DARK, 1)
    card(g, blob(0, -10, 38, 28), TAWNY_DARK)
    print(g, blob(-15, -8, 17), C.cream)
    print(g, blob(15, -8, 17), C.cream)
    white(g, -15, -8, 11)
    white(g, 15, -8, 11)
    card(g, poly([[-6, 2], [6, 2], [0, 13]]), '#f0a03a', 1)
    // Brows that meet in the middle: she is never quite pleased.
    line(g, [[-32, -24], [-4, -17]], INK, 4)
    line(g, [[32, -24], [4, -17]], INK, 4)
  },
}

const MOUSE = '#bdb6d6', MOUSE_DARK = '#9d95bd'

const mouse = (scarf: string, holdsTail: boolean, points = false): SpriteDef => ({
  x: -44, y: -72, w: 96, h: 84,
  draw: (g) => {
    shadow(g, 16)
    // The tail: the twin behind holds it.
    curve(g, -10, -8, -30, -4, -36, -22, C.pink, 3.5)
    card(g, blob(-5, -3, 8, 4.5), MOUSE_DARK, 1)
    card(g, blob(8, -3, 8, 4.5), MOUSE_DARK, 1)
    card(g, blob(0, -20, 15, 19), MOUSE, 2)
    card(g, blob(-8, -53, 11), MOUSE, 1)
    card(g, blob(15, -55, 11), MOUSE, 1)
    print(g, blob(-8, -53, 6.5), C.pink)
    print(g, blob(15, -55, 6.5), C.pink)
    card(g, blob(5, -40, 15, 13.5), MOUSE, 2)
    card(g, round(-11, -31, 26, 8, 4), scarf, 1)
    card(g, round(-13, -27, 8, 16, 3), scarf, 1)
    white(g, 0, -41, 4.6)
    white(g, 12, -41, 4.6)
    print(g, blob(20, -36, 3, 2.6), '#e2708a')
    line(g, [[19, -34], [30, -37]], 'rgba(58, 40, 22, 0.5)', 1.2)
    line(g, [[19, -33], [30, -30]], 'rgba(58, 40, 22, 0.5)', 1.2)
    // The twin behind reaches forward for the other's tail.
    if (points) line(g, holdsTail ? [[8, -24], [30, -37]] : [[-6, -24], [-28, -37]], MOUSE, 6)
    else if (holdsTail) line(g, [[8, -22], [26, -18]], MOUSE, 6)
  },
})

/** The twin in front, in the red scarf, and the twin behind, in the teal one, who holds the other's tail. */
export const mouseA = mouse(C.red, false)
export const mouseB = mouse(C.teal, true)
/** The twins pointing at each other: the one in front points back, the one behind lets go of the tail and points forward. */
export const mouseAPoints = mouse(C.red, false, true)
export const mouseBPoints = mouse(C.teal, true, true)

const SHELL = '#2f7396', SHELL_LIGHT = '#58abc9', SUIT = '#3a3340'

const beetleCard = (open: boolean): SpriteDef => ({
  x: -52, y: -96, w: 116, h: 110,
  draw: (g) => {
    shadow(g, 26)
    // Thin legs, and the stick he leans on with both hands.
    line(g, [[-8, -12], [-12, -1], [-18, -1]], SUIT, 3.5)
    line(g, [[9, -12], [12, -1], [19, -1]], SUIT, 3.5)
    line(g, [[36, 0], [31, -50]], '#8c5a2e', 4.5)
    card(g, blob(31, -53, 5.5), '#8c5a2e', 1)
    line(g, [[-22, -36], [-36, -30]], SUIT, 3.5)
    if (open) {
      // The wing cases popped open: two halves swung out from the top, the pale wings and his dark back between them.
      card(g, blob(-24, -30, 12, 22, 0.5), 'rgba(255, 250, 235, 0.85)', 1)
      card(g, blob(24, -30, 12, 22, -0.5), 'rgba(255, 250, 235, 0.85)', 1)
      card(g, blob(0, -38, 15, 27), SUIT, 1)
      card(g, blob(-17, -40, 13, 29, 0.32), SHELL)
      card(g, blob(17, -40, 13, 29, -0.32), SHELL)
      print(g, blob(-20, -46, 4, 11, 0.5), SHELL_LIGHT)
    } else {
      card(g, blob(0, -38, 27, 30), SHELL)
      line(g, [[1, -66], [0, -10]], SHELL_LIGHT, 3)
      print(g, blob(-12, -46, 6, 12, 0.3), SHELL_LIGHT)
    }
    line(g, [[14, -40], [30, -46]], SUIT, 4)
    line(g, [[12, -30], [31, -40]], SUIT, 4)
    // The head: spectacles, a white moustache, two feelers.
    curve(g, -2, -80, -12, -90, -20, -84, SUIT, 2.5)
    curve(g, 12, -80, 22, -92, 30, -86, SUIT, 2.5)
    card(g, blob(5, -66, 18, 15), SUIT, 2)
    white(g, -4, -66, 6)
    white(g, 14, -66, 6)
    line(g, [[2, -66], [8, -66]], PAPER, 1.6)
    card(g, blob(-3, -55, 8, 4, 0.3), PAPER, 1)
    card(g, blob(13, -55, 8, 4, -0.3), PAPER, 1)
  },
})

export const beetle = beetleCard(false)
/** The beetle with his wing cases popped open. */
export const beetleOpen = beetleCard(true)

export const beetleHat: SpriteDef = {
  x: -28, y: -24, w: 58, h: 36,
  draw: (g) => {
    card(g, (g2) => { g2.beginPath(); g2.moveTo(-14, 0); g2.quadraticCurveTo(-14, -18, 0, -18); g2.quadraticCurveTo(14, -18, 14, 0); g2.closePath() }, SUIT, 2)
    card(g, round(-21, -2, 42, 6, 3), SUIT, 2)
    print(g, round(-14, -6, 28, 4, 1), C.red)
  },
}
