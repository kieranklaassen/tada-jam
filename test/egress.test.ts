import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { scanGameSource, scanTree, scanUrls } from '../scripts/egress-check.ts'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

describe('egress scanner', () => {
  it('flags an external URL', () => {
    const findings = scanUrls("const font = 'https://fonts.example.com/a.woff2'", 'x.ts', [])
    expect(findings.map((f) => f.rule)).toEqual(['no-external-url'])
  })

  it('ignores local hosts and SVG namespaces', () => {
    expect(scanUrls('http://localhost:5173 http://www.w3.org/2000/svg', 'x.ts', [])).toEqual([])
  })

  it('flags network and storage APIs in game code', () => {
    const source = [
      "fetch('/api')",
      'localStorage.setItem("a", "b")',
      'new WebSocket(url)',
      'new Tone.Player(url)',
      'indexedDB.open("x")',
    ].join('\n')
    const rules = scanGameSource(source, 'games/x/x.ts').map((f) => f.rule)
    expect(rules).toEqual(['no-fetch', 'no-localstorage', 'no-websocket', 'no-sample-player', 'no-indexeddb'])
  })

  it('flags imports that leave the game folder or the tech menu', () => {
    const source = [
      "import { x } from '../other-game/x'",
      "import { y } from '../../harness/storage'",
      "import leftPad from 'left-pad'",
      "import type { Cartridge } from '../types'",
      "import { useState } from 'react'",
      "import { scene } from './scene'",
    ].join('\n')
    const rules = scanGameSource(source, 'games/x/x.ts').map((f) => f.rule)
    expect(rules).toEqual(['import-outside-game', 'no-shell-import', 'import-outside-game', 'package-not-on-menu'])
  })

  it('allows on-device speech synthesis (jam allowance for spoken number words)', () => {
    expect(scanGameSource('window.speechSynthesis.speak(utterance)', 'games/x/x.ts')).toEqual([])
  })

  it('passes on this repository', () => {
    expect(scanTree(root, { built: false })).toEqual([])
  })
})
