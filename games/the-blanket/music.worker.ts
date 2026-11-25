import { renderPatch } from '@kieranklaassen/live-mix/render'
import { RENDER_RATE, SECTIONS, STEMS, TAIL_SEC, type Section, type Stem } from './score'
import { SCORE } from './tune'

// Plays the whole score once on live-mix's instruments, off the page's thread and as fast as it can, and hands over
// each section of each stem as sound.

export interface Played { stem: Stem; section: Section; channels: Float32Array<ArrayBuffer>[] }

const port = self as unknown as { postMessage(value: Played | 'done', transfer?: Transferable[]): void }

async function play(): Promise<void> {
  // The ground of the first section first, so it is the first thing that can be heard.
  for (const section of SECTIONS) for (const stem of STEMS) {
    const frames = Math.round((SCORE.sectionSec + TAIL_SEC) * RENDER_RATE)
    const channels = [new Float32Array(frames), new Float32Array(frames)]
    for (const part of SCORE.stems[stem]) {
      const sound = await renderPatch(part.patch, {
        durationSec: frames / RENDER_RATE, sampleRate: RENDER_RATE, phrase: { notes: part.notes[section] },
        gainDb: part.gainDb, fadeOutSec: TAIL_SEC * 0.7, sliceMs: 0,
      })
      channels.forEach((channel, c) => { for (let i = 0; i < frames; i += 1) channel[i] += sound.channels[c][i] })
    }
    port.postMessage({ stem, section, channels }, channels.map((c) => c.buffer))
  }
  port.postMessage('done')
}

// A browser that cannot run the instruments (no WebAssembly, or a page that forbids it) has no music; the game is whole without it.
play().catch((error: unknown) => { setTimeout(() => { throw error }) })
