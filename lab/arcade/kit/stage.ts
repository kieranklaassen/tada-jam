// The stage runs one arcade prototype: it owns the canvas, the frame loop, the
// pointers, the fx and the sound, and hands the prototype a `Stage`. It reuses
// the first round's canvas letterboxing and frame loop.

import { mountCanvas, toLogical } from '../../kit/canvas.ts'
import { startFrameLoop } from '../../kit/loop.ts'
import { createRng } from '../../kit/rng.ts'
import { createFx } from './fx.ts'
import { clamp, ease } from './math.ts'
import { createSfx } from './sfx.ts'
import { warmText } from './text.ts'
import type { Sfx } from './sfx.ts'
import { H, W } from './types.ts'
import type { Game, Pointer, Proto, Stage } from './types.ts'

const MAX_DT = 1 / 30

export interface StageStats {
  frames: number
  // Milliseconds spent in update and draw: mean, and the worst single frame.
  avgMs: number
  worstMs: number
}

export interface MountedStage {
  restart(): void
  // Run the game forward without drawing, for the screenshot tool.
  fastForward(seconds: number): void
  readonly sfx: Sfx
  readonly stats: StageStats
  // Messages of errors the prototype threw. The loop stops at the first one.
  readonly errors: readonly string[]
  dispose(): void
}

interface Timer {
  at: number
  fn: () => void
}

interface Tween {
  start: number
  seconds: number
  fn: (t: number) => void
  ease: (t: number) => number
  done?: () => void
}

