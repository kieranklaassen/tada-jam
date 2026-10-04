import { COBALT, COBALT_WASH, GLAZE, arc3, band, brushStream, canvasOf, crazing, dabs, fish, flower, stroke, waves } from './glaze'

// The two painted sheets of the look. The atlas holds the brushwork of every
// piece of pottery in one texture, so every piece shares one material; the
// tile sheet is the wall behind the table. Both are painted once at load.
//
// A region is a rectangle of the atlas in pixels; `uvOf` turns a place inside
// one (0 to 1 across, 0 to 1 from its bottom to its top) into texture
// coordinates. A piece that carries no brushwork maps every vertex to `plain`.

export const ATLAS_SIZE = 1024

export type Region = { x: number; y: number; w: number; h: number }

export const REGIONS = {
  plain: { x: 8, y: 8, w: 96, h: 96 },
  pot: { x: 0, y: 160, w: 1024, h: 288 },
  saucer: { x: 0, y: 480, w: 1024, h: 96 },
  lid: { x: 0, y: 608, w: 1024, h: 96 },
  bear: { x: 0, y: 736, w: 340, h: 288 },
  mouse: { x: 342, y: 736, w: 340, h: 288 },
  hen: { x: 684, y: 736, w: 340, h: 288 },
} as const satisfies Record<string, Region>

export type RegionName = keyof typeof REGIONS

/** Texture coordinates of a place in a region: `u` across, `v` from its bottom edge up. The sheet is flipped as a canvas texture is. */
export function uvOf(region: Region, u: number, v: number): [number, number] {
  // A hair inside the edge, so a neighbour's paint never bleeds in.
  const inset = 1.5
  const px = region.x + inset + (region.w - inset * 2) * u
  const py = region.y + region.h - inset - (region.h - inset * 2) * v
  return [px / ATLAS_SIZE, 1 - py / ATLAS_SIZE]
}

