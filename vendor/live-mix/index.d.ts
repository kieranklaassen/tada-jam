// The part of live-mix's engine the jam uses, as types. live-mix's own types are the full ones.

export interface Clip {
  id: string
  sourceId: string
  startSec: number
  offsetSec: number
  durationSec: number
  fadeInSec: number
  fadeOutSec: number
  fadeCurve: 'linear' | 'equalPower'
  gainDb: number
}

export interface Bus {
  readonly gain: AudioParam
}

export interface AudioTrack {
  readonly clips: { add(clip: Clip): void }
  readonly strip: { setLevel(level: number, options?: { timeConstant?: number }): void }
}

export interface Ducker {
  key(node: AudioNode): void
}

export interface DuckerOptions {
  depth?: number
  timeConstant?: number
  attackMs?: number
  releaseMs?: number
  pollMs?: number
  gainScale?: number
  fftSize?: number
}

export interface Engine {
  readonly samples: { load(id: string, source: AudioBuffer): Promise<unknown> }
  readonly transport: { start(at?: number): void }
  addBus(name: string, options?: { gain?: number; destination?: Bus }): Bus
  addAudioTrack(name: string, options?: { destination?: Bus; lookaheadSec?: number }): AudioTrack
  addDucker(target: Bus, options?: DuckerOptions): Ducker
  stop(options?: { fadeSec?: number }): void
  dispose(): void
}

export function createEngine(options: {
  context: BaseAudioContext
  loop?: { enabled: boolean; lengthSec: number }
  setIntervalFn?: (run: () => void, ms: number) => unknown
  clearIntervalFn?: (id: unknown) => void
}): Engine
