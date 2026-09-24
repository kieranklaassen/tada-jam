// Jam smoothness shim for the Alien Frontier showcase (see showcases/alien-frontier/PERF.md).
//
// The game's source is not in this repo, so this file adjusts the built scene
// at runtime without touching the prebuilt bundle. It runs once the game has
// built its world (the boot loader's __bootDone), and every change here
// belongs in the game's source eventually.
//
// Settings can be switched off for measurement with ?smooth=merge,shadows,...
// (or localStorage['jam-smooth']) naming the ones to keep; 'off' disables the shim.

const inBrowser = typeof window !== 'undefined' && typeof document !== 'undefined'
// The shell's URL does not reach this iframe, so measurement runs may also set localStorage['jam-smooth'].
const pick = inBrowser ? new URLSearchParams(location.search).get('smooth') ?? localStorage.getItem('jam-smooth') : 'off'
/** What runs when nothing is picked. */
const DEFAULTS = ['merge', 'shadows', 'casters', 'lights', 'detail', 'governor']
const on = (name) => (pick === null ? DEFAULTS.includes(name) : pick !== 'off' && pick.split(',').includes(name))

/**
 * Every Object3D the game's own systems hold, so nothing they move, hide or swap is ever merged. Anchors
 * (game.world.anchors: where buildings stand, for navigation and labels) only read positions, so they do not count.
 */
const POSITION_ONLY = new Set(['anchors'])

export function referencedObjects(game) {
  const seen = new Set()
  const held = new Set()
  const visit = (value, depth) => {
    if (!value || typeof value !== 'object' || seen.has(value) || depth > 4) return
    seen.add(value)
    if (value.isObject3D) {
      if (value !== game.scene) held.add(value)
      return
    }
    if (Array.isArray(value)) {
      for (const item of value) visit(item, depth + 1)
      return
    }
    if (value instanceof Map) {
      for (const item of value.values()) visit(item, depth + 1)
      return
    }
    for (const key of Object.keys(value)) {
      if (key === 'scene' || key === 'renderer' || key === 'composer' || POSITION_ONLY.has(key)) continue
      visit(value[key], depth + 1)
    }
  }
  visit(game, 0)
  return held
}

function signature(geometry) {
  const names = Object.keys(geometry.attributes).sort()
  return names.map((n) => `${n}:${geometry.attributes[n].itemSize}:${geometry.attributes[n].array.constructor.name}`).join('|') + (geometry.index ? '|i' : '')
}

export function snapshot(game) {
  const matrices = new Map()
  game.scene.traverse((o) => { if (o.isMesh) matrices.set(o, o.matrixWorld.elements.slice()) })
  return matrices
}

/**
 * Merge static, opaque meshes that share a material into one mesh per material, baking their world transforms.
 * `before` is a snapshot of world matrices taken a moment earlier: anything that moved since (windmill blades
 * turning with their group, say) is left alone.
 */
