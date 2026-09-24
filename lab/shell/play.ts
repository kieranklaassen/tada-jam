// The play view: mounts the canvas, runs the loop, maps pointer events to
// logical coordinates for sim.pointer(), and shows the grown-up strip (back,
// restart, new seed) unless ?chrome=0 hides it. In watch mode a persona drives
// the sim instead and real pointer input is not forwarded.

import { mountCanvas, toLogical } from '../kit/canvas.ts'
import type { MountedCanvas } from '../kit/canvas.ts'
import { MAX_CATCH_UP_STEPS, startFrameLoop, startLoop } from '../kit/loop.ts'
import type { LoopHandle } from '../kit/loop.ts'
import type { Watcher } from '../kit/proto.ts'
import { TICK_MS } from '../kit/sim.ts'
import type { PointerPhase, Sim } from '../kit/sim.ts'
import { el } from './list.ts'
import type { RegistryEntry } from './list.ts'
import { buildPlayHash } from './routes.ts'
import { createWatcher } from './watch.ts'

export interface PlayOptions {
  entry: RegistryEntry
  seed: number
  chrome: boolean
  watch: string | null
}

function button(label: string, onClick: () => void): HTMLButtonElement {
  const node = el('button', 'btn', label)
  node.type = 'button'
  node.addEventListener('click', onClick)
  return node
}

export function mountPlay(host: HTMLElement, options: PlayOptions): () => void {
  const { entry, seed, chrome, watch } = options
  const { proto } = entry

  const root = el('div', 'play')
  const field = el('div', 'field')
  const status = el('span', 'strip-note')

  if (chrome) {
    const strip = el('div', 'strip')
    const back = el('a', 'btn', 'Back')
    back.href = '#/'
    const title = el('span', 'strip-title', proto.meta.name)
    const seedLabel = el('span', 'strip-note', `seed ${seed}`)
    strip.append(
      back,
      button('Restart', () => boot()),
      button('New seed', () => {
        location.hash = buildPlayHash({ view: 'play', key: entry.key, chrome, seed: seed + 1, watch })
      }),
      title,
      seedLabel,
      status,
    )
    root.append(strip)
  }
  root.append(field)
  host.replaceChildren(root)

  const mount: MountedCanvas = mountCanvas(field)
  const canvas = mount.canvas
  canvas.style.userSelect = 'none'
  canvas.style.setProperty('-webkit-user-select', 'none')
  canvas.style.setProperty('-webkit-touch-callout', 'none')

  let loop: LoopHandle | null = null
  // The sim the child plays; null while a persona plays instead.
  let live: Sim | null = null
  const active = new Set<number>()

  const boot = () => {
    loop?.stop()
    active.clear()
    live = null
    let watcher: Watcher | null = null
    status.textContent = ''
    if (watch) {
      try {
        watcher = createWatcher({ proto, seed, personaId: watch })
      } catch (error) {
        // A watcher that cannot start (an unknown persona id) throws; say so
        // in the strip and let the child play.
        status.textContent = `Cannot watch ${watch}: ${error instanceof Error ? error.message : 'unavailable'}`
        console.warn('watch mode unavailable', error)
      }
    }
    if (watcher) {
      const watching = watcher
      status.textContent = `Watching ${watch}`
      loop = startFrameLoop((dtMs) => {
        // Same catch-up cap as the normal loop, so a long frame cannot burst.
        watching.advance(Math.min(dtMs, TICK_MS * MAX_CATCH_UP_STEPS))
        const snapshot = watching.sim.snapshot()
        mount.drawField((ctx) => proto.draw(ctx, snapshot))
      })
      return
    }
    const sim = proto.createSim({ seed, hooks: proto.meta.hooks, hints: true })
    live = sim
    loop = startLoop({
      step: () => sim.step(),
      draw: () => {
        const snapshot = sim.snapshot()
        mount.drawField((ctx) => proto.draw(ctx, snapshot))
      },
    })
  }

  const forward = (phase: PointerPhase, event: PointerEvent) => {
    if (!live) return
    const point = toLogical(event.clientX, event.clientY, canvas.getBoundingClientRect())
    if (!point) return
    live.pointer({ id: event.pointerId, phase, x: point.x, y: point.y })
  }
  const onDown = (event: PointerEvent) => {
    event.preventDefault()
    try {
      canvas.setPointerCapture(event.pointerId)
    } catch {
      // A synthetic pointer cannot be captured; the events still arrive.
    }
    active.add(event.pointerId)
    forward('down', event)
  }
  const onMove = (event: PointerEvent) => {
    if (active.has(event.pointerId)) forward('move', event)
  }
  const onEnd = (event: PointerEvent) => {
    if (!active.delete(event.pointerId)) return
    forward('up', event)
  }
  const onContextMenu = (event: Event) => event.preventDefault()

  canvas.addEventListener('pointerdown', onDown)
  canvas.addEventListener('pointermove', onMove)
  canvas.addEventListener('pointerup', onEnd)
  canvas.addEventListener('pointercancel', onEnd)
  canvas.addEventListener('contextmenu', onContextMenu)

  boot()

  return () => {
    loop?.stop()
    canvas.removeEventListener('pointerdown', onDown)
    canvas.removeEventListener('pointermove', onMove)
    canvas.removeEventListener('pointerup', onEnd)
    canvas.removeEventListener('pointercancel', onEnd)
    canvas.removeEventListener('contextmenu', onContextMenu)
    mount.dispose()
    host.replaceChildren()
  }
}
