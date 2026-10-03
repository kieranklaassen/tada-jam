// The store: every fetched file and every official wording, kept outside the
// working tree and named by hash (plan KTD4). The repo is public and
// California's wording may not be committed, so the only copy of it is here.
//
//   <root>/blobs/<sha256>        a fetched file, byte for byte
//   <root>/text/<pin>.txt        the regulation text extracted from a page that is pinned by its text
//   <root>/text/<pin>.blob       the sha256 of the raw page that text was extracted from
//   <root>/git/<source-slug>/    the clone of a source pinned by a commit
//   <root>/wording/<sha256>.txt  the official wording of one record, named by its wording_sha256
//   <root>/incoming/             files fetched by hand; nothing here reads or writes it
//
// The root is $EDUCATION_STORE, or ~/.cache/tada-jam-education. Every function
// takes the root, so a test can use a temporary folder. The validator does not
// use the store; a tool that needs wording calls requireStore() first.

import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { wordingHash } from './normalise.ts'

export const STORE_ENV = 'EDUCATION_STORE'

// The command that creates and fills the store.
export const FETCH_COMMAND = 'npm run education:fetch'

export function storeRoot(env: Record<string, string | undefined> = process.env): string {
  return env[STORE_ENV] || join(homedir(), '.cache', 'tada-jam-education')
}

// The root of the store, or an error that says how to create it.
export function requireStore(root: string = storeRoot()): string {
  if (!existsSync(root)) {
    throw new Error(`the education store is missing at ${root}: run \`${FETCH_COMMAND}\` to create it (set ${STORE_ENV} to keep it somewhere else)`)
  }
  return root
}

export function sha256(data: Uint8Array | string): string {
  return createHash('sha256').update(data).digest('hex')
}

// Written under another name and then renamed, so a file named by a hash is
// never half written. A file that is already there is left as it is.
function writeOnce(path: string, data: Uint8Array | string): void {
  if (existsSync(path)) return
  mkdirSync(dirname(path), { recursive: true })
  const partial = `${path}.${process.pid}.partial`
  writeFileSync(partial, data)
  renameSync(partial, path)
}

function read(path: string): Buffer | null {
  return existsSync(path) ? readFileSync(path) : null
}

// --- fetched bytes -----------------------------------------------------------

export function blobPath(root: string, hash: string): string {
  return join(root, 'blobs', hash)
}

// Stores the bytes and gives back their sha256.
export function putBlob(root: string, bytes: Uint8Array): string {
  const hash = sha256(bytes)
  writeOnce(blobPath(root, hash), bytes)
  return hash
}

export function hasBlob(root: string, hash: string): boolean {
  return existsSync(blobPath(root, hash))
}

export function getBlob(root: string, hash: string): Buffer | null {
  return read(blobPath(root, hash))
}

// --- extracted text ----------------------------------------------------------

function textPath(root: string, pin: string): string {
  return join(root, 'text', `${pin}.txt`)
}

// Stores the text extracted from a page and which raw page (a blob's hash) it
// came from. Gives back the pin: the wording hash of the text.
export function putText(root: string, text: string, rawBlob: string): string {
  const pin = wordingHash(text)
  writeOnce(join(root, 'text', `${pin}.blob`), `${rawBlob}\n`)
  writeOnce(textPath(root, pin), text)
  return pin
}

export function hasText(root: string, pin: string): boolean {
  return existsSync(textPath(root, pin))
}

export function getText(root: string, pin: string): string | null {
  return read(textPath(root, pin))?.toString('utf8') ?? null
}

// The hash of the raw page a pinned text was extracted from: getBlob() reads it.
export function rawBlobFor(root: string, pin: string): string | null {
  return read(join(root, 'text', `${pin}.blob`))?.toString('utf8').trim() ?? null
}

// --- clones ------------------------------------------------------------------

export function clonePath(root: string, slug: string): string {
  return join(root, 'git', slug)
}

// --- official wording --------------------------------------------------------

function wordingPath(root: string, hash: string): string {
  return join(root, 'wording', `${hash}.txt`)
}

// Stores the official wording of one record and gives back its wording hash,
// the record's `wording_sha256`. The same wording again changes nothing.
export function putWording(root: string, wording: string): string {
  const hash = wordingHash(wording)
  writeOnce(wordingPath(root, hash), wording)
  return hash
}

export function hasWording(root: string, hash: string): boolean {
  return existsSync(wordingPath(root, hash))
}

export function getWording(root: string, hash: string): string | null {
  return read(wordingPath(root, hash))?.toString('utf8') ?? null
}

// --- encodings ---------------------------------------------------------------

// A text file as one string, whatever its encoding: UTF-8 when the bytes are
// valid UTF-8 (plain ASCII is), Windows-1252 otherwise. Line breaks are left
// as they are.
export function decodeText(bytes: Uint8Array): string {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } catch {
    return new TextDecoder('windows-1252').decode(bytes)
  }
}