export function paintAtlas(doc: Document): HTMLCanvasElement {
  const { canvas, ctx } = canvasOf(doc, ATLAS_SIZE, ATLAS_SIZE)
  const random = brushStream(0x7ea71e)
  ctx.fillStyle = GLAZE
  ctx.fillRect(0, 0, ATLAS_SIZE, ATLAS_SIZE)

  // The pot: fish swimming round the belly between two rows of waves.
  const pot = REGIONS.pot
  band(ctx, random, pot.x, pot.x + pot.w, pot.y + pot.h - 14, 9)
  waves(ctx, random, pot.x, pot.x + pot.w, pot.y + pot.h - 44, 16)
  for (let i = 0; i < 4; i++) fish(ctx, random, pot.x + 128 + i * 256, pot.y + pot.h * 0.5 + (i % 2 ? 10 : -8), 54, 1)
  for (let i = 0; i < 4; i++) flower(ctx, random, pot.x + i * 256 + 2, pot.y + pot.h * 0.5 + (i % 2 ? -16 : 14), 20)
  waves(ctx, random, pot.x, pot.x + pot.w, pot.y + 52, 13)
  band(ctx, random, pot.x, pot.x + pot.w, pot.y + 20, 7)
  crazing(ctx, random, pot.x, pot.y, pot.w, pot.h, 26)

  // A saucer: fat dabs round the rim, a thin line inside them.
  const saucer = REGIONS.saucer
  dabs(ctx, random, saucer.x, saucer.x + saucer.w, saucer.y + 30, 13, 64)
  band(ctx, random, saucer.x, saucer.x + saucer.w, saucer.y + 64, 4)

  // The lid: petals round the knob.
  const lid = REGIONS.lid
  for (let i = 0; i < 8; i++) stroke(ctx, random, arc3([lid.x + 64 + i * 128, lid.y + 80], [lid.x + 40 + i * 128, lid.y + 40], [lid.x + 64 + i * 128, lid.y + 14]), 22)
  band(ctx, random, lid.x, lid.x + lid.w, lid.y + 90, 6)

  // The guests. Each strip wraps once round the body with the front in the middle.
  const bear = REGIONS.bear
  // A wide pale belly with a small flower on it, and a spotted kerchief round the neck. A flower, five round petals
  // about a middle, and not a single curled stroke: one stroke alone on a belly reads as a numeral.
  ctx.globalAlpha = 0.28
  ctx.fillStyle = COBALT_WASH
  ctx.beginPath()
  ctx.ellipse(bear.x + bear.w / 2, bear.y + bear.h * 0.62, 62, 74, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.globalAlpha = 1
  ctx.fillStyle = COBALT
  ctx.globalAlpha = 0.85
  for (let petal = 0; petal < 5; petal++) {
    const turn = (petal / 5) * Math.PI * 2 - Math.PI / 2 + (random() - 0.5) * 0.12
    ctx.beginPath()
    ctx.ellipse(bear.x + bear.w / 2 + Math.cos(turn) * 17, bear.y + bear.h * 0.64 + Math.sin(turn) * 17, 10 + random() * 1.5, 7 + random(), turn, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalAlpha = 1
  band(ctx, random, bear.x, bear.x + bear.w, bear.y + 34, 30)
  ctx.fillStyle = GLAZE
  for (let i = 0; i < 9; i++) {
    ctx.beginPath()
    ctx.arc(bear.x + 20 + i * 38, bear.y + 34 + (i % 2 ? 5 : -5), 5.5, 0, Math.PI * 2)
    ctx.fill()
  }
  for (let i = 0; i < 7; i++) stroke(ctx, random, [[bear.x + 14 + i * 50, bear.y + bear.h - 44], [bear.x + 22 + i * 50, bear.y + bear.h - 16]], 9, COBALT, 0.8)

  const mouse = REGIONS.mouse
  // A pinafore of small flowers, and a neat hem.
  for (let row = 0; row < 2; row++) for (let i = 0; i < 5; i++) flower(ctx, random, mouse.x + 34 + i * 68 + row * 30, mouse.y + 120 + row * 70, 17)
  band(ctx, random, mouse.x, mouse.x + mouse.w, mouse.y + bear.h - 18, 8)
  band(ctx, random, mouse.x, mouse.x + mouse.w, mouse.y + 40, 6)

  const hen = REGIONS.hen
  // Feathers: rows of scallops, each a single curved stroke.
  for (let row = 0; row < 4; row++) {
    for (let i = 0; i < 7; i++) {
      const x = hen.x + 12 + i * 48 + (row % 2) * 24, y = hen.y + 76 + row * 54
      stroke(ctx, random, arc3([x - 20, y - 14], [x, y + 26], [x + 20, y - 14]), 9, COBALT, 0.9)
    }
  }
  dabs(ctx, random, hen.x, hen.x + hen.w, hen.y + 34, 8, 34)
  return canvas
}

export const TILE_COLS = 8
export const TILE_ROWS = 4
/** Which picture each tile of the sheet carries, row by row from the top: 0 a flower, 1 a fish, 2 a bird, 3 a boat, 4 a tulip. Filled as the sheet is painted. */
const TILE_PICTURES: number[] = []
/** The picture on a tile of the sheet, by its column and its row from the top; the wall repeats the sheet. */
export function tilePicture(col: number, row: number): number {
  return TILE_PICTURES[(((row % TILE_ROWS) + TILE_ROWS) % TILE_ROWS) * TILE_COLS + (((col % TILE_COLS) + TILE_COLS) % TILE_COLS)] ?? 0
}
const TILE = 128

function bird(ctx: CanvasRenderingContext2D, random: () => number, x: number, y: number, r: number): void {
  stroke(ctx, random, arc3([x - r * 0.8, y + r * 0.1], [x, y + r * 0.7], [x + r * 0.7, y - r * 0.1]), r * 0.5)
  stroke(ctx, random, arc3([x - r * 0.2, y], [x - r * 0.1, y - r * 0.7], [x - r * 0.9, y - r * 0.6]), r * 0.3)
  stroke(ctx, random, [[x - r * 0.8, y + r * 0.1], [x - r * 1.3, y + r * 0.5]], r * 0.24)
  stroke(ctx, random, [[x + r * 0.7, y - r * 0.15], [x + r * 1.05, y - r * 0.2]], r * 0.14)
  stroke(ctx, random, [[x - r * 0.1, y + r * 0.5], [x - r * 0.1, y + r * 0.95]], r * 0.08)
}

function boat(ctx: CanvasRenderingContext2D, random: () => number, x: number, y: number, r: number): void {
  stroke(ctx, random, arc3([x - r, y + r * 0.3], [x, y + r * 0.95], [x + r, y + r * 0.3]), r * 0.3)
  stroke(ctx, random, [[x, y + r * 0.4], [x, y - r]], r * 0.1)
  // The sail is a filled patch of cobalt, not an outline: an outlined sail beside the mast is a letter.
  ctx.fillStyle = COBALT
  ctx.globalAlpha = 0.78
  ctx.beginPath()
  ctx.moveTo(x + r * 0.12, y - r * 0.92)
  ctx.quadraticCurveTo(x + r * 0.95, y - r * 0.25, x + r * 0.78, y + r * 0.2)
  ctx.lineTo(x + r * 0.12, y + r * 0.18)
  ctx.closePath()
  ctx.fill()
  ctx.globalAlpha = 1
  waves(ctx, random, x - r * 1.1, x + r * 1.1, y + r * 1.1, r * 0.18)
}

function tulip(ctx: CanvasRenderingContext2D, random: () => number, x: number, y: number, r: number): void {
  stroke(ctx, random, arc3([x, y + r], [x - r * 0.1, y + r * 0.3], [x, y - r * 0.2]), r * 0.12)
  stroke(ctx, random, arc3([x, y + r * 0.8], [x - r * 0.8, y + r * 0.5], [x - r * 0.6, y - r * 0.1]), r * 0.24)
  stroke(ctx, random, arc3([x, y + r * 0.8], [x + r * 0.8, y + r * 0.5], [x + r * 0.6, y - r * 0.1]), r * 0.24)
  for (const lean of [-0.35, 0, 0.35]) stroke(ctx, random, arc3([x, y - r * 0.15], [x + lean * r * 1.4, y - r * 0.5], [x + lean * r, y - r]), r * 0.36)
}

/** The wall: hand-painted tiles, no two quite alike, each with one small picture and plain corners. No tile carries a letter, a numeral or a sign, and nothing is painted in the corners: four curls round a crossing of the grout close into a ring with a cross in it, and four dots make the four of a die. */
export function paintTiles(doc: Document): HTMLCanvasElement {
  const { canvas, ctx } = canvasOf(doc, TILE * TILE_COLS, TILE * TILE_ROWS)
  const random = brushStream(0x711e5)
  const pictures = [flower, (c: CanvasRenderingContext2D, r: () => number, x: number, y: number, s: number) => fish(c, r, x, y, s), bird, boat, tulip]
  for (let row = 0; row < TILE_ROWS; row++) {
    for (let col = 0; col < TILE_COLS; col++) {
      const x = col * TILE, y = row * TILE
      // Each tile was dipped by hand: its white leans a little warm or a little blue.
      const lean = Math.round((random() - 0.5) * 10)
      ctx.fillStyle = `rgb(${236 + lean}, ${240 + lean}, ${246 + Math.round(lean / 2)})`
      ctx.fillRect(x, y, TILE, TILE)
      crazing(ctx, random, x, y, TILE, TILE, 3)
      const picture = (row * 3 + col * 2 + Math.floor(random() * 2)) % pictures.length
      TILE_PICTURES[row * TILE_COLS + col] = picture
      pictures[picture](ctx, random, x + TILE / 2 + (random() - 0.5) * 6, y + TILE / 2 + (random() - 0.5) * 6, 26)
      // The grout, and the faint shade a tile's rounded edge throws into it.
      ctx.fillStyle = 'rgba(120, 136, 170, 0.75)'
      ctx.fillRect(x, y, TILE, 2)
      ctx.fillRect(x, y, 2, TILE)
      ctx.fillStyle = 'rgba(255, 255, 255, 0.55)'
      ctx.fillRect(x + 2, y + 2, TILE - 2, 1.5)
    }
  }
  return canvas
}

export { COBALT }
