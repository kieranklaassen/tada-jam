import { css, fill, makeFelt, oval, shade, type Ctx, type Felt, type Maker, type Rgb } from './felted'

// The felt figures and the moth, as pieces of firm felt made once. Each
// figure is drawn in its own units with (0, 0) between its feet and up as
// minus y, at the size it stands in the dish (layout.ts). How the pieces are
// put together and moved is in folkDraw.ts.

const CREAM: Rgb = [240, 230, 208]
const SLATE: Rgb = [74, 68, 88]
const EYE: Rgb = [252, 248, 240]
const GOOSE_WHITE: Rgb = [246, 243, 235]
const ORANGE: Rgb = [238, 146, 52]
const COAT: Rgb = [208, 180, 130]
const MADDER: Rgb = [198, 72, 62]
const HAT: Rgb = [112, 80, 60]
const SKIN: Rgb = [238, 192, 162]
const BOOT: Rgb = [70, 56, 62]
const BEECH: Rgb = [226, 198, 152]
const PINK: Rgb = [240, 168, 172]
const DEEP_PINK: Rgb = [216, 130, 142]
const MOTH: Rgb = [200, 180, 152]
export const INK = 'rgb(34,28,40)'

export type FolkArt = {
  sheep: { body: Felt; head: Felt; ear: Felt; jaw: Felt }
  goose: { body: Felt; wing: Felt; head: Felt; bill: Felt }
  shepherd: { body: Felt; head: Felt; hat: Felt; arm: Felt }
  pig: { body: Felt; head: Felt; ear: Felt; snout: Felt }
  moth: { body: Felt; wing: Felt }
}

const dot = (c: Ctx, x: number, y: number, r: number, colour: string): void => {
  c.fillStyle = colour
  c.beginPath()
  c.arc(x, y, r, 0, Math.PI * 2)
  c.fill()
}

/** How far round a stitched curl goes, in radians: the rest of the ring is its opening. */
export const CURL_SWEEP = 4.2

/** A stitched curl, for a fleece. */
const curl = (c: Ctx, x: number, y: number, r: number, turn: number): void => {
  c.moveTo(x + r * Math.cos(turn), y + r * Math.sin(turn))
  c.arc(x, y, r, turn, turn + CURL_SWEEP)
}

/** The way a curl begun at `turn` opens, in degrees round from the right by way of down: 90 is down, 180 left, 270 up. */
export function opensToward(turn: number): number {
  const middle = turn + CURL_SWEEP + (Math.PI * 2 - CURL_SWEEP) / 2
  return (((middle * 180) / Math.PI) % 360 + 360) % 360
}

/** A curl that opens `degrees` round from the right by way of down begins at this turn. */
const opening = (degrees: number): number => (degrees * Math.PI) / 180 - CURL_SWEEP - (Math.PI * 2 - CURL_SWEEP) / 2

/**
 * The curls stitched on the sheep's fleece: where each sits, how big it is, and where it begins. Each opens
 * downward or upward at a slant, and none to a side: an arc that opens to the right is the third letter of the
 * alphabet, and a figure that turns round would make one of any arc that opens to the left. The slant is one
 * of four, each the same way off level and off upright, because the sheep leans: it dangles in the hand and
 * shakes itself, by up to a fifth of a radian, and a curl must keep clear of both at the end of that lean.
 */
export const SHEEP_CURLS: readonly (readonly [x: number, y: number, r: number, turn: number])[] = [
  [-34, -96, 10, opening(117.5)], [4, -122, 11, opening(242.5)], [44, -98, 10, opening(62.5)], [12, -72, 9, opening(297.5)], [62, -126, 8, opening(117.5)],
  [-12, -146, 8, opening(242.5)], [78, -84, 8, opening(62.5)], [-58, -70, 8, opening(297.5)], [34, -146, 7, opening(117.5)],
]

