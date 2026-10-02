// The overlap check: the half of the reuse rule that needs the wording store
// (plan KTD5). It proves that no official wording of a description-only
// record is in the working tree.
//
//   npm run education:overlap
//
// The repo is public and California's publishers do not grant reproduction,
// so the official wording of a description-only record lives only in the
// store. This check takes that wording from the store, by each record's
// `wording_sha256`, and with it the official text that accompanies the
// statement (a footnote, a clarification, a boundary), by the record's
// `supplement_sha256`. It reads every committed text that could carry either:
//
//   - each description-only record itself;
//   - under corpus/us-ca/, every other file (the frames);
//   - every file under locators/us-ca/ and reviews/us-ca/ (in a JSON file,
//     each string value);
//   - the markdown and the .ts files at the top of education/ (the guide,
//     the rules, the maps, manifest.ts, ages.ts);
//   - every file under docs/, research/, manifest/, tools/ and sources/
//     (the source records of both jurisdictions: their file names do not
//     have to say which one a record belongs to).
//
// It does not read the Dutch frames, locators and reviews, and it skips a
// Dutch record (Dutch wording may be committed), nor does it read anything
// outside education/.
// A file that is not a record gets the first rule only, so a statement of
// fewer than eight words standing whole in one of them is not found here.
//
// Three rules. Text is normalised (normalise.ts), then compared word by word
// without case or punctuation, and without the endings of English words
// (stem() below), so `adds the counted objects` is `add the count object`:
//
//   eight-word-run   a run of eight or more consecutive words shared with the
//                    wording, or the accompanying text, of ANY description-only
//                    record. Every file above.
//   whole-statement  the body of a record holds its OWN wording whole. This
//                    is what catches a statement shorter than eight words.
//   four-fifths      a sentence in the body of a record shares more than four
//                    fifths of its OWN statement's words, in order.
//
// The last two compare against the statement only, never the accompanying
// text, and against each part of the statement as well as the whole of it
// (parts() below): a labelled paragraph, a lettered line.
//
// A verbatim record is skipped: its wording may be committed. A record whose
// wording or accompanying text is not in the store is a finding, since it
// cannot be checked. A finding prints at most the first three words of what
// matched, because this output ends up in logs and pull requests.
//
// The core is exported for overlap.test.ts and for reuse-history.ts, which
// runs the same rules over each commit of a range.

