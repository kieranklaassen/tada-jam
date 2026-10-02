import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { extractRegulationText, failed, fetchSources, formatOutcome, invalidContent } from './fetch.ts'
import type { FetchOptions, Fetcher, Outcome } from './fetch.ts'
import { caSource } from './fixtures.ts'
import { wordingHash } from './normalise.ts'
import { composeRecord } from './record.ts'
import { sourceId } from './schema.ts'
import type { SourceFrontmatter } from './schema.ts'
import { clonePath, getBlob, getText, rawBlobFor, sha256 } from './store.ts'

// Every file, page and repository here is invented. No official wording
// belongs in a test, and no test touches the network.

const NOTES = 'An invented file of counting statements.'
const CSV = 'code,statement\r\nK.1,"Count the apples in a basket"\r\n'
const OTHER_CSV = 'code,statement\r\nK.1,"Count the pears in a basket"\r\n'
const ROBOT_CHECK = '<!DOCTYPE html>\n<html lang="en">\n<head>\n    <title>Radware Captcha Page</title>\n</head>\n<body>Are you a person?</body>\n</html>\n'

let work: string
let sources: string
let store: string

beforeEach(() => {
  work = mkdtempSync(join(tmpdir(), 'education-fetch-'))
  sources = join(work, 'sources')
  store = join(work, 'store')
  mkdirSync(sources)
})

afterEach(() => {
  rmSync(work, { recursive: true, force: true })
})

function sourceRecord(slug: string, fields: Partial<SourceFrontmatter> = {}): string {
  return composeRecord({ ...caSource, id: sourceId('us-ca', slug), url: `https://example.org/${slug}`, ...fields }, NOTES)
}

// Writes sources/<slug>.md and gives back its text.
function writeSource(slug: string, fields: Partial<SourceFrontmatter> = {}): string {
  const text = sourceRecord(slug, fields)
  writeFileSync(join(sources, `${slug}.md`), text)
  return text
}

function readSource(slug: string): string {
  return readFileSync(join(sources, `${slug}.md`), 'utf8')
}

// Every file in the store, as sorted relative paths.
function stored(): string[] {
  if (!existsSync(store)) return []
  return (readdirSync(store, { recursive: true }) as string[]).filter((path) => statSync(join(store, path)).isFile()).sort()
}

interface Served {
  status?: number
  body: string | Uint8Array
}

// A network that serves what it is told, and remembers what it was asked.
function network(pages: Record<string, string | Uint8Array | Served>): { request: Fetcher; asked: { url: string; userAgent: string }[] } {
  const asked: { url: string; userAgent: string }[] = []
  const request: Fetcher = async (url, init) => {
    asked.push({ url, userAgent: init.headers['user-agent'] ?? '' })
    const page = pages[url]
    if (page === undefined) throw new Error(`the test network has no page at ${url}`)
    const served: Served = typeof page === 'string' || page instanceof Uint8Array ? { body: page } : page
    const status = served.status ?? 200
    const bytes = Buffer.from(served.body)
    return { ok: status >= 200 && status < 300, status, arrayBuffer: async () => new Uint8Array(bytes).buffer }
  }
  return { request, asked }
}

const noNetwork: Fetcher = async (url) => {
  throw new Error(`the test asked the network for ${url}`)
}

async function run(options: Partial<FetchOptions> = {}): Promise<Outcome[]> {
  return fetchSources({ sources, store, request: noNetwork, sleep: async () => {}, ...options })
}

