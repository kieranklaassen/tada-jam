import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CA_FILE, CA_WORDING, caObjective, sampleTree } from './fixtures.ts'
import { wordingHash } from './normalise.ts'
import { draftObjective, replaceRegion, withMarker } from './record.ts'
import { checkHistory, formatHistoryFinding } from './reuse-history.ts'
import type { HistoryFinding } from './reuse-history.ts'
import { OFFICIAL_WORDING, SUMMARY } from './schema.ts'
import { getWording, putWording } from './store.ts'

// Every wording here is invented. No official wording belongs in a test. The
// repository is a temporary one: nothing here touches the one the tests run in.

const SUMMARISED = replaceRegion(draftObjective(caObjective), SUMMARY, withMarker(SUMMARY, 'Says how many apples there are, as far as ten.'))
// The same record with the official wording committed: what the rule forbids.
const WITH_WORDING = SUMMARISED.replace(SUMMARY, `${OFFICIAL_WORDING}\n\n${CA_WORDING}\n\nSource: Example Department.\n\n${SUMMARY}`)
// Eight consecutive words of the invented wording.
const COPIED_PAGE = '# Notes\n\nFor instance the apples in a basket up to ten pieces.\n'

let repo: string
let store: string

beforeEach(() => {
  // The repository a git command works on is the one it is pointed at, also
  // when the tests run from a git hook, and no setting of the machine applies.
  for (const name of Object.keys(process.env)) if (name.startsWith('GIT_')) vi.stubEnv(name, undefined)
  vi.stubEnv('GIT_CONFIG_GLOBAL', '/dev/null')
  vi.stubEnv('GIT_CONFIG_NOSYSTEM', '1')
  for (const who of ['AUTHOR', 'COMMITTER']) {
    vi.stubEnv(`GIT_${who}_NAME`, 'A Test')
    vi.stubEnv(`GIT_${who}_EMAIL`, 'test@example.org')
  }
  repo = mkdtempSync(join(tmpdir(), 'education-history-'))
  store = mkdtempSync(join(tmpdir(), 'education-history-store-'))
  git('init', '--quiet', '--initial-branch', 'main')
  putWording(store, CA_WORDING)
})

afterEach(() => {
  vi.unstubAllEnvs()
  rmSync(repo, { recursive: true, force: true })
  rmSync(store, { recursive: true, force: true })
})

function git(...args: string[]): string {
  return execFileSync('git', ['-C', repo, ...args], { encoding: 'utf8' }).trim()
}

// Files under education/ of the temporary repository; null removes one.
function write(tree: Record<string, string | null>): void {
  for (const [file, text] of Object.entries(tree)) {
    const path = join(repo, 'education', file)
    if (text === null) rmSync(path)
    else {
      mkdirSync(dirname(path), { recursive: true })
      writeFileSync(path, text)
    }
  }
}

function commit(tree: Record<string, string | null>): string {
  write(tree)
  git('add', '--all')
  git('commit', '--quiet', '--message', 'a change')
  return git('rev-parse', 'HEAD')
}

function check(base: string): { commits: string[]; findings: HistoryFinding[] } {
  return checkHistory({ repo, range: `${base}..HEAD`, lookup: (hash) => getWording(store, hash) })
}

function rules(findings: readonly HistoryFinding[]): string[] {
  return findings.map((finding) => `${finding.commit} ${finding.file} ${finding.rule}`)
}

// The sample tree without its California objective.
function baseTree(): Record<string, string> {
  const { [CA_FILE]: _objective, ...rest } = sampleTree()
  return { ...rest, 'README.md': 'What the pack is.\n' }
}

