import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { NL_FILE, NL_WORDING, caFrame, caObjective, caSource, nlSource, sampleTree } from './fixtures.ts'
import { wordingHash } from './normalise.ts'
import { checkOverlap, overlapTree, readCommitted, scope, stems, words } from './overlap.ts'
import { composeRecord, draftObjective, replaceRegion, withMarker } from './record.ts'
import { DESIGN_NOTES, DESIGN_NOTES_SUBHEADINGS, SUMMARY, objectiveId, pathForId } from './schema.ts'
import { getWording, putWording } from './store.ts'
import type { Finding, RecordText } from './validate.ts'

// Every wording here is invented. No official wording belongs in a test.

const TWENTY = 'Sort the painted wooden buttons into three small jars by colour and then say which jar holds the most buttons.'
const TWELVE = 'Pour water from the tall jug into four cups without spilling drops.'
const SIX = 'Stack six red cups without help.'
const TWO = 'Count aloud.'

// Text that accompanies a statement: a footnote of fourteen words, and one of six.
const FOOTNOTE = 'Jars made of glass are kept on the low shelf until the spring fair.'
const EIGHT_OF_FOOTNOTE = 'glass are kept on the low shelf until'
const SHORT_FOOTNOTE = 'Only jars with green lids count.'

// Eight consecutive words of TWENTY, and seven.
const EIGHT_OF_TWENTY = 'painted wooden buttons into three small jars by'
const SEVEN_OF_TWENTY = 'painted wooden buttons into three small jars'

// A statement in two labelled paragraphs: two words of label, then ten words and thirteen.
const TWO_PARAGRAPHS = 'Early steps: Roll the soft ball across the mat to a friend.\n\nLater steps: Kick the soft ball between two cones and stop it with one foot.'
// A statement that is a stem and two lettered lines, of five words and nine.
const LETTERED = 'Look after the class garden through the spring term:\na. Water the bean rows daily.\nb. Pull weeds from between the stones near the gate.'
// A statement of seven words in two labelled paragraphs, the first of four words.
const SHORT_PARAGRAPHS = 'Day: Sweep the wide floor.\n\nNight: Rest.'

const HONEST = {
  hands: 'A child balances one beaker on another until the tower stands.',
  limits: 'Only a handful of beakers, all the same size.',
  mistakes: 'Knocking the tower over while adding the last one.',
}

let store: string

beforeEach(() => {
  store = mkdtempSync(join(tmpdir(), 'education-overlap-store-'))
})

afterEach(() => {
  rmSync(store, { recursive: true, force: true })
})

const lookup = (hash: string): string | null => getWording(store, hash)

interface Written {
  summary: string
  hands?: string
  limits?: string
  mistakes?: string
  // The official text that accompanies the statement. It goes into the store
  // unless `supplementStored` is false.
  supplement?: string
  supplementStored?: boolean
}

// A description-only record with its agent regions written. Its official
// wording goes into the store, as the record writer puts it there.
function record(slug: string, wording: string, written: Written, stored = true): RecordText {
  if (stored) putWording(store, wording)
  if (written.supplement !== undefined && written.supplementStored !== false) putWording(store, written.supplement)
  const id = objectiveId('us-ca', 'kindergarten', 'mathematics', slug)
  const [hands, limits, mistakes] = DESIGN_NOTES_SUBHEADINGS
  const notes = [hands, written.hands ?? HONEST.hands, limits, written.limits ?? HONEST.limits, mistakes, written.mistakes ?? HONEST.mistakes].join('\n\n')
  const supplement = written.supplement === undefined ? {} : { supplement_sha256: wordingHash(written.supplement) }
  const draft = draftObjective({ ...caObjective, id, wording_sha256: wordingHash(wording), ...supplement })
  const text = replaceRegion(replaceRegion(draft, SUMMARY, withMarker(SUMMARY, written.summary)), DESIGN_NOTES, withMarker(DESIGN_NOTES, notes))
  return { file: pathForId(id)!, text }
}

function rules(findings: readonly Finding[]): string[] {
  return findings.map((finding) => `${finding.file} ${finding.rule}`)
}

function lineOf(text: string, needle: string): number {
  if (!text.includes(needle)) throw new Error(`the text does not hold: ${needle}`)
  return text.slice(0, text.indexOf(needle)).split('\n').length
}

