// In-page half of the jam intersection audit (scripts/jam-intersections.mjs).
// Injected before any game code runs. three.js announces every Scene and
// WebGLRenderer it creates to window.__THREE_DEVTOOLS__, so the audit reaches
// any game's live scene graph without the game exporting anything. Plain
// browser JavaScript: it is read as text and passed to addInitScript.
;(() => {
  const audit = {
    renderers: [],
    pairs: new Map(),
    frames: 0,
    skipRender: true,
    // Last geometry version sent to Node per piece id; unchanged pieces are
    // sent without positions.
    sent: new Map(),
  }
  window.__jamAudit = audit

  const hook = new EventTarget()
  hook.addEventListener('observe', (event) => {
    const o = event.detail
    if (!o || !o.isWebGLRenderer) return
    audit.renderers.push(o)
    const render = o.render.bind(o)
    o.__auditRender = render
    o.render = (scene, camera) => {
      const key = scene.uuid + ':' + camera.uuid
      let pair = audit.pairs.get(key)
      if (!pair) {
        pair = { scene, camera, renderer: o, calls: 0, meshes: 0 }
        audit.pairs.set(key, pair)
      }
      pair.calls++
      audit.frames++
      if (pair.calls % 30 === 1) {
        let meshes = 0
        scene.traverse((m) => { if (m.isMesh) meshes++ })
        pair.meshes = meshes
      }
      if (audit.skipRender) {
        // Keep world matrices current, as a real render would: games pick
        // with raycasters that read matrixWorld.
        if (scene.matrixWorldAutoUpdate !== false) scene.updateMatrixWorld()
        if (camera.parent === null && camera.matrixWorldAutoUpdate !== false) camera.updateMatrixWorld()
        return
      }
      return render(scene, camera)
    }
  })
  Object.defineProperty(window, '__THREE_DEVTOOLS__', { value: hook, configurable: true })

  audit.main = () => {
    let best = null
    for (const p of audit.pairs.values()) if (!best || p.meshes > best.meshes) best = p
    return best
  }

  const compile = (list) => (list ?? []).map((s) => new RegExp(s))
  const matches = (res, ...texts) => res.some((re) => texts.some((t) => re.test(t)))

  function visibleChain(o) {
    for (let q = o; q; q = q.parent) if (!q.visible) return false
    return true
  }

  function pathOf(o, scene, cache) {
    if (o === scene || !o.parent) return ''
    if (cache.has(o)) return cache.get(o)
    const parent = pathOf(o.parent, scene, cache)
    const index = o.parent.children.indexOf(o)
    const own = (o.name ? o.name : o.type) + ':' + index
    const p = parent ? parent + '/' + own : own
    cache.set(o, p)
    return p
  }

  function labelOf(o, scene) {
    const names = []
    for (let q = o; q && q !== scene; q = q.parent) if (q.name) names.unshift(q.name)
    const g = o.geometry
    const kind = g.type === 'BufferGeometry' ? 'mesh' : g.type.replace(/Geometry$/, '').toLowerCase()
    if (!names.length) {
      const cache = new Map()
      const path = pathOf(o, scene, cache).split('/')
      names.push(path.slice(-2).join('/'))
    }
    const tail = o.name ? '' : ' ' + kind
    const color = (() => {
      const m = Array.isArray(o.material) ? o.material[0] : o.material
      const c = m && (m.color || (m.uniforms && (m.uniforms.uColor || m.uniforms.color || m.uniforms.uBase)?.value))
      return c && c.isColor ? ' #' + c.getHexString() : ''
    })()
    return (names.join('>') || '(unnamed)') + tail + color
  }

  function materialInfo(o) {
    const list = Array.isArray(o.material) ? o.material : [o.material]
    const m = list[0] || {}
    const any = (f) => list.some(f)
    return {
      type: m.type || 'unknown',
      side: m.side ?? 0,
      transparent: any((x) => x.transparent),
      opacity: Math.max(...list.map((x) => (x.opacity ?? 1))),
      depthTest: any((x) => x.depthTest !== false),
      depthWrite: any((x) => x.depthWrite !== false),
      polygonOffset: list.every((x) => x.polygonOffset && ((x.polygonOffsetFactor ?? 0) !== 0 || (x.polygonOffsetUnits ?? 0) !== 0)),
      colorWrite: any((x) => x.colorWrite !== false),
      customVertex: any((x) => x.isShaderMaterial || x.isRawShaderMaterial || typeof x.onBeforeCompile === 'function' && x.onBeforeCompile.toString().includes('vertex')),
      renderOrder: o.renderOrder || 0,
    }
  }

  function b64(typed) {
    const bytes = new Uint8Array(typed.buffer, typed.byteOffset, typed.byteLength)
    let s = ''
    for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000))
    return btoa(s)
  }

  function worldBox(o) {
    const g = o.geometry
    if (!g.boundingBox) g.computeBoundingBox()
    const bb = g.boundingBox
    const e = o.matrixWorld.elements
    const lo = [Infinity, Infinity, Infinity]
    const hi = [-Infinity, -Infinity, -Infinity]
    for (let i = 0; i < 8; i++) {
      const x = i & 1 ? bb.max.x : bb.min.x
      const y = i & 2 ? bb.max.y : bb.min.y
      const z = i & 4 ? bb.max.z : bb.min.z
      const w = [e[0] * x + e[4] * y + e[8] * z + e[12], e[1] * x + e[5] * y + e[9] * z + e[13], e[2] * x + e[6] * y + e[10] * z + e[14]]
      for (let k = 0; k < 3; k++) { lo[k] = Math.min(lo[k], w[k]); hi[k] = Math.max(hi[k], w[k]) }
    }
    return [lo, hi]
  }

  function cameraInfo(camera, renderer) {
    camera.updateMatrixWorld()
    const el = renderer.domElement
    const w = el.clientWidth || el.width
    const h = el.clientHeight || el.height
    const e = camera.matrixWorld.elements
    return {
      position: [e[12], e[13], e[14]],
      forward: [-e[8], -e[9], -e[10]],
      ortho: !!camera.isOrthographicCamera,
      near: camera.near ?? 0.1,
      far: camera.far ?? 1000,
      fov: camera.fov ?? 50,
      zoom: camera.zoom ?? 1,
      orthoHeight: camera.isOrthographicCamera ? (camera.top - camera.bottom) / (camera.zoom || 1) : 0,
      view: Array.from(camera.matrixWorldInverse.elements),
      projection: Array.from(camera.projectionMatrix.elements),
      viewport: [w, h],
      logDepth: !!renderer.capabilities?.logarithmicDepthBuffer,
    }
  }

  // Everything the Node side needs for one moment of game time. Positions are
  // sent only when a piece's geometry or transform changed since the last send.
  audit.snapshot = (options) => {
    const pair = audit.main()
    if (!pair) return null
    const { scene, camera, renderer } = pair
    scene.updateMatrixWorld(true)
    camera.updateMatrixWorld()
    const ignore = compile(options.ignore)
    const objectRules = (options.objects ?? []).map((r) => ({ re: new RegExp(r.match), as: r.as }))
    const cam = cameraInfo(camera, renderer)
    const cache = new Map()
    const meshes = []
    const skipped = []
    scene.traverse((o) => {
      if (!o.isMesh || !o.geometry || !o.geometry.attributes.position) return
      if (!visibleChain(o)) return
      if (o.layers && camera.layers && !camera.layers.test(o.layers)) return
      const mat = materialInfo(o)
      if (!mat.colorWrite || (mat.transparent && mat.opacity < 0.05)) return
      if (o.userData && o.userData.jamAuditIgnore) return
      const path = pathOf(o, scene, cache)
      const label = labelOf(o, scene)
      if (matches(ignore, path, label, mat.type)) return
      if (o.geometry.isInstancedBufferGeometry) { skipped.push({ path, label, why: 'shader-instanced' }); return }
      meshes.push({ o, path, label, mat })
    })

    // View size at the depth of the scene's content, for the object heuristic.
    const depths = []
    const boxes = new Map()
    for (const m of meshes) {
      const box = worldBox(m.o)
      boxes.set(m.o, box)
      const c = [0, 1, 2].map((k) => (box[0][k] + box[1][k]) / 2)
      depths.push((c[0] - cam.position[0]) * cam.forward[0] + (c[1] - cam.position[1]) * cam.forward[1] + (c[2] - cam.position[2]) * cam.forward[2])
    }
    depths.sort((a, b) => a - b)
    const focusDepth = Math.max(cam.near * 2, depths[depths.length >> 1] || 1)
    const aspect = cam.viewport[0] / Math.max(1, cam.viewport[1])
    const viewH = cam.ortho ? cam.orthoHeight : 2 * focusDepth * Math.tan((cam.fov * Math.PI) / 360)
    const viewSize = viewH * Math.max(1, aspect)

    const subtree = new Map()
    const subtreeInfo = (g) => {
      if (subtree.has(g)) return subtree.get(g)
      const lo = [Infinity, Infinity, Infinity]
      const hi = [-Infinity, -Infinity, -Infinity]
      let count = 0
      for (const m of meshes) {
        let inside = false
        for (let q = m.o; q; q = q.parent) if (q === g) { inside = true; break }
        if (!inside) continue
        count++
        const b = boxes.get(m.o)
        for (let k = 0; k < 3; k++) { lo[k] = Math.min(lo[k], b[0][k]); hi[k] = Math.max(hi[k], b[1][k]) }
      }
      const diag = count ? Math.hypot(hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]) : 0
      const info = { diag, count }
      subtree.set(g, info)
      return info
    }
    const objFrac = options.objectFraction ?? 0.3
    const objectOf = (m) => {
      for (const r of objectRules) if (r.re.test(m.path) || r.re.test(m.label)) return 'rule:' + r.as
      for (let q = m.o; q && q !== scene; q = q.parent) if (q.userData && q.userData.jamObject) return 'tag:' + q.userData.jamObject
      let root = m.o
      for (let q = m.o.parent; q && q !== scene; q = q.parent) {
        const info = subtreeInfo(q)
        if (info.diag <= objFrac * viewSize && info.count <= 80) root = q
        else break
      }
      return pathOf(root, scene, cache) || m.path
    }

    const pieces = []
    const tmp = new camera.position.constructor()
    for (const m of meshes) {
      const o = m.o
      const g = o.geometry
      const pos = g.attributes.position
      const deformed = !!(o.isSkinnedMesh || (o.morphTargetInfluences && o.morphTargetInfluences.some((v) => v !== 0)))
      const idx = g.index ? g.index.array : null
      const start = g.drawRange.start || 0
      const end = Math.min(g.index ? g.index.count : pos.count, start + (Number.isFinite(g.drawRange.count) ? g.drawRange.count : Infinity))
      const object = objectOf(m)
      const instances = o.isInstancedMesh ? Math.min(o.count, options.maxInstances ?? 256) : 0
      const e = o.matrixWorld.elements
      const base = {
        mesh: m.path,
        label: m.label,
        material: m.mat,
        instanced: o.isInstancedMesh ? o.count : 0,
      }
      const geomKey = g.uuid + ':' + pos.version + ':' + (g.index ? g.index.version : 0) + ':' + start + ':' + end
      const local = () => {
        if (!deformed) return pos
        const out = new Float32Array(pos.count * 3)
        for (let i = 0; i < pos.count; i++) {
          o.getVertexPosition(i, tmp)
          out[i * 3] = tmp.x; out[i * 3 + 1] = tmp.y; out[i * 3 + 2] = tmp.z
        }
        return { count: pos.count, getX: (i) => out[i * 3], getY: (i) => out[i * 3 + 1], getZ: (i) => out[i * 3 + 2], array: out }
      }
      const emit = (id, obj, matrix) => {
        const version = geomKey + ':' + (deformed ? audit.frames : '') + ':' + matrix.map((v) => v.toFixed(5)).join(',')
        const piece = { ...base, id, object: obj, version }
        if (audit.sent.get(id) !== version) {
          audit.sent.set(id, version)
          const src = local()
          const n = src.count
          const out = new Float32Array(n * 3)
          const me = matrix
          for (let i = 0; i < n; i++) {
            const x = src.getX(i), y = src.getY(i), z = src.getZ(i)
            out[i * 3] = me[0] * x + me[4] * y + me[8] * z + me[12]
            out[i * 3 + 1] = me[1] * x + me[5] * y + me[9] * z + me[13]
            out[i * 3 + 2] = me[2] * x + me[6] * y + me[10] * z + me[14]
          }
          piece.positions = b64(out)
          if (idx) piece.index = b64(Uint32Array.from(idx.subarray(start, end)))
          else if (start !== 0 || end !== n) piece.range = [start, end]
        }
        pieces.push(piece)
      }
      if (o.isInstancedMesh) {
        const im = o.instanceMatrix.array
        for (let i = 0; i < instances; i++) {
          const l = im.subarray(i * 16, i * 16 + 16)
          // world = matrixWorld * instanceMatrix
          const w = new Array(16)
          for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) {
            w[c * 4 + r] = e[r] * l[c * 4] + e[4 + r] * l[c * 4 + 1] + e[8 + r] * l[c * 4 + 2] + e[12 + r] * l[c * 4 + 3]
          }
          if (Math.abs(w[0]) + Math.abs(w[5]) + Math.abs(w[10]) < 1e-9) continue
          emit(m.path + '#' + i, object + '#' + i, w)
        }
      } else {
        emit(m.path, object, Array.from(e))
      }
    }
    return { camera: cam, viewSize, pieces, skipped, frames: audit.frames }
  }

  audit.projectFrac = (point) => {
    const pair = audit.main()
    if (!pair) return null
    const v = new pair.camera.position.constructor(point[0], point[1], point[2])
    v.project(pair.camera)
    return [(v.x + 1) / 2, (1 - v.y) / 2, v.z]
  }

  // Screen position (fractions of the canvas) of the first mesh whose path or
  // label matches, for moments that tap a named thing.
  audit.find = (pattern) => {
    const pair = audit.main()
    if (!pair) return null
    const re = new RegExp(pattern)
    const cache = new Map()
    let hit = null
    pair.scene.updateMatrixWorld(true)
    pair.scene.traverse((o) => {
      if (hit || !o.isMesh || !visibleChain(o)) return
      if (!re.test(pathOf(o, pair.scene, cache)) && !re.test(labelOf(o, pair.scene))) return
      const [lo, hi] = worldBox(o)
      hit = audit.projectFrac([(lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2, (lo[2] + hi[2]) / 2])
    })
    return hit
  }

  function renderWith(camera) {
    const pair = audit.main()
    const r = pair.renderer
    const prevTarget = r.getRenderTarget()
    const prevAuto = r.autoClear
    r.setRenderTarget(null)
    r.autoClear = true
    r.__auditRender(pair.scene, camera)
    const url = r.domElement.toDataURL('image/png')
    r.autoClear = prevAuto
    r.setRenderTarget(prevTarget)
    return url
  }

  function loadImage(url) {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = reject
      img.src = url
    })
  }

  // A magnified render of what the child's camera sees around `focus`, with
  // the intersection curve drawn over it, plus the whole frame with the spot
  // ringed. Rendered straight to the canvas (no post pass) while the clock is
  // paused; the game's next frame draws over it.
  audit.shoot = async ({ focus, radius, segments, zoom: wantZoom, color }) => {
    const pair = audit.main()
    if (!pair) return null
    const { camera, renderer } = pair
    const el = renderer.domElement
    const W = el.clientWidth || el.width
    const H = el.clientHeight || el.height
    const p = audit.projectFrac(focus)
    const edge = audit.projectFrac([focus[0] + radius, focus[1], focus[2]])
    const edge2 = audit.projectFrac([focus[0], focus[1] + radius, focus[2]])
    const rpx = Math.max(Math.hypot((edge[0] - p[0]) * W, (edge[1] - p[1]) * H), Math.hypot((edge2[0] - p[0]) * W, (edge2[1] - p[1]) * H), 4)
    const zoom = wantZoom ?? Math.min(8, Math.max(2, (0.22 * H) / rpx))
    const w = W / zoom
    const h = H / zoom
    const x0 = Math.min(Math.max(p[0] * W - w / 2, 0), W - w)
    const y0 = Math.min(Math.max(p[1] * H - h / 2, 0), H - h)
    const close = camera.clone()
    close.setViewOffset(W, H, x0, y0, w, h)
    close.updateProjectionMatrix()
    close.updateMatrixWorld()
    const closeUrl = renderWith(close)
    const frameUrl = renderWith(camera)
    const draw = async (url, cam, mark) => {
      const img = await loadImage(url)
      const c = document.createElement('canvas')
      c.width = img.width
      c.height = img.height
      const g = c.getContext('2d')
      g.drawImage(img, 0, 0)
      const sx = img.width / W
      const sy = img.height / H
      const V = camera.position.constructor
      const proj = (x, y, z) => {
        const v = new V(x, y, z).project(cam)
        return [((v.x + 1) / 2) * img.width, ((1 - v.y) / 2) * img.height]
      }
      g.lineWidth = Math.max(2, img.width / 400)
      g.strokeStyle = color || '#ff00d4'
      if (segments && segments.length) {
        g.beginPath()
        for (let i = 0; i + 5 < segments.length; i += 6) {
          const a = proj(segments[i], segments[i + 1], segments[i + 2])
          const b = proj(segments[i + 3], segments[i + 4], segments[i + 5])
          g.moveTo(a[0], a[1])
          g.lineTo(b[0], b[1])
        }
        g.stroke()
      }
      if (mark) {
        g.strokeStyle = '#ffe100'
        g.lineWidth = Math.max(2, img.width / 300)
        g.strokeRect(x0 * sx, y0 * sy, w * sx, h * sy)
      }
      return c.toDataURL('image/png').split(',')[1]
    }
    return { closeup: await draw(closeUrl, close, false), frame: await draw(frameUrl, camera, true), zoom }
  }

  audit.frame = async () => {
    const pair = audit.main()
    if (!pair) return null
    return renderWith(pair.camera).split(',')[1]
  }
})()
