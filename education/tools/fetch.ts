// Fetches every official file once, pins it by hash in its source record, and
// keeps it in the store outside the working tree (plan KTD4, store.ts).
//
//   npm run education:fetch                               every source under education/sources/
//   npm run education:fetch -- --only <slug>              only that source (repeatable)
//   npm run education:fetch -- --ingest <slug>=<path>     a local file, or a clone, in place of the network (repeatable)
//
// What the pin of a source is depends on its `pin_kind`:
//
//   bytes           the sha256 of the response.
//   extracted-text  the hash of the regulation text in the page after
//                   normalisation. The Dutch legal site stamps the day a page
//                   was read into the page, so its bytes differ every day;
//                   only a change to the regulation is a change. For a PDF
//                   that is made anew at every download, the hash of its
//                   text as pdftotext prints it, after normalisation.
//   git-commit      the commit the clone is on.
//
// A source with an empty pin is stored and its pin written into the record. A
// source with a pin is verified against it and nothing is written. When the
// content no longer matches the pin, the source is reported as changed and
// nothing is written either: a person who means to accept the new content
// clears `pin` in the source record and fetches again.
//
// Requests go one at a time, with a wait between two requests to the same
// host, and are never retried. A response that is not the file (an error
// status, or an HTML robot check served for a CSV or a PDF) is invalid and is
// neither stored nor pinned. `--ingest` exists because one publisher's site
// answers with a robot check after a few requests: a file saved by hand goes
// through the same checks and the same pinning.
//
// The core is exported so fetch.test.ts can run it against a network it makes up.

import { execFileSync } from 'node:child_process'
import { cpSync, existsSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { normalise, wordingHash } from './normalise.ts'
import { parseRecord, replaceFrontmatter } from './record.ts'
import { PIN_KINDS } from './schema.ts'
import type { PinKind } from './schema.ts'
import { clonePath, decodeText, hasBlob, hasText, putBlob, putText, sha256, storeRoot } from './store.ts'

export const STATUSES = ['stored', 'verified', 'changed', 'invalid', 'skipped'] as const
export type Status = (typeof STATUSES)[number]

export interface Outcome {
  // The source's slug: its file name under sources/ without `.md`.
  slug: string
  status: Status
  // The pin the source now has (stored) or still has (verified).
  pin?: string
  message: string
}

// The network, as much of it as the fetch uses. The default is the global `fetch`.
export type Fetcher = (
  url: string,
  init: { headers: Record<string, string> },
) => Promise<{ ok: boolean; status: number; arrayBuffer(): Promise<ArrayBuffer> }>

export interface FetchOptions {
  // The folder of source records (education/sources).
  sources: string
  // The root of the store.
  store: string
  // Fetch only these slugs; every other source is reported as skipped.
  only?: readonly string[]
  // Slug to a local file used as the response, or for a `git-commit` source
  // to a clone that is copied into the store.
  ingest?: Readonly<Record<string, string>>
  request?: Fetcher
  // The text of a PDF, in place of the system's pdftotext.
  pdfText?: (bytes: Uint8Array) => string
  // The wait between two requests to the same host. Default 5 seconds.
  delayMs?: number
  sleep?: (ms: number) => Promise<void>
  // Called with each outcome as it happens.
  report?: (outcome: Outcome) => void
}

export const DEFAULT_DELAY_MS = 5000

const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15'

// --- content checks ----------------------------------------------------------

// Why these bytes are not a file of this media type, or null when they pass.
export function invalidContent(mediaType: string, bytes: Uint8Array): string | null {
  const head = decodeText(bytes.subarray(0, 2048))
  if (!/html/i.test(mediaType) && /^\s*(?:<!doctype html|<html[\s>])/i.test(head)) {
    const title = /<title[^>]*>([^<]*)<\/title>/i.exec(head)?.[1]?.trim()
    return `an HTML page${title ? ` ("${title}")` : ''} was served where ${mediaType} was expected`
  }
  if (mediaType === 'application/pdf' && !head.startsWith('%PDF')) return 'the file is not a PDF: it does not start with %PDF'
  return null
}

// --- the regulation text of a Dutch legal page -------------------------------

const NOT_TEXT = /<script\b[\s\S]*?<\/script\s*>|<style\b[\s\S]*?<\/style\s*>|<!--[\s\S]*?-->/gi
// The list of actions (link, print, compare) under the heading of every article.
const ACTIONS = /<ul\b[^>]*aria-label="Lijst met mogelijke acties[^>]*>[\s\S]*?<\/ul\s*>/g
// The label of a part of the page that folds open and shut.
const FOLD_LABEL = /<div class="collapsible__header">[\s\S]*?<\/div\s*>/g
// The site's own note on an article that an amendment is pending. It changes
// when an amendment is announced, not when this version of the text does.
const PENDING_AMENDMENT = /<p>\[(?:(?!<\/p>)[\s\S])*?wijzigingenoverzicht<\/a>\.\]<\/p>/g
// The publication data the XML rendition carries beside each element's text.
const PUBLICATION_DATA = /<meta-data\b[\s\S]*?<\/meta-data\s*>/g
// "Read on <day>": the line that differs from one day's response to the next.
const READ_ON = /Geraadpleegd op \d{2}-\d{2}-\d{4}\.?/g

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' }

function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#[0-9]+|[a-z]+);/gi, (whole, name: string) => {
    if (name.startsWith('#x') || name.startsWith('#X')) return String.fromCodePoint(Number.parseInt(name.slice(2), 16))
    if (name.startsWith('#')) return String.fromCodePoint(Number.parseInt(name.slice(1), 10))
    return ENTITIES[name.toLowerCase()] ?? whole
  })
}

