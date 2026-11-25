// Plays a phrase on an instrument with no audio context: in a worker, in Node, on a page that is not https.

export interface PatchDevice {
  deviceId: string
  preset?: string
  params?: Readonly<Record<string, number>>
}

export interface Patch {
  id: string
  name: string
  category: string
  description: string
  instrument?: PatchDevice
  effects: readonly PatchDevice[]
}

export interface PhraseNote {
  atSec: number
  durSec: number
  note: number
  gain?: number
}

export interface PlanarAudio {
  channels: Float32Array[]
  sampleRate: number
}

export function renderPatch(
  patch: Patch,
  options: {
    durationSec: number
    sampleRate?: number
    phrase?: { notes: readonly PhraseNote[] }
    input?: PlanarAudio
    fadeOutSec?: number
    gainDb?: number
    normalizePeakDb?: number
    sliceMs?: number
    compile?: (source: URL | string, descriptor: { id: string }) => Promise<WebAssembly.Module>
  },
): Promise<PlanarAudio>