import { readFileSync, readdirSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { FrontmatterError } from './frontmatter.ts'
import { normalise } from './normalise.ts'
import { tryParseRecord } from './record.ts'
import type { RecordFile } from './record.ts'
import { getWording, requireStore } from './store.ts'
import { byFileThenLine, filesUnder, formatFinding, readRecords } from './validate.ts'
import type { Finding, RecordText } from './validate.ts'

// The official wording stored under a hash, or null when the store has none.
export type Lookup = (hash: string) => string | null

// The length of the shared run that fails.
export const RUN = 8

// How much of a match a finding prints.
const SHOWN = 3

// --- words ---------------------------------------------------------------------

// A word is a run of letters and digits. An apostrophe inside it is dropped
// (child's is one word); a hyphen, like all other punctuation, ends it, so
// `two-digit` and `two digit` compare equal.
export const WORD = /[\p{L}\p{N}]+(?:'[\p{L}\p{N}]+)*/gu

function plain(word: string): string {
  return word.toLowerCase().replaceAll("'", '')
}

// The words of a text as they are compared.
export function words(text: string): string[] {
  return (normalise(text).match(WORD) ?? []).map(plain)
}

// --- stems ---------------------------------------------------------------------

const ASCII = /^[a-z]+$/
const VOWEL = /[aeiouy]/
const DOUBLED = /([^aeiou])\1$/

// What is left of a word when an ending is cut is a word of its own: three
// letters or more, with a vowel (so `need`, `thing` and `string` stay whole).
function cuts(rest: string): boolean {
  return rest.length >= 3 && VOWEL.test(rest)
}

// A word without its ending, for comparison only: it is never printed and is
// not always a word. It folds the plural and third-person -s, -es and -ies,
// the past -ed and -ied, and -ing, and nothing else. So that `compare` meets
// `comparing` and `stop` meets `stopped`, every word, cut or not, then loses
// a last `e` and one of a doubled last consonant. A word of three letters or
// fewer is left as it is, no cut leaves fewer than three, and a word with
// anything but the letters a to z in it (a digit, an accent) is left as it is.
export function stem(word: string): string {
  if (word.length <= 3 || !ASCII.test(word)) return word
  let rest = word
  if (/ie[sd]$/.test(word) && word.length > 4) rest = `${word.slice(0, -3)}y`
  else if (word.endsWith('ing') && cuts(word.slice(0, -3))) rest = word.slice(0, -3)
  else if (word.endsWith('ed') && !word.endsWith('eed') && cuts(word.slice(0, -2))) rest = word.slice(0, -2)
  else if (word.endsWith('s') && !/(?:ss|us|is)$/.test(word)) rest = word.slice(0, -1)
  if (rest.length > 3 && rest.endsWith('e')) rest = rest.slice(0, -1)
  if (rest.length > 3 && DOUBLED.test(rest)) rest = rest.slice(0, -1)
  return rest
}

// The words of a text as the rules compare them.
export function stems(text: string): string[] {
  return words(text).map(stem)
}

interface Word {
  // The word as written, for a message.
  word: string
  // The word as it is compared.
  stem: string
  // The 1-based line it is on.
  line: number
  // True on the last word of a sentence.
  ends: boolean
}

// Sentence punctuation, then any closing quote, bracket or emphasis mark, then a space.
const STOP = /[.!?]["')\]*_]*\s/
// A blank line, a heading, a list item or a table row: the sentence before it has ended.
const BLOCK = /^(?:$|#|[-*+] |\d+[.)] |\|)/

// The words of a text with their lines and where its sentences end. A sentence
// ends at a full stop, question mark or exclamation mark followed by a space
// and a word that does not start with a small letter (so `e.g. a cup` is not
// two sentences), and at the end of a paragraph, heading or list item. It may
// run over several lines of a paragraph.
function locate(text: string, firstLine = 1): Word[] {
  const found: Word[] = []
  // The text since the last word.
  let gap = ''
  text.split('\n').forEach((raw, index) => {
    const row = normalise(raw)
    if (BLOCK.test(row) && found.length > 0) found.at(-1)!.ends = true
    let at = 0
    for (const match of row.matchAll(WORD)) {
      gap += row.slice(at, match.index)
      if (found.length > 0 && STOP.test(gap) && !/^\p{Ll}/u.test(match[0])) found.at(-1)!.ends = true
      const word = plain(match[0])
      found.push({ word, stem: stem(word), line: firstLine + index, ends: false })
      gap = ''
      at = match.index + match[0].length
    }
    gap += `${row.slice(at)}\n`
  })
  if (found.length > 0) found.at(-1)!.ends = true
  return found
}

function shown(found: readonly Word[], start: number, length: number): string {
  const head = found.slice(start, start + Math.min(length, SHOWN)).map((item) => item.word)
  return `"${head.join(' ')}${length > SHOWN ? ' ...' : ''}"`
}

// --- the index of official wording -----------------------------------------------

// Adds every run of RUN words of one official wording to the index.
export function addRuns(runs: Set<string>, wording: string): void {
  const statement = stems(wording)
  for (let start = 0; start + RUN <= statement.length; start += 1) runs.add(statement.slice(start, start + RUN).join(' '))
}

// A label names one paragraph among several: what a paragraph opens with, up to a colon and a space.
const LABEL = /^[^:\n]{1,40}: /
// The letter or number a line of a list opens with: `a. `, `2) `.
const MARKER = /^\(?[\p{L}\p{N}]{1,2}[.)]\s+/u

// What rules 2 and 3 compare a record's text with: the whole wording, then
// its parts. A wording of several paragraphs (set apart by a blank line) has
// each paragraph as a part, without its label; a paragraph of several lines
// has each line as a part, without its letter. Each is a list of stems, the
// whole first, none twice. One of one or two words is left out: words that
// common turn up in honest text, and every summary would fail.
export function parts(wording: string): string[][] {
  const paragraphs = wording.split(/\n\s*\n/).map((paragraph) => paragraph.trim())
  const texts = [wording]
  for (const paragraph of paragraphs) {
    const text = paragraphs.length > 1 ? paragraph.replace(LABEL, '') : paragraph
    const lines = text.split('\n')
    texts.push(text)
    if (lines.length > 1) texts.push(...lines.map((line) => line.trim().replace(MARKER, '')))
  }
  const seen = new Set<string>()
  return texts.map(stems).filter((part) => {
    const key = part.join(' ')
    if (part.length <= 2 || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

const OBJECTIVE = /^corpus\/[^/]+\/[^/]+\/[^/]+\/objectives\/[^/]+\.md$/

// The folders read whole, whatever the jurisdiction: the pack's own pages,
// the manifest (hand-written text about each statement), the tools with
// their test fixtures, and the source records.
const WHOLE_FOLDERS = ['docs', 'research', 'manifest', 'tools', 'sources'] as const
// What is read of the folders that are split by jurisdiction: California's part.
const CALIFORNIA = ['corpus/us-ca/', 'locators/us-ca/', 'reviews/us-ca/'] as const

// What the check does with a file, by its path relative to education/:
// `record` for an objective record, `text` for any other file that could
// carry description-only wording, null for a file it does not read.
export function scope(file: string): 'record' | 'text' | null {
  if (OBJECTIVE.test(file)) return 'record'
  if (CALIFORNIA.some((start) => file.startsWith(start))) return 'text'
  if (WHOLE_FOLDERS.some((top) => file.startsWith(`${top}/`))) return 'text'
  return !file.includes('/') && (file.endsWith('.md') || file.endsWith('.ts')) ? 'text' : null
}

// An objective record that is not verbatim, or null for any other file and
// for a record that cannot be read.
function descriptionOnly(file: RecordText): RecordFile | null {
  if (scope(file.file) !== 'record') return null
  const record = tryParseRecord(file.text, file.file)
  return record instanceof FrontmatterError || record.frontmatter.reuse_policy === 'verbatim' ? null : record
}

// The `wording_sha256` of an objective record that is not verbatim, or null
// for any other file and for a record that cannot be read.
export function descriptionOnlyHash(file: RecordText): string | null {
  const hash = descriptionOnly(file)?.frontmatter.wording_sha256
  return typeof hash === 'string' ? hash : null
}

// The hashes under which the store holds the official text of a
// description-only record: its wording, and its accompanying text when it has
// any. None for any other file and for a record that cannot be read.
function storedHashes(file: RecordText): string[] {
  const record = descriptionOnly(file)
  if (!record) return []
  const { wording_sha256: wording, supplement_sha256: supplement } = record.frontmatter
  return [wording, supplement].filter((hash) => typeof hash === 'string')
}

// The wording of the store at `store` by its hash, each hash read once.
export function storeLookup(store: string): Lookup {
  const held = new Map<string, string | null>()
  return (hash) => {
    let text = held.get(hash)
    if (text === undefined) {
      text = getWording(store, hash)
      held.set(hash, text)
    }
    return text
  }
}

// The index the eight-word rule reads: every run of RUN words in the wording
// and in the accompanying text of every description-only record among the
// files. Text the store lacks adds nothing here; checkFile reports it.
export function wordingRuns(files: readonly RecordText[], lookup: Lookup, runs = new Set<string>()): Set<string> {
  const added = new Set<string>()
  for (const file of files) {
    for (const hash of storedHashes(file)) {
      if (added.has(hash)) continue
      added.add(hash)
      const text = lookup(hash)
      if (text !== null) addRuns(runs, text)
    }
  }
  return runs
}

// --- the rules -----------------------------------------------------------------

type Add = (rule: string, line: number, message: string) => void

// Rule 1. One finding per shared run, however long it is.
function checkRuns(found: readonly Word[], runs: ReadonlySet<string>, add: Add): void {
  let start = -1
  const close = (end: number): void => {
    if (start === -1) return
    const length = end - start + RUN - 1
    add('eight-word-run', found[start]!.line, `a run of ${length} consecutive words is shared with official wording that may not be committed, from ${shown(found, start, length)}`)
    start = -1
  }
  for (let at = 0; at + RUN <= found.length; at += 1) {
    const hit = runs.has(
      found
        .slice(at, at + RUN)
        .map((item) => item.stem)
        .join(' '),
    )
    if (hit && start === -1) start = at
    if (!hit) close(at)
  }
  close(Math.max(found.length - RUN + 1, 0))
}

// Rule 2. A statement or a part of RUN words or more copied whole is already
// a finding of rule 1, so this looks only for the shorter ones. `targets` is
// from parts(): the whole wording first. Words inside a match are not looked
// at again, so the whole wording and a part of it are one finding.
function checkWhole(body: readonly Word[], targets: readonly string[][], add: Add): void {
  const short = targets.filter((target) => target.length < RUN)
  for (let at = 0; at < body.length; at += 1) {
    const held = short.find((target) => target.every((word, offset) => body[at + offset]?.stem === word))
    if (held === undefined) continue
    const what = held === targets[0] ? 'its whole official wording' : 'one part of its official wording whole'
    add('whole-statement', body[at]!.line, `the record holds ${what} (${held.length} words), from ${shown(body, at, held.length)}`)
    at += held.length - 1
  }
}

// The length of the longest common subsequence of two lists of words.
function inOrder(a: readonly Word[], b: readonly string[]): number {
  let previous = new Array<number>(b.length + 1).fill(0)
  for (const { stem: word } of a) {
    const row = [0]
    b.forEach((other, index) => row.push(word === other ? previous[index]! + 1 : Math.max(previous[index + 1]!, row[index]!)))
    previous = row
  }
  return previous[b.length]!
}

// Rule 3. `targets` is from parts(): the whole wording first. A sentence is
// one finding, for the first of them it shares too much of.
function checkFourFifths(body: readonly Word[], targets: readonly string[][], add: Add): void {
  let sentence: Word[] = []
  const sets = targets.map((target) => new Set(target))
  for (const item of body) {
    sentence.push(item)
    if (!item.ends) continue
    for (const [index, target] of targets.entries()) {
      let most = 0
      for (const each of sentence) if (sets[index]!.has(each.stem)) most += 1
      if (most * 5 <= target.length * 4) continue
      const shared = inOrder(sentence, target)
      if (shared * 5 <= target.length * 4) continue
      const of = target === targets[0] ? "the record's official wording" : "one part of the record's official wording"
      add('four-fifths', sentence[0]!.line, `a sentence shares ${shared} of the ${target.length} words of ${of}, in order: the sentence that starts ${shown(sentence, 0, sentence.length)}`)
      break
    }
    sentence = []
  }
}

// The texts of a file that is not a record. A JSON file is each of its string
// values, on the line the value is written on; any other file is its text.
function texts(file: RecordText): { text: string; line: number | null }[] {
  if (!file.file.endsWith('.json')) return [{ text: file.text, line: null }]
  let data: unknown
  try {
    data = JSON.parse(file.text)
  } catch {
    return [{ text: file.text, line: null }]
  }
  const found: { text: string; line: number }[] = []
  const breaks: number[] = []
  for (let at = file.text.indexOf('\n'); at !== -1; at = file.text.indexOf('\n', at + 1)) breaks.push(at)
  const lines = new Map<string, number>()
  const lineOf = (value: string): number => {
    let line = lines.get(value)
    if (line === undefined) {
      const at = file.text.indexOf(JSON.stringify(value))
      let low = 0
      let high = at === -1 ? 0 : breaks.length
      while (low < high) {
        const middle = (low + high) >> 1
        if (breaks[middle]! < at) low = middle + 1
        else high = middle
      }
      line = low + 1
      lines.set(value, line)
    }
    return line
  }
  const visit = (value: unknown): void => {
    if (typeof value === 'string') {
      found.push({ text: value, line: lineOf(value) })
    } else if (Array.isArray(value)) value.forEach(visit)
    else if (value !== null && typeof value === 'object') Object.values(value).forEach(visit)
  }
  visit(data)
  return found
}

// Every finding for one file. `runs` is the index from wordingRuns(). A file
// outside the check's scope, and a verbatim record, have none.
export function checkFile(file: RecordText, runs: ReadonlySet<string>, lookup: Lookup): Finding[] {
  const findings: Finding[] = []
  const add: Add = (rule, line, message) => findings.push({ file: file.file, line, rule, message })
  const kind = scope(file.file)

  if (kind === 'text') {
    for (const { text, line } of texts(file)) {
      const found = locate(text)
      checkRuns(line === null ? found : found.map((item) => ({ ...item, line })), runs, add)
    }
  }
  if (kind !== 'record') return findings

  const record = tryParseRecord(file.text, file.file)
  if (record instanceof FrontmatterError) {
    add('frontmatter', record.line, `${record.reason}: the record cannot be read, so its reuse policy is unknown and it is checked as text`)
    checkRuns(locate(file.text), runs, add)
    return findings
  }
  if (record.frontmatter.reuse_policy === 'verbatim') return findings

  // The whole file, frontmatter included: a title or a locator can carry wording too.
  const found = locate(file.text)
  checkRuns(found, runs, add)

  const { wording_sha256: hash, supplement_sha256: supplement } = record.frontmatter
  const wording = typeof hash === 'string' ? lookup(hash) : null
  if (wording === null) {
    add('wording-missing', record.lines.wording_sha256 ?? 1, 'the official wording of this record is not in the store, so its text cannot be checked against it: run the import that wrote the record')
  }
  if (typeof supplement === 'string' && lookup(supplement) === null) {
    add('wording-missing', record.lines.supplement_sha256!, 'the official text that accompanies the statement of this record is not in the store, so no text can be checked against it: run the import that wrote the record')
  }
  // The two rules about a record's own statement. A statement, or a part of
  // one, of one or two words is exempt from them (parts() leaves it out).
  const targets = wording === null ? [] : parts(wording)
  if (targets.length > 0) {
    const body = found.filter((item) => item.line >= record.prefaceLine)
    checkWhole(body, targets, add)
    checkFourFifths(body, targets, add)
  }
  return findings.sort((a, b) => a.line - b.line)
}

// Every finding for a set of files: the description-only records among them
// give the wording, and each file in scope is checked against it.
export function checkOverlap(files: readonly RecordText[], lookup: Lookup): Finding[] {
  const runs = wordingRuns(files, lookup)
  return files.flatMap((file) => checkFile(file, runs, lookup)).sort(byFileThenLine)
}

// --- the tree on disk ------------------------------------------------------------

// Every file of an education folder the check reads, sorted by path: the
// records, and the other files in scope (frames, source records, locators,
// reviews, pages, the manifest, the tools). A folder that does not exist yet
// holds none.
export function readCommitted(education: string): RecordText[] {
  // The markdown under corpus/ and sources/: the records, the frames and the source records.
  const records = readRecords(education).filter((record) => scope(record.file) !== null)
  const read = new Set(records.map((record) => record.file))
  const files = [...WHOLE_FOLDERS, 'locators', 'reviews'].flatMap((top) => filesUnder(education, top))
  for (const entry of readdirSync(education, { withFileTypes: true })) if (entry.isFile()) files.push(entry.name)
  const others = files.filter((file) => scope(file) === 'text' && !read.has(file)).map((file) => ({ file, text: readFileSync(join(education, file), 'utf8') }))
  return [...records, ...others].sort((a, b) => (a.file < b.file ? -1 : a.file > b.file ? 1 : 0))
}

// The findings of an education folder against the store at `store`.
export function overlapTree(education: string, store: string): Finding[] {
  return checkOverlap(readCommitted(education), storeLookup(store))
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isMain) {
  const education = resolve(import.meta.dirname, '..')
  let store: string
  try {
    store = requireStore()
  } catch (error) {
    console.error(`education overlap failed: ${error instanceof Error ? error.message : String(error)}`)
    process.exit(1)
  }
  const lookup: Lookup = storeLookup(store)
  const files = readCommitted(education)
  const records = files.filter((file) => descriptionOnlyHash(file) !== null).length
  const others = files.filter((file) => scope(file.file) === 'text').length
  const findings = checkOverlap(files, lookup)
  if (findings.length > 0) {
    for (const finding of findings) console.error(formatFinding(finding))
    console.error(`\neducation overlap failed: ${findings.length} finding(s) in ${records} description-only record(s) and ${others} other file(s)`)
    process.exit(1)
  }
  console.log(`education overlap passed: ${records} description-only record(s) and ${others} other file(s) hold no official wording`)
}
