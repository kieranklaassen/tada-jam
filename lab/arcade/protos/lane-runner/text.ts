// Outlined text without stroking it every frame. Stroked canvas text was most
// of this prototype's frame cost, so every string is drawn once to a small
// canvas (or, for numbers that change all the time, one glyph at a time) and
// blitted from then on. Sprites are drawn at twice the logical size so they
// stay sharp on a retina iPad.

const SS = 2
const OUTLINE = 'rgba(30,20,40,0.85)'

function font(size: number): string {
  return `900 ${size}px system-ui, -apple-system, 'Segoe UI', sans-serif`
}

let scratch: CanvasRenderingContext2D | null = null
function measure(text: string, size: number): number {
  if (!scratch) scratch = document.createElement('canvas').getContext('2d')
  if (!scratch) return text.length * size * 0.6
  scratch.font = font(size)
  return scratch.measureText(text).width
}

export interface TextSprite {
  canvas: HTMLCanvasElement
  // Logical size.
  w: number
  h: number
}

function render(text: string, size: number, color: string | null, outline: string | null, advance: number): TextSprite {
  const line = Math.max(4, size * 0.18)
  const w = Math.ceil(advance + line * 2)
  const h = Math.ceil(size * 1.4 + line * 2)
  const canvas = document.createElement('canvas')
  canvas.width = w * SS
  canvas.height = h * SS
  const c = canvas.getContext('2d')
  if (c) {
    c.scale(SS, SS)
    c.font = font(size)
    c.textAlign = 'center'
    c.textBaseline = 'middle'
    c.lineJoin = 'round'
    if (outline) {
      c.lineWidth = line
      c.strokeStyle = outline
      c.strokeText(text, w / 2, h / 2)
    }
    if (color) {
      c.fillStyle = color
      c.fillText(text, w / 2, h / 2)
    }
  }
  return { canvas, w, h }
}

const strings = new Map<string, TextSprite>()

// A whole string as one sprite: for words that repeat ("WHOA!", "HOP! +2").
export function textSprite(text: string, size: number, color = '#ffffff', outline: string = OUTLINE): TextSprite {
  const key = `${size}|${color}|${outline}|${text}`
  let sprite = strings.get(key)
  if (!sprite) {
    if (strings.size > 160) strings.clear()
    sprite = render(text, size, color, outline, measure(text, size))
    strings.set(key, sprite)
  }
  return sprite
}

// Centred on (x, y), scaled about its centre.
export function drawTextSprite(g: CanvasRenderingContext2D, sprite: TextSprite, x: number, y: number, scale = 1): void {
  const w = sprite.w * scale
  const h = sprite.h * scale
  g.drawImage(sprite.canvas, x - w / 2, y - h / 2, w, h)
}

interface Glyph {
  outline: TextSprite
  fill: TextSprite
  advance: number
}

export interface Atlas {
  width(text: string): number
  // Same anchoring as the kit's `label`: y is the middle of the line.
  draw(g: CanvasRenderingContext2D, text: string, x: number, y: number, align?: 'left' | 'center' | 'right', scale?: number): void
}

// Numbers that change many times a second (coins, metres): one cached sprite
// per character, outlines laid down first and fills on top, so the result is
// the same as stroking and filling the whole string.
export function createAtlas(size: number, color = '#ffffff', outline: string = OUTLINE): Atlas {
  const glyphs = new Map<string, Glyph>()
  const glyph = (ch: string): Glyph => {
    let gl = glyphs.get(ch)
    if (!gl) {
      const advance = measure(ch, size)
      gl = { outline: render(ch, size, null, outline, advance), fill: render(ch, size, color, null, advance), advance }
      glyphs.set(ch, gl)
    }
    return gl
  }
  const width = (text: string) => {
    let w = 0
    for (let i = 0; i < text.length; i++) w += glyph(text[i]).advance
    return w
  }
  return {
    width,
    draw(g, text, x, y, align = 'center', scale = 1) {
      const total = width(text) * scale
      const left = align === 'left' ? x : align === 'right' ? x - total : x - total / 2
      for (let pass = 0; pass < 2; pass++) {
        let cx = left
        for (let i = 0; i < text.length; i++) {
          const gl = glyph(text[i])
          const sprite = pass === 0 ? gl.outline : gl.fill
          const adv = gl.advance * scale
          if (text[i] !== ' ') drawTextSprite(g, sprite, cx + adv / 2, y, scale)
          cx += adv
        }
      }
    },
  }
}

interface Floater {
  x: number
  y: number
  sprite: TextSprite
  life: number
  max: number
  rise: number
}

export interface SayOptions {
  color?: string
  size?: number
  life?: number
  rise?: number
}

export interface Floaters {
  say(x: number, y: number, text: string, options?: SayOptions): void
  update(dt: number): void
  draw(g: CanvasRenderingContext2D): void
}

// Floating words with the kit's own motion (pop in with overshoot, drift up,
// fade at the end), drawn from cached sprites instead of stroked each frame.
export function createFloaters(): Floaters {
  const list: Floater[] = []
  return {
    say(x, y, text, options = {}) {
      const life = options.life ?? 0.9
      list.push({ x, y, sprite: textSprite(text, options.size ?? 44, options.color ?? '#ffffff'), life, max: life, rise: options.rise ?? 80 })
    },
    update(dt) {
      for (let i = list.length - 1; i >= 0; i--) {
        list[i].life -= dt
        if (list[i].life <= 0) list.splice(i, 1)
      }
    },
    draw(g) {
      for (const f of list) {
        const t = 1 - f.life / f.max
        const pop = t < 0.18 ? 1 + 2.70158 * (t / 0.18 - 1) ** 3 + 1.70158 * (t / 0.18 - 1) ** 2 : 1
        if (pop <= 0.01) continue
        g.globalAlpha = t > 0.7 ? (1 - t) / 0.3 : 1
        drawTextSprite(g, f.sprite, f.x, f.y - f.rise * (1 - (1 - t) ** 2), pop)
      }
      g.globalAlpha = 1
    },
  }
}
