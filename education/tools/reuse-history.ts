// The reuse rule over history (plan KTD5). On a public repo a push has
// already published, so both halves of the rule are run against EACH commit
// that is about to be pushed, not only against the tip: wording that one
// commit adds and a later one removes is still in the history.
//
//   npm run education:reuse-history                       origin/main..HEAD
//   npm run education:reuse-history -- <base>..<head>     the commits in that range
//
// For each commit in the range, the files under education/ that the commit
// adds or changes are read as they are in that commit and checked by:
//
//   official-wording-forbidden  the validator's rule: a description-only
//                               record holds an official wording section.
//   verbatim-forbidden          a record is marked verbatim in a jurisdiction
//                               whose sources may not be quoted (California).
//   the overlap rules           overlap.ts, all three, against the store.
//
// The wording the overlap rules compare against is that of every
// description-only record in the working tree and in the tree of every commit
// of the range, so a page is also checked against a record that was deleted
// or re-imported later.
//
// Git is only read (rev-list, ls-tree, diff-tree, cat-file): nothing is
// checked out and nothing is written.
//
// The core is exported so reuse-history.test.ts can run it on a repository it makes.

import { execFileSync } from 'node:child_process'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { FrontmatterError } from './frontmatter.ts'
import { checkFile, scope, storeLookup, wordingRuns } from './overlap.ts'
import type { Lookup } from './overlap.ts'
import { tryParseRecord } from './record.ts'
import { JURISDICTIONS, REUSE_POLICIES_BY_JURISDICTION } from './schema.ts'
import { requireStore } from './store.ts'
import { byFileThenLine, formatFinding, isRecordFile, readRecords, validateRecords } from './validate.ts'
import type { Finding, RecordText } from './validate.ts'

export const DEFAULT_RANGE = 'origin/main..HEAD'

export interface HistoryFinding extends Finding {
  // The full sha of the commit the file is in.
  commit: string
}

export interface HistoryOptions {
  // The working tree of the repository.
  repo: string
  // What `git rev-list` takes: `<base>..<head>`.
  range: string
  lookup: Lookup
  // The pack's folder in the repository. Default `education`.
  folder?: string
}

function git(repo: string, args: readonly string[], input?: string): Buffer {
  return execFileSync('git', ['-C', repo, ...args], { input, maxBuffer: 2 ** 31 - 1, stdio: ['pipe', 'pipe', 'pipe'] })
}

function entries(output: Buffer, separator: string): string[] {
  return output.toString('utf8').split(separator).filter((entry) => entry !== '')
}

// The contents of objects named as `git cat-file` takes them (a blob's sha, or
// `<commit>:<path>`), in the order asked, null for a name that is no object.
// One process reads them all.
function readObjects(repo: string, names: readonly string[]): (string | null)[] {
  if (names.length === 0) return []
  const output = git(repo, ['cat-file', '--batch'], `${names.join('\n')}\n`)
  const contents: (string | null)[] = []
  let at = 0
  for (let index = 0; index < names.length; index += 1) {
    const end = output.indexOf('\n', at)
    const size = /^[0-9a-f]+ \w+ (\d+)$/.exec(output.subarray(at, end).toString('utf8'))?.[1]
    at = end + 1
    if (size === undefined) {
      contents.push(null)
      continue
    }
    contents.push(output.subarray(at, at + Number(size)).toString('utf8'))
    at += Number(size) + 1
  }
  return contents
}