describe('the invented statements', () => {
  it('have the lengths the tests rely on', () => {
    expect([TWENTY, TWELVE, SIX, TWO, EIGHT_OF_TWENTY, SEVEN_OF_TWENTY].map((text) => words(text).length)).toEqual([20, 12, 6, 2, 8, 7])
    expect([FOOTNOTE, EIGHT_OF_FOOTNOTE, SHORT_FOOTNOTE].map((text) => words(text).length)).toEqual([14, 8, 6])
    expect([TWO_PARAGRAPHS, LETTERED, SHORT_PARAGRAPHS].map((text) => words(text).length)).toEqual([27, 25, 7])
  })
})

describe('words', () => {
  it('are compared without case, punctuation, quote style or line breaks', () => {
    expect(words('“Painted” wooden\nBUTTONS — the child’s jar, half-full.')).toEqual(['painted', 'wooden', 'buttons', 'the', 'childs', 'jar', 'half', 'full'])
  })
})

describe('stems', () => {
  const same = (forms: string): string[] => [...new Set(stems(forms))]

  it('fold the endings of a verb or a noun into one form', () => {
    expect(same('add adds added adding')).toHaveLength(1)
    expect(same('compare compares compared comparing')).toHaveLength(1)
    expect(same('try tries tried trying')).toHaveLength(1)
    expect(same('object objects')).toHaveLength(1)
    expect(same('box boxes')).toHaveLength(1)
    expect(same('stop stops stopped stopping')).toHaveLength(1)
    expect(same('carry carries carried carrying')).toHaveLength(1)
    expect(same('glass glasses')).toHaveLength(1)
    expect(same('tie ties')).toHaveLength(1)
  })

  it('keep different words apart', () => {
    expect(same('add compare try object box stop carry glass')).toHaveLength(8)
  })

  it('leave alone a word of three letters or fewer, and a word that would be cut to fewer than three', () => {
    const short = ['is', 'as', 'was', 'bus', 'red', 'its', 'the', 'add', 'try', 'box']
    expect(stems(short.join(' '))).toEqual(short)
    const cut = ['need', 'thing', 'being', 'used', 'this', 'died']
    expect(stems(cut.join(' '))).toEqual(cut)
  })

  it('give one stem per word and never throw, whatever the text', () => {
    const odd = "3rd café's ß ing s ed ies İİİing 100s"
    expect(stems('')).toEqual([])
    expect(stems(odd)).toHaveLength(words(odd).length)
  })

  it('leave words() as it was', () => {
    expect(words('Adds, counted and comparing objects')).toEqual(['adds', 'counted', 'and', 'comparing', 'objects'])
  })
})

describe('a run of eight words', () => {
  it('fails a summary that shares eight consecutive words with the stored wording, and names the record and the line', () => {
    const copied = record('k-cc-1', TWENTY, { summary: `The child puts ${EIGHT_OF_TWENTY} shade.` })

    const findings = checkOverlap([copied], lookup)

    expect(rules(findings)).toEqual([`${copied.file} eight-word-run`])
    expect(findings[0]!.line).toBe(lineOf(copied.text, 'The child puts'))
  })

  it('prints no more of the official wording than the first three words of the match', () => {
    const copied = record('k-cc-1', TWENTY, { summary: `The child puts ${EIGHT_OF_TWENTY} shade.` })

    const [finding] = checkOverlap([copied], lookup)

    expect(finding!.message).toContain('painted wooden buttons')
    expect(finding!.message).not.toContain('into')
    expect(finding!.message).toContain('8 consecutive words')
  })

  it('passes a summary that shares seven consecutive words with a twenty-word statement', () => {
    const close = record('k-cc-1', TWENTY, { summary: `The child puts ${SEVEN_OF_TWENTY} in a way they choose.` })

    expect(checkOverlap([close], lookup)).toEqual([])
  })

  it('fails a run that differs from the stored wording only in the endings of its words, and prints the words as written', () => {
    const copied = record('k-cc-1', TWENTY, { summary: 'The child puts painting wooden button into three small jar by shade.' })

    const findings = checkOverlap([copied], lookup)

    expect(rules(findings)).toEqual([`${copied.file} eight-word-run`])
    expect(findings[0]!.line).toBe(lineOf(copied.text, 'The child puts'))
    expect(findings[0]!.message).toContain('8 consecutive words')
    expect(findings[0]!.message).toContain('"painting wooden button ..."')
  })

  it('fails the run when it is broken over two lines, in other case and with other punctuation', () => {
    const copied = record('k-cc-1', TWENTY, { summary: 'The child puts PAINTED wooden buttons, into three\nsmall jars by shade.' })

    expect(rules(checkOverlap([copied], lookup))).toEqual([`${copied.file} eight-word-run`])
  })

  it('reports one finding for a longer run, with its length', () => {
    const copied = record('k-cc-1', TWENTY, { summary: `The child puts ${EIGHT_OF_TWENTY} colour and then shade.` })

    const findings = checkOverlap([copied], lookup)

    expect(rules(findings)).toEqual([`${copied.file} eight-word-run`])
    expect(findings[0]!.message).toContain('11 consecutive words')
  })

  it('fails a design note that shares the run with the wording of another record', () => {
    const other = record('k-cc-1', TWENTY, { summary: 'Groups buttons by how they look and compares the groups.' })
    const copied = record('k-cc-2', SIX, { summary: 'Builds a small tower from half a dozen beakers, unaided.', limits: `Not ${EIGHT_OF_TWENTY} shade.` })

    expect(rules(checkOverlap([other, copied], lookup))).toEqual([`${copied.file} eight-word-run`])
  })
})