export function mergeStatic(game, before) {
  const held = referencedObjects(game)
  const groups = new Map()
  const skipped = {}
  const skip = (reason, n = 1) => (skipped[reason] = (skipped[reason] ?? 0) + n)
  /** Whether a game system holds this object or any group above it (it may move, hide or swap them). */
  const isHeld = (o) => {
    for (let p = o; p && p !== game.scene; p = p.parent) if (held.has(p)) return true
    return false
  }
  const hidden = (o) => {
    for (let p = o; p && p !== game.scene; p = p.parent) if (!p.visible) return true
    return false
  }
  const moved = (o) => {
    const was = before.get(o)
    return !was || was.some((v, i) => Math.abs(v - o.matrixWorld.elements[i]) > 1e-6)
  }
  for (const top of game.scene.children) {
    top.updateMatrixWorld(true)
    // A group with any moving part (windmill blades, a swinging sign) is left whole: its still parts may move later.
    let anyMoved = false
    let meshes = 0
    top.traverse((o) => {
      if (!o.isMesh) return
      meshes++
      if (moved(o)) anyMoved = true
    })
    if (anyMoved) { skip('in a group that moved while watched', meshes); continue }
    top.traverse((o) => {
      if (!o.isMesh) return
      if (isHeld(o)) return skip('held by a game system')
      if (hidden(o)) return skip('hidden')
      if (o.isInstancedMesh || o.isSkinnedMesh) return skip('instanced or skinned')
      const m = o.material
      if (!m || Array.isArray(m)) return skip('multi-material')
      if (m.transparent) return skip('transparent')
      if (Object.prototype.hasOwnProperty.call(o, 'onBeforeRender')) return skip('per-object render hook')
      const g = o.geometry
      if (g.morphAttributes && Object.keys(g.morphAttributes).length) return skip('morph targets')
      if (!g.attributes.position) return skip('no positions')
      const key = `${m.uuid}#${signature(g)}#${o.castShadow ? 1 : 0}${o.receiveShadow ? 1 : 0}`
      const list = groups.get(key) ?? []
      list.push(o)
      groups.set(key, list)
    })
  }
  let removed = 0
  let added = 0
  for (const meshes of groups.values()) {
    if (meshes.length < 2) continue
    const first = meshes[0]
    const names = Object.keys(first.geometry.attributes)
    let vertexCount = 0
    let indexCount = 0
    for (const mesh of meshes) {
      vertexCount += mesh.geometry.attributes.position.count
      indexCount += mesh.geometry.index ? mesh.geometry.index.count : 0
    }
    const merged = new first.geometry.constructor()
    const arrays = {}
    for (const name of names) {
      const a = first.geometry.attributes[name]
      arrays[name] = new a.array.constructor(vertexCount * a.itemSize)
    }
    const indexed = !!first.geometry.index
    const index = indexed ? new (vertexCount > 65535 ? Uint32Array : Uint16Array)(indexCount) : null
    let vOffset = 0
    let iOffset = 0
    for (const mesh of meshes) {
      const g = mesh.geometry
      const e = mesh.matrixWorld.elements
      // Normal matrix: inverse transpose of the upper 3x3.
      const [a, b, c, d, f, h, k, l, n] = [e[0], e[4], e[8], e[1], e[5], e[9], e[2], e[6], e[10]]
      const det = a * (f * n - h * l) - b * (d * n - h * k) + c * (d * l - f * k) || 1
      const nm = [(f * n - h * l) / det, -(d * n - h * k) / det, (d * l - f * k) / det, -(b * n - c * l) / det, (a * n - c * k) / det, -(a * l - b * k) / det, (b * h - c * f) / det, -(a * h - c * d) / det, (a * f - b * d) / det]
      const count = g.attributes.position.count
      for (const name of names) {
        const src = g.attributes[name]
        const dst = arrays[name]
        const size = src.itemSize
        for (let i = 0; i < count; i++) {
          if (name === 'position') {
            const x = src.getX(i), y = src.getY(i), z = src.getZ(i)
            const o = (vOffset + i) * 3
            dst[o] = e[0] * x + e[4] * y + e[8] * z + e[12]
            dst[o + 1] = e[1] * x + e[5] * y + e[9] * z + e[13]
            dst[o + 2] = e[2] * x + e[6] * y + e[10] * z + e[14]
          } else if (name === 'normal') {
            const x = src.getX(i), y = src.getY(i), z = src.getZ(i)
            let nx = nm[0] * x + nm[1] * y + nm[2] * z
            let ny = nm[3] * x + nm[4] * y + nm[5] * z
            let nz = nm[6] * x + nm[7] * y + nm[8] * z
            const len = Math.hypot(nx, ny, nz) || 1
            const o = (vOffset + i) * 3
            dst[o] = nx / len
            dst[o + 1] = ny / len
            dst[o + 2] = nz / len
          } else {
            for (let s = 0; s < size; s++) dst[(vOffset + i) * size + s] = src.array[i * size + s] ?? 0
          }
        }
      }
      if (indexed) {
        const src = g.index
        for (let i = 0; i < src.count; i++) index[iOffset + i] = src.getX(i) + vOffset
        iOffset += src.count
      }
      vOffset += count
    }
    for (const name of names) {
      const a = first.geometry.attributes[name]
      merged.setAttribute(name, new a.constructor(arrays[name], a.itemSize, a.normalized))
    }
    if (indexed) merged.setIndex(new first.geometry.index.constructor(index, 1))
    merged.computeBoundingSphere()
    merged.computeBoundingBox()
    const mesh = new first.constructor(merged, first.material)
    mesh.castShadow = first.castShadow
    mesh.receiveShadow = first.receiveShadow
    mesh.matrixAutoUpdate = false
    mesh.updateMatrix()
    mesh.name = 'jam-merged-static'
    game.scene.add(mesh)
    for (const m of meshes) m.parent.remove(m)
    removed += meshes.length
    added += 1
  }
  // Groups left empty by the merge are dropped so the renderer does not visit them every frame.
  for (const top of [...game.scene.children]) {
    let meshesLeft = 0
    top.traverse((o) => { if (o.isMesh || o.isLight || o.isPoints || o.isLine || o.isSprite) meshesLeft++ })
    if (meshesLeft === 0 && top.children.length >= 0 && !held.has(top) && top.type === 'Group') game.scene.remove(top)
  }
  return { removed, added, skipped }
}