// A record marked verbatim in a jurisdiction that allows no verbatim record.
// The jurisdiction is the one its frontmatter names or the one its path is under.
function verbatimForbidden(file: RecordText): Finding[] {
  const record = tryParseRecord(file.text, file.file)
  if (record instanceof FrontmatterError || record.frontmatter.reuse_policy !== 'verbatim') return []
  const named = [record.frontmatter.jurisdiction, /^corpus\/([^/]+)\//.exec(file.file)?.[1]]
  const forbidden = JURISDICTIONS.find((jurisdiction) => named.includes(jurisdiction) && !REUSE_POLICIES_BY_JURISDICTION[jurisdiction].includes('verbatim'))
  if (!forbidden) return []
  return [{ file: file.file, line: record.lines.reuse_policy ?? 1, rule: 'verbatim-forbidden', message: `a ${forbidden} record must not be verbatim: no publisher there allows its wording to be copied` }]
}

// The commits of the range, oldest first, and every finding in them. Throws
// when git cannot read the range.
export function checkHistory(options: HistoryOptions): { commits: string[]; findings: HistoryFinding[] } {
  const { repo, range, lookup, folder = 'education' } = options
  const rows = entries(git(repo, ['rev-list', '--reverse', '--parents', range]), '\n').map((row) => row.split(' '))
  const commits = rows.map((row) => row[0]!)
  const inRange = new Set(commits)

  // The objective records the trees of the commits hold (by blob, since most
  // are the same file in every commit) and the files each commit adds or changes.
  const recordBlobs = new Map<string, string>()
  const listedBy = new Map<string, string[]>(commits.map((commit) => [commit, []]))
  // The whole tree is listed only for a commit none of whose parents is in
  // the range. The tree of any other commit is that of a parent in the range
  // with what the commit adds or changes, and the diff below gives those blobs.
  for (const [commit, ...parents] of rows) {
    if (parents.some((parent) => inRange.has(parent))) continue
    for (const entry of entries(git(repo, ['ls-tree', '-r', '-z', commit!, '--', `${folder}/corpus`]), '\0')) {
      const tab = entry.indexOf('\t')
      const [, type, blob] = entry.slice(0, tab).split(' ')
      const file = entry.slice(tab + 1 + folder.length + 1)
      if (type === 'blob' && scope(file) === 'record') recordBlobs.set(blob!, file)
    }
  }
  // One diff-tree for all commits. It prints the id of a commit before the
  // files that commit adds or changes against a parent, each as a line of
  // modes and blobs and then its path. -m and --root: a merge and a first
  // commit list their files too. Deleted files are left out.
  if (commits.length > 0) {
    const tokens = git(repo, ['diff-tree', '--stdin', '--raw', '--no-abbrev', '-r', '-m', '--root', '--diff-filter=d', '-z', '--', folder], `${commits.join('\n')}\n`).toString('utf8').split('\0')
    let listed: string[] | undefined
    for (let at = 0; at < tokens.length; at += 1) {
      const token = tokens[at]!
      if (token === '') continue
      if (!token.startsWith(':')) {
        listed = listedBy.get(token.split(' ')[0]!)
        if (!listed) throw new Error(`git diff-tree printed ${token}, which is no commit of the range`)
        continue
      }
      const [, mode, , blob] = token.split(' ')
      const name = tokens[++at]!
      listed!.push(name)
      const file = name.slice(folder.length + 1)
      if (mode !== '160000' && file.startsWith('corpus/') && scope(file) === 'record') recordBlobs.set(blob!, file)
    }
  }
  const changed = new Map<string, string[]>()
  for (const commit of commits) {
    const files = [...new Set(listedBy.get(commit)!)].map((name) => name.slice(folder.length + 1))
    changed.set(commit, files.filter((file) => isRecordFile(file) || scope(file) !== null).sort())
  }

  const blobs = [...recordBlobs.keys()]
  const inCommits = readObjects(repo, blobs).flatMap((text, index) => (text === null ? [] : [{ file: recordBlobs.get(blobs[index]!)!, text }]))
  const runs = wordingRuns(inCommits, lookup, wordingRuns(readRecords(join(repo, folder)), lookup))

  const names = commits.flatMap((commit) => changed.get(commit)!.map((file) => `${commit}:${folder}/${file}`))
  const texts = readObjects(repo, names)
  const findings: HistoryFinding[] = []
  let next = 0
  for (const commit of commits) {
    const files = changed.get(commit)!.flatMap((file) => {
      const text = texts[next]
      next += 1
      return text === null || text === undefined ? [] : [{ file, text }]
    })
    const records = files.filter((file) => isRecordFile(file.file))
    const found = [
      ...validateRecords(records).filter((finding) => finding.rule === 'official-wording-forbidden'),
      ...records.flatMap(verbatimForbidden),
      ...files.flatMap((file) => checkFile(file, runs, lookup)),
    ]
    found.sort(byFileThenLine)
    findings.push(...found.map((finding) => ({ commit, ...finding })))
  }
  return { commits, findings }
}

export function formatHistoryFinding(finding: HistoryFinding): string {
  return `${finding.commit.slice(0, 7)}  ${formatFinding(finding)}`
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isMain) {
  const args = process.argv.slice(2)
  if (args.length > 1 || args[0]?.startsWith('-')) {
    console.error('usage: npm run education:reuse-history -- [<base>..<head>]')
    process.exit(2)
  }
  const range = args[0] ?? DEFAULT_RANGE
  try {
    const store = requireStore()
    const { commits, findings } = checkHistory({ repo: resolve(import.meta.dirname, '..', '..'), range, lookup: storeLookup(store) })
    if (findings.length > 0) {
      for (const finding of findings) console.error(formatHistoryFinding(finding))
      const bad = new Set(findings.map((finding) => finding.commit)).size
      console.error(`\neducation reuse-history failed: ${findings.length} finding(s) in ${bad} of the ${commits.length} commit(s) of ${range}. Do not push: rewrite those commits first.`)
      process.exit(1)
    }
    console.log(`education reuse-history passed: ${commits.length} commit(s) of ${range}`)
  } catch (error) {
    console.error(`education reuse-history failed: ${error instanceof Error ? error.message.trim() : String(error)}`)
    process.exit(1)
  }
}