describe('the text that accompanies a statement', () => {
  const honest = 'Groups buttons by how they look and compares the groups.'

  it('fails a summary that shares eight consecutive words with the footnote of its own record', () => {
    const copied = record('k-cc-1', TWENTY, { summary: `Jars of ${EIGHT_OF_FOOTNOTE} later.`, supplement: FOOTNOTE })

    const findings = checkOverlap([copied], lookup)

    expect(rules(findings)).toEqual([`${copied.file} eight-word-run`])
    expect(findings[0]!.line).toBe(lineOf(copied.text, 'Jars of glass'))
  })

  it('fails a design note that shares the run with the footnote of another record', () => {
    const other = record('k-cc-1', TWENTY, { summary: honest, supplement: FOOTNOTE })
    const copied = record('k-cc-2', SIX, { summary: 'Builds a small tower from half a dozen beakers, unaided.', limits: `Jars of ${EIGHT_OF_FOOTNOTE} later.` })

    expect(rules(checkOverlap([other, copied], lookup))).toEqual([`${copied.file} eight-word-run`])
  })

  it('keeps the two rules about a record\'s own statement to the statement: a short footnote copied whole is not a finding of theirs', () => {
    const copied = record('k-cc-1', TWENTY, { summary: `${honest} ${SHORT_FOOTNOTE}`, supplement: SHORT_FOOTNOTE })

    expect(checkOverlap([copied], lookup)).toEqual([])
  })

  it('reports a record whose accompanying text is not in the store, at the line of its hash', () => {
    const missing = record('k-cc-1', TWENTY, { summary: honest, supplement: FOOTNOTE, supplementStored: false })

    const findings = checkOverlap([missing], lookup)

    expect(rules(findings)).toEqual([`${missing.file} wording-missing`])
    expect(findings[0]!.line).toBe(lineOf(missing.text, 'supplement_sha256'))
  })
})

describe('the whole statement', () => {
  it('fails a six-word statement copied whole into a summary', () => {
    const copied = record('k-cc-1', SIX, { summary: 'Stack six red cups without help.' })

    const findings = checkOverlap([copied], lookup)

    expect(rules(findings)).toContain(`${copied.file} whole-statement`)
    const whole = findings.find((finding) => finding.rule === 'whole-statement')!
    expect(whole.line).toBe(lineOf(copied.text, 'Stack six red cups'))
    expect(whole.message).toContain('stack six red')
    expect(whole.message).not.toContain('cups')
  })

  it('fails a six-word statement copied whole into a design note', () => {
    const copied = record('k-cc-1', SIX, {
      summary: 'Builds a small tower from half a dozen beakers, unaided.',
      hands: 'A child will stack six red cups without help while a friend watches.',
    })

    const findings = checkOverlap([copied], lookup)

    expect(rules(findings)).toContain(`${copied.file} whole-statement`)
    expect(findings.find((finding) => finding.rule === 'whole-statement')!.line).toBe(lineOf(copied.text, 'A child will stack'))
  })

  it('fails a six-word statement copied whole with one plural changed', () => {
    const copied = record('k-cc-1', SIX, { summary: 'Stack six red cup without help.' })

    const findings = checkOverlap([copied], lookup)

    expect(rules(findings)).toContain(`${copied.file} whole-statement`)
    const whole = findings.find((finding) => finding.rule === 'whole-statement')!
    expect(whole.line).toBe(lineOf(copied.text, 'Stack six red cup'))
    expect(whole.message).toContain('"stack six red ..."')
  })

  it('leaves a statement of two words alone: its words alone are too common to mean a copy', () => {
    const short = record('k-cc-1', TWO, { summary: 'Children count aloud while they walk up the stairs.' })

    expect(checkOverlap([short], lookup)).toEqual([])
  })
})

