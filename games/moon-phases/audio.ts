// Raw Web Audio: a soft bell for each phase and a breath of air when the
// point of view changes. Created in the first tap, quiet while unattended.

// A pentatonic climb to full moon and back down again.
const PHASE_NOTES = [392, 440, 523.25, 587.33, 659.25, 587.33, 523.25, 440]

export class Sound {
  private context: AudioContext | null = null
  private awake = true
  private noise: AudioBuffer | null = null
  /**
   * Builds the audio context (suspended until a tap) and the whoosh's noise ahead of time, so the child's first
   * tap and first change of view do not pay for them in a long frame.
   */
  prepare() {
    try {
      this.context ||= new AudioContext()
      if (!this.noise) {
        this.noise = this.context.createBuffer(1, this.context.sampleRate, this.context.sampleRate)
        const data = this.noise.getChannelData(0)
        for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
      }
    } catch { /* Audio is optional. */ }
  }
  unlock() {
    if (!this.awake) return
    try {
      this.context ||= new AudioContext()
      if (this.context.state !== 'running') void this.context.resume().catch(() => {})
    } catch { /* Audio is optional. */ }
  }
  setAwake(awake: boolean) {
    this.awake = awake
    if (!this.context) return
    if (awake) void this.context.resume().catch(() => {})
    else void this.context.suspend().catch(() => {})
  }
  private ready() {
    const ctx = this.context
    return ctx && this.awake && ctx.state === 'running' ? ctx : null
  }
  bell(phase: number, volume = 0.06) {
    const ctx = this.ready(); if (!ctx) return
    const base = PHASE_NOTES[phase % PHASE_NOTES.length], at = ctx.currentTime
    const out = ctx.createGain()
    out.gain.setValueAtTime(0, at); out.gain.linearRampToValueAtTime(volume, at + 0.01); out.gain.exponentialRampToValueAtTime(0.0008, at + 2.2)
    out.connect(ctx.destination)
    // A bell: the fundamental plus two quieter, slightly inharmonic partials.
    for (const [ratio, level] of [[1, 1], [2.76, 0.28], [5.4, 0.1]] as const) {
      const osc = ctx.createOscillator(), gain = ctx.createGain()
      osc.type = 'sine'; osc.frequency.value = base * ratio; gain.gain.value = level
      osc.connect(gain); gain.connect(out); osc.start(at); osc.stop(at + 2.3)
      osc.onended = () => { osc.disconnect(); gain.disconnect() }
    }
    setTimeout(() => out.disconnect(), 2500)
  }
  tick() {
    const ctx = this.ready(); if (!ctx) return
    const osc = ctx.createOscillator(), gain = ctx.createGain(), at = ctx.currentTime
    osc.type = 'triangle'; osc.frequency.setValueAtTime(900, at); osc.frequency.exponentialRampToValueAtTime(600, at + 0.06)
    gain.gain.setValueAtTime(0.035, at); gain.gain.exponentialRampToValueAtTime(0.0008, at + 0.09)
    osc.connect(gain); gain.connect(ctx.destination); osc.start(at); osc.stop(at + 0.1)
    osc.onended = () => { osc.disconnect(); gain.disconnect() }
  }
  whoosh(inward: boolean) {
    const ctx = this.ready(); if (!ctx) return
    if (!this.noise) {
      this.noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate)
      const data = this.noise.getChannelData(0)
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
    }
    const source = ctx.createBufferSource(), filter = ctx.createBiquadFilter(), gain = ctx.createGain(), at = ctx.currentTime
    source.buffer = this.noise
    filter.type = 'bandpass'; filter.Q.value = 1.4
    filter.frequency.setValueAtTime(inward ? 500 : 2200, at); filter.frequency.exponentialRampToValueAtTime(inward ? 2200 : 500, at + 0.9)
    gain.gain.setValueAtTime(0, at); gain.gain.linearRampToValueAtTime(0.09, at + 0.3); gain.gain.exponentialRampToValueAtTime(0.0008, at + 1)
    source.connect(filter); filter.connect(gain); gain.connect(ctx.destination); source.start(at); source.stop(at + 1.05)
    source.onended = () => { source.disconnect(); filter.disconnect(); gain.disconnect() }
  }
  dispose() {
    const ctx = this.context
    this.context = null
    if (ctx) void ctx.close().catch(() => {})
  }
}
