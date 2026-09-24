// Watch mode: a seeded persona drives a prototype's sim in the browser. This is
// built from the very same run player the panel measures with
// (lab/panel/session.ts), so what Kieran watches is what the panel measured:
// for a seed, the pointer input fed to the sim is the input log of the panel's
// run for that persona and seed.
//
// The shell advances it by real elapsed time and draws watcher.sim.snapshot().

import { createStepper } from '../kit/loop.ts'
import type { CreateWatcher, Watcher } from '../kit/proto.ts'
import { TICK_MS } from '../kit/sim.ts'
import { getPersona } from '../panel/personas.ts'
import { createRunPlayer } from '../panel/session.ts'

export const createWatcher: CreateWatcher = ({ proto, seed, personaId }): Watcher => {
  const persona = getPersona(personaId)
  // Hints are off, as in the panel's return and self-aim runs.
  const player = createRunPlayer({ persona, proto, runSeed: seed, hints: false })
  // Uncapped: every whole tick of the time given runs (the shell caps the
  // frame before it calls advance).
  const stepper = createStepper(TICK_MS, Number.POSITIVE_INFINITY)
  return {
    // The session in play; it changes when the persona comes back for another.
    get sim() {
      return player.sim
    },
    advance(dtMs) {
      for (let ticks = stepper.advance(dtMs); ticks > 0; ticks--) {
        if (!player.done) {
          player.tick()
        } else if (player.crash === null) {
          // The persona has left; the world carries on without them.
          player.sim.step()
        }
      }
    },
  }
}