describe('four fifths of a statement in order', () => {
  it('fails a twelve-word statement copied with one word changed', () => {
    const copied = record('k-cc-1', TWELVE, { summary: 'Pour water from the tall pitcher into four cups without spilling drops.' })

    const findings = checkOverlap([copied], lookup)

    expect(rules(findings)).toEqual([`${copied.file} four-fifths`])
    expect(findings[0]!.line).toBe(lineOf(copied.text, 'Pour water from'))
    expect(findings[0]!.message).toContain('11 of the 12 words')
  })

  it('fails a twelve-word statement copied with every verb and noun in another form', () => {
    const copied = record('k-cc-1', TWELVE, { summary: 'Pours waters from the tall jugs, then, into four cup without spilled drop.' })

    const findings = checkOverlap([copied], lookup)

    expect(rules(findings)).toEqual([`${copied.file} four-fifths`])
    expect(findings[0]!.line).toBe(lineOf(copied.text, 'Pours waters from'))
    expect(findings[0]!.message).toContain('12 of the 12 words')
    expect(findings[0]!.message).toContain('"pours waters from ..."')
  })

  it('fails a sentence that is wrapped over two lines and holds an abbreviation', () => {
    const copied = record('k-cc-1', TWELVE, { summary: 'Pour water, e.g. from the tall pitcher,\ninto four cups without spilling drops.' })

    const findings = checkOverlap([copied], lookup)

    expect(rules(findings)).toEqual([`${copied.file} four-fifths`])
    expect(findings[0]!.line).toBe(lineOf(copied.text, 'Pour water, e.g.'))
  })

  it('passes when the same words are spread over two sentences, or over a paragraph and the heading after it', () => {
    const spread = record('k-cc-1', TWELVE, { summary: 'Pour water from the tall pitcher. Fill four cups without spilling drops.' })
    const apart = record('k-cc-1', TWELVE, { summary: 'Pour water from the tall pitcher', hands: 'into four cups without spilling drops' })

    expect(checkOverlap([spread], lookup)).toEqual([])
    expect(checkOverlap([apart], lookup)).toEqual([])
  })

  it('passes an honest paraphrase of a short statement', () => {
    const honest = record('k-cc-1', SIX, { summary: 'Builds a small tower from half a dozen beakers, unaided.' })

    expect(checkOverlap([honest], lookup)).toEqual([])
  })
})

describe('the parts of a statement', () => {
  it('fails a sentence that copies the second of two labelled paragraphs with one word changed', () => {
    const copied = record('k-cc-1', TWO_PARAGRAPHS, { summary: 'Passes a ball to a partner. Kick the soft ball between two posts and stop it with one foot.' })

    const findings = checkOverlap([copied], lookup)

    expect(rules(findings)).toEqual([`${copied.file} four-fifths`])
    expect(findings[0]!.line).toBe(lineOf(copied.text, 'Passes a ball'))
    expect(findings[0]!.message).toContain('12 of the 13 words of one part')
    expect(findings[0]!.message).toContain('"kick the soft ..."')
  })

  it('fails a five-word lettered line copied whole', () => {
    const copied = record('k-cc-1', LETTERED, { summary: 'Children water the bean rows daily and keep the paths clear.' })

    const findings = checkOverlap([copied], lookup)

    expect(rules(findings)).toContain(`${copied.file} whole-statement`)
    const whole = findings.find((finding) => finding.rule === 'whole-statement')!
    expect(whole.line).toBe(lineOf(copied.text, 'Children water the bean'))
    expect(whole.message).toContain('one part')
    expect(whole.message).toContain('(5 words)')
    expect(whole.message).toContain('"water the bean ..."')
  })

  it('passes an honest summary of a statement in two paragraphs, and of one in lettered lines', () => {
    const paragraphs = record('k-cc-1', TWO_PARAGRAPHS, { summary: 'Sends a ball to a partner, first by hand and later with the feet, and brings it to rest.' })
    const lettered = record('k-cc-2', LETTERED, { summary: 'Tends growing plants over a season: gives them a drink and clears what should not grow there.' })

    expect(checkOverlap([paragraphs, lettered], lookup)).toEqual([])
  })

  it('reports a sentence once for a rule when it holds both the whole statement and one of its parts', () => {
    const copied = record('k-cc-1', SHORT_PARAGRAPHS, { summary: 'Day: sweep the wide floor, night: rest.' })

    expect(rules(checkOverlap([copied], lookup))).toEqual([`${copied.file} whole-statement`, `${copied.file} four-fifths`])
  })

  it('leaves a part of one or two words alone', () => {
    const short = record('k-cc-1', SHORT_PARAGRAPHS, { summary: 'Cleans a room while it is light, and then they rest.' })

    expect(checkOverlap([short], lookup)).toEqual([])
  })
})

