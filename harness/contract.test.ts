import { describe, expect, it } from 'vitest'
import { validateManifest, type CartridgeManifest } from './contract'

const good: CartridgeManifest = {
  key: 'pebble-table',
  name: 'Pebble Table',
  ageBand: [3, 7],
  permissions: ['storage'],
  iconIdentity: { family: 'play', contrast: 'paper' },
}

describe('validateManifest', () => {
  it('accepts a well-formed manifest', () => {
    expect(validateManifest(good)).toEqual([])
  })

  it('rejects a non-slug key', () => {
    expect(validateManifest({ ...good, key: 'Pebble_Table' })).toHaveLength(1)
  })

  it('rejects an inverted age band', () => {
    expect(validateManifest({ ...good, ageBand: [7, 3] })).toHaveLength(1)
  })

  it('rejects permissions outside the closed set', () => {
    expect(validateManifest({ ...good, permissions: ['network' as never] })).toHaveLength(1)
  })

  it('requires an icon identity unless dev-only', () => {
    const { iconIdentity: _omit, ...rest } = good
    expect(validateManifest(rest)).toHaveLength(1)
    expect(validateManifest({ ...rest, devOnly: true })).toEqual([])
  })

  it('rejects a non-semver version', () => {
    expect(validateManifest({ ...good, version: 'v1' })).toHaveLength(1)
  })
})
