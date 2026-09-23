import { describe, expect, it } from 'vitest'
import { DEFAULT_SEED, buildPlayHash, parseRoute, resolveRoute } from './routes.ts'

describe('parseRoute', () => {
  it('shows the list for an empty or unknown hash', () => {
    expect(parseRoute('', '')).toEqual({ view: 'list' })
    expect(parseRoute('#', '')).toEqual({ view: 'list' })
    expect(parseRoute('#/', '')).toEqual({ view: 'list' })
    expect(parseRoute('#/nope', '')).toEqual({ view: 'list' })
    expect(parseRoute('#/play', '')).toEqual({ view: 'list' })
    expect(parseRoute('#/play/', '')).toEqual({ view: 'list' })
  })

  it('resolves #/play/<key> with defaults', () => {
    expect(parseRoute('#/play/bounce-pads', '')).toEqual({
      view: 'play',
      key: 'bounce-pads',
      chrome: true,
      seed: DEFAULT_SEED,
      watch: null,
    })
  })

  it('tolerates a trailing slash', () => {
    expect(parseRoute('#/play/example/', '')).toMatchObject({ view: 'play', key: 'example' })
  })

  it('falls back to the list for a key that cannot be a folder name', () => {
    expect(parseRoute('#/play/Not%20Kebab', '')).toEqual({ view: 'list' })
    expect(parseRoute('#/play/../secret', '')).toEqual({ view: 'list' })
    expect(parseRoute('#/play/a/b', '')).toEqual({ view: 'list' })
    expect(parseRoute('#/play/%E0%A4%A', '')).toEqual({ view: 'list' })
  })

  it('reads ?chrome=0 from the search', () => {
    expect(parseRoute('#/play/example', '?chrome=0')).toMatchObject({ chrome: false })
    expect(parseRoute('#/play/example', '?chrome=1')).toMatchObject({ chrome: true })
    expect(parseRoute('#/play/example', '')).toMatchObject({ chrome: true })
  })

  it('reads ?seed= and falls back to 1 for anything that is not a whole number', () => {
    expect(parseRoute('#/play/example', '?seed=12')).toMatchObject({ seed: 12 })
    expect(parseRoute('#/play/example', '?seed=0')).toMatchObject({ seed: 0 })
    for (const bad of ['1.5', '-3', 'abc', '', '12abc', '1e3', '99999999999']) {
      expect(parseRoute('#/play/example', `?seed=${bad}`)).toMatchObject({ seed: DEFAULT_SEED })
    }
  })

  it('reads ?watch=<personaId>', () => {
    expect(parseRoute('#/play/example', '?watch=kaia')).toMatchObject({ watch: 'kaia' })
    expect(parseRoute('#/play/example', '?watch=')).toMatchObject({ watch: null })
    expect(parseRoute('#/play/example', '?watch=has%20space')).toMatchObject({ watch: null })
    expect(parseRoute('#/play/example', '')).toMatchObject({ watch: null })
  })

  it('ignores unknown params', () => {
    expect(parseRoute('#/play/example', '?foo=bar&x=1')).toEqual({
      view: 'play',
      key: 'example',
      chrome: true,
      seed: DEFAULT_SEED,
      watch: null,
    })
  })

  it('reads params written inside the hash, and lets them win over the search', () => {
    expect(parseRoute('#/play/example?chrome=0&seed=7&watch=tess', '')).toEqual({
      view: 'play',
      key: 'example',
      chrome: false,
      seed: 7,
      watch: 'tess',
    })
    expect(parseRoute('#/play/example?seed=7', '?seed=3&chrome=0')).toMatchObject({ seed: 7, chrome: false })
  })
})

describe('resolveRoute', () => {
  const known = ['example', 'bounce-pads']

  it('keeps a play route whose key is registered', () => {
    const route = parseRoute('#/play/example', '')
    expect(resolveRoute(route, known)).toBe(route)
  })

  it('falls back to the list for an unknown key', () => {
    expect(resolveRoute(parseRoute('#/play/missing', ''), known)).toEqual({ view: 'list' })
  })

  it('leaves the list route alone', () => {
    expect(resolveRoute({ view: 'list' }, known)).toEqual({ view: 'list' })
  })

  it('accepts any iterable of keys', () => {
    expect(resolveRoute(parseRoute('#/play/example', ''), new Set(known))).toMatchObject({ view: 'play' })
  })
})

describe('buildPlayHash', () => {
  it('writes a hash that parses back to the same route', () => {
    const route = { view: 'play', key: 'example', chrome: false, seed: 9, watch: 'kaia' } as const
    expect(parseRoute(buildPlayHash(route), '')).toEqual(route)
  })

  it('omits defaults', () => {
    expect(buildPlayHash({ view: 'play', key: 'example', chrome: true, seed: DEFAULT_SEED, watch: null })).toBe(
      '#/play/example',
    )
  })
})