describe('which files are checked', () => {
  const source = (): RecordText => record('k-cc-1', TWENTY, { summary: 'Groups buttons by how they look and compares the groups.' })

  it('fails a locator file of a description-only lane that holds eight consecutive official words in one string', () => {
    const file = 'locators/us-ca/kindergarten/mathematics.json'
    // Written out, the line break inside the string is the two characters \n.
    const bad = { statements: [{ code: 'K.CC.1', page: 3, first: 'Sort the painted', last: 'painted wooden buttons into\nthree small jars by' }] }
    const good = { statements: [{ code: 'K.CC.1', page: 3, first: 'Sort the painted wooden', last: 'the most buttons.' }] }
    const text = JSON.stringify(bad, null, 2)

    const findings = checkOverlap([source(), { file, text }], lookup)

    expect(rules(findings)).toEqual([`${file} eight-word-run`])
    expect(findings[0]!.line).toBe(lineOf(text, '"last"'))
    expect(checkOverlap([source(), { file, text: JSON.stringify(good, null, 2) }], lookup)).toEqual([])
  })

  it('fails a California review file whose note holds eight consecutive official words', () => {
    const file = 'reviews/us-ca/kindergarten/mathematics.json'
    const verdict = (note: string) => ({ lane: 'us-ca/kindergarten/mathematics', verdicts: [{ id: caObjective.id, verdict: 'unconfirmed', reason: 'wording-differs', note, place: { page: 3 } }] })
    const text = JSON.stringify(verdict(`The page has ${EIGHT_OF_TWENTY} shade.`), null, 2)

    const findings = checkOverlap([source(), { file, text }], lookup)

    expect(rules(findings)).toEqual([`${file} eight-word-run`])
    expect(findings[0]!.line).toBe(lineOf(text, '"note"'))
    expect(checkOverlap([source(), { file, text: JSON.stringify(verdict('The page says jars where the file says tins.'), null, 2) }], lookup)).toEqual([])
  })

  it.each(['corpus/us-ca/kindergarten/mathematics/frame.md', 'README.md', 'counting-rule.md', 'docs/LICENSE-NOTES.md', 'research/web-california.md', 'locators/us-ca/notes.txt'])(
    'fails %s when it holds eight consecutive official words',
    (file) => {
      const text = file.endsWith('frame.md') ? composeRecord(caFrame, `Covers sorting.\n\nFor instance ${EIGHT_OF_TWENTY} shade.`) : `# A page\n\nFor instance ${EIGHT_OF_TWENTY} shade.\n`

      const findings = checkOverlap([source(), { file, text }], lookup)

      expect(rules(findings)).toEqual([`${file} eight-word-run`])
      expect(findings[0]!.line).toBe(lineOf(text, 'For instance'))
    },
  )

  // The manifest, the tools with their fixtures and the top-level .ts files:
  // hand-written text about California statements, and the likeliest place
  // for a pasted one.
  it.each(['manifest/us-ca.ts', 'manifest/us-ca-additions.ts', 'manifest/nl-additions.ts', 'tools/fixtures.ts', 'tools/overlap.test.ts', 'tools/ocr.swift', 'manifest.ts', 'ages.ts'])(
    'fails %s when a string or a comment in it holds eight consecutive official words',
    (file) => {
      const inString = `// A list of corrections.\nexport const CORRECTIONS = [\n  { code: 'K.CC.1', from: 'tins', to: 'For instance ${EIGHT_OF_TWENTY} shade.' },\n]\n`
      const inComment = `export const COUNT = 1\n// For instance ${EIGHT_OF_TWENTY}\n// shade.\n`

      for (const text of [inString, inComment]) {
        const findings = checkOverlap([source(), { file, text }], lookup)
        expect(rules(findings)).toEqual([`${file} eight-word-run`])
        expect(findings[0]!.line).toBe(lineOf(text, 'For instance'))
      }
      // Seven consecutive words are no finding there either.
      expect(checkOverlap([source(), { file, text: `const NOTE = '${SEVEN_OF_TWENTY} in a way they choose'\n` }], lookup)).toEqual([])
    },
  )

  // A source record's file name does not have to say whose it is, so the
  // source records of both jurisdictions are read.
  it.each([caSource, nlSource])('fails the source record $id when one of its paragraphs holds eight consecutive official words', (frontmatter) => {
    const file = pathForId(frontmatter.id)!
    const text = composeRecord(frontmatter, `An invented file of counting statements.\n\nFor instance ${EIGHT_OF_TWENTY} shade.`)

    const findings = checkOverlap([source(), { file, text }], lookup)

    expect(file.startsWith('sources/')).toBe(true)
    expect(rules(findings)).toEqual([`${file} eight-word-run`])
    expect(findings[0]!.line).toBe(lineOf(text, 'For instance'))
  })

  // Dutch wording may be committed, so the Dutch half of the folders that
  // are split by jurisdiction stays unread; so does what is no text of the pack.
  it.each(['corpus/nl/fase-1/mathematics/frame.md', 'locators/nl/fase-1.json', 'locators/nl/frame-texts.json', 'reviews/nl/fase-1/mathematics.json', 'tsconfig.json', 'node_modules/example/index.ts'])(
    'does not read %s',
    (file) => {
      expect(scope(file)).toBeNull()
      expect(checkOverlap([source(), { file, text: `For instance ${EIGHT_OF_TWENTY} shade.\n` }], lookup)).toEqual([])
    },
  )

  it('says of each kind of path whether it is a record, other text, or not read', () => {
    const kinds = (files: string[]): (string | null)[] => files.map(scope)
    expect(kinds([pathForId(caObjective.id)!, NL_FILE])).toEqual(['record', 'record'])
    expect(kinds(['manifest/us-ca.ts', 'manifest/nl.ts', 'manifest/us-ca-additions.ts'])).toEqual(['text', 'text', 'text'])
    expect(kinds(['tools/fixtures.ts', 'tools/extract.test.ts', 'tools/ocr.swift'])).toEqual(['text', 'text', 'text'])
    expect(kinds(['manifest.ts', 'ages.ts', 'vitest.config.ts', 'README.md', 'map-us-ca-ages-2-to-5.md'])).toEqual(['text', 'text', 'text', 'text', 'text'])
    expect(kinds([pathForId(caSource.id)!, pathForId(nlSource.id)!, 'sources/us-ca-cde-example.md'])).toEqual(['text', 'text', 'text'])
    expect(kinds(['docs/COVERAGE.md', 'research/web-california.md', 'locators/us-ca/preschool-tk/mathematics.json', 'reviews/us-ca/grade-1/science.json'])).toEqual(['text', 'text', 'text', 'text'])
    expect(kinds(['tsconfig.json', 'locators/nl/frame-texts.json', 'reviews/nl/fase-1/mathematics.json'])).toEqual([null, null, null])
  })

  it('skips a verbatim record, which holds its own official wording', () => {
    putWording(store, NL_WORDING)

    expect(checkOverlap([{ file: NL_FILE, text: sampleTree()[NL_FILE]! }], lookup)).toEqual([])
  })

  it('reports a description-only record whose wording is not in the store', () => {
    const missing = record('k-cc-1', SIX, { summary: 'Builds a small tower from half a dozen beakers, unaided.' }, false)

    const findings = checkOverlap([missing], lookup)

    expect(rules(findings)).toEqual([`${missing.file} wording-missing`])
    expect(findings[0]!.line).toBe(lineOf(missing.text, 'wording_sha256'))
  })

  it('reports a record whose frontmatter cannot be read, and still checks its text', () => {
    const good = record('k-cc-1', TWENTY, { summary: `The child puts ${EIGHT_OF_TWENTY} shade.` })
    const broken = { file: pathForId(objectiveId('us-ca', 'kindergarten', 'mathematics', 'k-cc-2'))!, text: good.text.replace('kind: objective', 'kind: [objective') }

    expect(rules(checkOverlap([record('k-cc-1', TWENTY, { summary: 'Groups buttons by how they look.' }), broken], lookup))).toEqual([
      `${broken.file} frontmatter`,
      `${broken.file} eight-word-run`,
    ])
  })
})