export function makeFolkArt(make: Maker, scale: number): FolkArt {
  const felt = (x0: number, y0: number, x1: number, y1: number, seed: number, paint: (c: Ctx) => void, detail?: (c: Ctx) => void): Felt => makeFelt(make, scale, x0, y0, x1, y1, seed, paint, detail)

  // --- The sheep: a cloud of cream fleece on four short dark legs, facing the frame. ---
  const sheepBody = felt(-100, -176, 122, 4, 41, (c) => {
    for (const x of [-56, -26, 30, 60]) fill(c, SLATE, (p) => p.roundRect(x - 9, -48, 18, 48, 8))
    fill(c, shade(CREAM, -0.08), (p) => oval(p, 102, -104, 17, 15))
    fill(c, CREAM, (p) => {
      for (const [x, y, r] of [[8, -92, 62], [-50, -84, 40], [64, -86, 42], [-22, -130, 36], [38, -132, 38], [8, -62, 48], [-58, -112, 26], [76, -120, 26]]) oval(p, x, y, r, r)
    })
  }, (c) => {
    c.strokeStyle = css(shade(CREAM, -0.2), 0.75)
    c.lineWidth = 2.2
    c.lineCap = 'round'
    c.beginPath()
    for (const [x, y, r, turn] of SHEEP_CURLS) curl(c, x, y, r, turn)
    c.stroke()
  })
  const sheepHead = felt(-42, -58, 42, 44, 42, (c) => {
    fill(c, SLATE, (p) => oval(p, 0, 0, 30, 38, 0.12))
    fill(c, CREAM, (p) => { oval(p, -8, -36, 15, 13); oval(p, 10, -40, 14, 12); oval(p, 2, -30, 16, 10) })
  }, (c) => {
    dot(c, -12, -6, 10, css(EYE))
    dot(c, 13, -8, 12, css(EYE))
    dot(c, -7, 21, 2, 'rgba(20,16,28,0.6)')
    dot(c, 5, 22, 2, 'rgba(20,16,28,0.6)')
  })
  const sheepEar = felt(-4, -10, 36, 10, 43, (c) => fill(c, shade(SLATE, 0.12), (p) => { p.moveTo(0, 0); p.quadraticCurveTo(16, -12, 34, 0); p.quadraticCurveTo(16, 12, 0, 0) }))
  const sheepJaw = felt(-18, -10, 18, 12, 44, (c) => fill(c, shade(SLATE, 0.1), (p) => oval(p, 0, 0, 15, 9)))

  // --- The goose: a white egg on orange feet, with a long neck drawn each frame. ---
  const gooseBody = felt(-70, -154, 96, 10, 51, (c) => {
    c.lineCap = 'round'
    for (const x of [-22, 16]) {
      fill(c, ORANGE, (p) => oval(p, x - 6, 0, 17, 6.5))
      fill(c, ORANGE, (p) => p.roundRect(x - 3, -30, 6, 30, 3))
    }
    fill(c, GOOSE_WHITE, (p) => {
      oval(p, 6, -84, 66, 58)
      p.moveTo(40, -128)
      p.quadraticCurveTo(70, -134, 90, -150)
      p.quadraticCurveTo(84, -110, 62, -92)
      p.closePath()
    })
  })
  const gooseWing = felt(-6, -24, 78, 28, 52, (c) => fill(c, shade(GOOSE_WHITE, -0.12), (p) => { p.moveTo(0, 0); p.bezierCurveTo(10, -26, 54, -22, 76, -2); p.bezierCurveTo(56, 24, 14, 26, 0, 0) }), (c) => {
    c.strokeStyle = 'rgba(120,116,128,0.5)'
    c.lineWidth = 1.6
    c.beginPath()
    for (const y of [-6, 4, 13]) { c.moveTo(26, y); c.quadraticCurveTo(46, y + 3, 64, y - 2) }
    c.stroke()
  })
  const gooseHead = felt(-30, -30, 30, 30, 53, (c) => fill(c, GOOSE_WHITE, (p) => oval(p, 0, 0, 25, 24)), (c) => dot(c, -5, -7, 10, 'rgb(206,220,232)'))
  // The upper bill is part of the lower one's piece turned the other way: one wedge, used twice.
  const gooseBill = felt(-44, -9, 4, 9, 54, (c) => fill(c, ORANGE, (p) => { p.moveTo(2, -7); p.quadraticCurveTo(-24, -8, -42, 2); p.quadraticCurveTo(-22, 8, 2, 7); p.closePath() }))

  // --- The shepherd: a bell of a coat on two boots, a round face with a white moustache, a wide hat. ---
  const shepherdBody = felt(-86, -306, 72, 8, 61, (c) => {
    for (const x of [-22, 22]) fill(c, BOOT, (p) => oval(p, x, -7, 21, 11))
    // His crook, behind the coat.
    c.strokeStyle = css(BEECH)
    c.shadowColor = css(BEECH, 0.9)
    c.lineWidth = 7
    c.lineCap = 'round'
    c.beginPath()
    c.moveTo(-66, -8)
    c.lineTo(-66, -276)
    c.bezierCurveTo(-66, -304, -34, -304, -36, -276)
    c.stroke()
    fill(c, COAT, (p) => { p.moveTo(-34, -234); p.bezierCurveTo(-46, -160, -66, -80, -64, -24); p.quadraticCurveTo(0, -8, 64, -24); p.bezierCurveTo(66, -80, 46, -160, 34, -234); p.quadraticCurveTo(0, -248, -34, -234) })
    // The arm that holds the crook, and its mitten.
    fill(c, shade(COAT, -0.1), (p) => { p.moveTo(-30, -226); p.quadraticCurveTo(-62, -190, -72, -128); p.lineTo(-50, -122); p.quadraticCurveTo(-42, -180, -22, -206); p.closePath() })
    fill(c, MADDER, (p) => oval(p, -63, -120, 13, 12))
    // The scarf, with one end hanging.
    fill(c, MADDER, (p) => { p.roundRect(-36, -240, 72, 20, 9); p.roundRect(8, -226, 18, 58, 7) })
  }, (c) => {
    // Three buttons and the scarf's fringe: stitches, not letters.
    for (const y of [-190, -150, -110]) dot(c, -6, y, 4.5, css(shade(COAT, -0.4)))
    c.strokeStyle = css(shade(MADDER, 0.4), 0.8)
    c.lineWidth = 1.6
    c.beginPath()
    for (const x of [11, 15, 19, 23]) { c.moveTo(x, -170); c.lineTo(x, -162) }
    c.stroke()
  })
  const shepherdHead = felt(-40, -40, 40, 42, 62, (c) => {
    fill(c, SKIN, (p) => oval(p, 0, 0, 34, 34))
    fill(c, [226, 134, 118], (p) => oval(p, 0, 7, 11, 9.5))
    fill(c, EYE, (p) => { oval(p, -15, 21, 16, 7.5, 0.35); oval(p, 15, 21, 16, 7.5, -0.35) })
  }, (c) => {
    dot(c, -13, -7, 8.5, css(EYE))
    dot(c, 13, -7, 8.5, css(EYE))
    dot(c, -22, 8, 6, 'rgba(226,120,110,0.35)')
    dot(c, 22, 8, 6, 'rgba(226,120,110,0.35)')
  })
  const shepherdHat = felt(-68, -46, 68, 16, 63, (c) => {
    fill(c, shade(HAT, -0.12), (p) => oval(p, 0, 2, 64, 13))
    fill(c, HAT, (p) => { p.moveTo(-34, 0); p.bezierCurveTo(-36, -44, 36, -44, 34, 0); p.quadraticCurveTo(0, 8, -34, 0) })
    fill(c, MADDER, (p) => { p.moveTo(-34, -6); p.quadraticCurveTo(0, 4, 34, -6); p.lineTo(34, 1); p.quadraticCurveTo(0, 10, -34, 1); p.closePath() })
  })
  const shepherdArm = felt(-16, -6, 16, 108, 64, (c) => {
    fill(c, shade(COAT, -0.06), (p) => p.roundRect(-13, -4, 26, 90, 12))
    fill(c, MADDER, (p) => oval(p, 0, 92, 13, 13))
  })

  // --- The pig: a fat pink oval on four stubs, with a round head as wide as its body is high. ---
  const pigBody = felt(-78, -132, 100, 6, 71, (c) => {
    for (const x of [-46, -20, 28, 54]) fill(c, DEEP_PINK, (p) => p.roundRect(x - 9, -38, 18, 38, 8))
    fill(c, PINK, (p) => oval(p, 10, -72, 80, 54))
  }, (c) => {
    dot(c, 34, -86, 15, 'rgba(216,130,142,0.35)')
    dot(c, 58, -58, 9, 'rgba(216,130,142,0.3)')
  })
  const pigHead = felt(-50, -50, 50, 50, 72, (c) => fill(c, shade(PINK, 0.08), (p) => oval(p, 0, 0, 44, 42)), (c) => {
    dot(c, -18, -12, 10.5, css(EYE))
    dot(c, 11, -14, 12, css(EYE))
    dot(c, 26, 12, 9, 'rgba(226,110,120,0.3)')
  })
  const pigEar = felt(-14, -38, 14, 4, 73, (c) => fill(c, DEEP_PINK, (p) => { p.moveTo(-12, 0); p.quadraticCurveTo(-12, -30, 4, -36); p.quadraticCurveTo(14, -16, 12, 0); p.closePath() }))
  const pigSnout = felt(-22, -18, 22, 18, 74, (c) => fill(c, DEEP_PINK, (p) => oval(p, 0, 0, 19, 15)), (c) => {
    c.fillStyle = 'rgba(120,50,70,0.75)'
    c.beginPath()
    c.ellipse(-7, 0, 3.2, 5, 0, 0, Math.PI * 2)
    c.ellipse(7, 0, 3.2, 5, 0, 0, Math.PI * 2)
    c.fill()
  })

  // --- The moth: a fat furry body with eyes too big for it, and two soft wings. ---
  const mothBody = felt(-16, -26, 16, 26, 81, (c) => fill(c, MOTH, (p) => oval(p, 0, 2, 12, 21)), (c) => {
    dot(c, -6, -12, 6.5, css(EYE))
    dot(c, 6, -12, 6.5, css(EYE))
    dot(c, -4.4, -11, 2.8, INK)
    dot(c, 4.4, -11, 2.8, INK)
    c.strokeStyle = css(shade(MOTH, -0.3), 0.6)
    c.lineWidth = 1.4
    c.beginPath()
    for (const y of [2, 9, 16]) { c.moveTo(-9, y); c.quadraticCurveTo(0, y + 3, 9, y) }
    c.stroke()
  })
  const mothWing = felt(-4, -26, 46, 22, 82, (c) => fill(c, shade(MOTH, 0.3), (p) => { p.moveTo(0, 0); p.bezierCurveTo(8, -30, 44, -28, 44, -6); p.bezierCurveTo(44, 12, 16, 22, 0, 6); p.closePath() }), (c) => {
    dot(c, 28, -8, 6, css(shade(MOTH, -0.25), 0.7))
    dot(c, 28, -8, 2.5, css(EYE, 0.8))
  })

  return {
    sheep: { body: sheepBody, head: sheepHead, ear: sheepEar, jaw: sheepJaw },
    goose: { body: gooseBody, wing: gooseWing, head: gooseHead, bill: gooseBill },
    shepherd: { body: shepherdBody, head: shepherdHead, hat: shepherdHat, arm: shepherdArm },
    pig: { body: pigBody, head: pigHead, ear: pigEar, snout: pigSnout },
    moth: { body: mothBody, wing: mothWing },
  }
}
