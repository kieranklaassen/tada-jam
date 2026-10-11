import { voiceOf, type Note, type Voice } from './audio'

// The buses beside the plain way out. What a scene sounds, or a walker where
// it stands, goes through `stage`; a bucket on its run through `carry`; and
// what each walker does on a piece through a bus of its own. The answer to
// the child's own touch goes straight out. When a touch ends a scene or a
// carry, or makes a walker stand still on its piece, that bus is hushed:
// whatever of it still rings fades in a few hundredths of a second, the
// emptied bus is taken off the way out, and what sounds on that bus next
// goes through a new one. So a scene that was ended is not heard again, and
// the touch that ended it is heard whole.

export type Bus = 'stage' | 'carry' | 'on:squirrel' | 'on:owl' | 'on:mice' | 'on:beetle'
export const BUSES: readonly Bus[] = ['stage', 'carry', 'on:squirrel', 'on:owl', 'on:mice', 'on:beetle']

/** How fast a hushed bus fades: a time constant, so it is silent within about five of these. */
export const HUSH_SECONDS = 0.015

export class Buses {
  private readonly open = new Map<Bus, GainNode>()

  /** One moment's notes as one voice: the plain ones straight out, the others through their bus. */
  voice(plain: readonly Note[], staged: Partial<Record<Bus, readonly Note[]>>): Voice {
    return (context, out, at) => {
      if (plain.length > 0) voiceOf(plain)(context, out, at)
      for (const bus of BUSES) { const notes = staged[bus]; if (notes && notes.length > 0) voiceOf(notes)(context, this.through(bus, context, out), at) }
    }
  }

  /** Whatever still rings on this bus, or is yet to start on it, is silenced. */
  hush(bus: Bus): void {
    const node = this.open.get(bus)
    if (!node) return
    this.open.delete(bus)
    try {
      const now = node.context.currentTime
      node.gain.cancelScheduledValues(now)
      node.gain.setTargetAtTime(0, now, HUSH_SECONDS)
      // Once it is silent it is taken off the way out. A context that has no timer of its own to offer keeps it, silent.
      setTimeout(() => { try { node.disconnect() } catch { /* closed already */ } }, 1000)
    } catch {
      // A context that was closed under it is silent already.
    }
  }

  dispose(): void {
    this.open.clear()
  }

  private through(bus: Bus, context: AudioContext, out: AudioNode): GainNode {
    let node = this.open.get(bus)
    if (!node || node.context !== context) {
      node = context.createGain()
      node.connect(out)
      this.open.set(bus, node)
    }
    return node
  }
}
