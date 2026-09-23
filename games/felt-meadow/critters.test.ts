import { describe, expect, it } from 'vitest'
import { Mouse, Snail } from './critters'
import { BURROW, PLOT_RADIUS, plotAt, PLOTS, SNAIL_PATH } from './layout'

const FRAME = 1 / 60

describe('Snail', () => {
  it('glides by stretching and catching up, and turns at the ends of its path', () => {
    const snail = new Snail()
    let minStretch = Infinity
    let maxStretch = 0
    const dirs = new Set<number>()
    for (let i = 0; i < 60 * 120; i++) {
      snail.step(FRAME)
      if (snail.mode === 'glide' && snail.motion.delight === null) {
        minStretch = Math.min(minStretch, snail.stretch)
        maxStretch = Math.max(maxStretch, snail.stretch)
      }
      dirs.add(snail.dir)
      expect(snail.x).toBeGreaterThan(SNAIL_PATH.left - 3)
      expect(snail.x).toBeLessThan(SNAIL_PATH.right + 3)
    }
    expect(maxStretch - minStretch).toBeGreaterThan(0.1)
    expect(dirs.size).toBe(2)
  })

  it('answers a tap its own way each time (tuck and peek, tall eyes, shiver in its shell), never twice running', () => {
    const snail = new Snail()
    const variants: string[] = []
    const seen = { tuck: false, tall: false, shiver: false }
    for (let poke = 0; poke < 9; poke++) {
      const variant = snail.poke()
      expect(variant).not.toBeNull()
      variants.push(variant as string)
      const x = snail.x
      let maxEye = 0
      let minEye = Infinity
      let maxShiver = 0
      let firstOut = -1
      let secondOut = -1
      for (let i = 0; i < 60 * 5 && snail.mode === 'poked'; i++) {
        snail.step(FRAME)
        maxEye = Math.max(maxEye, snail.eyeLeft.x)
        if (i > 20) minEye = Math.min(minEye, snail.eyeLeft.x)
        maxShiver = Math.max(maxShiver, Math.abs(snail.shiver))
        if (minEye < 0.1 && firstOut < 0 && snail.eyeLeft.x > 0.5) firstOut = i
        if (minEye < 0.1 && secondOut < 0 && snail.eyeRight.x > 0.5) secondOut = i
      }
      expect(snail.mode).toBe('glide')
      expect(Math.abs(snail.x - x)).toBeLessThan(3)
      if (variant === 'tuck-and-peek') seen.tuck ||= minEye < 0.1 && secondOut - firstOut > 20 && maxShiver === 0
      if (variant === 'tall-eyes') seen.tall ||= maxEye > 1.4 && minEye > 0.5
      if (variant === 'shiver-in') seen.shiver ||= minEye < 0.1 && maxShiver > 0.03 && Math.abs(secondOut - firstOut) < 4
      for (let i = 0; i < 30; i++) snail.step(FRAME)
    }
    for (let i = 1; i < variants.length; i++) expect(variants[i]).not.toBe(variants[i - 1])
    expect(seen).toEqual({ tuck: true, tall: true, shiver: true })
  })

  it('tucks its eyes in without a flicker at 20 fps, the longest step a frame takes', () => {
    const snail = new Snail()
    for (let tries = 0; tries < 6 && snail.poke() !== 'tuck-and-peek'; tries++) for (let i = 0; i < 60 * 5 && snail.mode === 'poked'; i++) snail.step(FRAME)
    expect(snail.motion.poke).toBe('tuck-and-peek')
    let lowest = Infinity
    for (let i = 0; i < 20 * 2; i++) {
      snail.step(0.05)
      lowest = Math.min(lowest, snail.eyeLeft.x, snail.eyeRight.x)
    }
    expect(lowest).toBeGreaterThan(-0.15)
  })

  it('stays tucked in when tapped again while hidden', () => {
    const snail = new Snail()
    for (let tries = 0; tries < 6 && snail.poke() !== 'tuck-and-peek'; tries++) for (let i = 0; i < 60 * 5 && snail.mode === 'poked'; i++) snail.step(FRAME)
    expect(snail.motion.poke).toBe('tuck-and-peek')
    for (let i = 0; i < 60 * 2; i++) snail.step(FRAME)
    expect(snail.hidden()).toBe(true)
    expect(snail.poke()).toBeNull()
    for (let i = 0; i < 60 * 2; i++) snail.step(FRAME)
    expect(snail.hidden()).toBe(true)
  })

  it('now and then glances at the child, stretches long, or wobbles its eyes, only while gliding', () => {
    const snail = new Snail()
    const delights = new Set<string>()
    for (let i = 0; i < 60 * 240; i++) {
      snail.step(FRAME)
      const delight = snail.motion.delight
      if (delight !== null) {
        delights.add(delight)
        expect(snail.mode).toBe('glide')
      }
    }
    expect(delights).toEqual(new Set(['glance', 'long-stretch', 'eye-wobble']))
  })
})

