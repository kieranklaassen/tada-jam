// Synthesized effects only (no recorded music in the jam). The context is
// created inside the child's first tap, suspended while unattended, and
// closed on unmount.

export type SoundKind = 'tap' | 'rattle' | 'drop' | 'land' | 'lost' | 'glue' | 'secure' | 'level'

const NOTES: Record<SoundKind, number[]> = {
  tap: [620],
  rattle: [880, 620, 940],
  drop: [330, 196],
  land: [110, 73, 55],
  lost: [294, 220],
  glue: [220, 330, 440],
  secure: [784, 1175],
  level: [523, 659, 784],
}

export class Sound {
  private context: AudioContext | null = null
  private awake = true
  /** Builds the context ahead of time (it stays suspended until a tap), so the first tap is not a long frame. */
  prepare() {
    try {
      this.context ||= new AudioContext()
    } catch { /* Audio is optional on older browsers. */ }
  }
  unlock() {
    if (!this.awake) return
    try {
      this.context ||= new AudioContext()
      if (this.context.state !== 'running') void this.context.resume().catch(() => {})
    } catch { /* Audio is optional on older browsers. */ }
  }
  setAwake(awake: boolean) {
    this.awake = awake
    if (!this.context) return
    if (awake) void this.context.resume().catch(() => {})
    else void this.context.suspend().catch(() => {})
  }
  play(kind: SoundKind) {
    const ctx = this.context
    if (!ctx || !this.awake || ctx.state !== 'running') return
    const quiet = kind === 'rattle' || kind === 'secure'
    NOTES[kind].forEach((note, i) => {
      const osc = ctx.createOscillator(), gain = ctx.createGain(), at = ctx.currentTime + i * 0.065
      osc.type = kind === 'drop' || kind === 'land' ? 'sine' : 'triangle'
      osc.frequency.setValueAtTime(note, at); osc.frequency.exponentialRampToValueAtTime(note * 0.97, at + 0.15)
      gain.gain.setValueAtTime(0, at); gain.gain.linearRampToValueAtTime(quiet ? 0.02 : 0.05, at + 0.008); gain.gain.exponentialRampToValueAtTime(0.001, at + 0.23)
      osc.connect(gain); gain.connect(ctx.destination); osc.start(at); osc.stop(at + 0.25)
      osc.onended = () => { osc.disconnect(); gain.disconnect() }
    })
  }
  dispose() {
    const ctx = this.context
    this.context = null
    if (ctx) void ctx.close().catch(() => {})
  }
}
