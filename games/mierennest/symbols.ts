// template: cartridge/symbols.ts v3

// The one module of a game that draws numerals and mathematics signs on the
// kid side. Nothing in it knows what the game is about: it takes numbers, a
// fraction as two integers, or a sign by name, and never a string to draw, so
// no other file can hand it a word. The caller lays each symbol on or beside
// the quantity it names; this module only draws it where it is told.
//
// Every text call formats its own number or draws a literal with no letter in
// it, and carries the comment the wordless check asks for. The fraction bar is
// a filled rectangle, which the check cannot see: it is drawn here and nowhere
// else.

/** A fraction as two whole numbers. The module draws it as it is given and never reduces it. */
export type Fraction = { num: number; den: number }

/** The signs the jam allows from a band that starts at 6, by name. */
export type Sign = 'plus' | 'minus' | 'times' | 'divide' | 'equals' | 'less' | 'greater' | 'percent'

/** The decimal mark of the child's country: a point in California, a comma in the Netherlands. */
export type DecimalMark = 'point' | 'comma'

/** How a symbol is inked: a fill, and an outline under it when the look has one. */
export type Ink = { fill: string; edge?: string; edgeWidth?: number }

/** What the module needs of a surface. A canvas 2D context has all of it, and so does a test's recorder. */
export type SymbolSurface = Pick<
  CanvasRenderingContext2D,
  'font' | 'textAlign' | 'textBaseline' | 'fillStyle' | 'strokeStyle' | 'lineWidth' | 'lineJoin' | 'fillText' | 'strokeText' | 'measureText' | 'fillRect' | 'strokeRect'
>

/** Where a symbol was drawn, so the caller can lay the next thing beside it. */
export type Box = { x: number; y: number; width: number; height: number }

/** System fonts only, heaviest first: a numeral has to read at a glance from across a table. */
export const SYMBOL_FONT = 'ui-rounded, system-ui, -apple-system, sans-serif'

/** The proportions of a stacked fraction, in units of the numeral size. */
export const FRACTION = { bar: 0.12, gap: 0.16, overhang: 0.18, scale: 0.82 } as const

/** A number the module will draw as a whole number: finite, and rounded to the nearest one. */
export function isDrawable(n: number): boolean {
  return Number.isFinite(n) && Math.abs(n) <= Number.MAX_SAFE_INTEGER
}

/** A fraction the module will draw: two drawable whole numbers, the lower one not zero. */
export function isFraction(f: Fraction): boolean {
  return isDrawable(f.num) && isDrawable(f.den) && Math.round(f.den) !== 0
}