export function mountStage(host: HTMLElement, proto: Proto, seed = 1): MountedStage {
  const mount = mountCanvas(host)
  const canvas = mount.canvas
  canvas.style.userSelect = 'none'
  canvas.style.setProperty('-webkit-user-select', 'none')
  canvas.style.setProperty('-webkit-touch-callout', 'none')

  const fx = createFx()
  const sfx = createSfx()
  warmText()
  const pointers = new Map<number, Pointer>()
  const lastEventAt = new Map<number, number>()
  const errors: string[] = []
  const stats: StageStats = { frames: 0, avgMs: 0, worstMs: 0 }

  let time = 0
  let timers: Timer[] = []
  let tweens: Tween[] = []
  let rand = createRng(seed)
  let runs = 0
  let game: Game | null = null
  let restartQueued = false

  const stage: Stage = {
    W,
    H,
    get time() {
      return time
    },
    pointers,
    fx,
    sfx,
    rand: () => rand(),
    after(seconds, fn) {
      timers.push({ at: time + Math.max(0, seconds), fn })
    },
    tween(seconds, fn, easing = ease.outCubic, done) {
      tweens.push({ start: time, seconds: Math.max(0.0001, seconds), fn, ease: easing, done })
    },
    // Deferred to the top of the next frame, so a game can call it from inside
    // its own update or pointer handler.
    restart() {
      restartQueued = true
    },
  }

  const fail = (where: string, error: unknown) => {
    const message = `${proto.meta.key} ${where}: ${error instanceof Error ? (error.stack ?? error.message) : String(error)}`
    errors.push(message)
    console.error(message)
    game = null
  }

  const boot = () => {
    restartQueued = false
    try {
      game?.dispose?.()
    } catch (error) {
      console.error(error)
    }
    fx.clear()
    pointers.clear()
    lastEventAt.clear()
    timers = []
    tweens = []
    time = 0
    // A restart gives a different (still seeded) world, so "again" is not a replay.
    rand = createRng(seed + runs * 7919)
    runs++
    try {
      game = proto.create(stage)
    } catch (error) {
      fail('create', error)
    }
  }

  const advance = (dt: number) => {
    fx.update(dt)
    if (!game || fx.frozen > 0) return
    time += dt
    if (timers.length > 0) {
      const due = timers.filter((t) => t.at <= time)
      if (due.length > 0) {
        timers = timers.filter((t) => t.at > time)
        for (const t of due) t.fn()
      }
    }
    if (tweens.length > 0) {
      const running = tweens
      tweens = []
      const kept: Tween[] = []
      for (const tw of running) {
        const t = clamp((time - tw.start) / tw.seconds, 0, 1)
        tw.fn(tw.ease(t))
        if (t < 1) kept.push(tw)
        else tw.done?.()
      }
      // Tweens started from inside a callback landed in `tweens`.
      tweens = kept.concat(tweens)
    }
    game.update(dt)
  }

  const render = () => {
    mount.drawField((g) => {
      if (!game) {
        g.fillStyle = '#2b2620'
        g.fillRect(0, 0, W, H)
        g.fillStyle = '#ffb4a8'
        g.font = '24px ui-monospace, Menlo, monospace'
        g.textAlign = 'left'
        g.textBaseline = 'top'
        const lines = (errors[errors.length - 1] ?? 'This prototype did not start.').split('\n').slice(0, 12)
        lines.forEach((text, i) => g.fillText(text.slice(0, 84), 40, 40 + i * 34))
        return
      }
      g.save()
      g.translate(fx.shakeX, fx.shakeY)
      g.lineCap = 'round'
      g.lineJoin = 'round'
      game.draw(g)
      g.globalAlpha = 1
      fx.draw(g)
      g.restore()
      fx.drawFlash(g, W, H)
    })
  }

  const frame = (dtMs: number) => {
    const started = performance.now()
    if (restartQueued) boot()
    try {
      advance(Math.min(dtMs / 1000, MAX_DT))
      render()
    } catch (error) {
      fail('frame', error)
      render()
    }
    const spent = performance.now() - started
    stats.frames++
    stats.avgMs += (spent - stats.avgMs) / Math.min(stats.frames, 120)
    if (stats.frames > 10 && spent > stats.worstMs) stats.worstMs = spent
  }

  const locate = (event: PointerEvent): { x: number; y: number } | null => {
    const point = toLogical(event.clientX, event.clientY, canvas.getBoundingClientRect())
    if (!point) return null
    return { x: clamp(point.x, 0, W), y: clamp(point.y, 0, H) }
  }

  const call = (where: 'down' | 'move' | 'up', p: Pointer) => {
    if (!game) return
    try {
      game[where]?.(p)
    } catch (error) {
      fail(where, error)
    }
  }

  const onDown = (event: PointerEvent) => {
    event.preventDefault()
    sfx.unlock()
    const at = locate(event)
    if (!at) return
    try {
      canvas.setPointerCapture(event.pointerId)
    } catch {
      // A synthetic pointer cannot be captured; the events still arrive.
    }
    const p: Pointer = { id: event.pointerId, x: at.x, y: at.y, startX: at.x, startY: at.y, dx: 0, dy: 0, vx: 0, vy: 0, downAt: time, down: true }
    pointers.set(p.id, p)
    lastEventAt.set(p.id, event.timeStamp)
    call('down', p)
  }

  const track = (event: PointerEvent): Pointer | null => {
    const p = pointers.get(event.pointerId)
    const at = locate(event)
    if (!p || !at) return p ?? null
    p.dx = at.x - p.x
    p.dy = at.y - p.y
    const elapsed = Math.max(1, event.timeStamp - (lastEventAt.get(p.id) ?? event.timeStamp)) / 1000
    lastEventAt.set(p.id, event.timeStamp)
    if (p.dx !== 0 || p.dy !== 0) {
      p.vx = p.vx * 0.5 + (p.dx / elapsed) * 0.5
      p.vy = p.vy * 0.5 + (p.dy / elapsed) * 0.5
    }
    p.x = at.x
    p.y = at.y
    return p
  }

  const onMove = (event: PointerEvent) => {
    if (!pointers.has(event.pointerId)) return
    const p = track(event)
    if (p) call('move', p)
  }

  const onEnd = (event: PointerEvent) => {
    const p = pointers.get(event.pointerId)
    if (!p) return
    // A finger that rested before lifting is not a fling.
    if (event.timeStamp - (lastEventAt.get(p.id) ?? 0) > 90) {
      p.vx = 0
      p.vy = 0
    }
    p.down = false
    pointers.delete(p.id)
    lastEventAt.delete(p.id)
    call('up', p)
  }

  const onContextMenu = (event: Event) => event.preventDefault()

  canvas.addEventListener('pointerdown', onDown)
  canvas.addEventListener('pointermove', onMove)
  canvas.addEventListener('pointerup', onEnd)
  canvas.addEventListener('pointercancel', onEnd)
  canvas.addEventListener('contextmenu', onContextMenu)

  boot()
  const loop = startFrameLoop(frame)

  return {
    restart: boot,
    fastForward(seconds) {
      const steps = Math.round(clamp(seconds, 0, 600) * 60)
      try {
        for (let i = 0; i < steps; i++) {
          if (restartQueued) boot()
          advance(1 / 60)
        }
      } catch (error) {
        fail('frame', error)
      }
    },
    sfx,
    stats,
    errors,
    dispose() {
      loop.stop()
      canvas.removeEventListener('pointerdown', onDown)
      canvas.removeEventListener('pointermove', onMove)
      canvas.removeEventListener('pointerup', onEnd)
      canvas.removeEventListener('pointercancel', onEnd)
      canvas.removeEventListener('contextmenu', onContextMenu)
      try {
        game?.dispose?.()
      } catch (error) {
        console.error(error)
      }
      game = null
      sfx.dispose()
      mount.dispose()
    },
  }
}
