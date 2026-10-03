import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs'
import { homedir, tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { wordingHash } from './normalise.ts'
import {
  clonePath,
  decodeText,
  getBlob,
  getText,
  getWording,
  hasBlob,
  hasText,
  hasWording,
  putBlob,
  putText,
  putWording,
  rawBlobFor,
  requireStore,
  sha256,
  storeRoot,
} from './store.ts'

// Every text here is invented. No official wording belongs in a test.

let root: string

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'education-store-'))
})

afterEach(() => {
  rmSync(root, { recursive: true, force: true })
})

describe('where the store is', () => {
  it('is the folder the environment names', () => {
    expect(storeRoot({ EDUCATION_STORE: '/somewhere/else' })).toBe('/somewhere/else')
  })

  it('is a cache folder under the home directory otherwise', () => {
    expect(storeRoot({})).toBe(join(homedir(), '.cache', 'tada-jam-education'))
  })

  it('tells a tool that needs wording which command creates a missing store', () => {
    const missing = join(root, 'not-there')
    expect(() => requireStore(missing)).toThrow('npm run education:fetch')
    expect(() => requireStore(missing)).toThrow(missing)
  })

  it('hands back the root of a store that exists', () => {
    expect(requireStore(root)).toBe(root)
  })
})

describe('fetched bytes', () => {
  it('are kept under blobs/, named by their sha256', () => {
    const bytes = Buffer.from('code,statement\r\nK.1,"Count the apples"\r\n')
    const hash = putBlob(root, bytes)
    expect(hash).toBe(sha256(bytes))
    expect(hash).toMatch(/^[0-9a-f]{64}$/)
    expect(readFileSync(join(root, 'blobs', hash))).toEqual(bytes)
    expect(hasBlob(root, hash)).toBe(true)
    expect(getBlob(root, hash)).toEqual(bytes)
  })

  it('are absent until they are put', () => {
    const hash = sha256('never stored')
    expect(hasBlob(root, hash)).toBe(false)
    expect(getBlob(root, hash)).toBeNull()
  })
})

describe('official wording', () => {
  it('is kept under wording/, named by its wording hash', () => {
    const wording = 'Count the apples in a basket up to ten.'
    const hash = putWording(root, wording)
    expect(hash).toBe(wordingHash(wording))
    expect(existsSync(join(root, 'wording', `${hash}.txt`))).toBe(true)
    expect(hasWording(root, hash)).toBe(true)
    expect(getWording(root, hash)).toBe(wording)
  })

  it('is put once: the same wording again gives the same hash and the same file', () => {
    const first = putWording(root, 'Count the apples in a basket up to ten.')
    const second = putWording(root, 'Count  the apples in a basket up to ten. ')
    expect(second).toBe(first)
    expect(readdirSync(join(root, 'wording'))).toEqual([`${first}.txt`])
    expect(getWording(root, first)).toBe('Count the apples in a basket up to ten.')
  })

  it('is absent until it is put', () => {
    const hash = wordingHash('never stored')
    expect(hasWording(root, hash)).toBe(false)
    expect(getWording(root, hash)).toBeNull()
  })
})

describe('the extracted text of a page', () => {
  it('is kept under text/, named by its pin, with the raw page it came from', () => {
    const page = putBlob(root, Buffer.from('<html>the page as it was served</html>'))
    const pin = putText(root, 'Een kind telt de appels.', page)
    expect(pin).toBe(wordingHash('Een kind telt de appels.'))
    expect(existsSync(join(root, 'text', `${pin}.txt`))).toBe(true)
    expect(hasText(root, pin)).toBe(true)
    expect(getText(root, pin)).toBe('Een kind telt de appels.')
    expect(rawBlobFor(root, pin)).toBe(page)
  })

  it('is absent until it is put', () => {
    const pin = wordingHash('never stored')
    expect(hasText(root, pin)).toBe(false)
    expect(getText(root, pin)).toBeNull()
    expect(rawBlobFor(root, pin)).toBeNull()
  })
})

describe('clones', () => {
  it('sit under git/, one folder per source', () => {
    expect(clonePath(root, 'voorbeeld-doelen')).toBe(join(root, 'git', 'voorbeeld-doelen'))
  })
})

describe('decodeText', () => {
  // "Café – 5 apples", then a row break, then a field with a bare line feed in it.
  const text = 'Café – 5 apples\r\n"first line\nsecond line"\r\n'
  const windows1252 = Buffer.from([
    ...Buffer.from('Caf', 'latin1'),
    0xe9,
    0x20,
    0x96,
    ...Buffer.from(' 5 apples\r\n"first line\nsecond line"\r\n', 'latin1'),
  ])

  it('reads a Windows-1252 file and a UTF-8 file with the same text as the same string', () => {
    expect(decodeText(windows1252)).toBe(text)
    expect(decodeText(Buffer.from(text, 'utf8'))).toBe(text)
  })

  it('reads plain ASCII as it is', () => {
    expect(decodeText(Buffer.from('K.CC.1,row\r\n', 'ascii'))).toBe('K.CC.1,row\r\n')
  })
})
