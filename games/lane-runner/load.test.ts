import { describe, expect, it, vi } from 'vitest'

// The jam loads every game's code at once, so nothing may happen when this
// game's modules load: nothing drawn from chance, and nothing made for the
// renderer.

const modules = import.meta.glob(['./**/*.ts', './**/*.tsx', '!./**/*.test.ts'])
const sources = import.meta.glob(['./**/*.ts', './**/*.tsx', '!./**/*.test.ts'], { query: '?raw', import: 'default', eager: true }) as Record<string, string>

describe('loading the game', () => {
  it('draws nothing from chance and reads no clock while its modules load', async () => {
    // The libraries are loaded first: what they do when they load is theirs. What is watched is this game's own modules.
    await import('three')
    await import('react')
    const random = vi.spyOn(Math, 'random')
    const now = vi.spyOn(Date, 'now')
    const names = Object.keys(modules)
    expect(names.length).toBeGreaterThan(35)
    for (const name of names) await modules[name]()
    expect(random).not.toHaveBeenCalled()
    expect(now).not.toHaveBeenCalled()
    random.mockRestore()
    now.mockRestore()
  }, 60_000)

  it('makes nothing for the renderer at module level: every material, geometry, texture and mesh is made in the view', () => {
    const made = /^(?:export )?(?:const|let|var) [^\n]*\bnew THREE\./m
    for (const [name, source] of Object.entries(sources)) expect(made.test(source), name).toBe(false)
    // And only the view knows the renderer at all.
    for (const [name, source] of Object.entries(sources)) {
      if (name.startsWith('./view/') || name === './perf.ts') continue
      expect(/from 'three'/.test(source), name).toBe(false)
    }
  })
})