describe('a source pinned by its bytes', () => {
  const url = 'https://example.org/counting'

  it('is stored on the first fetch, and its hash is written into the source record', async () => {
    writeSource('counting')
    const outcomes = await run({ request: network({ [url]: CSV }).request })

    const hash = sha256(CSV)
    expect(outcomes).toEqual([{ slug: 'counting', status: 'stored', pin: hash, message: hash }])
    expect(getBlob(store, hash)?.toString()).toBe(CSV)
    // Only the pin changed: the file is the record as it would be written with the pin in it.
    expect(readSource('counting')).toBe(sourceRecord('counting', { pin: hash }))
    expect(failed(outcomes)).toBe(false)
  })

  it('is verified by a second fetch of the same bytes, which writes nothing', async () => {
    writeSource('counting')
    const { request } = network({ [url]: CSV })
    await run({ request })
    const record = readSource('counting')
    const files = stored()

    const outcomes = await run({ request })
    expect(outcomes).toEqual([{ slug: 'counting', status: 'verified', pin: sha256(CSV), message: sha256(CSV) }])
    expect(readSource('counting')).toBe(record)
    expect(stored()).toEqual(files)
    expect(failed(outcomes)).toBe(false)
  })

  it('stops on a second fetch of other bytes, names both hashes and changes nothing', async () => {
    writeSource('counting')
    await run({ request: network({ [url]: CSV }).request })
    const record = readSource('counting')
    const files = stored()

    const outcomes = await run({ request: network({ [url]: OTHER_CSV }).request })
    expect(outcomes).toHaveLength(1)
    expect(outcomes[0]!.status).toBe('changed')
    expect(outcomes[0]!.message).toContain(sha256(CSV))
    expect(outcomes[0]!.message).toContain(sha256(OTHER_CSV))
    expect(readSource('counting')).toBe(record)
    expect(stored()).toEqual(files)
    expect(failed(outcomes)).toBe(true)
  })

  it('is pinned again once a person clears the pin', async () => {
    writeSource('counting', { pin: sha256(CSV) })
    const outcomes = await run({ request: network({ [url]: OTHER_CSV }).request })
    expect(outcomes[0]!.status).toBe('changed')

    writeSource('counting', { pin: '' })
    const again = await run({ request: network({ [url]: OTHER_CSV }).request })
    expect(again[0]).toMatchObject({ status: 'stored', pin: sha256(OTHER_CSV) })
  })

  it('is put back in a store that lost it, when the bytes match the pin', async () => {
    writeSource('counting', { pin: sha256(CSV) })
    const outcomes = await run({ request: network({ [url]: CSV }).request })
    expect(outcomes[0]!.status).toBe('verified')
    expect(getBlob(store, sha256(CSV))?.toString()).toBe(CSV)
  })
})

// A page shaped like the Dutch legal site's: the day it was read is stamped
// into the header and above the regulation, each article carries a list of
// actions and may carry a note that an amendment is pending, and pop-ups
// follow the text.
function legalPage(day: string, sentence = 'Een kind telt de appels in de mand.'): string {
  return `<!DOCTYPE HTML>
<html lang="nl">
<head><title>Voorbeeldregeling</title><script>var open = '<div class="wetgeving">';</script></head>
<body>
<h2>Voorbeeldregeling<span>Geraadpleegd op ${day}. <br>Geldend van 01-08-2026 t/m heden.<br></span></h2>
<ul><li><a href="#Artikel1">Artikel 1 Tellen</a></li></ul>
<div id="content">
<div id="regeling">
<h1>Voorbeeldregeling</h1>
<p class="regeling-toestand-meldingen">Geraadpleegd op ${day}. <br>Geldend van 01-08-2026 t/m heden.</p>
<div>
<div class="wetgeving">
<div class="collapsible__header"><a href="#aanhef">Origineel opschrift en aanhef</a></div>
<div class="artikel" id="Artikel1">
<div class="article__header--law artikel">
<h4>Artikel 1. Tellen</h4>
<ul role="list" aria-label="Lijst met mogelijke acties voor Artikel 1. Tellen.">
<li role="listitem" class="action--permalink"><a href="/x"><span>Maak een permanente link</span></a></li>
<li role="listitem" class="action--print"><a href="/x"><span>Druk het regelingonderdeel af</span></a></li>
</ul>
</div>
<p>[Wijziging(en) zonder datum inwerkingtreding aanwezig. Zie het <a href="/x/informatie#tab-wijzigingenoverzicht">wijzigingenoverzicht</a>.]</p>
<p class="al">${sentence}</p>
<ul class="list--law__unordered"><li class="li"><p class="al">Appels &amp; peren tellen mee, ook de <em>kleine</em>&#160;appels.</p></li></ul>
</div>
</div>
</div>
</div>
</div>
<div class="modal"><div class="modal__content"><h2>Permanente link naar versie regeling</h2></div></div>
</body>
</html>
`
}

