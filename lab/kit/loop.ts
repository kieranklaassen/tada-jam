// The fixed-step loop. The browser advances a sim by whole TICK_MS steps of
// real time; the panel calls sim.step() directly and never uses this file.
// It reads the timestamp requestAnimationFrame hands it, never a clock.

import { TICK_MS } from './sim.ts'

// A long frame (a slow device, a debugger pause) runs at most this many steps;
// the rest of the backlog is dropped, so the sim slows down instead of
// spiralling.
export const MAX_CATCH_UP_STEPS = 5

export interface Stepper {
  // Add elapsed real time; returns how many whole steps to run now. The
  // remainder (less than one step) is kept for the next call.
  advance(dtMs: number): number
  reset(): void
}

// `maxSteps` caps one call's catch-up; pass Infinity to owe every whole step.
export function createStepper(tickMs: number, maxSteps = MAX_CATCH_UP_STEPS): Stepper {
  let accumulated = 0
  return {
    advance(dtMs) {
      if (!Number.isFinite(dtMs) || dtMs <= 0) return 0
      accumulated += dtMs
      const whole = Math.floor(accumulated / tickMs)
      const steps = Math.min(whole, maxSteps)
      // Keep only the part of a step: a capped backlog is dropped, not owed.
      accumulated %= tickMs
      return steps
    },
    reset() {
      accumulated = 0
    },
  }
}

export interface LoopHandle {
  stop(): void
}

// One callback per visible frame with the real milliseconds since the last
// visible frame. The first frame, and the first one after the tab was hidden,
// report 0: elapsed time is dropped, never replayed as a burst.
export function startFrameLoop(onFrame: (dtMs: number) => void): LoopHandle {
  let last: number | null = null
  let handle = 0
  let stopped = false

  const frame = (now: number) => {
    if (stopped) return
    handle = requestAnimationFrame(frame)
    if (document.hidden) {
      last = null
      return
    }
    const dt = last === null ? 0 : Math.max(0, now - last)
    last = now
    onFrame(dt)
  }
  const onVisibility = () => {
    last = null
  }

  document.addEventListener('visibilitychange', onVisibility)
  handle = requestAnimationFrame(frame)

  return {
    stop() {
      stopped = true
      cancelAnimationFrame(handle)
      document.removeEventListener('visibilitychange', onVisibility)
    },
  }
}

export interface LoopHandlers {
  // One fixed TICK_MS step of the sim.
  step(): void
  // Draw the current state; called on every visible frame.
  draw(): void
}

export function startLoop({ step, draw }: LoopHandlers): LoopHandle {
  const stepper = createStepper(TICK_MS)
  return startFrameLoop((dtMs) => {
    const steps = stepper.advance(dtMs)
    for (let i = 0; i < steps; i++) step()
    draw()
  })
}
