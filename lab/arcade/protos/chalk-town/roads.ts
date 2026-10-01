// What the chalk means. Every stroke is kept as a chain of points about nine
// pixels apart. Points that lie close to another stroke are linked, so the
// chains become a road graph a toy can ride. A coarse grid of the same points
// finds the closed shapes (places to live in) and the blue patches (water).
// No DOM in here.

export const STEP = 9
const LINK_R = 22
const HASH = 24
const CELL = 10
// How far a chalk line counts as a wall on the grid. Generous on purpose: a
// four-year-old's house rarely quite closes.
const WALL_R = 14

export const BLUE = 3

export interface Pt {
  x: number
  y: number
  st: Stroke
  i: number
  alive: boolean
  links: Pt[]
  // Ids of the places this point borders.
  regs: number[]
  mark: number
  from: Pt | null
}

export interface Stroke {
  id: number
  color: number
  pts: Pt[]
  // A zigzag: people hop along it, from one corner to the next.
  zig: boolean
  corners: number[]
  // 1 is fresh; the rain wears it to 0.
  ink: number
  endedAt: number
}

export interface Region {
  id: number
  cells: number[]
  cx: number
  cy: number
  water: boolean
}

// Something riding the chalk: a car, or a person out for a walk.
export interface Rider {
  st: Stroke | null
  idx: number
  t: number
  dir: 1 | -1
  // Pixels to go before another junction may be taken.
  cool: number
  x: number
  y: number
  // Unit vector to steer towards.
  ax: number
  ay: number
}

export function newRider(): Rider {
  return { st: null, idx: 0, t: 0, dir: 1, cool: 0, x: 0, y: 0, ax: 1, ay: 0 }
}

export interface Town {
  readonly strokes: Stroke[]
  readonly places: Region[]
  readonly ponds: Region[]
  // Bumped whenever places are found again, so a toy can notice.
  readonly version: number
  begin(color: number): Stroke
  add(stroke: Stroke, x: number, y: number): Pt
  finish(stroke: Stroke, time: number): void
  // Rub out every point within r. True if anything went.
  erase(x: number, y: number, r: number): boolean
  kill(stroke: Stroke): void
  nearest(x: number, y: number, r: number): Pt | null
  rebuild(): void
  placeAt(x: number, y: number): Region | null
  pondAt(x: number, y: number): Region | null
  cellCentre(cell: number): [number, number]
  inPlace(region: Region, x: number, y: number): boolean
  // Put a rider on the chain at this point, facing the way that best matches
  // (hx, hy). False if the chalk there is too short to drive on.
  mount(r: Rider, p: Pt, hx: number, hy: number): boolean
  // Move a rider along. 'end' is the end of the line; 'lost' means the chalk
  // under it has gone.
  ride(r: Rider, dist: number, rand: () => number): 'ok' | 'end' | 'lost'
  // A walk along the chalk from one place to another that `want` accepts.
  route(from: Region, want: (r: Region) => boolean, rand: () => number): { path: Pt[]; to: Region } | null
  clear(): void
}