const REGULATION = 'Artikel 1. Tellen Een kind telt de appels in de mand. Appels & peren tellen mee, ook de kleine appels.'

describe('extractRegulationText', () => {
  it('is the text of the regulation in a page, without the day it was read, the actions, the amendment notes or the rest of the site', () => {
    expect(extractRegulationText(legalPage('02-10-2026'))).toBe(REGULATION)
  })

  it('drops the day the page was read wherever it is stamped', () => {
    const page = legalPage('02-10-2026').replace('<p class="al">Een kind', '<p>Geraadpleegd op 02-10-2026.</p><p class="al">Een kind')
    expect(extractRegulationText(page)).toBe(REGULATION)
  })

  it('is the text of the regulation body in the XML rendition, without its publication data', () => {
    const xml =
      '<?xml version="1.0" encoding="UTF-8"?><toestand bwb-id="BWBR0000000" inwerkingtreding="2026-08-01"><bwb-inputbestand/>' +
      '<wetgeving soort="wet"><intitule status="goed">Voorbeeldregeling<meta-data><brondata><publicatiejaar>2026</publicatiejaar></brondata></meta-data></intitule>\n' +
      '  <wet-besluit><wettekst><artikel><kop><label>Artikel</label> <nr>1</nr> <titel>Tellen</titel><meta-data><jcis><jci verwijzing="x"/></jcis></meta-data></kop>' +
      '<al>Een kind telt de appels in de mand.</al></artikel></wettekst></wet-besluit></wetgeving></toestand>'
    expect(extractRegulationText(xml)).toBe('Voorbeeldregeling Artikel 1 Tellen Een kind telt de appels in de mand.')
  })

  it('finds nothing in a page that holds no regulation', () => {
    expect(extractRegulationText('<html><body><p>Deze pagina bestaat niet.</p></body></html>')).toBeNull()
  })
})

describe('a legal page pinned by its extracted text', () => {
  const url = 'https://example.org/regeling'
  const page = { media_type: 'text/html', pin_kind: 'extracted-text' } as const

  it('is stored on the first fetch: the pin is the hash of the text, with the text and the raw page in the store', async () => {
    writeSource('regeling', page)
    const outcomes = await run({ request: network({ [url]: legalPage('02-10-2026') }).request })

    const pin = wordingHash(REGULATION)
    expect(outcomes).toEqual([{ slug: 'regeling', status: 'stored', pin, message: pin }])
    expect(readSource('regeling')).toBe(sourceRecord('regeling', { ...page, pin }))
    expect(getText(store, pin)).toBe(REGULATION)
    expect(rawBlobFor(store, pin)).toBe(sha256(legalPage('02-10-2026')))
    expect(getBlob(store, sha256(legalPage('02-10-2026')))?.toString()).toBe(legalPage('02-10-2026'))
  })

  it('is verified by a page that differs only in the day it was read, and nothing is written', async () => {
    writeSource('regeling', page)
    await run({ request: network({ [url]: legalPage('02-10-2026') }).request })
    const record = readSource('regeling')
    const files = stored()

    const outcomes = await run({ request: network({ [url]: legalPage('03-10-2026') }).request })
    expect(outcomes[0]).toMatchObject({ status: 'verified', pin: wordingHash(REGULATION) })
    expect(readSource('regeling')).toBe(record)
    expect(stored()).toEqual(files)
  })

  it('stops when a sentence of the regulation changed', async () => {
    writeSource('regeling', page)
    await run({ request: network({ [url]: legalPage('02-10-2026') }).request })
    const record = readSource('regeling')
    const files = stored()

    const changed = legalPage('03-10-2026', 'Een kind telt de peren in de mand.')
    const outcomes = await run({ request: network({ [url]: changed }).request })
    expect(outcomes[0]!.status).toBe('changed')
    expect(outcomes[0]!.message).toContain(wordingHash(REGULATION))
    expect(outcomes[0]!.message).toContain(wordingHash(extractRegulationText(changed)!))
    expect(readSource('regeling')).toBe(record)
    expect(stored()).toEqual(files)
    expect(failed(outcomes)).toBe(true)
  })

  it('is invalid when the page holds no regulation text', async () => {
    const record = writeSource('regeling', page)
    const outcomes = await run({ request: network({ [url]: '<html><body><p>Deze pagina bestaat niet.</p></body></html>' }).request })
    expect(outcomes[0]!.status).toBe('invalid')
    expect(readSource('regeling')).toBe(record)
    expect(stored()).toEqual([])
  })
})