describe('Mouse', () => {
  it('comes out, darts between freezes without stepping on a molehill, and goes home', () => {
    const mouse = new Mouse(11)
    const modes = new Set<string>()
    let wasOut = false
    let wentHome = false
    for (let i = 0; i < 60 * 90; i++) {
      mouse.step(FRAME)
      modes.add(mouse.mode)
      if (mouse.mode === 'freeze' || mouse.mode === 'rear') expect(plotAt(mouse.x, mouse.z, 2)).toBe(-1)
      if (mouse.visible()) wasOut = true
      if (wasOut && mouse.mode === 'home') wentHome = true
    }
    expect(modes).toContain('dart')
    expect(modes).toContain('freeze')
    expect(wentHome).toBe(true)
  })

  it('keeps a wide berth from every molehill and is out about half the time', () => {
    for (const seed of [3, 7, 11]) {
      const mouse = new Mouse(seed)
      let nearest = Infinity
      let out = 0
      const frames = 60 * 180
      for (let i = 0; i < frames; i++) {
        mouse.step(FRAME)
        if (!mouse.visible()) continue
        out++
        for (const p of PLOTS) nearest = Math.min(nearest, Math.hypot(mouse.x - p.x, mouse.z - p.z))
      }
      expect(nearest).toBeGreaterThan(PLOT_RADIUS + 9)
      expect(out / frames).toBeGreaterThan(0.35)
    }
  })

  it('answers a tap its own way each time (leap home, stand and squeak, chase its tail), never twice running', () => {
    const mouse = new Mouse(11)
    const variants: string[] = []
    const seen = { leap: false, stand: false, chase: false }
    for (let i = 0; i < 60 * 600 && variants.length < 9; i++) {
      mouse.step(FRAME)
      if ((mouse.mode !== 'freeze' && mouse.mode !== 'rear') || mouse.out < 1) continue
      const variant = mouse.poke()
      expect(variant).not.toBeNull()
      variants.push(variant as string)
      let turned = 0
      let lastYaw = mouse.yaw
      let rose = 0
      let home = -1
      for (let j = 0; j < 60 * 6; j++) {
        mouse.step(FRAME)
        turned += Math.abs(Math.atan2(Math.sin(mouse.yaw - lastYaw), Math.cos(mouse.yaw - lastYaw)))
        lastYaw = mouse.yaw
        rose = Math.max(rose, mouse.rear)
        if (!mouse.visible()) {
          home = j
          break
        }
      }
      if (variant === 'leap-home') seen.leap ||= home >= 0 && turned < Math.PI * 1.5
      if (variant === 'tail-chase') seen.chase ||= home >= 0 && turned > Math.PI * 3
      if (variant === 'stand-and-squeak') seen.stand ||= rose > 0.8 && (home < 0 || home > 60 * 1.5)
      if (home >= 0) {
        expect(mouse.x).toBe(BURROW.x)
        expect(mouse.z).toBe(BURROW.z)
      }
    }
    for (let i = 1; i < variants.length; i++) expect(variants[i]).not.toBe(variants[i - 1])
    expect(seen).toEqual({ leap: true, stand: true, chase: true })
  })

  it('ignores taps while it is already home', () => {
    const mouse = new Mouse(3)
    expect(mouse.poke()).toBeNull()
    expect(mouse.mode).toBe('home')
  })

  it('comes out to see when its burrow is knocked while it is home, but never straight back out after running in', () => {
    const mouse = new Mouse(3)
    for (let i = 0; i < 90; i++) mouse.step(FRAME)
    expect(mouse.knock()).toBe(true)
    let frames = 0
    while (!mouse.visible() && frames < 600) {
      mouse.step(FRAME)
      frames++
    }
    expect(frames * FRAME).toBeLessThan(0.5)
    expect(mouse.knock()).toBe(false)

    const fled = new Mouse(11)
    for (let i = 0; i < 60 * 600; i++) {
      fled.step(FRAME)
      if ((fled.mode === 'freeze' || fled.mode === 'rear') && fled.out >= 1 && fled.poke() === 'leap-home') break
    }
    while (fled.visible()) fled.step(FRAME)
    expect(fled.knock()).toBe(true)
    let hidden = 0
    while (!fled.visible()) {
      fled.step(FRAME)
      hidden++
    }
    expect(hidden * FRAME).toBeGreaterThan(1.1)
    expect(hidden * FRAME).toBeLessThan(1.5)
  })

  it('while still, now and then glances at the child, washes its face, or flicks its tail', () => {
    const mouse = new Mouse(5)
    const delights = new Set<string>()
    for (let i = 0; i < 60 * 300; i++) {
      mouse.step(FRAME)
      const delight = mouse.motion.delight
      if (delight !== null) {
        delights.add(delight)
        expect(['freeze', 'rear']).toContain(mouse.mode)
      }
    }
    expect(delights).toEqual(new Set(['glance', 'wash-face', 'tail-flick']))
  })
})