// The regulation in a page of wetten.overheid.nl: the one element of class
// `wetgeving`, through its closing tag, without the site's own controls.
function htmlRegulation(page: string): string | null {
  const open = /<div\b[^>]*\bclass="wetgeving"[^>]*>/.exec(page)
  if (!open) return null
  const tags = /<div\b|<\/div\s*>/g
  tags.lastIndex = open.index
  let depth = 0
  for (let tag = tags.exec(page); tag; tag = tags.exec(page)) {
    depth += tag[0].startsWith('</') ? -1 : 1
    if (depth === 0) return page.slice(open.index, tag.index).replace(ACTIONS, ' ').replace(FOLD_LABEL, ' ').replace(PENDING_AMENDMENT, ' ')
  }
  return null
}

// The regulation in the XML rendition of the same site: the `wetgeving`
// element, without its publication data.
function xmlRegulation(page: string): string | null {
  const body = /<wetgeving[\s>][\s\S]*<\/wetgeving\s*>/.exec(page)
  return body ? body[0].replace(PUBLICATION_DATA, ' ') : null
}

// The text of the regulation in a Dutch legal page, normalised, or null when
// the page holds none. It leaves out everything that is the site and not the
// regulation: navigation, pop-ups, the actions on each article, the notes that
// an amendment is pending, and the line stating the day the page was read. Adjust it here if the site changes shape;
// every `extracted-text` pin then has to be cleared and fetched again.
export function extractRegulationText(page: string): string | null {
  const clean = page.replace(NOT_TEXT, ' ')
  const regulation = htmlRegulation(clean) ?? xmlRegulation(clean)
  if (regulation === null) return null
  const text = normalise(decodeEntities(regulation.replace(/<[^>]*>/g, ' ')).replace(READ_ON, ' '))
  return text === '' ? null : text
}

// --- the text of a PDF -------------------------------------------------------

// The text of a PDF as the system's pdftotext prints it without a flag. It is
// found on PATH and reads the PDF from standard input.
function pdftotext(bytes: Uint8Array): string {
  return execFileSync('pdftotext', ['-', '-'], { input: bytes, maxBuffer: 1 << 30, stdio: ['pipe', 'pipe', 'pipe'] }).toString('utf8')
}

// --- sources -----------------------------------------------------------------

interface Source {
  slug: string
  file: string
  url: string
  mediaType: string
  pinKind: PinKind
  pin: string
}

