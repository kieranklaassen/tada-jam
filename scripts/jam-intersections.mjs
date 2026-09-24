// Jam intersection audit: plays each game's production build headless and
// checks its live three.js scene for pieces passing through each other.
//
//   npm run build
//   npm run check:intersections -- <game> [<game> ...] | --all
//     [--ci] [--out <dir>] [--base <url>] [--sample <ms>] [--no-shots] [--shard i/n]
//     [--replay <earlier report.json>]
//
// Per game: open it with the clock paused before load and Math.random seeded,
// drive the moments in scripts/intersections/games/<key>.ts (a generic
// idle-play-rest script when it has none), and every `sampleMs` of game time
// read every visible mesh in world space through three.js's devtools hook.
// scripts/intersections/core.ts turns each sample into findings (penetration,
// contained, pose, zfight, nearclip). Rendering is skipped while playing and
// done only for pictures, so a run is mostly game logic.
//
// Writes <out>/<game>/report.json, report.md, contact-sheet.png, and one
// close-up plus a ringed full frame per finding under hits/. The pictures are
// raw renders (no post pass), magnified from the child's own camera.
// --ci exits non-zero when a game with `enforce: true` has a visible finding
// that its `allow` list does not cover. Default out: test-results/intersections.
// --replay takes the report.json of an earlier run with the same moments (say,
// before a fix) and photographs each of its findings again at the same game
// time and spot, writing replay/ and a before-after.png sheet.
// Needs Playwright's Chromium: npx playwright install chromium.

import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { chromium } from 'playwright'
import { DEFAULT_TOLERANCE, analyseMoment, clipToPlanes, pairKey, preparePiece, splitComponents } from './intersections/core.ts'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const W = 1180
const H = 820
const STEP = 33
const COUNTS_UP = new Set(['light-garden', 'bedtime-forest', 'critter-clay'])

function parseArgs(argv) {
  const opts = { games: [], ci: false, out: join(root, 'test-results', 'intersections'), base: null, sample: null, shots: true, compose: null }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--all') opts.all = true
    else if (a === '--ci') opts.ci = true
    else if (a === '--out') opts.out = resolve(argv[++i])
    else if (a === '--base') opts.base = argv[++i]
    else if (a === '--sample') opts.sample = Number(argv[++i])
    else if (a === '--no-shots') opts.shots = false
    else if (a === '--shard') opts.shard = argv[++i].split('/').map(Number)
    else if (a === '--replay') opts.replay = resolve(argv[++i])
    else if (a === '--compose') opts.compose = argv.slice(i + 1)
    else if (!a.startsWith('--')) opts.games.push(a)
    if (opts.compose) break
  }
  return opts
}

export function allGames() {
  const dir = join(root, 'games')
  return readdirSync(dir).filter((k) => existsSync(join(dir, k, 'index.ts'))).sort()
}

async function loadConfig(game) {
  const file = join(root, 'scripts', 'intersections', 'games', `${game}.ts`)
  if (!existsSync(file)) return { enforce: false }
  return (await import(pathToFileURL(file).href)).default
}

const at = (f) => ({ x: f[0] * W, y: f[1] * H })

function genericMoments() {
  const grid = []
  for (const fy of [0.4, 0.6, 0.78]) for (const fx of [0.25, 0.5, 0.75]) grid.push([fx, fy])
  return [
    { name: 'idle', run: (d) => d.wait(7000) },
    {
      name: 'play',
      run: async (d) => {
        for (let i = 0; i < grid.length; i++) {
          if (i % 3 === 2) await d.drag([0.5, 0.85], grid[i], 700)
          else await d.tap(grid[i])
          await d.wait(700)
        }
      },
    },
    { name: 'rest', run: (d) => d.wait(3000) },
  ]
}

function decode(b64, Type) {
  const buf = Buffer.from(b64, 'base64')
  return new Type(buf.buffer, buf.byteOffset, buf.byteLength / Type.BYTES_PER_ELEMENT)
}