/** Parts too small to throw a visible shadow (buttons, eyes, hat bands) stop casting, so the shadow pass skips them. */
export function smallCastersOff(game, radius) {
  let off = 0
  game.scene.traverse((o) => {
    if (!o.isMesh || !o.castShadow || o.isInstancedMesh) return
    if (!o.geometry.boundingSphere) o.geometry.computeBoundingSphere()
    const s = o.getWorldScale(o.position.clone())
    if (o.geometry.boundingSphere.radius * Math.max(s.x, s.y, s.z) < radius) {
      o.castShadow = false
      off++
    }
  })
  return { off }
}

/** The sun's shadow map re-renders every caster each frame; redraw it every few frames instead. */
export function throttleShadows(game, every) {
  const shadowMap = game.renderer.shadowMap
  shadowMap.autoUpdate = false
  let frame = 0
  const render = game.composer.render.bind(game.composer)
  game.composer.render = (...args) => {
    if (frame++ % every === 0 || !game.sky?.sun?.shadow?.map) shadowMap.needsUpdate = true
    return render(...args)
  }
}

/**
 * Every lit pixel loops over every point light in the scene (14: the fires and the saucer). Keep only the
 * nearest few switched on. The number switched on never changes, so no shader recompiles.
 */
export function poolLights(game, keep) {
  const lights = []
  game.scene.traverse((o) => { if (o.isPointLight) lights.push(o) })
  if (lights.length <= keep) return { lights: lights.length, kept: lights.length }
  const at = lights[0].position.clone()
  const place = () => {
    const c = game.camera.position
    const distance = (l) => {
      l.getWorldPosition(at)
      return (at.x - c.x) ** 2 + (at.y - c.y) ** 2 + (at.z - c.z) ** 2
    }
    const sorted = [...lights].sort((a, b) => distance(a) - distance(b))
    sorted.forEach((light, i) => { light.visible = i < keep })
  }
  place()
  setInterval(place, 500)
  return { lights: lights.length, kept: keep }
}

/**
 * Characters are built from 25 to 117 separate meshes each. Far away (they stay in view through the thin fog)
 * only their largest parts draw: the rest of each rig is left off the camera's render layer, so the game's own
 * visibility flags are never touched.
 */
export function characterDetail(game, distance, keep) {
  const roots = [
    ...Object.values(game.npcs ?? {}).map((n) => n.rig?.root),
    ...(game.cows ?? []).map((c) => c.rig?.root),
    game.horse?.rig?.root,
  ].filter(Boolean)
  const rigs = roots.map((root) => {
    const meshes = []
    root.traverse((o) => { if (o.isMesh) meshes.push(o) })
    const size = (m) => {
      if (!m.geometry.boundingSphere) m.geometry.computeBoundingSphere()
      const s = m.getWorldScale(m.position.clone())
      return m.geometry.boundingSphere.radius * Math.max(s.x, s.y, s.z)
    }
    const small = meshes.map((m) => [m, size(m)]).sort((a, b) => b[1] - a[1]).slice(keep).map(([m]) => m)
    for (const m of small) m.userData.jamLayers = m.layers.mask
    return { root, small, far: false }
  })
  const place = () => {
    const c = game.camera.position
    for (const rig of rigs) {
      const p = rig.root.getWorldPosition(rig.root.position.clone())
      const far = (p.x - c.x) ** 2 + (p.z - c.z) ** 2 > distance * distance
      if (far === rig.far) continue
      rig.far = far
      for (const m of rig.small) m.layers.mask = far ? 0 : m.userData.jamLayers
    }
  }
  place()
  setInterval(place, 250)
  return { rigs: rigs.length, farParts: rigs.reduce((n, r) => n + r.small.length, 0) }
}

/**
 * A governor that follows the jam's rules (docs/solutions/performance-issues/measure-on-the-target-device-and-
 * ship-adaptive-quality.md), replacing the game's own, which starts an M4 at Ultra and walks down with a resize
 * hitch at every step, ignores frames over 250 ms (so a slow device never steps down), and retries failed
 * upgrades. Tiers are the game's: 0 Ultra ... 6 Lowest.
 */
export const GOVERNOR = {
  startTier: 3,
  windowFrames: 30,
  windowSeconds: 1,
  missedMs: 20.8,
  badShare: 0.1,
  cleanShare: 0.02,
  farOffMs: 34,
  stallMs: 1000,
  cleanWindowsToClimb: 6,
  lightWorkMs: 8,
  failedWithinSeconds: 20,
  settleSeconds: 1.5,
}

/**
 * The governor itself: `sample(dt)` gets each frame's interval in seconds and returns a new tier or null;
 * `workMs()` reads the last frame's CPU work. `settle(seconds)` is also called by the game after scene changes.
 */