describe('the tree on disk', () => {
  let education: string

  beforeEach(() => {
    education = mkdtempSync(join(tmpdir(), 'education-overlap-'))
  })

  afterEach(() => {
    rmSync(education, { recursive: true, force: true })
  })

  function write(tree: Record<string, string>): void {
    for (const [file, text] of Object.entries(tree)) {
      mkdirSync(dirname(join(education, file)), { recursive: true })
      writeFileSync(join(education, file), text)
    }
  }

  it('passes a tree with no locators folder and nothing copied, and lists each file it read once', () => {
    const honest = record('k-cc-1', SIX, { summary: 'Builds a small tower from half a dozen beakers, unaided.' })
    write({ ...sampleTree(), [honest.file]: honest.text, 'README.md': 'What the pack is.\n', 'tools/fixtures.ts': "export const WORDING = 'An invented statement.'\n", 'tsconfig.json': '{}\n' })

    expect(overlapTree(education, store)).toEqual([])
    const read = readCommitted(education).map((file) => file.file)
    expect(read).toEqual([...new Set(read)])
    expect(read).toEqual(expect.arrayContaining(['README.md', 'tools/fixtures.ts', honest.file, pathForId(caSource.id)!, pathForId(nlSource.id)!]))
    expect(read).not.toContain('tsconfig.json')
  })

  it('reads the records, the locators, the reviews, the source records, the top-level markdown and .ts files, docs, research, the manifest and the tools', () => {
    const copied = record('k-cc-1', TWENTY, { summary: `The child puts ${EIGHT_OF_TWENTY} shade.` })
    const page = `For instance ${EIGHT_OF_TWENTY} shade.\n`
    const code = `export const NOTE = 'For instance ${EIGHT_OF_TWENTY} shade.'\n`
    write({
      ...sampleTree(),
      [copied.file]: copied.text,
      'README.md': page,
      'docs/notes/deep.md': page,
      'research/web.md': page,
      'locators/us-ca/kindergarten/mathematics.json': JSON.stringify({ last: EIGHT_OF_TWENTY }),
      'reviews/us-ca/kindergarten/mathematics.json': JSON.stringify({ verdicts: [{ note: EIGHT_OF_TWENTY }] }),
      'manifest.ts': code,
      'ages.ts': code,
      'manifest/us-ca-additions.ts': code,
      'tools/fixtures.ts': code,
      'tools/deep/sample.test.ts': code,
      [pathForId(caSource.id)!]: composeRecord(caSource, page),
      [pathForId(nlSource.id)!]: composeRecord(nlSource, page),
      // Not read: the Dutch locators, and a file that is no text of the pack.
      'locators/nl/fase-1/mathematics.json': JSON.stringify({ last: EIGHT_OF_TWENTY }),
      'tsconfig.json': JSON.stringify({ note: EIGHT_OF_TWENTY }),
    })

    expect(rules(overlapTree(education, store)).sort()).toEqual(
      [
        'README.md eight-word-run',
        `${copied.file} eight-word-run`,
        'docs/notes/deep.md eight-word-run',
        'locators/us-ca/kindergarten/mathematics.json eight-word-run',
        'research/web.md eight-word-run',
        'reviews/us-ca/kindergarten/mathematics.json eight-word-run',
        'ages.ts eight-word-run',
        'manifest.ts eight-word-run',
        'manifest/us-ca-additions.ts eight-word-run',
        `${pathForId(caSource.id)!} eight-word-run`,
        `${pathForId(nlSource.id)!} eight-word-run`,
        'tools/deep/sample.test.ts eight-word-run',
        'tools/fixtures.ts eight-word-run',
      ].sort(),
    )
  })

  it('finds no statement of fewer than eight words standing whole in a file that is not a record: only the eight-word rule reads those', () => {
    const honest = record('k-cc-1', SIX, { summary: 'Builds a small tower from half a dozen beakers, unaided.' })
    write({ ...sampleTree(), [honest.file]: honest.text, 'tools/fixtures.ts': `// ${SIX}\n`, 'manifest/us-ca.ts': `// ${SIX}\n` })

    expect(overlapTree(education, store)).toEqual([])
  })
})