class TwoGen {
  prev = new Map()
  next = new Map()
  has(k) { return this.next.has(k) || this.prev.has(k) }
  get(k) {
    if (this.next.has(k)) return this.next.get(k)
    const v = this.prev.get(k)
    this.next.set(k, v)
    return v
  }
  set(k, v) { this.next.set(k, v); return this }
  roll() { this.prev = this.next; this.next = new Map() }
}

const compileAll = (list) => (list ?? []).map((s) => new RegExp(s))
// Rules also see each text without its colour suffix and child indices, as in page.js.
const bare = (t) => String(t).replace(/ #[0-9a-f]{6}$/i, '').replace(/:\d+(?=[/#~]|$)/g, '')
const test = (re, ...texts) => texts.some((t) => re.test(t) || re.test(bare(t)))

function allowedBy(finding, allow) {
  for (const rule of allow) {
    if (rule.kind && rule.kind !== finding.kind) continue
    const ra = new RegExp(rule.a)
    const rb = rule.b ? new RegExp(rule.b) : null
    const side = (re, x) => test(re, x.id, x.label, x.object)
    const A = { id: finding.a, label: finding.labelA, object: finding.objectA }
    const B = { id: finding.b, label: finding.labelB, object: finding.objectB }
    const hit = rb ? (side(ra, A) && side(rb, B)) || (side(ra, B) && side(rb, A)) : side(ra, A) || side(ra, B)
    if (!hit) continue
    if (rule.upTo !== undefined && finding.relative > rule.upTo) continue
    return rule
  }
  return null
}

function severity(f) {
  if (f.kind === 'zfight') return f.pixels / 40
  if (f.kind === 'nearclip') return 1
  return f.relative * Math.min(4, 0.5 + f.pixels / 8)
}

function reportable(f) {
  if (!f.visible) return false
  if (f.kind === 'zfight' || f.kind === 'nearclip') return true
  return f.pixels >= 1.5
}

const slug = (s) => s.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').slice(0, 60).toLowerCase()

async function auditGame(browser, base, game, opts) {
  const config = await loadConfig(game)
  const tolerance = { ...DEFAULT_TOLERANCE, ...config.tolerance }
  const sampleMs = opts.sample ?? config.sampleMs ?? 250
  const out = join(opts.out, game)
  const replayFile = opts.replay && (opts.replay.endsWith('.json') ? opts.replay : join(opts.replay, game, 'report.json'))
  const replay = replayFile && existsSync(replayFile) ? JSON.parse(readFileSync(replayFile, 'utf8')) : null
  const replayTargets = (replay?.findings ?? []).filter((f) => f.shot && f.at !== null)
  const replayed = []
  rmSync(out, { recursive: true, force: true })
  mkdirSync(join(out, 'hits'), { recursive: true })
  mkdirSync(join(out, 'contacts'), { recursive: true })
  if (replay) mkdirSync(join(out, 'replay'), { recursive: true })
  const context = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, hasTouch: true })
  await context.addInitScript(() => {
    let s = 0x2545f491
    Math.random = () => {
      s ^= s << 13
      s ^= s >>> 17
      s ^= s << 5
      return (s >>> 0) / 2 ** 32
    }
  })
  await context.addInitScript({ content: readFileSync(join(root, 'scripts', 'intersections', 'page.js'), 'utf8') })
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)))
  await page.clock.install({ time: 0 })
  await page.clock.pauseAt(1000)
  await page.goto(base + '/')
  await page.evaluate((age) => {
    localStorage.clear()
    localStorage.setItem('tada-jam:prefs', JSON.stringify({ childAge: age }))
  }, config.childAge ?? 5)
  const query = config.query ?? (game === 'pebble-table' ? '' : `tier=${COUNTS_UP.has(game) ? 3 : 0}`)
  await page.goto(`${base}/?chrome=0${query ? '&' + query : ''}#/play/${game}`)
  const firstFrame = async () => {
    for (let i = 0; i <= 120; i++) {
      // Two frames, not one: a game may draw once from its resize handler
      // before its own loop has placed anything.
      if (await page.evaluate(() => (window.__jamAudit?.main()?.calls ?? 0) > 1)) return true
      await page.clock.runFor(STEP)
    }
    return false
  }
  if (!(await firstFrame())) {
    // A canvas-2D, SVG or DOM game has no three.js scene to read: say so
    // and leave it to its own tests, rather than failing every CI run.
    const renderers = await page.evaluate(() => window.__jamAudit?.renderers.length ?? 0)
    if (renderers > 0) throw new Error(`${game}: no frame drawn after 4 s of game time`)
    await context.close()
    const result = { game, enforce: !!config.enforce, notAudited: 'no three.js scene', skipped: [], counts: { reportable: 0, open: 0, allowed: 0, hidden: 0 }, samples: 0, pieces: 0, seconds: 0, errors, findings: [], moments: [] }
    writeFileSync(join(out, 'report.json'), JSON.stringify(result, null, 1))
    writeFileSync(join(out, 'report.md'), `# Intersection audit: ${game}\n\nSkipped: the game drew no three.js scene within 4 s of game time (a canvas-2D, SVG, or DOM game). Cover its overlaps with tests on its own model.\n`)
    return result
  }

  const positions = new Map()
  const versions = new Map()
  const names = new Map()
  const prepared = new Map()
  const cache = new TwoGen()
  const poseHistory = new Map()
  const findings = new Map()
  const moments = []
  const skipped = new Map()
  const ignoreRes = compileAll(config.ignore)
  const splitRes = compileAll(config.split)
  const allow = config.allow ?? []
  let t = 0
  let moment = ''
  let samples = 0
  let pieceCount = 0
  let customVertex = new Set()
  let lastSampleAt = -Infinity
  let lastPieces = []
  let lastSnap = null

  const shoot = async (f, file) => {
    if (!opts.shots) return null
    const shot = await page.evaluate((a) => window.__jamAudit.shoot(a), { focus: f.focus, radius: Math.max(f.radius, 1e-6), segments: f.segments.slice(0, 6 * 240) })
    if (!shot) return null
    writeFileSync(join(out, 'hits', file + '.png'), Buffer.from(shot.closeup, 'base64'))
    writeFileSync(join(out, 'hits', file + '-frame.png'), Buffer.from(shot.frame, 'base64'))
    return `hits/${file}.png`
  }

  const sample = async () => {
    const snap = await page.evaluate((o) => window.__jamAudit.snapshot(o), { ignore: config.ignore ?? [], objects: config.objects ?? [], instances: config.instances ?? [], objectFraction: config.objectFraction })
    if (!snap) return
    samples++
    lastSampleAt = t
    for (const s of snap.skipped) skipped.set(s.path, s)
    const pieces = []
    for (const p of snap.pieces) {
      if (!versions.has(p.id)) versions.set(p.id, new Set())
      if (versions.get(p.id).size < 3) versions.get(p.id).add(p.pose)
      if (p.positions) {
        const pos = decode(p.positions, Float32Array)
        let index = p.index ? decode(p.index, Uint32Array) : null
        if (!index && p.range) index = Uint32Array.from({ length: p.range[1] - p.range[0] }, (_, i) => p.range[0] + i)
        const clipped = clipToPlanes({ positions: pos.slice(), index: index ? index.slice() : null }, p.clip ?? [])
        positions.set(p.id, { version: p.version, positions: clipped?.positions ?? null, index: clipped?.index ?? null })
      }
      const stored = positions.get(p.id)
      if (!stored || stored.version !== p.version || !stored.positions) continue
      if (p.material.customVertex) customVertex.add(p.mesh)
      if (ignoreRes.some((re) => test(re, p.id, p.label))) continue
      const input = { id: p.id, mesh: p.mesh, label: p.label, object: p.object, positions: stored.positions, index: stored.index, material: p.material, version: p.version }
      const parts = splitRes.some((re) => test(re, p.id, p.label)) ? splitComponents(input) : [input]
      for (const part of parts) {
        const key = part.id + '@' + part.version
        let piece = prepared.get(key)
        if (!piece) {
          piece = preparePiece(part, snap.camera)
          piece.version = part.version
        }
        pieces.push(piece)
      }
    }
    prepared.clear()
    for (const piece of pieces) {
      prepared.set(piece.id + '@' + piece.version, piece)
      names.set(piece.id, { label: piece.label, object: piece.object })
    }
    pieceCount = Math.max(pieceCount, pieces.length)
    lastPieces = pieces
    lastSnap = snap
    const found = analyseMoment(pieces, { camera: snap.camera, viewSize: snap.viewSize, tolerance, poseHistory, cache })
    cache.roll()
    for (const f of found) {
      const key = pairKey(f.kind, f.a, f.b)
      const prev = findings.get(key)
      const sev = severity(f)
      const rep = reportable(f)
      if (prev) {
        prev.seen.push(+(t / 1000).toFixed(2))
        if (!rep && prev.reportable) continue
        if (sev <= prev.severity && !(rep && !prev.reportable)) continue
      }
      const entry = { ...f, segments: undefined, severity: sev, reportable: rep, moment, at: +(t / 1000).toFixed(2), seen: prev?.seen ?? [+(t / 1000).toFixed(2)], shot: prev?.shot ?? null }
      entry.allowedBy = allowedBy(entry, allow)?.reason ?? null
      findings.set(key, entry)
      entry.file = prev?.file
      entry.shotSeverity = prev?.shotSeverity ?? 0
      entry.shotAt = prev?.shotAt ?? null
      entry.shotFocus = prev?.shotFocus ?? null
      entry.shotRadius = prev?.shotRadius ?? null
      // Rendering is most of a run's cost, so a finding is photographed again
      // only when it gets clearly worse; CI photographs only what fails it.
      const growth = opts.ci ? 1.5 : 1.25
      if (rep && opts.shots && !(opts.ci && entry.allowedBy) && (!entry.shot || sev > entry.shotSeverity * growth)) {
        entry.file ??= `${String(findings.size).padStart(3, '0')}-${f.kind}-${slug(f.labelA)}--${slug(f.labelB)}`
        entry.shot = await shoot(f, entry.file)
        entry.shotSeverity = sev
        entry.shotAt = entry.at
        entry.shotFocus = f.focus
        entry.shotRadius = f.radius
      }
    }
    // A replay photographs the moment and spot of the earlier photo, which can
    // be earlier than the finding's deepest sample (`at`).
    for (const target of replayTargets) {
      if (Math.abs((target.shotAt ?? target.at) * 1000 - t) > 6) continue
      const shot = await page.evaluate((a) => window.__jamAudit.shoot(a), { focus: target.shotFocus ?? target.focus, radius: Math.max(target.shotRadius ?? target.radius, 1e-6), segments: [] })
      if (!shot) continue
      const file = `replay/${target.file}.png`
      writeFileSync(join(out, file), Buffer.from(shot.closeup, 'base64'))
      const still = findings.get(pairKey(target.kind, target.a, target.b))
      replayed.push({ before: join(dirname(replayFile), target.shot), after: join(out, file), target, still: still && still.reportable && !still.allowedBy ? still : null })
    }
  }

  const advance = async (ms) => {
    let left = ms
    while (left > 0) {
      const step = Math.min(STEP, left)
      await page.clock.runFor(step)
      t += step
      left -= step
      if (t - lastSampleAt >= sampleMs) await sample()
    }
  }
  let pointer = null
  const driver = {
    page,
    wait: advance,
    sample,
    press: async (f) => {
      const p = at(f)
      await page.mouse.move(p.x, p.y)
      await page.mouse.down()
      pointer = f
      await advance(STEP * 2)
    },
    move: async (f, ms = 400) => {
      const from = pointer ?? f
      const steps = Math.max(1, Math.round(ms / STEP))
      for (let i = 1; i <= steps; i++) {
        const k = i / steps
        const p = at([from[0] + (f[0] - from[0]) * k, from[1] + (f[1] - from[1]) * k])
        await page.mouse.move(p.x, p.y)
        await advance(STEP)
      }
      pointer = f
    },
    release: async () => {
      await page.mouse.up()
      pointer = null
      await advance(STEP)
    },
    tap: async (f) => {
      await driver.press(f)
      await driver.release()
    },
    drag: async (from, to, ms = 600) => {
      await driver.press(from)
      await driver.move(to, ms)
      await advance(STEP * 3)
      await driver.release()
    },
    find: (pattern) => page.evaluate((p) => window.__jamAudit.find(p), pattern),
    reload: async (entries = {}) => {
      await page.evaluate((e) => {
        for (const [k, v] of Object.entries(e)) {
          if (v === null) localStorage.removeItem(k)
          else localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v))
        }
      }, entries)
      await page.reload()
      if (!(await firstFrame())) throw new Error(`${game}: no frame drawn after reloading`)
      await sample()
    },
  }

  const contactShots = async (label) => {
    if (!opts.shots || !lastSnap) return []
    // Closest touching pairs of distinct objects: what a human should eyeball
    // even when nothing crosses by more than the tolerance.
    const zones = []
    const ps = lastPieces.filter((p) => !p.enclosure && p.scale < lastSnap.viewSize * 0.35)
    for (let i = 0; i < ps.length; i++) {
      for (let j = 0; j < lastPieces.length; j++) {
        const a = ps[i]
        const b = lastPieces[j]
        if (a === b || a.object === b.object || b.enclosure) continue
        const ea = a.box.clone().expandByScalar(a.scale * 0.04)
        if (!ea.intersectsBox(b.box)) continue
        const overlap = ea.intersect(b.box)
        const c = overlap.getCenter(ea.min.clone())
        zones.push({ a, b, focus: c.toArray(), radius: Math.max(a.scale, 1e-6) * 0.9, score: a.scale })
      }
    }
    zones.sort((m, n) => m.score - n.score)
    const picked = []
    const usedObjects = new Set()
    for (const z of zones) {
      if (usedObjects.has(z.a.object)) continue
      usedObjects.add(z.a.object)
      picked.push(z)
      if (picked.length >= 5) break
    }
    const files = []
    for (let i = 0; i < picked.length; i++) {
      const z = picked[i]
      const shot = await page.evaluate((a) => window.__jamAudit.shoot(a), { focus: z.focus, radius: z.radius, segments: [] })
      if (!shot) continue
      const file = `contacts/${slug(label)}-${i + 1}.png`
      writeFileSync(join(out, file), Buffer.from(shot.closeup, 'base64'))
      files.push({ file, caption: `${label}: ${z.a.label} on ${z.b.label}` })
    }
    const frame = await page.evaluate(() => window.__jamAudit.frame())
    if (frame) {
      writeFileSync(join(out, 'contacts', `${slug(label)}-frame.png`), Buffer.from(frame, 'base64'))
      files.unshift({ file: `contacts/${slug(label)}-frame.png`, caption: `${label} (whole frame)` })
    }
    return files
  }

  const started = Date.now()
  await sample()
  const list = config.moments ?? genericMoments()
  for (const m of list) {
    moment = m.name
    const from = t
    await m.run(driver)
    await sample()
    moments.push({ name: m.name, from: +(from / 1000).toFixed(2), to: +(t / 1000).toFixed(2), contacts: await contactShots(m.name) })
  }
  // Pose tracks whose shallowest moment came after their deepest one.
  for (const [key, h] of poseHistory) {
    if (h.flagged || !(h.max - h.min > h.limit)) continue
    const [, a, b] = key.split('|')
    const A = names.get(a) ?? { label: a, object: '' }
    const B = names.get(b) ?? { label: b, object: '' }
    const entry = {
      kind: 'pose', a, b, labelA: A.label, labelB: B.label, objectA: A.object, objectB: B.object, depth: h.max - h.min, relative: (h.max - h.min) / h.scale,
      area: 0, pixels: NaN, support: false, visible: true, onScreen: true, focus: [0, 0, 0], radius: 0,
      severity: (h.max - h.min) / h.scale, reportable: true, moment: '(whole run)', at: null, seen: [], shot: null,
    }
    entry.allowedBy = allowedBy(entry, allow)?.reason ?? null
    findings.set(key, entry)
  }
  await context.close()

  // A pair where neither piece ever moved is modelling (two blocks built to
  // overlap, a post set into the ground); one that moves is play. Both can be
  // wrong, but a moving one is what a child sees happen.
  for (const f of findings.values()) f.moving = (versions.get(f.a)?.size ?? 1) > 1 || (versions.get(f.b)?.size ?? 1) > 1
  const all = [...findings.values()].sort((x, y) => (y.reportable - x.reportable) || (y.moving - x.moving) || y.severity - x.severity)
  const open = all.filter((f) => f.reportable && !f.allowedBy)
  const result = {
    game,
    enforce: !!config.enforce,
    configured: !!config.moments,
    seconds: Math.round((Date.now() - started) / 1000),
    gameSeconds: +(t / 1000).toFixed(1),
    samples,
    pieces: pieceCount,
    customVertexMeshes: customVertex.size,
    skipped: [...skipped.values()],
    tolerance,
    errors,
    counts: {
      reportable: all.filter((f) => f.reportable).length,
      open: open.length,
      allowed: all.filter((f) => f.reportable && f.allowedBy).length,
      hidden: all.filter((f) => !f.reportable).length,
    },
    moments,
    findings: all,
  }
  writeFileSync(join(out, 'report.json'), JSON.stringify(result, null, 1))
  writeFileSync(join(out, 'report.md'), markdown(result))
  if (opts.shots) await composeSheet(browser, sheetTiles(result, out), join(out, 'contact-sheet.png'), `${game}: ${result.counts.open} open, ${result.counts.allowed} allowed`)
  if (replayed.length) {
    const tiles = []
    for (const r of replayed.slice(0, 20)) {
      const what = `${r.target.kind} ${r.target.kind === 'zfight' ? Math.round(r.target.pixels) + 'px²' : pct(r.target.relative)}: ${r.target.labelA} × ${r.target.labelB} @${r.target.at}s`
      tiles.push({ file: r.before, caption: `before - ${what}`, tone: 'before' })
      tiles.push({ file: r.after, caption: `after - ${r.still ? 'still ' + (r.still.kind === 'zfight' ? Math.round(r.still.pixels) + 'px²' : pct(r.still.relative)) : 'clear'}`, tone: r.still ? 'bad' : 'after' })
    }
    await composeSheet(browser, tiles, join(out, 'before-after.png'), `${game}: before and after, same moment and spot`, { cols: 4 })
    result.replayed = replayed.map((r) => ({ finding: pairKey(r.target.kind, r.target.a, r.target.b), before: r.before, after: r.after, still: !!r.still }))
    writeFileSync(join(out, 'report.json'), JSON.stringify(result, null, 1))
  }
  return result
}