export function createGovernor(startTier, workMs, g = GOVERNOR) {
  const lowest = 6
  return {
    tier: Math.max(g.startTier, startTier),
    ceiling: 0,
    settleLeft: g.settleSeconds,
    frames: [],
    works: [],
    elapsed: 0,
    bad: 0,
    clean: 0,
    climbedAt: -Infinity,
    now: 0,
    settle(seconds = g.settleSeconds) {
      this.settleLeft = Math.max(this.settleLeft, seconds)
      this.frames.length = 0
      this.works.length = 0
      this.elapsed = 0
    },
    change(tier) {
      this.tier = Math.max(this.ceiling, Math.min(lowest, tier))
      this.bad = 0
      this.clean = 0
      this.settle()
      return this.tier
    },
    sample(dt) {
      this.now += dt
      if (dt * 1000 > g.stallMs) return null
      if (this.settleLeft > 0) {
        this.settleLeft -= dt
        return null
      }
      this.frames.push(dt * 1000)
      this.works.push(workMs())
      this.elapsed += dt
      if (this.frames.length < g.windowFrames && this.elapsed < g.windowSeconds) return null
      if (this.frames.length < 4) return null
      const sorted = [...this.frames].sort((a, b) => a - b)
      sorted.pop() // one isolated long frame (a build, a GC pause) says nothing about the device
      const average = sorted.reduce((a, b) => a + b, 0) / sorted.length
      const missed = sorted.filter((ms) => ms > g.missedMs).length / sorted.length
      const averageWork = this.works.reduce((a, b) => a + b, 0) / this.works.length
      this.frames.length = 0
      this.works.length = 0
      this.elapsed = 0
      if (missed > g.badShare || average > g.missedMs) {
        this.clean = 0
        this.bad += 1
        const farOff = average > g.farOffMs
        if ((this.bad >= 2 || farOff) && this.tier < lowest) {
          if (this.now - this.climbedAt < g.failedWithinSeconds) this.ceiling = this.tier + 1
          return this.change(this.tier + (farOff ? 2 : 1))
        }
        return null
      }
      this.bad = 0
      this.clean = missed <= g.cleanShare && averageWork < g.lightWorkMs ? this.clean + 1 : 0
      if (this.clean >= g.cleanWindowsToClimb && this.tier > this.ceiling) {
        this.climbedAt = this.now
        return this.change(this.tier - 1)
      }
      return null
    },
  }
}

function replaceGovernor(game) {
  let work = 0
  const update = game.update.bind(game)
  const render = game.composer.render.bind(game.composer)
  let frameWork = 0
  game.update = (dt) => {
    const t = performance.now()
    update(dt)
    frameWork = performance.now() - t
  }
  game.composer.render = (...args) => {
    const t = performance.now()
    const out = render(...args)
    work = frameWork + (performance.now() - t)
    return out
  }
  const governor = createGovernor(game.auto?.tier ?? GOVERNOR.startTier, () => work)
  game.auto = governor
  if (game.settings?.quality === 'auto') game.applyTier(governor.tier)
  return { startTier: governor.tier }
}

/** The composer's target is 4x multisampled (a half-float target): drop the samples. */
export function dropMultisampling(game) {
  for (const target of [game.composer.renderTarget1, game.composer.renderTarget2]) {
    if (!target || !target.samples) continue
    target.samples = 0
    target.dispose()
  }
}

/** How long to watch the title scene for moving parts before merging what stayed still. */
const WATCH_MS = 2000
const SETTLE_MS = 600

function boot(game) {
  const report = {}
  window.__jamSmooth = report
  if (on('shadows')) throttleShadows(game, 3)
  if (on('casters')) report.casters = smallCastersOff(game, 0.25)
  if (on('lights')) report.lights = poolLights(game, 4)
  if (on('msaa')) dropMultisampling(game)
  if (on('detail')) report.detail = characterDetail(game, 50, 5)
  if (on('governor')) report.governor = replaceGovernor(game)
  if (on('merge')) {
    // Watch the world in play, not on the title screen: some scenery (windmills, signs) only moves once play
    // starts. Merge once play has started, the opening cinematic is over, and nothing moved for WATCH_MS.
    const playing = () => game.started && !game.cine && !game.paused && !game.suspended
    const wait = setInterval(() => {
      if (!playing()) return
      clearInterval(wait)
      setTimeout(() => {
        const before = snapshot(game)
        setTimeout(() => {
          const t0 = performance.now()
          report.merge = mergeStatic(game, before)
          report.merge.ms = +(performance.now() - t0).toFixed(1)
          console.info('[jam-smooth]', JSON.stringify(report))
        }, WATCH_MS)
      }, SETTLE_MS)
    }, 250)
  }
}

if (inBrowser && pick !== 'off') {
  const done = window.__bootDone
  window.__bootDone = (...args) => {
    done?.(...args)
    try {
      if (window.game) boot(window.game)
    } catch (error) {
      console.error('[jam-smooth] failed; the game runs unchanged', error)
    }
  }
}
