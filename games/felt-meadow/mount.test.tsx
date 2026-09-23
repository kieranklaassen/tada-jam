// @vitest-environment jsdom
import { act, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CartridgeBoundary, MAX_CRASHES } from '../../harness/CartridgeBoundary'
import type { CartridgeContext, CartridgeStorage } from '../types'
import { feltMeadowCartridge } from './felt-meadow'

// jsdom has no WebGL, which is the case this covers: a device or moment where
// the meadow cannot get a context.

const { Mount } = feltMeadowCartridge

const storage: CartridgeStorage = {
  load: () => Promise.resolve(null),
  save: () => {},
  flush: () => Promise.resolve(),
}

const crashes: unknown[] = []
let bringBack = () => {}

/** The jam shell's containment, as JamShell wires it: parking withdraws attention but keeps the boundary mounted. */
function Shell() {
  const [parked, setParked] = useState(false)
  bringBack = () => setParked(false)
  const ctx = useMemo<CartridgeContext>(
    () => ({ childNickname: 'Kaia', childAge: 4, language: 'en', theme: 'meadow', status: 'ready', storage, attention: { attended: !parked } }),
    [parked],
  )
  return (
    <CartridgeBoundary onPark={() => setParked(true)} onCrash={(error) => crashes.push(error)}>
      <Mount ctx={ctx} />
    </CartridgeBoundary>
  )
}

async function settle(): Promise<void> {
  for (let i = 0; i < 40; i++) await act(() => new Promise<void>((resolve) => setTimeout(resolve, 0)))
}

describe('mounting without WebGL', () => {
  beforeEach(() => {
    ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
    crashes.length = 0
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('fails into the shell, which retries and parks it; parked it waits instead of failing again', async () => {
    expect(document.visibilityState).toBe('visible')
    const container = document.createElement('div')
    document.body.appendChild(container)
    const root = createRoot(container, { onCaughtError: () => {} })
    await act(async () => root.render(<Shell />))
    await settle()
    expect(crashes).toHaveLength(MAX_CRASHES + 1)
    for (const error of crashes) expect(String(error)).toMatch(/WebGL context/)
    expect(container.querySelector('canvas')).toBeNull()

    await settle()
    expect(crashes).toHaveLength(MAX_CRASHES + 1)

    await act(async () => bringBack())
    await settle()
    expect(crashes).toHaveLength(2 * (MAX_CRASHES + 1))

    await act(async () => root.unmount())
    container.remove()
  })
})
