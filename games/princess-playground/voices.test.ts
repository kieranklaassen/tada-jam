import { describe, expect, it } from 'vitest'
import * as voices from './voices'
import { RANGE, THROAT, VARIANTS, chirp, creak, drag, knock, leap, lengthOf, levelHum, lift, poke, slide, thump, whoop, type Part } from './voices'
import { FRIEND_IDS, FRIENDS } from './world'

/** Every voice the game can make, at the edges of what it is asked for. */
function everyVoice(): { name: string; voice: Part[] }[] {
  const all: { name: string; voice: Part[] }[] = []
  for (const id of FRIEND_IDS) {
    for (let v = 0; v < VARIANTS; v++) all.push({ name: `chirp ${id} ${v}`, voice: chirp(id, v) })
    all.push({ name: `leap ${id}`, voice: leap(id) }, { name: `lift ${id}`, voice: lift(id) })
    for (const speed of [0, 6, 16, 40]) all.push({ name: `whoop ${id} ${speed}`, voice: whoop(id, speed) })
    for (const on of ['plank', 'sand', 'friend'] as const) for (const hard of [0, 0.5, 1, 3]) all.push({ name: `thump ${id} ${on} ${hard}`, voice: thump(FRIENDS[id].weight, on, hard) })
  }
  for (const speed of [0, 1, 3.5, 9]) all.push({ name: `knock ${speed}`, voice: knock(speed) }, { name: `drag ${speed}`, voice: drag(speed * 4) })
  for (const strength of [0, 0.6, 1, 2]) all.push({ name: `creak ${strength}`, voice: creak(strength) })
  all.push({ name: 'level', voice: levelHum() }, { name: 'slide', voice: slide() }, { name: 'poke', voice: poke() })
  // The cells' own sounds: every voice that takes no argument, then the ones that take one.
  const plain = ['tick', 'trill', 'clack', 'crow', 'raspberry', 'rattle', 'purr', 'knead', 'scrunch', 'yowl', 'ringOver', 'longNote', 'duet', 'softNote', 'scratch', 'snore', 'slam', 'wheeze', 'sigh', 'chuckle', 'squeal', 'clonk', 'twang', 'trickle', 'whisper', 'patter', 'comb'] as const
  for (const name of plain) all.push({ name, voice: voices[name]() })
  for (const alone of [true, false]) all.push({ name: `hum ${alone}`, voice: voices.hum(alone) })
  for (const weight of [0, 2, 4, 9, 30]) all.push({ name: `crunch ${weight}`, voice: voices.crunch(weight) })
  for (const id of FRIEND_IDS) all.push({ name: `ask ${id}`, voice: voices.ask(id) })
  return all
}

const within = (value: number, [low, high]: readonly [number, number]) => value >= low && value <= high

describe('the voices, as numbers', () => {
  it('every part of every voice stays inside the stated ranges', () => {
    for (const { name, voice } of everyVoice()) {
      expect(voice.length, name).toBeGreaterThan(0)
      expect(voice.length, name).toBeLessThanOrEqual(RANGE.parts)
      expect(lengthOf(voice), name).toBeLessThanOrEqual(RANGE.length)
      for (const part of voice) {
        expect(within(part.frequency, RANGE.frequency), `${name} frequency ${part.frequency}`).toBe(true)
        if (part.glideTo !== 0) expect(within(part.glideTo, RANGE.frequency), `${name} glide ${part.glideTo}`).toBe(true)
        expect(within(part.peak, RANGE.peak), `${name} peak ${part.peak}`).toBe(true)
        expect(within(part.attack, RANGE.attack), `${name} attack ${part.attack}`).toBe(true)
        expect(within(part.decay, RANGE.decay), `${name} decay ${part.decay}`).toBe(true)
        expect(part.delay, name).toBeGreaterThanOrEqual(0)
      }
    }
  })

  it('the parts of one voice together never pass a safe peak', () => {
    for (const { name, voice } of everyVoice()) expect(voice.reduce((sum, part) => sum + part.peak, 0), name).toBeLessThanOrEqual(0.45)
  })

  it('every voice the module exports is among those held in range', () => {
    const held = new Set(everyVoice().map(({ name }) => name.split(' ')[0]))
    const makers = Object.entries(voices).filter(([, value]) => typeof value === 'function').map(([name]) => name).filter((name) => name !== 'lengthOf')
    for (const name of makers) expect(held.has(name === 'levelHum' ? 'level' : name), name).toBe(true)
  })

  it('a bigger friend speaks lower and lands lower', () => {
    expect(THROAT.pim.pitch).toBeGreaterThan(THROAT.mog.pitch)
    expect(THROAT.mog.pitch).toBeGreaterThan(THROAT.bo.pitch * 2)
    expect(thump(2, 'plank', 1)[0].frequency).toBeGreaterThan(thump(3, 'plank', 1)[0].frequency)
    expect(thump(3, 'plank', 1)[0].frequency).toBeGreaterThan(thump(4, 'plank', 1)[0].frequency)
  })

  it('each friend answers a touch in its own voice, and in more than one way', () => {
    const shape = (voice: Part[]) => voice.map((part) => `${part.wave} ${Math.round(part.frequency)} ${part.glideTo > part.frequency ? 'up' : part.glideTo ? 'down' : 'flat'} ${part.delay}`).join(' | ')
    const first = FRIEND_IDS.map((id) => shape(chirp(id, 0)))
    expect(new Set(first).size).toBe(4)
    // The two friends of one size are told apart by ear as well: Mog chirrups upward, Dot holds two level notes.
    expect(chirp('mog', 0).every((part) => part.glideTo > part.frequency)).toBe(true)
    expect(chirp('dot', 0).every((part) => part.glideTo === 0)).toBe(true)
    for (const id of FRIEND_IDS) expect(new Set([0, 1, 2].map((v) => shape(chirp(id, v)))).size).toBe(VARIANTS)
  })

  it('the slide down the plank is a whistle that rises', () => {
    const [whistle] = slide()
    expect(whistle.kind).toBe('tone')
    expect(whistle.glideTo).toBeGreaterThan(whistle.frequency * 2)
  })

  it('a harder knock is louder and longer, and a landing in sand sounds unlike one on the plank', () => {
    expect(knock(3.5)[0].peak).toBeGreaterThan(knock(0.6)[0].peak)
    expect(lengthOf(knock(3.5))).toBeGreaterThan(lengthOf(knock(0.6)))
    expect(thump(3, 'sand', 1).some((part) => part.kind === 'noise')).toBe(true)
    expect(thump(3, 'plank', 1).some((part) => part.kind === 'noise')).toBe(false)
  })
})