export function createTown(width: number, height: number): Town {
  const strokes: Stroke[] = []
  let places: Region[] = []
  let ponds: Region[] = []
  let version = 0
  let nextId = 1
  let stamp = 1

  const hc = Math.ceil(width / HASH) + 1
  const hr = Math.ceil(height / HASH) + 1
  const hash: Pt[][] = []
  for (let i = 0; i < hc * hr; i++) hash.push([])
  const bucket = (x: number, y: number): number => Math.max(0, Math.min(hc - 1, Math.floor(x / HASH))) + Math.max(0, Math.min(hr - 1, Math.floor(y / HASH))) * hc

  const gw = Math.ceil(width / CELL)
  const gh = Math.ceil(height / CELL)
  // 0 open, otherwise colour + 1.
  const wall = new Uint8Array(gw * gh)
  // -1 wall, 0 outside, above 0 the id of a place.
  const label = new Int16Array(gw * gh)
  const pondLabel = new Int16Array(gw * gh)
  const cellOf = (x: number, y: number): number => Math.max(0, Math.min(gw - 1, Math.floor(x / CELL))) + Math.max(0, Math.min(gh - 1, Math.floor(y / CELL))) * gw

  const near = (x: number, y: number, r: number, fn: (p: Pt, d2: number) => void): void => {
    const x0 = Math.max(0, Math.floor((x - r) / HASH))
    const x1 = Math.min(hc - 1, Math.floor((x + r) / HASH))
    const y0 = Math.max(0, Math.floor((y - r) / HASH))
    const y1 = Math.min(hr - 1, Math.floor((y + r) / HASH))
    const r2 = r * r
    for (let cy = y0; cy <= y1; cy++) {
      for (let cx = x0; cx <= x1; cx++) {
        const list = hash[cx + cy * hc]
        for (let k = 0; k < list.length; k++) {
          const p = list[k]
          if (!p.alive) continue
          const dx = p.x - x
          const dy = p.y - y
          const d2 = dx * dx + dy * dy
          if (d2 <= r2) fn(p, d2)
        }
      }
    }
  }

  const drop = (p: Pt): void => {
    p.alive = false
    const list = hash[bucket(p.x, p.y)]
    const at = list.indexOf(p)
    if (at !== -1) list.splice(at, 1)
    for (const q of p.links) {
      const back = q.links.indexOf(p)
      if (back !== -1) q.links.splice(back, 1)
    }
    p.links = []
  }

  // How many live points lie ahead of p in direction d, up to `max`.
  const ahead = (p: Pt, d: number, max: number): number => {
    const pts = p.st.pts
    let n = 0
    for (let k = 1; k <= max; k++) {
      const q = pts[p.i + d * k]
      if (!q || !q.alive) break
      n++
    }
    return n
  }

  const findZig = (s: Stroke): boolean => {
    const pts = s.pts
    if (pts.length < 14) return false
    const first = pts[0]
    const last = pts[pts.length - 1]
    if (Math.hypot(first.x - last.x, first.y - last.y) < 60) return false
    const LAG = 3
    const corners: number[] = []
    const where: number[] = [0]
    let bestAt = -1
    let best = 0
    let bestSign = 0
    for (let i = LAG; i < pts.length - LAG; i++) {
      const ax = pts[i].x - pts[i - LAG].x
      const ay = pts[i].y - pts[i - LAG].y
      const bx = pts[i + LAG].x - pts[i].x
      const by = pts[i + LAG].y - pts[i].y
      const cross = ax * by - ay * bx
      const turn = Math.abs(Math.atan2(cross, ax * bx + ay * by))
      if (turn > 1.0) {
        if (turn > best) {
          best = turn
          bestAt = i
          bestSign = Math.sign(cross)
        }
      } else if (bestAt !== -1) {
        corners.push(bestSign)
        where.push(bestAt)
        bestAt = -1
        best = 0
      }
    }
    if (bestAt !== -1) {
      corners.push(bestSign)
      where.push(bestAt)
    }
    where.push(pts.length - 1)
    s.corners = where
    let run = 1
    let longest = corners.length > 0 ? 1 : 0
    for (let i = 1; i < corners.length; i++) {
      run = corners[i] !== corners[i - 1] ? run + 1 : 1
      if (run > longest) longest = run
    }
    return longest >= 3
  }

  const rebuild = (): void => {
    for (let i = strokes.length - 1; i >= 0; i--) {
      if (!strokes[i].pts.some((p) => p.alive)) strokes.splice(i, 1)
    }
    wall.fill(0)
    const reach = Math.ceil(WALL_R / CELL)
    for (const s of strokes) {
      for (const p of s.pts) {
        if (!p.alive) continue
        const cx = Math.floor(p.x / CELL)
        const cy = Math.floor(p.y / CELL)
        for (let y = cy - reach; y <= cy + reach; y++) {
          if (y < 0 || y >= gh) continue
          for (let x = cx - reach; x <= cx + reach; x++) {
            if (x < 0 || x >= gw) continue
            const dx = (x + 0.5) * CELL - p.x
            const dy = (y + 0.5) * CELL - p.y
            if (dx * dx + dy * dy <= WALL_R * WALL_R) wall[x + y * gw] = s.color + 1
          }
        }
      }
    }

    // Flood the open ground in from the border. Whatever open ground is left
    // is inside a shape.
    const queue: number[] = []
    for (let i = 0; i < label.length; i++) label[i] = wall[i] ? -1 : -2
    const seed = (c: number): void => {
      if (label[c] === -2) {
        label[c] = 0
        queue.push(c)
      }
    }
    for (let x = 0; x < gw; x++) {
      seed(x)
      seed(x + (gh - 1) * gw)
    }
    for (let y = 0; y < gh; y++) {
      seed(y * gw)
      seed(gw - 1 + y * gw)
    }
    const spread = (id: number, into: number[] | null): void => {
      while (queue.length > 0) {
        const c = queue.pop()!
        if (into) into.push(c)
        const x = c % gw
        const y = (c - x) / gw
        if (x > 0 && label[c - 1] === -2) {
          label[c - 1] = id
          queue.push(c - 1)
        }
        if (x < gw - 1 && label[c + 1] === -2) {
          label[c + 1] = id
          queue.push(c + 1)
        }
        if (y > 0 && label[c - gw] === -2) {
          label[c - gw] = id
          queue.push(c - gw)
        }
        if (y < gh - 1 && label[c + gw] === -2) {
          label[c + gw] = id
          queue.push(c + gw)
        }
      }
    }
    spread(0, null)

    const found: Region[] = []
    const water: Region[] = []
    let id = 1
    for (let c = 0; c < label.length; c++) {
      if (label[c] !== -2) continue
      const cells: number[] = []
      label[c] = id
      queue.push(c)
      spread(id, cells)
      if (cells.length < 9) {
        for (const k of cells) label[k] = 0
        continue
      }
      let sx = 0
      let sy = 0
      let blue = 0
      let edge = 0
      for (const k of cells) {
        const x = k % gw
        const y = (k - x) / gw
        sx += x
        sy += y
        for (const n of [k - 1, k + 1, k - gw, k + gw]) {
          if (n < 0 || n >= wall.length || !wall[n]) continue
          edge++
          if (wall[n] === BLUE + 1) blue++
        }
      }
      const region: Region = { id, cells, cx: (sx / cells.length + 0.5) * CELL, cy: (sy / cells.length + 0.5) * CELL, water: edge > 0 && blue / edge > 0.6 }
      found.push(region)
      if (region.water) water.push(region)
      id++
    }

    // A blue scribble: blue chalk laid thick enough that a five by five block
    // of the grid is all blue.
    pondLabel.fill(0)
    const deep = new Uint8Array(gw * gh)
    for (let y = 2; y < gh - 2; y++) {
      for (let x = 2; x < gw - 2; x++) {
        let all = true
        for (let dy = -2; dy <= 2 && all; dy++) {
          for (let dx = -2; dx <= 2; dx++) {
            if (wall[x + dx + (y + dy) * gw] !== BLUE + 1) {
              all = false
              break
            }
          }
        }
        if (all) deep[x + y * gw] = 1
      }
    }
    for (let c = 0; c < deep.length; c++) {
      if (!deep[c] || pondLabel[c]) continue
      const cells: number[] = []
      const stack = [c]
      pondLabel[c] = id
      while (stack.length > 0) {
        const k = stack.pop()!
        cells.push(k)
        const x = k % gw
        for (const n of [k - 1, k + 1, k - gw, k + gw]) {
          if (n < 0 || n >= deep.length || !deep[n] || pondLabel[n]) continue
          if (Math.abs((n % gw) - x) > 1) continue
          pondLabel[n] = id
          stack.push(n)
        }
      }
      if (cells.length < 3) continue
      let sx = 0
      let sy = 0
      for (const k of cells) {
        sx += k % gw
        sy += Math.floor(k / gw)
      }
      water.push({ id, cells, cx: (sx / cells.length + 0.5) * CELL, cy: (sy / cells.length + 0.5) * CELL, water: true })
      id++
    }
    for (const region of water) if (region.cells.length > 0 && label[region.cells[0]] === region.id) for (const k of region.cells) pondLabel[k] = region.id

    // Which places each chalk point borders, for finding the way between them.
    for (const s of strokes) {
      for (const p of s.pts) {
        p.regs.length = 0
        if (!p.alive) continue
        const cx = Math.floor(p.x / CELL)
        const cy = Math.floor(p.y / CELL)
        for (let y = cy - 2; y <= cy + 2; y++) {
          if (y < 0 || y >= gh) continue
          for (let x = cx - 2; x <= cx + 2; x++) {
            if (x < 0 || x >= gw) continue
            const l = label[x + y * gw]
            if (l > 0 && !p.regs.includes(l)) p.regs.push(l)
          }
        }
      }
    }

    places = found
    ponds = water
    version++
  }

  const steer = (r: Rider): void => {
    const st = r.st
    if (!st) return
    const pts = st.pts
    const cur = pts[r.idx]
    const nxt = pts[r.idx + r.dir]
    if (nxt && nxt.alive) {
      r.x = cur.x + (nxt.x - cur.x) * r.t
      r.y = cur.y + (nxt.y - cur.y) * r.t
    } else {
      r.x = cur.x
      r.y = cur.y
    }
    let look: Pt | null = null
    for (let k = 3; k >= 1; k--) {
      const q = pts[r.idx + r.dir * k]
      if (q && q.alive && ahead(cur, r.dir, k) === k) {
        look = q
        break
      }
    }
    if (look) {
      const dx = look.x - r.x
      const dy = look.y - r.y
      const d = Math.hypot(dx, dy)
      if (d > 0.5) {
        r.ax = dx / d
        r.ay = dy / d
      }
    }
  }

  interface Option {
    p: Pt
    dir: 1 | -1
  }

  // The ways off the current chain at the rider's node. `must` is the end of
  // the line: look a little way back too, and accept sharper turns.
  const options = (r: Rider, must: boolean): Option[] => {
    const st = r.st!
    const pts = st.pts
    const out: Option[] = []
    const back = pts[r.idx - r.dir * 2] ?? pts[r.idx - r.dir]
    const here = pts[r.idx]
    let hx = r.ax
    let hy = r.ay
    if (back && back.alive) {
      const d = Math.hypot(here.x - back.x, here.y - back.y)
      if (d > 0.5) {
        hx = (here.x - back.x) / d
        hy = (here.y - back.y) / d
      }
    }
    const span = must ? 3 : 0
    for (let k = 0; k <= span; k++) {
      const node = pts[r.idx - r.dir * k]
      if (!node || !node.alive) break
      for (const q of node.links) {
        if (!q.alive) continue
        for (const d of [1, -1] as const) {
          if (ahead(q, d, 4) < 4) continue
          const far = q.st.pts[q.i + d * 4]
          const vx = far.x - q.x
          const vy = far.y - q.y
          const vl = Math.hypot(vx, vy) || 1
          const turn = Math.acos(Math.max(-1, Math.min(1, (vx * hx + vy * hy) / vl)))
          if (must ? turn < 2.5 : turn > 0.6 && turn < 2.2) out.push({ p: q, dir: d })
        }
      }
    }
    return out
  }

  const take = (r: Rider, o: Option): void => {
    r.st = o.p.st
    r.idx = o.p.i
    r.dir = o.dir
    r.t = 0
    r.cool = 70
  }

  return {
    strokes,
    get places() {
      return places
    },
    get ponds() {
      return ponds
    },
    get version() {
      return version
    },
    begin(color) {
      const s: Stroke = { id: nextId++, color, pts: [], zig: false, corners: [], ink: 1, endedAt: -1 }
      strokes.push(s)
      return s
    },
    add(stroke, x, y) {
      const p: Pt = { x, y, st: stroke, i: stroke.pts.length, alive: true, links: [], regs: [], mark: 0, from: null }
      near(x, y, LINK_R, (q) => {
        if (q.st === stroke && p.i - q.i <= 14) return
        p.links.push(q)
        q.links.push(p)
      })
      stroke.pts.push(p)
      hash[bucket(x, y)].push(p)
      return p
    },
    finish(stroke, time) {
      stroke.endedAt = time
      stroke.zig = findZig(stroke)
    },
    erase(x, y, r) {
      const gone: Pt[] = []
      near(x, y, r, (p) => gone.push(p))
      for (const p of gone) drop(p)
      return gone.length > 0
    },
    kill(stroke) {
      for (const p of stroke.pts) if (p.alive) drop(p)
    },
    nearest(x, y, r) {
      let best: Pt | null = null
      let bestD = Infinity
      near(x, y, r, (p, d2) => {
        if (d2 < bestD) {
          bestD = d2
          best = p
        }
      })
      return best
    },
    rebuild,
    placeAt(x, y) {
      const l = label[cellOf(x, y)]
      if (l <= 0) return null
      return places.find((p) => p.id === l) ?? null
    },
    pondAt(x, y) {
      const l = pondLabel[cellOf(x, y)]
      if (l <= 0) return null
      return ponds.find((p) => p.id === l) ?? null
    },
    cellCentre(cell) {
      const x = cell % gw
      return [(x + 0.5) * CELL, ((cell - x) / gw + 0.5) * CELL]
    },
    inPlace(region, x, y) {
      return label[cellOf(x, y)] === region.id
    },
    mount(r, p, hx, hy) {
      const fwd = ahead(p, 1, 4)
      const bwd = ahead(p, -1, 4)
      if (fwd + bwd < 4) return false
      const pts = p.st.pts
      let dir: 1 | -1 = fwd >= bwd ? 1 : -1
      if (fwd >= 2 && bwd >= 2) {
        const f = pts[p.i + 2]
        dir = (f.x - p.x) * hx + (f.y - p.y) * hy >= 0 ? 1 : -1
      }
      r.st = p.st
      r.idx = p.i
      r.dir = dir
      r.t = 0
      r.cool = 40
      steer(r)
      return true
    },
    ride(r, dist, rand) {
      const st = r.st
      if (!st) return 'lost'
      let left = dist
      let guard = 0
      while (guard++ < 40) {
        const cur = r.st!.pts[r.idx]
        if (!cur || !cur.alive) {
          r.st = null
          return 'lost'
        }
        const nxt = r.st!.pts[r.idx + r.dir]
        if (!nxt || !nxt.alive) {
          const ways = options(r, true)
          if (ways.length === 0) {
            r.t = 0
            steer(r)
            return 'end'
          }
          take(r, ways[Math.floor(rand() * ways.length)])
          continue
        }
        const seg = Math.hypot(nxt.x - cur.x, nxt.y - cur.y) || 0.001
        const remain = seg * (1 - r.t)
        if (left < remain) {
          r.t += left / seg
          break
        }
        left -= remain
        r.idx += r.dir
        r.t = 0
        r.cool -= seg
        if (r.cool <= 0 && nxt.links.length > 0) {
          const ways = options(r, false)
          if (ways.length > 0) {
            if (rand() < 0.5) take(r, ways[Math.floor(rand() * ways.length)])
            else r.cool = 70
          }
        }
      }
      steer(r)
      return 'ok'
    },
    route(from, want, rand) {
      stamp++
      let queue: Pt[] = []
      for (const s of strokes) {
        for (const p of s.pts) {
          if (p.alive && p.regs.includes(from.id)) {
            p.mark = stamp
            p.from = null
            queue.push(p)
          }
        }
      }
      // Breadth first, so the first point found beside each other place is the
      // nearest way there.
      const hits = new Map<number, Pt>()
      while (queue.length > 0) {
        const next: Pt[] = []
        for (const p of queue) {
          for (const id of p.regs) {
            if (id !== from.id && !hits.has(id)) hits.set(id, p)
          }
          const pts = p.st.pts
          const around = [pts[p.i - 1], pts[p.i + 1], ...p.links]
          for (const q of around) {
            if (!q || !q.alive || q.mark === stamp) continue
            q.mark = stamp
            q.from = p
            next.push(q)
          }
        }
        queue = next
      }
      const choices: { path: Pt[]; to: Region }[] = []
      for (const [id, end] of hits) {
        const to = places.find((p) => p.id === id)
        if (!to || !want(to)) continue
        const path: Pt[] = []
        let at: Pt | null = end
        while (at) {
          path.push(at)
          at = at.from
        }
        path.reverse()
        choices.push({ path, to })
      }
      if (choices.length === 0) return null
      return choices[Math.floor(rand() * choices.length)]
    },
    clear() {
      strokes.length = 0
      for (const list of hash) list.length = 0
      rebuild()
    },
  }
}
