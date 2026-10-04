import { restOutline, type DoughBody, type Form } from './doughBody'
import { paintBread, type Kit } from './lookBread'
import { TAU, mulberry32, wave, type Ctx } from './lookCut'
import { INK } from './lookInk'

// The stuff on the peel, drawn live every frame because the finger shapes it.
// It is still a print: flat inks, hard edges and a hand-cut line, and nothing
// that fades. Each kind reads at a glance by how it is cut, not by colour
// alone: dust has no contour and spills specks, dough is bare paper inside one
// heavy contour, batter lies flat inside a thin double line, and water is the
// dark block with pale rings. The working object stays plain. What the oven
// made of it is drawn in lookBread.ts, with the same tools.

export type StuffPainter = {
  /** Draws the stuff this frame, centred on cx, cy in logical pixels at `scale` pixels per reference unit, and returns how many fills it made. */
  paint(g: CanvasRenderingContext2D, body: DoughBody, form: Form | null, cx: number, cy: number, scale: number): number
  /** Draws a form at rest where no finger reaches it: on the rack, in a basket, carried. `turn` tilts it, in radians. Reads from scale 0.3 up. Returns the fills made. */
  still(g: CanvasRenderingContext2D, form: Form | null, cx: number, cy: number, scale: number, turn?: number): number
}

/** A closed path through x,y pairs: rounded for anything soft, straight cuts for anything ragged. */
function lay(g: Ctx, p: readonly number[], round: boolean, m = p.length): void {
  if (!round) {
    g.moveTo(p[0], p[1])
    for (let i = 2; i < m; i += 2) g.lineTo(p[i], p[i + 1])
  } else {
    g.moveTo((p[m - 2] + p[0]) / 2, (p[m - 1] + p[1]) / 2)
    for (let i = 0; i < m; i += 2) { const j = (i + 2) % m; g.quadraticCurveTo(p[i], p[i + 1], (p[i] + p[j]) / 2, (p[i + 1] + p[j + 1]) / 2) }
  }
  g.closePath()
}

const side: number[] = []
/** A carved line along x,y pairs: thin where the tool enters and leaves, `w` wide between. Never an even stroke. */
function line(g: Ctx, p: readonly number[], w: number, ends = 0.1, m = p.length): void {
  const last = m / 2 - 1
  for (let i = 0; i <= last; i++) {
    const a = Math.max(0, i - 1) * 2, b = Math.min(last, i + 1) * 2, tx = p[b] - p[a], ty = p[b + 1] - p[a + 1], len = Math.hypot(tx, ty) || 1
    const half = (w / 2) * (ends + (1 - ends) * Math.sqrt(Math.max(0, Math.sin((Math.PI * i) / last))))
    side[i * 2] = p[i * 2] + (ty / len) * half; side[i * 2 + 1] = p[i * 2 + 1] - (tx / len) * half
    side[(2 * last + 1 - i) * 2] = p[i * 2] - (ty / len) * half; side[(2 * last + 1 - i) * 2 + 1] = p[i * 2 + 1] + (tx / len) * half
  }
  lay(g, side, false, (last + 1) * 4)
}

const run: number[] = []
/** Part of a ring lying flat round x,y, from turn `a` to turn `b`. */
function ring(g: Ctx, x: number, y: number, r: number, a: number, b: number, w: number, ends = 0.1): void {
  const count = Math.max(4, Math.ceil(Math.abs(b - a) * 22))
  for (let i = 0; i <= count; i++) { const t = (a + ((b - a) * i) / count) * TAU; run[i * 2] = x + Math.cos(t) * r; run[i * 2 + 1] = y + Math.sin(t) * r * 0.62 }
  line(g, run, w, ends, (count + 1) * 2)
}

/** A small chip with cut corners: one speck of flour, one grain. */
function chip(g: Ctx | Path2D, x: number, y: number, r: number, turn: number): void {
  for (let i = 0; i < 5; i++) {
    const t = turn + (i / 5) * TAU, d = r * (i % 2 ? 0.62 : 1), px = x + Math.cos(t) * d, py = y + Math.sin(t) * d * 0.8
    if (i) g.lineTo(px, py); else g.moveTo(px, py)
  }
  g.closePath()
}