const pct = (x) => (Number.isFinite(x) ? `${Math.round(x * 100)}%` : '-')

function markdown(r) {
  const lines = [
    `# Intersection audit: ${r.game}`,
    '',
    `${r.samples} samples over ${r.gameSeconds} s of game time, ${r.pieces} pieces, ${r.customVertexMeshes} meshes with custom vertex shaders (their CPU geometry may differ from what is drawn). Enforced in CI: ${r.enforce ? 'yes' : 'no'}. Moments: ${r.configured ? 'game script' : 'generic script'}.`,
    '',
    `Open: ${r.counts.open}. Allowed: ${r.counts.allowed}. Not visible or under the pixel floor: ${r.counts.hidden}.`,
    '',
  ]
  if (r.skipped.length) lines.push(`Not audited (shader-instanced geometry, outline hulls): ${r.skipped.map((s) => '`' + s.label + '` (' + s.why + ')').join(', ')}`, '')
  if (r.errors.length) lines.push('Page errors:', ...r.errors.map((e) => `- ${e}`), '')
  lines.push('| # | kind | depth | px | moves | pieces | moment @ s | status | shot |', '| --- | --- | --- | --- | --- | --- | --- | --- | --- |')
  r.findings.forEach((f, i) => {
    if (!f.reportable && i > 60) return
    const depth = f.kind === 'zfight' ? `${Math.round(f.pixels)} px²` : pct(f.relative)
    const status = !f.reportable ? 'hidden' : f.allowedBy ? `allowed: ${f.allowedBy}` : '**open**'
    lines.push(`| ${i + 1} | ${f.kind}${f.support ? ' (sinks)' : ''} | ${depth} | ${Number.isFinite(f.pixels) ? f.pixels.toFixed(1) : '-'} | ${f.moving ? 'yes' : 'static'} | \`${f.labelA}\` × \`${f.labelB}\` | ${f.moment} @ ${f.at ?? '-'} | ${status} | ${f.shot ? `[close-up](${f.shot})` : ''} |`)
  })
  lines.push('', 'Ids for `allow` rules:', '')
  for (const f of r.findings.filter((x) => x.reportable)) lines.push(`- ${f.kind}: \`${f.a}\` × \`${f.b}\``)
  return lines.join('\n') + '\n'
}