function readSources(dir: string): Source[] {
  if (!existsSync(dir)) throw new Error(`no source records: ${dir} does not exist`)
  return readdirSync(dir)
    .filter((name) => name.endsWith('.md'))
    .sort()
    .map((name) => {
      const file = join(dir, name)
      const { url, media_type: mediaType, pin_kind: pinKind, pin } = parseRecord(readFileSync(file, 'utf8'), file).frontmatter
      if (typeof url !== 'string' || typeof mediaType !== 'string' || typeof pin !== 'string' || !PIN_KINDS.includes(pinKind as PinKind)) {
        throw new Error(`${file} is not a source record the fetch can read: run \`npm run education:validate\``)
      }
      return { slug: name.slice(0, -'.md'.length), file, url, mediaType, pinKind: pinKind as PinKind, pin }
    })
}

// Writes the pin into the source record. Every other byte stays as it was.
function writePin(source: Source, pin: string): void {
  const text = readFileSync(source.file, 'utf8')
  writeFileSync(source.file, replaceFrontmatter(text, { ...parseRecord(text, source.file).frontmatter, pin }))
}

function reason(error: unknown): string {
  return error instanceof Error ? error.message.trim() : String(error)
}

function git(...args: string[]): string {
  return execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim()
}

function mismatch(source: Source, now: string): string {
  return `pinned ${source.pin}, now ${now}. Nothing was written. To accept the new content, clear pin in ${source.slug}.md and fetch again.`
}

// --- the fetch ---------------------------------------------------------------

export async function fetchSources(options: FetchOptions): Promise<Outcome[]> {
  const { store, only, ingest = {}, request = (url, init) => fetch(url, init), pdfText = pdftotext, delayMs = DEFAULT_DELAY_MS, report } = options
  const sleep = options.sleep ?? ((ms: number) => new Promise<void>((done) => setTimeout(done, ms)))
  const sources = readSources(options.sources)

  // A mistyped slug or path must not turn into a request to the publisher.
  const unknown = [...(only ?? []), ...Object.keys(ingest)].filter((slug) => !sources.some((source) => source.slug === slug))
  if (unknown.length > 0) throw new Error(`no source record for: ${unknown.join(', ')}`)
  const missing = Object.values(ingest).filter((path) => !existsSync(path))
  if (missing.length > 0) throw new Error(`nothing to ingest at: ${missing.join(', ')}`)

  const asked = new Set<string>()
  // Called before each request: waits when this host was asked before.
  const politely = async (url: string): Promise<void> => {
    if (!URL.canParse(url)) return
    const host = new URL(url).host
    if (asked.has(host)) await sleep(delayMs)
    asked.add(host)
  }

  const file = async (source: Source, local: string | undefined): Promise<Outcome> => {
    const { slug } = source
    let bytes: Buffer
    if (local !== undefined) bytes = readFileSync(local)
    else {
      await politely(source.url)
      try {
        const response = await request(source.url, { headers: { 'user-agent': USER_AGENT } })
        if (!response.ok) return { slug, status: 'invalid', message: `HTTP ${response.status} from ${source.url}` }
        bytes = Buffer.from(await response.arrayBuffer())
      } catch (error) {
        return { slug, status: 'invalid', message: `no response from ${source.url}: ${reason(error)}` }
      }
    }
    const problem = invalidContent(source.mediaType, bytes)
    if (problem) return { slug, status: 'invalid', message: problem }

    let text: string | null = null
    if (source.pinKind === 'extracted-text' && source.mediaType === 'application/pdf') {
      // The hash of no text would verify any PDF without a text layer.
      text = normalise(pdfText(bytes))
      if (text === '') return { slug, status: 'invalid', message: 'no text was found in the PDF' }
    } else if (source.pinKind === 'extracted-text') {
      text = extractRegulationText(decodeText(bytes))
      if (text === null) return { slug, status: 'invalid', message: 'no regulation text was found in the page' }
    }
    const pin = text === null ? sha256(bytes) : wordingHash(text)
    if (source.pin !== '' && source.pin !== pin) return { slug, status: 'changed', message: mismatch(source, pin) }

    // The store first, then the pin, so a pin always has its file. A store on
    // another machine starts empty while the pins are already in the records:
    // content that matches its pin is stored there too.
    if (!(text === null ? hasBlob(store, pin) : hasText(store, pin))) {
      const blob = putBlob(store, bytes)
      if (text !== null) putText(store, text, blob)
    }
    if (source.pin !== '') return { slug, status: 'verified', pin, message: pin }
    writePin(source, pin)
    return { slug, status: 'stored', pin, message: pin }
  }

  const clone = async (source: Source, local: string | undefined): Promise<Outcome> => {
    const { slug } = source
    const dir = clonePath(store, slug)
    let head: string
    try {
      if (local !== undefined && (source.pin === '' || !existsSync(dir))) {
        // A clone made by hand is copied in, so the one in incoming/ stays as it is.
        rmSync(dir, { recursive: true, force: true })
        cpSync(local, dir, { recursive: true })
      } else if (!existsSync(dir)) {
        await politely(source.url)
        git('clone', '--quiet', source.url, dir)
      } else if (source.pin === '') {
        // A cleared pin on a source that was cloned before: move to the publisher's newest commit.
        await politely(source.url)
        git('-C', dir, 'fetch', '--quiet', 'origin', 'HEAD')
        git('-C', dir, 'checkout', '--quiet', '--detach', 'FETCH_HEAD')
      }
      head = git('-C', dir, 'rev-parse', 'HEAD')
    } catch (error) {
      return { slug, status: 'invalid', message: `git could not get ${local ?? source.url}: ${reason(error)}` }
    }
    if (source.pin === '') {
      writePin(source, head)
      return { slug, status: 'stored', pin: head, message: head }
    }
    try {
      git('-C', dir, 'checkout', '--quiet', '--detach', source.pin)
    } catch {
      return { slug, status: 'changed', message: `the pinned commit ${source.pin} cannot be reached in ${dir}. Nothing was written.` }
    }
    return { slug, status: 'verified', pin: source.pin, message: source.pin }
  }

  const outcomes: Outcome[] = []
  for (const source of sources) {
    let outcome: Outcome
    if (only && !only.includes(source.slug)) outcome = { slug: source.slug, status: 'skipped', message: 'not named by --only' }
    else if (source.pinKind === 'git-commit') outcome = await clone(source, ingest[source.slug])
    else outcome = await file(source, ingest[source.slug])
    report?.(outcome)
    outcomes.push(outcome)
  }
  return outcomes
}

