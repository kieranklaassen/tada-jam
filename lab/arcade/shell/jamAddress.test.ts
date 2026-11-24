import { describe, expect, it } from 'vitest'
import { parseRoute } from '../../shell/routes.ts'
import { jamAddress } from './jamAddress.ts'

const at = (pathname: string, search: string, hash: string) => jamAddress(pathname, search, parseRoute(hash, search))

describe('where the published player sends a visitor', () => {
  it('sends a demo to the jam, where it plays full screen', () => {
    expect(at('/lab/arcade/index.html', '', '#/play/monster-pizza')).toBe('../../index.html#/demo/monster-pizza')
  })

  it('sends the list to the jam home page', () => {
    expect(at('/lab/arcade/', '', '')).toBe('../../index.html')
  })

  it('stays when the rating strip is asked for, and when the jam frames a demo', () => {
    expect(at('/lab/arcade/index.html', '?chrome=1', '#/play/monster-pizza')).toBeNull()
    expect(at('/lab/arcade/index.html', '?chrome=1', '')).toBeNull()
    expect(at('/lab/arcade/index.html', '?chrome=0', '#/play/monster-pizza')).toBeNull()
    expect(at('/lab/arcade/index.html', '', '#/play/monster-pizza?chrome=0')).toBeNull()
  })

  it('leaves the lab on its own server as it is', () => {
    expect(at('/arcade/', '', '#/play/monster-pizza')).toBeNull()
    expect(at('/arcade/', '', '')).toBeNull()
  })
})