// Each test makes a repository and a few commits, which takes seconds on a busy machine.
describe('the reuse line over history', { timeout: 30_000 }, () => {
  it('reports the commit that adds a description-only record with an official wording section, though a later commit removes it', () => {
    const base = commit(baseTree())
    const added = commit({ [CA_FILE]: WITH_WORDING })
    const removed = commit({ [CA_FILE]: SUMMARISED })

    const { commits, findings } = check(base)

    expect(commits).toEqual([added, removed])
    expect(rules(findings)).toContain(`${added} ${CA_FILE} official-wording-forbidden`)
    expect(new Set(findings.map((finding) => finding.commit))).toEqual(new Set([added]))
    const forbidden = findings.find((finding) => finding.rule === 'official-wording-forbidden')!
    expect(formatHistoryFinding(forbidden)).toContain(`${added.slice(0, 7)}  education/${CA_FILE}:`)
  })

  it('passes a clean range', () => {
    const base = commit(baseTree())
    commit({ [CA_FILE]: SUMMARISED })
    commit({ 'README.md': 'What the pack is, in more words.\n', 'docs/notes.md': 'Children count things they can touch.\n' })

    const { commits, findings } = check(base)

    expect(commits).toHaveLength(2)
    expect(findings).toEqual([])
  })

  it('does not look at commits before the range', () => {
    commit(baseTree())
    const base = commit({ [CA_FILE]: WITH_WORDING })
    commit({ [CA_FILE]: SUMMARISED })

    expect(check(base).findings).toEqual([])
  })

  it('reports a California record marked verbatim', () => {
    const base = commit(baseTree())
    const verbatim = draftObjective({ ...caObjective, reuse_policy: 'verbatim' }, { wording: CA_WORDING, source: 'Example Department.' })
    const added = commit({ [CA_FILE]: verbatim })

    expect(rules(check(base).findings)).toEqual([`${added} ${CA_FILE} verbatim-forbidden`])
  })

  it('checks a page against the records of its own commit, also when the record is gone from the working tree', () => {
    const base = commit({ ...baseTree(), [CA_FILE]: SUMMARISED })
    const copied = commit({ 'docs/notes.md': COPIED_PAGE })
    commit({ 'docs/notes.md': null, [CA_FILE]: null })

    expect(rules(check(base).findings)).toEqual([`${copied} docs/notes.md eight-word-run`])
  })

  it('checks a page against the records of the working tree, also when no commit holds the record yet', () => {
    const base = commit(baseTree())
    const copied = commit({ 'docs/notes.md': COPIED_PAGE })
    write({ [CA_FILE]: SUMMARISED })

    expect(rules(check(base).findings)).toEqual([`${copied} docs/notes.md eight-word-run`])
  })

  it('checks the manifest, the tools, a source record and a top-level .ts file of a commit, though a later commit removes the text', () => {
    const base = commit({ ...baseTree(), [CA_FILE]: SUMMARISED })
    const code = "export const NOTE = 'For instance the apples in a basket up to ten pieces.'\n"
    const copied = commit({ 'manifest/us-ca-additions.ts': code, 'tools/fixtures.ts': code, 'ages.ts': code, 'sources/another-file.md': COPIED_PAGE, 'tsconfig.json': JSON.stringify({ note: COPIED_PAGE }) })
    commit({ 'manifest/us-ca-additions.ts': null, 'tools/fixtures.ts': null, 'ages.ts': null, 'sources/another-file.md': null })

    expect(rules(check(base).findings)).toEqual(['ages.ts', 'manifest/us-ca-additions.ts', 'sources/another-file.md', 'tools/fixtures.ts'].map((file) => `${copied} ${file} eight-word-run`))
  })

  it('reports a record whose wording is not in the store', () => {
    const base = commit(baseTree())
    const other = SUMMARISED.replace(wordingHash(CA_WORDING), wordingHash('A wording nobody stored.'))
    const added = commit({ [CA_FILE]: other })

    expect(rules(check(base).findings)).toEqual([`${added} ${CA_FILE} wording-missing`])
  })

  it('fails on a range git cannot read', () => {
    commit(baseTree())

    expect(() => checkHistory({ repo, range: 'no-such-branch..HEAD', lookup: () => null })).toThrow()
  })
})