function sheetTiles(r, out) {
  const tiles = []
  for (const f of r.findings.filter((x) => x.shot).slice(0, 16)) {
    tiles.push({ file: join(out, f.shot), caption: `${f.allowedBy ? 'allowed' : 'OPEN'} ${f.kind} ${f.kind === 'zfight' ? Math.round(f.pixels) + 'px²' : pct(f.relative)}: ${f.labelA} × ${f.labelB} @${f.at}s`, tone: f.allowedBy ? 'ok' : 'bad' })
  }
  for (const m of r.moments) for (const c of m.contacts) tiles.push({ file: join(out, c.file), caption: c.caption, tone: 'plain' })
  return tiles
}

// Grid of images with captions, drawn in a blank page one tile at a time, so a
// sheet of any length never holds more than one full-size picture in flight.
// A sheet is a picture for people: failing to draw one never fails the audit.
export async function composeSheet(browser, tiles, file, title, { cols = 4, tileW = 472, maxTiles = 120 } = {}) {
  tiles = tiles.slice(0, maxTiles)
  if (!tiles.length) return
  const page = await browser.newPage()
  try {
    const first = 'data:image/png;base64,' + readFileSync(tiles[0].file).toString('base64')
    await page.evaluate(async ({ first, count, cols, tileW, title }) => {
      const img = await new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = first })
      const tileH = Math.round(tileW * (img.height / img.width))
      const capH = 34
      const head = title ? 44 : 0
      const c = document.createElement('canvas')
      c.width = cols * tileW + (cols + 1) * 8
      c.height = head + Math.ceil(count / cols) * (tileH + capH + 8) + 8
      const g = c.getContext('2d')
      g.fillStyle = '#1d1d22'
      g.fillRect(0, 0, c.width, c.height)
      if (title) {
        g.fillStyle = '#fff'
        g.font = 'bold 22px sans-serif'
        g.fillText(title, 12, 30)
      }
      window.__sheet = { c, g, tileH, capH, head, cols, tileW }
    }, { first, count: tiles.length, cols, tileW, title })
    for (let i = 0; i < tiles.length; i++) {
      const src = 'data:image/png;base64,' + readFileSync(tiles[i].file).toString('base64')
      await page.evaluate(async ({ src, i, caption, tone }) => {
        const { g, tileH, capH, head, cols, tileW } = window.__sheet
        const img = await new Promise((ok, no) => { const im = new Image(); im.onload = () => ok(im); im.onerror = no; im.src = src })
        const x = 8 + (i % cols) * (tileW + 8)
        const y = head + 8 + Math.floor(i / cols) * (tileH + capH + 8)
        const s = Math.min(tileW / img.width, tileH / img.height)
        g.drawImage(img, x, y, img.width * s, img.height * s)
        g.fillStyle = tone === 'bad' ? '#7a1830' : tone === 'ok' ? '#1f5a36' : tone === 'before' ? '#6b3b12' : tone === 'after' ? '#174a6b' : '#33333b'
        g.fillRect(x, y + tileH, tileW, capH)
        g.fillStyle = '#fff'
        g.font = '13px sans-serif'
        let line = ''
        let ly = y + tileH + 14
        for (const w of caption.split(' ')) {
          if (g.measureText(line + w).width > tileW - 10 && line) {
            g.fillText(line, x + 5, ly)
            line = ''
            ly += 15
            if (ly > y + tileH + capH) break
          }
          line += w + ' '
        }
        if (ly <= y + tileH + capH) g.fillText(line, x + 5, ly)
      }, { src, i, caption: tiles[i].caption, tone: tiles[i].tone })
    }
    const png = await page.evaluate(() => window.__sheet.c.toDataURL('image/png').split(',')[1])
    writeFileSync(file, Buffer.from(png, 'base64'))
  } catch (e) {
    console.log(`  (could not draw ${file}: ${String(e).split('\n')[0]})`)
  } finally {
    await page.close().catch(() => {})
  }
}