describe('a PDF pinned by its extracted text', () => {
  const url = 'https://example.org/concept'
  const draft = { media_type: 'application/pdf', pin_kind: 'extracted-text' } as const
  const TEXT = 'Concept\n\nEen kind telt de appels   in de mand.\n\f'

  // A PDF as the site makes it at the moment of download: the same text, other bytes each time.
  const pdf = (madeAt: string, text = TEXT): string => `%PDF-1.7\n% made at ${madeAt}\n${text}`
  // In place of pdftotext: the text of an invented PDF is what follows its second line.
  const pdfText = (bytes: Uint8Array): string => Buffer.from(bytes).toString('utf8').split('\n').slice(2).join('\n')

  it('is stored on the first fetch: the pin is the hash of its text, with the normalised text and the raw PDF in the store', async () => {
    writeSource('concept', draft)
    const outcomes = await run({ pdfText, request: network({ [url]: pdf('10:00') }).request })

    const pin = wordingHash(TEXT)
    expect(outcomes).toEqual([{ slug: 'concept', status: 'stored', pin, message: pin }])
    expect(readSource('concept')).toBe(sourceRecord('concept', { ...draft, pin }))
    expect(getText(store, pin)).toBe('Concept Een kind telt de appels in de mand.')
    expect(rawBlobFor(store, pin)).toBe(sha256(pdf('10:00')))
    expect(getBlob(store, sha256(pdf('10:00')))?.toString()).toBe(pdf('10:00'))
  })

  it('is verified by a PDF of other bytes and the same text, and nothing is written', async () => {
    writeSource('concept', draft)
    await run({ pdfText, request: network({ [url]: pdf('10:00') }).request })
    const record = readSource('concept')
    const files = stored()

    const outcomes = await run({ pdfText, request: network({ [url]: pdf('10:25') }).request })
    expect(sha256(pdf('10:25'))).not.toBe(sha256(pdf('10:00')))
    expect(outcomes[0]).toMatchObject({ status: 'verified', pin: wordingHash(TEXT) })
    expect(readSource('concept')).toBe(record)
    expect(stored()).toEqual(files)
    expect(failed(outcomes)).toBe(false)
  })

  it('stops when a sentence of the PDF changed', async () => {
    writeSource('concept', draft)
    await run({ pdfText, request: network({ [url]: pdf('10:00') }).request })
    const record = readSource('concept')
    const files = stored()

    const changed = 'Concept\n\nEen kind telt de peren in de mand.\n\f'
    const outcomes = await run({ pdfText, request: network({ [url]: pdf('10:25', changed) }).request })
    expect(outcomes[0]!.status).toBe('changed')
    expect(outcomes[0]!.message).toContain(wordingHash(TEXT))
    expect(outcomes[0]!.message).toContain(wordingHash(changed))
    expect(readSource('concept')).toBe(record)
    expect(stored()).toEqual(files)
    expect(failed(outcomes)).toBe(true)
  })

  it('is invalid when the PDF holds no text: the hash of nothing is not a pin', async () => {
    const record = writeSource('concept', draft)
    const outcomes = await run({ pdfText, request: network({ [url]: pdf('10:00', '\n\f') }).request })
    expect(outcomes[0]!.status).toBe('invalid')
    expect(readSource('concept')).toBe(record)
    expect(stored()).toEqual([])
  })
})

