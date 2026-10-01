// Outlined text as cached sprites. Stroking big bold text (and looking up the
// emoji font) every frame was the single largest frame cost in the round's
// first builds, so `label` and the fx floaters draw a cached image instead and
// only rasterise when the words, colour or size bucket change.

const FONT = "system-ui, -apple-system, 'Segoe UI', sans-serif"
// Rendered at twice the logical size so it stays sharp at a device pixel
// ratio of 2 and when a floater pops past its base size.
const RES = 2
// Sizes share a sprite within a bucket and are scaled to fit, so a pulsing
// label does not rasterise on every frame.
const BUCKET = 4
const MAX_SPRITES = 400

export interface TextSprite {
  canvas: HTMLCanvasElement
  // Logical size of the sprite at the bucket size, and the padding around the
  // text inside it.
  w: number
  h: number
  pad: number
  // The size the sprite was rasterised at.
  px: number
}

const sprites = new Map<string, TextSprite>()

export function fontFor(px: number): string {
  return `900 ${px}px ${FONT}`
}

export function outlineWidth(px: number): number {
  return Math.max(4, px * 0.18)
}

function rasterise(text: string, px: number, color: string, outline: string | null): TextSprite {
  const canvas = document.createElement('canvas')
  const c = canvas.getContext('2d')
  const line = outline ? outlineWidth(px) : 0
  const pad = Math.ceil(line / 2 + 3)
  let textW = px * Math.max(1, text.length) * 0.7
  if (c) {
    c.font = fontFor(px)
    textW = c.measureText(text).width
  }
  const w = Math.ceil(textW + pad * 2)
  const h = Math.ceil(px * 1.5 + pad * 2)
  canvas.width = Math.max(1, w * RES)
  canvas.height = Math.max(1, h * RES)
  if (c) {
    c.scale(RES, RES)
    c.font = fontFor(px)
    c.textAlign = 'left'
    c.textBaseline = 'middle'
    c.lineJoin = 'round'
    if (outline) {
      c.lineWidth = line
      c.strokeStyle = outline
      c.strokeText(text, pad, h / 2)
    }
    c.fillStyle = color
    c.fillText(text, pad, h / 2)
  }
  return { canvas, w, h, pad, px }
}

function spriteFor(text: string, size: number, color: string, outline: string | null): TextSprite {
  const px = Math.max(BUCKET, Math.ceil(size / BUCKET) * BUCKET)
  const key = `${px}|${color}|${outline ?? ''}|${text}`
  let found = sprites.get(key)
  if (found) {
    // Re-insert so the map's order is least recently used first.
    sprites.delete(key)
    sprites.set(key, found)
    return found
  }
  found = rasterise(text, px, color, outline)
  sprites.set(key, found)
  if (sprites.size > MAX_SPRITES) {
    const oldest = sprites.keys().next().value
    if (oldest !== undefined) sprites.delete(oldest)
  }
  return found
}

// Draw `text` with its vertical middle on y. `align` says what x is: the
// centre, the left edge or the right edge of the words.
export function drawText(
  g: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  size: number,
  color: string,
  outline: string | null,
  align: CanvasTextAlign = 'center',
): void {
  if (text === '' || !(size > 0.5)) return
  const s = spriteFor(text, size, color, outline)
  const k = size / s.px
  const w = s.w * k
  const h = s.h * k
  const pad = s.pad * k
  const left = align === 'center' ? x - w / 2 : align === 'right' || align === 'end' ? x - w + pad : x - pad
  g.drawImage(s.canvas, left, y - h / 2, w, h)
}

// Pay the one-off cost of finding the text and emoji fonts before play starts,
// not on the first "YUM!".
export function warmText(): void {
  rasterise('Aa0', 32, '#ffffff', '#000000')
  rasterise('👆⭐', 32, '#ffffff', null)
}
