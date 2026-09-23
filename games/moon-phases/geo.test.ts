import { describe, expect, it } from 'vitest'
import { DEFAULT_HOME, altitude, earthAngle, homeAt, homeForCountry, horizonDip, litSide, viewPitch, zenith, type Vec } from './geo'
import { orbitPoint } from './phase'

const deg = Math.PI / 180
const R = 0.8
const SUN: Vec = { x: -1, y: 0, z: 0 }
const eyeAt = (up: Vec): Vec => ({ x: up.x * R, y: up.y * R, z: up.z * R })

describe('where the child lives', () => {
  it('uses the profile country and falls back quietly', () => {
    expect(homeForCountry('NL').lat).toBeCloseTo(52.37 * deg)
    expect(homeForCountry('au').lat).toBeLessThan(0)
    expect(homeForCountry(null)).toEqual(DEFAULT_HOME)
    expect(homeForCountry('zz')).toEqual(DEFAULT_HOME)
  })

  it('faces the sun at local noon and away from it at midnight', () => {
    const home = { lat: 0, lon: 1.2 }
    const noon = zenith(home, earthAngle(12, home.lon))
    const midnight = zenith(home, earthAngle(0, home.lon))
    expect(noon.x).toBeCloseTo(-1)
    expect(midnight.x).toBeCloseTo(1)
  })

  it('turns towards the sun in the morning', () => {
    const home = { lat: 0, lon: 0 }
    const before = zenith(home, earthAngle(5.9, 0)), after = zenith(home, earthAngle(6.1, 0))
    expect(after.x).toBeLessThan(before.x)
  })

  it('reads a tapped point on the globe back as a place', () => {
    const home = { lat: -0.6, lon: 2.4 }, spin = 1.3
    const back = homeAt(zenith(home, spin), spin)
    expect(back.lat).toBeCloseTo(home.lat)
    expect(back.lon).toBeCloseTo(home.lon)
  })
})

describe('the sky from home', () => {
  // A first-quarter moon, seen in the early evening from each hemisphere.
  const moonAt = (elongation: number): Vec => { const p = orbitPoint(elongation, 3.3); return { x: p.x, y: 0, z: p.z } }

  it('a first-quarter moon is up in the evening, lit on the right in Amsterdam and on the left in Sydney', () => {
    const moon = moonAt(Math.PI / 2)
    for (const [country, side] of [['nl', 1], ['au', -1]] as const) {
      const home = homeForCountry(country)
      const up = zenith(home, earthAngle(18, home.lon)), eye = eyeAt(up)
      expect(altitude(eye, up, moon)).toBeGreaterThan(0)
      expect(litSide(eye, up, moon, SUN)).toBe(side)
    }
  })

  it('a full moon has set by noon and is up at midnight', () => {
    const moon = moonAt(Math.PI), home = homeForCountry('nl')
    const noon = zenith(home, earthAngle(12, home.lon)), midnight = zenith(home, earthAngle(0, home.lon))
    expect(altitude(eyeAt(noon), noon, moon)).toBeLessThan(0)
    expect(altitude(eyeAt(midnight), midnight, moon)).toBeGreaterThan(0)
  })

  it('keeps some ground in view while the moon is low', () => {
    expect(viewPitch(-0.3, 60 * deg)).toBeCloseTo(26 * deg)
    expect(viewPitch(1, 60 * deg)).toBe(1)
    // On a small globe the ground drops away, so the view tips down with it.
    const dip = horizonDip(0.8, 0.045)
    expect(dip).toBeLessThan(-15 * deg)
    expect(viewPitch(-0.3, 60 * deg, dip)).toBeCloseTo(dip + 26 * deg)
  })
})