describe('invalid content', () => {
  it('is an HTML robot check served for a CSV or a PDF address: nothing is stored or pinned', async () => {
    const csv = writeSource('counting', { media_type: 'text/csv' })
    const pdf = writeSource('standards', { media_type: 'application/pdf' })
    const { request } = network({ 'https://example.org/counting': ROBOT_CHECK, 'https://example.org/standards': ROBOT_CHECK })

    const outcomes = await run({ request })
    expect(outcomes.map((outcome) => [outcome.slug, outcome.status])).toEqual([
      ['counting', 'invalid'],
      ['standards', 'invalid'],
    ])
    expect(outcomes[0]!.message).toContain('HTML page')
    expect(outcomes[0]!.message).toContain('Radware Captcha Page')
    expect(readSource('counting')).toBe(csv)
    expect(readSource('standards')).toBe(pdf)
    expect(stored()).toEqual([])
    expect(failed(outcomes)).toBe(true)
  })

  it('is a response whose status is not 2xx', async () => {
    const record = writeSource('counting')
    const outcomes = await run({ request: network({ 'https://example.org/counting': { status: 403, body: CSV } }).request })
    expect(outcomes[0]!.status).toBe('invalid')
    expect(outcomes[0]!.message).toContain('403')
    expect(readSource('counting')).toBe(record)
    expect(stored()).toEqual([])
  })

  it('is no response at all', async () => {
    writeSource('counting')
    const outcomes = await run({
      request: async () => {
        throw new Error('the line is down')
      },
    })
    expect(outcomes[0]).toMatchObject({ status: 'invalid', message: expect.stringContaining('the line is down') })
  })

  it('is a PDF that does not start as one', () => {
    expect(invalidContent('application/pdf', Buffer.from('not a pdf at all'))).toContain('%PDF')
    expect(invalidContent('application/pdf', Buffer.from('%PDF-1.7\n...'))).toBeNull()
  })

  it('is not an HTML page served for an HTML address, nor a CSV served as one', () => {
    expect(invalidContent('text/html', Buffer.from(ROBOT_CHECK))).toBeNull()
    expect(invalidContent('text/csv', Buffer.from(CSV))).toBeNull()
    expect(invalidContent('application/vnd.openxmlformats-officedocument.wordprocessingml.document', Buffer.from(ROBOT_CHECK))).toContain('HTML page')
  })
})

describe('--ingest', () => {
  it('pins a local file like a fetch, without the network, and stops on a later ingest of other bytes', async () => {
    writeSource('counting')
    const file = join(work, 'counting.csv')
    writeFileSync(file, CSV)

    const first = await run({ ingest: { counting: file } })
    expect(first).toEqual([{ slug: 'counting', status: 'stored', pin: sha256(CSV), message: sha256(CSV) }])
    expect(readSource('counting')).toBe(sourceRecord('counting', { pin: sha256(CSV) }))
    expect(getBlob(store, sha256(CSV))?.toString()).toBe(CSV)

    expect((await run({ ingest: { counting: file } }))[0]!.status).toBe('verified')

    const record = readSource('counting')
    const files = stored()
    writeFileSync(file, OTHER_CSV)
    const later = await run({ ingest: { counting: file } })
    expect(later[0]!.status).toBe('changed')
    expect(later[0]!.message).toContain(sha256(CSV))
    expect(later[0]!.message).toContain(sha256(OTHER_CSV))
    expect(readSource('counting')).toBe(record)
    expect(stored()).toEqual(files)
  })

  it('rejects a local file that is a saved robot check', async () => {
    const record = writeSource('counting')
    const file = join(work, 'counting.csv')
    writeFileSync(file, ROBOT_CHECK)
    expect((await run({ ingest: { counting: file } }))[0]!.status).toBe('invalid')
    expect(readSource('counting')).toBe(record)
    expect(stored()).toEqual([])
  })
})