function setFont(ctx: SymbolSurface, size: number): void {
  ctx.font = `800 ${size}px ${SYMBOL_FONT}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.lineJoin = 'round'
}

/** Runs `put` once for the outline, when the ink has one, and once for the fill. */
function inked(ctx: SymbolSurface, ink: Ink, size: number, put: (edge: boolean) => void): void {
  if (ink.edge) {
    ctx.strokeStyle = ink.edge
    ctx.lineWidth = ink.edgeWidth ?? size * 0.16
    put(true)
  }
  ctx.fillStyle = ink.fill
  put(false)
}

/** The width a whole number takes at this size. */
export function wholeWidth(ctx: SymbolSurface, n: number, size: number): number {
  if (!isDrawable(n)) return 0
  setFont(ctx, size)
  return ctx.measureText(String(Math.round(n))).width
}

/** Draws a whole number centred on (x, y). A number that is not drawable draws nothing. */
export function drawWhole(ctx: SymbolSurface, n: number, x: number, y: number, size: number, ink: Ink): Box {
  const width = wholeWidth(ctx, n, size)
  if (!isDrawable(n)) return { x, y, width: 0, height: 0 }
  inked(ctx, ink, size, (edge) => {
    // wordless-ok: numeral the outline of a whole number this module formats itself
    if (edge) ctx.strokeText(String(Math.round(n)), x, y)
    // wordless-ok: numeral a whole number this module formats itself
    else ctx.fillText(String(Math.round(n)), x, y)
  })
  return { x: x - width / 2, y: y - size / 2, width, height: size }
}

/**
 * Where the three parts of a stacked fraction go when its bar is centred on (x, y): the upper number above the
 * bar, the lower one below it, and a bar a little wider than the wider of the two. Pure: it takes the two widths.
 */
export function fractionLayout(numWidth: number, denWidth: number, x: number, y: number, size: number) {
  const digit = size * FRACTION.scale
  const bar = size * FRACTION.bar
  const gap = size * FRACTION.gap
  const width = Math.max(numWidth, denWidth) + 2 * size * FRACTION.overhang
  const reach = bar / 2 + gap + digit / 2
  return {
    digit,
    num: { x, y: y - reach },
    den: { x, y: y + reach },
    bar: { x: x - width / 2, y: y - bar / 2, width, height: bar },
    box: { x: x - width / 2, y: y - reach - digit / 2, width, height: 2 * reach + digit },
  }
}

/** The box a fraction takes when its bar is centred on (x, y), without drawing it. */
export function fractionBox(ctx: SymbolSurface, f: Fraction, x: number, y: number, size: number): Box {
  if (!isFraction(f)) return { x, y, width: 0, height: 0 }
  const digit = size * FRACTION.scale
  return fractionLayout(wholeWidth(ctx, f.num, digit), wholeWidth(ctx, f.den, digit), x, y, size).box
}

/**
 * Draws a fraction with a horizontal bar, the bar centred on (x, y). The two numbers are drawn as given: two
 * quarters stay two quarters. A fraction that is not drawable draws nothing.
 */
export function drawFraction(ctx: SymbolSurface, f: Fraction, x: number, y: number, size: number, ink: Ink): Box {
  if (!isFraction(f)) return { x, y, width: 0, height: 0 }
  const digit = size * FRACTION.scale
  const at = fractionLayout(wholeWidth(ctx, f.num, digit), wholeWidth(ctx, f.den, digit), x, y, size)
  if (ink.edge) {
    ctx.strokeStyle = ink.edge
    ctx.lineWidth = ink.edgeWidth ?? size * 0.16
    ctx.strokeRect(at.bar.x, at.bar.y, at.bar.width, at.bar.height)
  }
  drawWhole(ctx, f.num, at.num.x, at.num.y, digit, ink)
  drawWhole(ctx, f.den, at.den.x, at.den.y, digit, ink)
  // The fraction bar, over the outlines of the two numbers so it stays one clean stroke.
  ctx.fillStyle = ink.fill
  ctx.fillRect(at.bar.x, at.bar.y, at.bar.width, at.bar.height)
  return at.box
}

/** Draws a whole number and a fraction side by side, as a mixed number, the pair centred on (x, y). */
export function drawMixed(ctx: SymbolSurface, whole: number, f: Fraction, x: number, y: number, size: number, ink: Ink): Box {
  if (!isDrawable(whole) || !isFraction(f)) return { x, y, width: 0, height: 0 }
  const wholeW = wholeWidth(ctx, whole, size)
  const part = fractionBox(ctx, f, 0, 0, size * 0.8)
  const gap = size * 0.12
  const left = x - (wholeW + gap + part.width) / 2
  drawWhole(ctx, whole, left + wholeW / 2, y, size, ink)
  const drawn = drawFraction(ctx, f, left + wholeW + gap + part.width / 2, y, size * 0.8, ink)
  const top = Math.min(y - size / 2, drawn.y)
  return { x: left, y: top, width: wholeW + gap + part.width, height: Math.max(y + size / 2, drawn.y + drawn.height) - top }
}

/** Draws one sign centred on (x, y). It goes between or beside the two quantities it relates. */
export function drawSign(ctx: SymbolSurface, sign: Sign, x: number, y: number, size: number, ink: Ink): Box {
  setFont(ctx, size)
  inked(ctx, ink, size, (edge) => {
    // wordless-ok: numeral the outline of one mathematics sign, a literal chosen by name
    if (edge) ctx.strokeText(sign === 'plus' ? '+' : sign === 'minus' ? '−' : sign === 'times' ? '×' : sign === 'divide' ? '÷' : sign === 'equals' ? '=' : sign === 'less' ? '<' : sign === 'greater' ? '>' : '%', x, y)
    // wordless-ok: numeral one mathematics sign, a literal chosen by name
    else ctx.fillText(sign === 'plus' ? '+' : sign === 'minus' ? '−' : sign === 'times' ? '×' : sign === 'divide' ? '÷' : sign === 'equals' ? '=' : sign === 'less' ? '<' : sign === 'greater' ? '>' : '%', x, y)
  })
  const width = size * 0.7
  return { x: x - width / 2, y: y - size / 2, width, height: size }
}

/**
 * Draws a decimal number with a fixed count of places and the mark of the child's country, centred on (x, y).
 * It draws the size of the number and no sign: a caller that needs a minus lays the sign beside it.
 * It is drawn digit by digit, each on a cell of one width, so the digits of a changing number do not jump.
 */
export function drawDecimal(ctx: SymbolSurface, value: number, places: number, mark: DecimalMark, x: number, y: number, size: number, ink: Ink): Box {
  const count = Math.max(0, Math.min(6, Math.round(places)))
  const scaled = Math.round(Math.abs(value) * 10 ** count)
  if (!isDrawable(value) || !isDrawable(scaled)) return { x, y, width: 0, height: 0 }
  const whole = Math.floor(scaled / 10 ** count)
  const cell = wholeWidth(ctx, 0, size)
  const wholeW = wholeWidth(ctx, whole, size)
  const markW = count > 0 ? cell * 0.55 : 0
  const width = wholeW + markW + cell * count
  let left = x - width / 2
  drawWhole(ctx, whole, left + wholeW / 2, y, size, ink)
  left += wholeW
  if (count > 0) {
    inked(ctx, ink, size, (edge) => {
      // wordless-ok: numeral the outline of the decimal mark, a literal with no letter
      if (edge) ctx.strokeText(mark === 'comma' ? ',' : '.', left + markW / 2, y)
      // wordless-ok: numeral the decimal mark, a literal with no letter
      else ctx.fillText(mark === 'comma' ? ',' : '.', left + markW / 2, y)
    })
    left += markW
    for (let place = count - 1; place >= 0; place--) {
      drawWhole(ctx, Math.floor(scaled / 10 ** place) % 10, left + cell / 2, y, size, ink)
      left += cell
    }
  }
  return { x: x - width / 2, y: y - size / 2, width, height: size }
}