// True when a source changed or was invalid: the run has failed.
export function failed(outcomes: readonly Outcome[]): boolean {
  return outcomes.some((outcome) => outcome.status === 'changed' || outcome.status === 'invalid')
}

export function formatOutcome(outcome: Outcome): string {
  return `${outcome.status.padEnd(8)}  ${outcome.slug}  ${outcome.message}`
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isMain) {
  const usage = (): never => {
    console.error('usage: npm run education:fetch -- [--only <slug>]... [--ingest <slug>=<path>]...')
    process.exit(2)
  }
  const args = process.argv.slice(2)
  const only: string[] = []
  const ingest: Record<string, string> = {}
  for (let i = 0; i < args.length; i += 2) {
    const value = args[i + 1]
    if (value === undefined) usage()
    else if (args[i] === '--only') only.push(value)
    else if (args[i] === '--ingest' && value.indexOf('=') > 0) ingest[value.slice(0, value.indexOf('='))] = resolve(value.slice(value.indexOf('=') + 1))
    else usage()
  }
  try {
    const outcomes = await fetchSources({
      sources: resolve(import.meta.dirname, '..', 'sources'),
      store: storeRoot(),
      ...(only.length > 0 ? { only } : {}),
      ingest,
      report: (outcome) => console.log(formatOutcome(outcome)),
    })
    const count = (status: Status): number => outcomes.filter((outcome) => outcome.status === status).length
    const summary = STATUSES.map((status) => `${count(status)} ${status}`).join(', ')
    if (failed(outcomes)) {
      console.error(`\neducation fetch failed: ${summary}`)
      process.exit(1)
    }
    console.log(`\neducation fetch passed: ${summary}`)
  } catch (error) {
    console.error(`education fetch: ${reason(error)}`)
    process.exit(2)
  }
}