function git(dir: string, ...args: string[]): string {
  return execFileSync('git', ['-C', dir, '-c', 'user.name=Test', '-c', 'user.email=test@example.org', '-c', 'commit.gpgsign=false', ...args], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim()
}

// A repository with one commit, and its HEAD.
function repository(name: string): { dir: string; head: string } {
  const dir = join(work, name)
  mkdirSync(dir)
  git(dir, 'init', '-q')
  writeFileSync(join(dir, 'doelen.json'), '[{"titel":"Appels tellen"}]\n')
  git(dir, 'add', '.')
  git(dir, 'commit', '-q', '-m', 'first')
  return { dir, head: git(dir, 'rev-parse', 'HEAD') }
}

function commit(dir: string, content: string): string {
  writeFileSync(join(dir, 'doelen.json'), content)
  git(dir, 'commit', '-q', '-am', 'next')
  return git(dir, 'rev-parse', 'HEAD')
}

describe('a source pinned by a commit', () => {
  const repo = { media_type: 'application/json', pin_kind: 'git-commit' } as const

  it('is cloned on the first fetch, which pins its HEAD, and verified by the second', async () => {
    const { dir, head } = repository('upstream')
    writeSource('doelen', { ...repo, url: dir })

    const first = await run()
    expect(first).toEqual([{ slug: 'doelen', status: 'stored', pin: head, message: head }])
    expect(readSource('doelen')).toBe(sourceRecord('doelen', { ...repo, url: dir, pin: head }))
    expect(readFileSync(join(clonePath(store, 'doelen'), 'doelen.json'), 'utf8')).toBe('[{"titel":"Appels tellen"}]\n')

    const record = readSource('doelen')
    const second = await run()
    expect(second).toEqual([{ slug: 'doelen', status: 'verified', pin: head, message: head }])
    expect(readSource('doelen')).toBe(record)
  })

  it('stays on the pinned commit when the publisher has moved on', async () => {
    const { dir, head } = repository('upstream')
    writeSource('doelen', { ...repo, url: dir })
    await run()
    commit(dir, '[{"titel":"Peren tellen"}]\n')

    expect((await run())[0]).toMatchObject({ status: 'verified', pin: head })
    expect(git(clonePath(store, 'doelen'), 'rev-parse', 'HEAD')).toBe(head)
  })

  it('is cloned again at the pinned commit when the store has no clone', async () => {
    const { dir, head } = repository('upstream')
    commit(dir, '[{"titel":"Peren tellen"}]\n')
    writeSource('doelen', { ...repo, url: dir, pin: head })

    expect((await run())[0]).toMatchObject({ status: 'verified', pin: head })
    expect(readFileSync(join(clonePath(store, 'doelen'), 'doelen.json'), 'utf8')).toBe('[{"titel":"Appels tellen"}]\n')
  })

  it('stops when the pinned commit cannot be reached', async () => {
    const { dir } = repository('upstream')
    const gone = 'a'.repeat(40)
    const record = writeSource('doelen', { ...repo, url: dir, pin: gone })

    const outcomes = await run()
    expect(outcomes[0]!.status).toBe('changed')
    expect(outcomes[0]!.message).toContain(gone)
    expect(readSource('doelen')).toBe(record)
    expect(failed(outcomes)).toBe(true)
  })

  it('is pinned to the publisher’s newest commit once a person clears the pin', async () => {
    const { dir } = repository('upstream')
    writeSource('doelen', { ...repo, url: dir })
    await run()
    const next = commit(dir, '[{"titel":"Peren tellen"}]\n')

    writeSource('doelen', { ...repo, url: dir, pin: '' })
    expect((await run())[0]).toMatchObject({ status: 'stored', pin: next })
    expect(git(clonePath(store, 'doelen'), 'rev-parse', 'HEAD')).toBe(next)
  })

  it('adopts a clone made by hand with --ingest, pinning its HEAD and leaving the clone where it was', async () => {
    const { dir, head } = repository('by-hand')
    writeSource('doelen', { ...repo, url: 'https://example.org/doelen.git' })

    const outcomes = await run({ ingest: { doelen: dir } })
    expect(outcomes).toEqual([{ slug: 'doelen', status: 'stored', pin: head, message: head }])
    expect(git(clonePath(store, 'doelen'), 'rev-parse', 'HEAD')).toBe(head)
    expect(existsSync(join(dir, 'doelen.json'))).toBe(true)
    expect((await run({ ingest: { doelen: dir } }))[0]!.status).toBe('verified')
  })

  it('is invalid when there is nothing to clone', async () => {
    const record = writeSource('doelen', { ...repo, url: join(work, 'no-such-repository') })
    const outcomes = await run()
    expect(outcomes[0]!.status).toBe('invalid')
    expect(readSource('doelen')).toBe(record)
  })
})

describe('politeness', () => {
  it('asks one source at a time, waits between two requests to the same host, and looks like a browser', async () => {
    writeSource('a-first', { url: 'https://slow.example.org/one.csv' })
    writeSource('b-second', { url: 'https://other.example.org/two.csv' })
    writeSource('c-third', { url: 'https://slow.example.org/three.csv' })
    const { request, asked } = network({
      'https://slow.example.org/one.csv': CSV,
      'https://other.example.org/two.csv': CSV,
      'https://slow.example.org/three.csv': CSV,
    })
    const events: string[] = []
    const logged: Fetcher = async (url, init) => {
      events.push(`ask ${url}`)
      return request(url, init)
    }
    const sleep = async (ms: number): Promise<void> => {
      events.push(`wait ${ms}`)
    }

    await run({ request: logged, sleep, delayMs: 5000 })
    expect(events).toEqual([
      'ask https://slow.example.org/one.csv',
      'ask https://other.example.org/two.csv',
      'wait 5000',
      'ask https://slow.example.org/three.csv',
    ])
    expect(asked.every((ask) => /^Mozilla\/5\.0 .*Safari/.test(ask.userAgent))).toBe(true)
  })

  it('does not wait for a file that is ingested', async () => {
    writeSource('a-first', { url: 'https://slow.example.org/one.csv' })
    writeSource('b-second', { url: 'https://slow.example.org/two.csv' })
    const file = join(work, 'two.csv')
    writeFileSync(file, CSV)
    const waits: number[] = []
    await run({
      request: network({ 'https://slow.example.org/one.csv': CSV }).request,
      ingest: { 'b-second': file },
      sleep: async (ms) => {
        waits.push(ms)
      },
    })
    expect(waits).toEqual([])
  })
})

describe('choosing sources', () => {
  it('fetches only the sources named by --only and reports the rest as skipped', async () => {
    writeSource('counting')
    const untouched = writeSource('standards')
    const { request, asked } = network({ 'https://example.org/counting': CSV })

    const outcomes = await run({ request, only: ['counting'] })
    expect(outcomes.map((outcome) => [outcome.slug, outcome.status])).toEqual([
      ['counting', 'stored'],
      ['standards', 'skipped'],
    ])
    expect(asked.map((ask) => ask.url)).toEqual(['https://example.org/counting'])
    expect(readSource('standards')).toBe(untouched)
    expect(failed(outcomes)).toBe(false)
  })

  it('refuses a slug that is no source, before anything is asked', async () => {
    writeSource('counting')
    await expect(run({ only: ['countign'] })).rejects.toThrow('countign')
    await expect(run({ ingest: { countign: join(work, 'counting.csv') } })).rejects.toThrow('countign')
  })

  it('reports each outcome as it happens', async () => {
    writeSource('counting')
    writeSource('standards')
    const seen: string[] = []
    await run({
      request: network({ 'https://example.org/counting': CSV, 'https://example.org/standards': OTHER_CSV }).request,
      report: (outcome) => seen.push(formatOutcome(outcome)),
    })
    expect(seen).toEqual([`stored    counting  ${sha256(CSV)}`, `stored    standards  ${sha256(OTHER_CSV)}`])
  })
})