async function startPreview() {
  if (!existsSync(join(root, 'dist', 'index.html'))) throw new Error('no dist/: run npm run build first')
  const { preview } = await import('vite')
  const server = await preview({ root, logLevel: 'error', preview: { port: 4390, strictPort: false, host: '127.0.0.1' } })
  const url = server.resolvedUrls?.local?.[0]?.replace(/\/$/, '') ?? 'http://127.0.0.1:4390'
  return { url, close: () => new Promise((ok) => server.httpServer.close(ok)) }
}

async function main() {
  const opts = parseArgs(process.argv.slice(2))
  const browser = await chromium.launch()
  if (opts.compose) {
    // --compose <out.png> <title> <image>::<caption>[::tone] ...
    const [file, title, ...rest] = opts.compose
    const tiles = rest.map((s) => {
      const [img, caption = '', tone = 'plain'] = s.split('::')
      return { file: resolve(img), caption, tone }
    })
    await composeSheet(browser, tiles, resolve(file), title, { cols: Number(process.env.COLS ?? 4) })
    await browser.close()
    return
  }
  let games = opts.all ? allGames() : opts.games
  if (opts.shard) games = games.filter((_, i) => i % opts.shard[1] === opts.shard[0] - 1)
  if (!games.length) {
    console.error('usage: npm run check:intersections -- <game> [...] | --all [--ci] [--out dir] [--base url] [--sample ms] [--no-shots]')
    process.exit(2)
  }
  const server = opts.base ? null : await startPreview()
  const base = opts.base ?? server.url
  mkdirSync(opts.out, { recursive: true })
  const results = []
  let failed = false
  for (const game of games) {
    try {
      const r = await auditGame(browser, base, game, opts)
      results.push(r)
      if (r.notAudited) {
        console.log(`${game}: not audited - ${r.notAudited}`)
        continue
      }
      const verdict = r.counts.open === 0 ? 'clean' : r.enforce ? 'FAIL' : 'open (not enforced)'
      if (r.counts.open && r.enforce) failed = true
      console.log(`${game}: ${verdict} - ${r.counts.open} open, ${r.counts.allowed} allowed, ${r.counts.hidden} hidden; ${r.samples} samples, ${r.pieces} pieces, ${r.seconds} s${r.errors.length ? `; ${r.errors.length} page errors` : ''}`)
      for (const f of r.findings.filter((x) => x.reportable && !x.allowedBy).slice(0, 12)) {
        console.log(`  ${f.kind}${f.support ? ' (sinks)' : ''} ${f.kind === 'zfight' ? Math.round(f.pixels) + ' px²' : pct(f.relative)}  ${f.labelA}  x  ${f.labelB}  [${f.moment} @ ${f.at}s]`)
      }
    } catch (e) {
      // A crash fails CI only for a game that has promised to stay clean.
      const enforce = !!(await loadConfig(game).catch(() => ({}))).enforce
      if (enforce) failed = true
      console.log(`${game}: ERROR${enforce ? '' : ' (not enforced)'} ${e.stack ?? e}`)
      results.push({ game, enforce, error: String(e) })
    }
  }
  writeFileSync(join(opts.out, 'summary.json'), JSON.stringify(results.map((r) => ({ game: r.game, error: r.error, enforce: r.enforce, counts: r.counts, samples: r.samples, seconds: r.seconds })), null, 1))
  await browser.close()
  await server?.close()
  if (opts.ci && failed) process.exit(1)
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) await main()