function oval(g: Ctx, x: number, y: number, long: number, short: number, lie: number): void {
  g.moveTo(x + Math.cos(lie) * long, y + Math.sin(lie) * long)
  g.ellipse(x, y, long, short, lie, 0, TAU)
}

export function createStuffPainter(seed: number): StuffPainter {
  const rnd = mulberry32(seed)
  // One slow wobble and one quick jag per point of the ring, fixed for good, so the cut line does not boil from frame to frame.
  const drift = wave(rnd, 96, 6), jag = Array.from({ length: 96 }, () => rnd() * 2 - 1)
  // Loose bits as turn, distance (1 is the edge), size and lie: specks spilt round a heap, grains in it, seeds, and where the wet patches sit.
  const bits = (count: number, near: number, far: number, small: number, big: number) =>
    Array.from({ length: count }, () => [rnd(), near + (far - near) * Math.sqrt(rnd()), small + (big - small) * rnd() * rnd(), rnd() * TAU])
  const spilt = bits(64, 0, 1, 1, 3.6).map(([turn, d, size, lie]) => [turn, 0.97 + d * d * 0.5, size, lie])
  const grains = bits(30, 0.15, 0.82, 1, 2.2), seeds = bits(26, 0.05, 0.9, 0, 1).map(([turn, d, size, lie]) => [turn, 0.08 + d * d, size, lie])
  // Wet streaks: from a turn and distance to another, and how wide. Set askew, so they never make a face.
  const streaks = [[0.5, 1, 0.66, 0.28, 13], [0.9, 1, 1.02, 0.52, 9], [0.22, 1, 0.3, 0.7, 6]]
  const drops = [[0.03, 1.32, 10], [0.36, 1.3, 7], [0.71, 1.38, 5]]
  // Bubbles keep to one side in an uneven huddle: two alike side by side would be a pair of eyes.
  const bubbles = [[0.9, 0.56, 9.5], [0.96, 0.76, 5.4], [0.85, 0.8, 3.4], [0.8, 0.5, 4.4], [0.93, 0.34, 3], [0.99, 0.5, 3.8]]
  // Risen dough: blisters under the skin near the top, each at its own height.
  const blisters = [[0.69, 0.6, 8.5], [0.8, 0.8, 5], [0.87, 0.48, 6.5]]
  const outer: number[] = [], inner: number[] = [], bend: number[] = [], put: number[] = [], rest: number[] = [], NONE: readonly number[] = [0, 0, 0, 0]
  let o: readonly number[] = [], n = 0, ops = 0
  let spill: Path2D | null = null, spillKey = ''

  /** A place in the stuff, as a turn round it and a distance out (1 is the edge): marks set this way ride the outline as it is pushed. */
  const spot = (turn: number, far: number) => {
    const f = (((turn % 1) + 1) % 1) * n, i = Math.floor(f) % n, j = (i + 1) % n, t = f - Math.floor(f)
    k.x = (o[i * 2] * (1 - t) + o[j * 2] * t) * far; k.y = (o[i * 2 + 1] * (1 - t) + o[j * 2 + 1] * t) * far
  }
  /** A run of places from one turn to another, as a line to carve. */
  const sweep = (from: number, to: number, far: number, count = 6) => {
    for (let i = 0; i <= count; i++) { spot(from + ((to - from) * i) / count, far); bend[i * 2] = k.x; bend[i * 2 + 1] = k.y }
    bend.length = (count + 1) * 2
    return bend
  }

  /** The cut edge and the inside of its contour: thin up and left, heavy low and right, where the carver left more block. */
  function edge(rag: number, thin: number, thick: number, pinched: boolean): void {
    outer.length = inner.length = n * 2
    for (let i = 0; i < n; i++) {
      const a = ((i + n - 1) % n) * 2, b = ((i + 1) % n) * 2, tx = o[b] - o[a], ty = o[b + 1] - o[a + 1], len = Math.hypot(tx, ty) || 1, nx = ty / len, ny = -tx / len
      const x = o[i * 2] + nx * rag * jag[i], y = o[i * 2 + 1] + ny * rag * jag[i]
      let w = (thin + (thick - thin) * Math.max(0, nx * 0.5 + ny * 0.87)) * (1 + 0.3 * drift[i])
      if (pinched) {
        // A pulled neck is thinner than its own contour: leave a third of it bare whatever happens.
        let room = Infinity
        for (let k = 3; k < n - 2; k++) { const c = ((i + k) % n) * 2; room = Math.min(room, Math.hypot(o[c] - x, o[c + 1] - y)) }
        w = Math.min(w, room * 0.32)
      }
      outer[i * 2] = x; outer[i * 2 + 1] = y; inner[i * 2] = x - nx * w; inner[i * 2 + 1] = y - ny * w
    }
  }

  /** Furrows in a heap: where the finger went the board shows through, until the heap slumps back. */
  const furrows = (marks: readonly number[], fresh: number) => {
    for (let i = 0, from = 0; i <= fresh; i++) {
      bend[(i - from) * 2] = marks[i * 4] + jag[i] * 1.2; bend[(i - from) * 2 + 1] = marks[i * 4 + 1] + jag[i + 40] * 1.2
      if (i < fresh && marks[i * 4 + 7]) continue
      // One stroke of the finger is one cut; a poke alone is a small pit. Both close up at the end, they do not fade.
      const wide = 8 * Math.min(1, marks[i * 4 + 2] * 3)
      if (i > from) line(k.g, bend, wide, 0.35, (i - from + 1) * 2); else oval(k.g, bend[0], bend[1], wide * 0.8, wide * 0.5, 0)
      from = i + 1
    }
  }
  const ink = (colour: string) => { k.g.fillStyle = colour; k.g.beginPath() }
  const print = () => { k.g.fill(); ops++ }
  /** Everything lookBread.ts needs to cut a bread with the same hand. */
  const k: Kit = { g: null as unknown as Ctx, x: 0, y: 0, outer, inner, bend, jag, grains, spot, sweep, edge, furrows, ink, print, lay, line, ring, chip }

  /** One frame of one form. `o` is its outline now; the marks, the finger and the lobe are the body's, or none for a form at rest. */
  function draw(g: Ctx, form: Form, marks: readonly number[], tip: { x: number; y: number } | null, pulled: boolean, cx: number, cy: number, scale: number, turn: number): number {
    const { kind, texture, rx, ry, bread } = form, dough = kind === 'dough'
    let fresh = -1
    for (let i = 0; i < marks.length / 4 && marks[i * 4 + 2] > 0; i++) fresh = i
    k.g = g; ops = 0
    g.save()
    g.translate(cx, cy); g.scale(scale, scale)
    if (turn) g.rotate(turn)

    if (kind === 'dust' || (dough && (bread ? bread.crumb === 'crumbly' : texture === 'streaky'))) {
      // Flour that never got wet, or crumbs, lie spilt round the edge. The scatter is cut once per size and laid down whole.
      const key = `${Math.round(rx / 3)} ${Math.round(ry / 3)} ${dough}`
      if (key !== spillKey || !spill) {
        spill = new Path2D(); spillKey = key
        spilt.forEach(([at, far, size, lie], i) => { if (!dough || i % 3 === 0) chip(spill as Path2D, Math.cos(at * TAU) * (rx + 4) * far, Math.sin(at * TAU) * (ry + 4) * far + (kind === 'dust' ? ry * 0.2 : 0), size * (bread ? 1.5 : 1), lie) })
      }
      g.fillStyle = bread ? INK.gold : INK.paper; g.fill(spill); ops++
    }

    if (bread && kind !== 'seeds') paintBread(k, bread, ry, marks, fresh)
    else if (kind === 'seeds') {
      // Nothing under them: only the seeds, lying where the body's ring holds them.
    } else if (kind === 'puddle') {
      edge(0, 0, 0, false)
      ink(INK.key); lay(g, outer, true)
      for (const [turn, far, size] of drops) { spot(turn, far); oval(g, k.x, k.y, size, size * 0.62, 0) }
      print()
      ink(INK.paper)
      // Water lies flat: broken rings one inside the other, the way a still puddle is cut, and never a highlight on a round thing.
      line(g, sweep(0.08, 0.6, 0.68, 14), 2.6); line(g, sweep(0.7, 0.97, 0.68, 8), 2.2); line(g, sweep(0.42, 0.94, 0.36, 10), 2.4)
      for (const [turn, far, size] of drops) { spot(turn, far); ring(g, k.x, k.y - size * 0.1, size * 0.5, 0.55, 0.8, 1.6) }
      // A poke: whole rings that widen and thin.
      for (let i = 0; i <= fresh; i++) {
        const life = marks[i * 4 + 2], grown = 1 - life
        if (i === fresh || marks[i * 4 + 3] === 0) { ring(g, marks[i * 4], marks[i * 4 + 1], 12 + 34 * grown, 0, 1, 1 + 2.4 * life, 1); ring(g, marks[i * 4], marks[i * 4 + 1], 4 + 16 * grown, 0, 1, 1 + 1.8 * life, 1) }
      }
      print()
    } else if (kind === 'dust') {
      edge(2, 0, 0, false)
      ink(INK.paper); lay(g, outer, false); print()
      ink(INK.key)
      for (const [turn, far, size, lie] of grains) { spot(turn, far); chip(g, k.x, k.y, size, lie) }
      // No drawn contour, or it would be dough: the edge of a heap is grains, larger where it lies on the board, with gaps.
      for (let i = 0; i < n * 2; i++) {
        const a = (i >> 1) * 2, b = ((i >> 1) + (i & 1)) % n * 2, low = Math.max(0, (outer[a + 1] + outer[b + 1]) / (2 * ry) + 0.3)
        if (jag[(i * 7) % 96] < 0.5 - 0.5 * low) chip(g, (outer[a] + outer[b]) / 2 + jag[(i + 13) % 96] * 1.5, (outer[a + 1] + outer[b + 1]) / 2 + jag[(i + 31) % 96] * 1.5, 1.5 + 1.9 * low * (1 + 0.5 * jag[(i + 5) % 96]), i)
      }
      furrows(marks, fresh)
      print()
    } else {
      const round = !dough || texture !== 'streaky', flat = kind === 'batter'
      edge(dough ? (texture === 'smooth' ? 0.5 : texture === 'shaggy' ? 1.4 : 2.8) : 0.4, flat ? 1.8 : 3, flat ? 4.6 : 9.5, pulled)
      ink(INK.key); lay(g, outer, round); print()
      ink(INK.paper); lay(g, inner, round); print()
      ink(INK.key)
      if (flat) {
        // Batter shines: a second line inside the first, and a bubble or two that do not move.
        line(g, sweep(0.5, 0.78, 0.84, 9), 2.2); line(g, sweep(0.06, 0.2, 0.8, 5), 2)
        for (let i = 0; i < (form.bubbly ? 4 : 2) + Math.round(form.rise * 2); i++) { spot(bubbles[i][0], bubbles[i][1]); ring(g, k.x, k.y, bubbles[i][2], 0.08, 0.95, 1.7, 0.4) }
        // It closes over the finger: one fold on the far side, drawing in as it fills.
        if (fresh >= 0) { const life = marks[fresh * 4 + 2]; ring(g, marks[fresh * 4], marks[fresh * 4 + 1], 14 + 16 * life, 0.56, 0.94, 1 + 2 * life); ring(g, marks[fresh * 4], marks[fresh * 4 + 1], 30 + 16 * life, 0.62, 0.86, 0.8 + 1.4 * life) }
      } else if (texture === 'smooth') {
        // Taut skin: one long mark up and left, one short one low and right, as the carver set them.
        line(g, sweep(0.535, 0.7, 0.72, 7), 3.6, 0.05); line(g, sweep(0.05, 0.14, 0.74, 4), 3.4, 0.05)
      } else if (texture === 'shaggy') {
        // Torn places: short cuts in from the edge, and a couple of creases.
        for (const [turn, deep] of [[0.09, 0.7], [0.43, 0.74], [0.66, 0.68]]) {
          spot(turn - 0.014, 0.97); g.moveTo(k.x, k.y); spot(turn + 0.016, 0.97); g.lineTo(k.x, k.y); spot(turn + 0.012, deep); g.lineTo(k.x, k.y); g.closePath()
        }
        line(g, sweep(0.25, 0.34, 0.52, 3), 3.2, 0.05)
      } else {
        // Streaky: the water still lies in it as dark patches, with dry flour sitting on them.
        for (const [t0, f0, t1, f1, w] of streaks) {
          for (let i = 0; i <= 5; i++) { spot(t0 + ((t1 - t0) * i) / 5, f0 + ((f1 - f0) * i) / 5 + 0.05 * jag[i + 9]); bend[i * 2] = k.x; bend[i * 2 + 1] = k.y }
          line(g, bend, w, 0.25, 12)
        }
        print(); ink(INK.paper)
        for (const [t0, f0, t1, f1] of streaks) for (let i = 1; i < 4; i++) { spot(t0 + (t1 - t0) * (i / 4 + 0.05 * jag[i]), f0 + (f1 - f0) * (i / 4)); chip(g, k.x + jag[i + 20], k.y + jag[i + 30], 1.3 + (i % 2) * 0.7, i) }
      }
      // Air under the skin: two blisters, then three, each arched over like a bubble about to show.
      if (dough) for (let i = 0; i < Math.min(3, Math.round(form.rise * 3.4)); i++) { spot(blisters[i][0], blisters[i][1]); ring(g, k.x, k.y, blisters[i][2], 0.42, 1.1, 2.2, 0.1) }
      const press = fresh < 0 ? 0 : marks[fresh * 4 + 2]
      if (dough && texture !== 'streaky' && press > 0) {
        // The dent: one carved crescent on the far side of the fingertip. It shortens as the dent fills; it does not fade.
        ring(g, marks[fresh * 4], marks[fresh * 4 + 1] + 4, 23, 0.75 - 0.2 * press, 0.75 + 0.2 * press, 4.2, 0.05)
      }
      print()
    }

    if (form.seeds || kind === 'seeds') {
      const few = kind === 'seeds' ? 1 : 2, black = !!bread && bread.crust === 'black'
      ink(INK.key)
      for (let i = 0; i < seeds.length; i += few) {
        spot(seeds[i][0], seeds[i][1] * (few === 1 ? 1 : 0.8))
        // Loose seeds skitter out from under the finger.
        const dx = k.x - (tip ? tip.x : 1e6), dy = k.y - (tip ? tip.y : 1e6), near = Math.hypot(dx, dy) || 1, shy = few === 1 && near < 44 ? (44 - near) / near : 0
        put[i * 2] = k.x + dx * shy; put[i * 2 + 1] = k.y + dy * shy
        oval(g, put[i * 2], put[i * 2 + 1], 8, 4.6, seeds[i][3])
      }
      print()
      // Raw, a seed is dark with a pale split, so it is a seed on the peel and not a hole. Baked onto a crust it shows pale, and loose
      // seeds that went through the oven show gold inside a dark husk, less of it the darker they are.
      const onCrust = !!bread && few === 2, split = onCrust ? 6.2 : bread ? (black ? 4.2 : bread.crust === 'dark' ? 5.4 : 6.2) : 5, wide = onCrust ? 3.1 : bread ? (black ? 1 : bread.crust === 'dark' ? 1.7 : 2.7) : 1.2
      ink(bread && few === 1 ? INK.gold : INK.paper)
      for (let i = 0; i < seeds.length; i += few) oval(g, put[i * 2], put[i * 2 + 1], split, wide, seeds[i][3])
      print()
    }
    g.restore()
    return ops
  }

  function paint(g: Ctx, body: DoughBody, form: Form | null, cx: number, cy: number, scale: number): number {
    o = body.outline(); n = Math.min(96, o.length / 2)
    if (!form || n < 3 || !(scale > 0)) return 0
    return draw(g, form, body.marks(), body.finger, body.reach > 0, cx, cy, scale, 0)
  }

  function still(g: Ctx, form: Form | null, cx: number, cy: number, scale: number, turn = 0): number {
    if (!form || !(scale > 0)) return 0
    restOutline(form, rest, 36); o = rest; n = 36
    return draw(g, form, NONE, null, false, cx, cy, scale, turn)
  }

  return { paint, still }
}
