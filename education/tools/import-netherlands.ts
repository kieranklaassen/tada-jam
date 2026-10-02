// The importer for the Dutch sources a script can read whole: one
// objective record per official statement, for every part of a Dutch lane
// whose selection is `legal` (a regulation in the XML of the legislation
// repository) or `data` (the curriculum institute's open data).
//
//   node education/tools/import-netherlands.ts                               every such part
//   node education/tools/import-netherlands.ts --lane einde-po/mathematics   the parts of one lane
//
// A part of located statements (a card, the draft decree) is not read here:
// the extraction writes it (extract.ts), so a lane can be partly filled when
// this is done. Each part is counted on its own against its expected count in
// the manifest, and a part whose count is off writes nothing.
//
// An import writes files and deletes none. When the import is done, each lane
// whose parts all succeeded is swept (sweepOrphans): a record file that no
// part of the lane gives any more is reported, and removed only when
// manifest/nl-additions.ts lists it as removed, with its reason. A file that
// is reported and not listed fails the run.
//
// Each source is read out of the store through readSource(), as its plan in
// the manifest says, and each record is written through writeObjective(): the
// Dutch sources may be quoted, so the wording goes into the file with its
// source line, and a second run changes nothing.
//
// Where the wording comes from:
//
//   legal   the text of the element of the legal XML that holds the statement.
//           The open data carries the same core goals; it is never the wording.
//           Where the manifest says its nodes pair one to one with the
//           statements, a record takes the id of its node as its slug, the
//           pairing is checked, and each wording that differs from the node's
//           is listed in the run's report. The record follows the law.
//   data    the goal text the manifest's walk and join lead to. Where the
//           data misfiles a goal, manifest/nl-additions.ts corrects it by the
//           id of its goal-at-level object: the record takes the group of
//           another cluster (regroup), is filed at another level (relevel),
//           or is no record because it is a copy (skip). The code stays the
//           data's, and the locator says where the data lists the goal and
//           what was corrected. A releveled record whose file stands in the
//           lane of its old level is moved, with what a lane agent wrote in
//           it, before it is written.
//
//           Where the data cuts a statement short, the wording is the
//           statement as the part's content-line PDF prints it
//           (NL_RESTORED_STATEMENTS), and the source line cites that PDF. It
//           ends where the upright statement ends: an example in italics
//           that closes it is accompanying text, as for any other goal, and
//           an example inside its sentence stays in the wording.
//
// Accompanying text. For a part whose content-line PDF prints examples in
// italics (NL_EXAMPLES), every goal is joined by its text to the statement
// the PDF prints for it (content-lines.ts), and what the PDF sets in italics
// with it becomes the record's accompanying text: in the store, and in the
// file under its own line, after the wording. The wording and its hash stay
// the data's. A goal that cannot be joined stops the run.
//
// An example that closes its goal is cut where the italics open, not where
// the letters of the wording run out: a bracket or a quotation mark that
// closes the statement is set upright and stays with the statement. A digit
// the page raises is written raised (m²), and a sign of the Symbol font as
// the character it prints (≈). The source line names the page, or the
// pages, the example itself stands on, which need not be the page the goal
// opens on.
//
// Every part of every lane is read before anything is written, so a
// correction that does not fit its source stops the run with the tree as it
// was.
//
// What a record's fields are made of:
//
//   wording      the official text, each run of whitespace one space. Without
//                the number, letter or dash that opens the statement in its
//                list, and without soft hyphens. A statement of the legal
//                text that holds several paragraphs, list items or cells
//                keeps them apart: each is a line of the wording, so two
//                examples printed under one statement do not run together.
//                A line break is whitespace to the hash (normalise.ts), so
//                it changes no hash. Where the legal text prints an image,
//                the wording holds the transcription the manifest lists for
//                it, marked as standing for an image (imageMarker in
//                manifest/nl-additions.ts), or IMAGE_PLACEHOLDER when the
//                manifest lists none. What the text sets raised or lowered
//                (sup, inf) is written with the raised and lowered
//                characters: 6¹/₄, m³.
//   code         as printed: the number and letters of a core goal, the article
//                of an aim, the code the data gives a per-band goal (also when
//                it names another fase than the goal links to). Empty for a
//                reference level, which prints none.
//   code_scope   the title of the source record, then the statement's group in
//                the manifest: the set, the area and the heading. A batch is
//                found by what the scope ends in (lane-text.ts).
//   title        the code and the group. For a statement without a code, the
//                group and the labels that lead to it.
//   standing, regime, curriculum_version, reuse_policy
//                the source record's of the part. Never the open data's own
//                status, which calls enacted goals drafts.
//   slug         the id of the paired node, or of the goal-at-level object;
//                otherwise the group and the code or labels, as the
//                extraction names a located statement.
//   locator      legal: the path of the nearest element that has one, then the
//                group and the code or labels. data: the files, entities and
//                ids the text was reached through.

import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { IMAGE_PLACEHOLDER, planFor } from '../manifest.ts'
import type { DataNodes, DataSelection, DataStep, Lane, LanePart, LegalSelection, StatementRef } from '../manifest.ts'
import { NL_ADDITIONS, NO_ADDITIONS, imageMarker } from '../manifest/nl-additions.ts'
import type { CorrectedGoal, NlAdditions, RemovedRecord } from '../manifest/nl-additions.ts'
import { NL_LANES, NL_SOURCE_PLANS } from '../manifest/nl.ts'
import { closingExample, columnOfLevel, holdsPrivateUse, italicStretches, joinGoals, letters, pagesOf, readContentLine, runsAfterWording, statementsOf, textOf as printedText, uprightOf } from './content-lines.ts'
import type { ContentLine, PrintedItem, Run } from './content-lines.ts'
import { collapse, normalise, normaliseCode } from './normalise.ts'
import { statusCounts, writeObjective } from './record-writer.ts'
import type { ObjectiveFields, ObjectiveInput, WriteResult } from './record-writer.ts'
import { decodeEntities, readSource, readSourceRecord } from './rendition.ts'
import { laneKey, levelSlug, objectiveId, parseId, pathForId, slugify, sourceId } from './schema.ts'
import type { SourceFrontmatter } from './schema.ts'
import { requireStore, sha256, storeRoot } from './store.ts'
import type { Finding } from './validate.ts'

// ---------------------------------------------------------------------------
// A reader for the legal XML. The files are well-formed and hold no CDATA.
// ---------------------------------------------------------------------------

export interface XmlNode {
  name: string
  attributes: Record<string, string>
  children: (XmlNode | string)[]
  parent: XmlNode | null
}

// The attribute that gives every structural element its path.
const PATH = 'bwb-ng-variabel-deel'

// A comment, a declaration, a closing tag, an opening tag with its attributes, or text.
const TOKEN = /<!--[\s\S]*?-->|<[?!][^>]*>|<\/([^\s>]+)\s*>|<([^\s/>]+)((?:\s+[^\s=/>]+\s*=\s*(?:"[^"]*"|'[^']*'))*)\s*(\/?)>|([^<]+)/g
const ATTRIBUTE = /([^\s=]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g

export function parseXml(text: string): XmlNode {
  const root: XmlNode = { name: '', attributes: {}, children: [], parent: null }
  let open = root
  for (const token of text.matchAll(TOKEN)) {
    const [, closing, opening, attributes, empty, between] = token
    if (between !== undefined) open.children.push(decodeEntities(between))
    else if (opening !== undefined) {
      const node: XmlNode = { name: opening, attributes: {}, children: [], parent: open }
      for (const attribute of (attributes ?? '').matchAll(ATTRIBUTE)) node.attributes[attribute[1]!] = decodeEntities(attribute[2] ?? attribute[3] ?? '')
      open.children.push(node)
      if (empty === '') open = node
    } else if (closing !== undefined) {
      if (closing !== open.name || !open.parent) throw new Error(`the XML closes <${closing}> where <${open.name}> is open`)
      open = open.parent
    }
  }
  if (open !== root) throw new Error(`the XML ends where <${open.name}> is open`)
  return root
}

const elements = (node: XmlNode): XmlNode[] => node.children.filter((child): child is XmlNode => typeof child !== 'string')
const named = (node: XmlNode, name: string): XmlNode[] => elements(node).filter((child) => child.name === name)

// Every element below a node with this name, in document order.
function all(node: XmlNode, name: string): XmlNode[] {
  return elements(node).flatMap((child) => [...(child.name === name ? [child] : []), ...all(child, name)])
}

// The structural element with this path. A reference to it (intref) carries the same attribute.
function find(root: XmlNode, path: string): XmlNode {
  const search = (node: XmlNode): XmlNode | null => {
    for (const child of elements(node)) {
      if (child.attributes[PATH] === path && child.name !== 'intref' && child.name !== 'extref') return child
      const below = search(child)
      if (below) return below
    }
    return null
  }
  const found = search(root)
  if (!found) throw new Error(`the legal text has no element with the path ${path}`)
  return found
}

// The path of the nearest element at or above a node that has one.
function pathOf(node: XmlNode): string {
  for (let at: XmlNode | null = node; at; at = at.parent) if (at.attributes[PATH] !== undefined) return at.attributes[PATH]
  return ''
}

// The publication data beside an element's text.
const NOT_TEXT = new Set(['meta-data', 'jcis'])
// Elements that stand apart from what is around them: a paragraph, a list item and its number, the parts of a heading, a table cell.
const APART = new Set(['al', 'li', 'li.nr', 'lijst', 'label', 'nr', 'titel', 'entry', 'row'])
// Of those, the ones that open a new line in the text of a statement: a paragraph, a list item, a list, a table cell and row.
const LINE = new Set(['al', 'li', 'lijst', 'entry', 'row'])
// The marker that opens a list item: it stays on the line of the item's first paragraph.
const ITEM_MARKER = 'li.nr'

// An image, while a statement is being read: the name of its file between
// two characters no text holds. imagesIn() names the images of a text, and
// withImages() writes each as its transcription or as the placeholder.
const IMAGE_OPENS = '\uE000'
const IMAGE_CLOSES = '\uE001'
const IMAGE_TOKEN = new RegExp(`${IMAGE_OPENS}([^${IMAGE_CLOSES}]*)${IMAGE_CLOSES}`, 'g')
// An image stands inside its sentence: nothing between it and the punctuation mark that follows it.
const AFTER_IMAGE = new RegExp(`(${IMAGE_CLOSES}) (?=[,;.:])`, 'g')

const imageToken = (node: XmlNode): string => `${IMAGE_OPENS}${all(node, 'illustratie')[0]?.attributes.naam ?? ''}${IMAGE_CLOSES}`
const imagesIn = (text: string): string[] => [...text.matchAll(IMAGE_TOKEN)].map((match) => match[1]!)
const withImages = (text: string, transcriptions: Readonly<Record<string, { text: string }>>): string =>
  text.replace(IMAGE_TOKEN, (_, name: string) => (transcriptions[name] ? imageMarker(transcriptions[name].text) : IMAGE_PLACEHOLDER))

// The raised and the lowered form of each digit and letter that has one.
// Read flat, a raised or lowered character runs into what is beside it: a
// mixed number (6 and 1/4) would read 61/4. A character without such a form
// stays as it is, and nothing is added.
const pairs = (plain: string, set: string): Map<string, string> => new Map([...plain].map((character, index) => [character, [...set][index]!]))
const RAISED = pairs('0123456789abcdefghijklmnoprstuvwxyzABDEGHIJKLMNOPRTUVW', '⁰¹²³⁴⁵⁶⁷⁸⁹ᵃᵇᶜᵈᵉᶠᵍʰⁱʲᵏˡᵐⁿᵒᵖʳˢᵗᵘᵛʷˣʸᶻᴬᴮᴰᴱᴳᴴᴵᴶᴷᴸᴹᴺᴼᴾᴿᵀᵁⱽᵂ')
const LOWERED = pairs('0123456789aehijklmnoprstuvx', '₀₁₂₃₄₅₆₇₈₉ₐₑₕᵢⱼₖₗₘₙₒₚᵣₛₜᵤᵥₓ')

function rawText(node: XmlNode | string): string {
  if (typeof node === 'string') return node
  if (NOT_TEXT.has(node.name)) return ''
  if (node.name === 'plaatje') return ` ${imageToken(node)} `
  const text = node.children.map(rawText).join('')
  if (node.name === 'sup' || node.name === 'inf') {
    const forms = node.name === 'sup' ? RAISED : LOWERED
    return [...text].map((character) => forms.get(character) ?? character).join('')
  }
  return APART.has(node.name) ? ` ${text} ` : text
}

// The text of elements in a row, each run of whitespace one space.
function textOf(...nodes: readonly XmlNode[]): string {
  return collapse(nodes.map(rawText).join(' ')).replace(AFTER_IMAGE, '$1')
}

// The text of elements in a row as the lines the XML holds it in: every
// paragraph, list item and table cell opens a new line, and inside a line
// each run of whitespace is one space. Two things stay on the line they
// belong to: the marker of a list item (its dash, letter or number) on the
// line of the item's first paragraph, and an image, which the XML sets
// between two paragraphs, on the line before it. A line without text is left
// out.
function linesOf(...nodes: readonly XmlNode[]): string {
  const lines: string[] = ['']
  // A new line opens with the next text. After a list marker, that text goes on the marker's line.
  let opens = false
  let marked = false
  const add = (text: string): void => {
    if (opens && text.trim() !== '') {
      if (marked) lines[lines.length - 1] += ' '
      else lines.push('')
      opens = false
      marked = false
    }
    if (!opens) lines[lines.length - 1] += text
  }
  const visit = (node: XmlNode | string): void => {
    if (typeof node === 'string') return add(node)
    if (NOT_TEXT.has(node.name)) return
    if (node.name === 'plaatje') {
      opens = false
      return add(` ${imageToken(node)} `)
    }
    if (node.name === 'sup' || node.name === 'inf') return add(rawText(node))
    const line = LINE.has(node.name)
    if (node.name === 'li') marked = false
    if (line) opens = true
    else if (APART.has(node.name)) add(' ')
    node.children.forEach(visit)
    if (line) opens = true
    else if (APART.has(node.name)) add(' ')
    if (node.name === ITEM_MARKER) marked = true
  }
  nodes.forEach((node) => {
    opens = true
    visit(node)
  })
  return lines
    .map((line) => collapse(line).replace(AFTER_IMAGE, '$1'))
    .filter((line) => line !== '')
    .join('\n')
}

// The running text of a division of the legal text, for a frame to quote: what
// stands in it beside the statements that are records. One line per heading,
// paragraph and list item:
//
//   - a heading of a division (its number and title) and a heading inside it
//     stand at the margin;
//   - a paragraph is set in under them, a list item after its number, and a
//     list inside an item further in;
//   - a table stands by its caption alone: its cells are read as statements;
//   - a footnote is taken out of its sentence, which keeps the number of the
//     note in square brackets where the mark stands, and follows its
//     paragraph on a line of its own after the same number. The brackets are
//     not the decree's.
export function runningText(root: XmlNode, path: string): string {
  const lines: string[] = []
  // The text of a paragraph, and the footnotes taken out of it.
  const paragraph = (node: XmlNode): { text: string; notes: string[] } => {
    const notes: string[] = []
    const without = (each: XmlNode): XmlNode => ({
      ...each,
      children: each.children.map((child) => {
        if (typeof child === 'string') return child
        if (child.name !== 'noot') return without(child)
        const number = textOf(...named(child, 'noot.nr'))
        notes.push(`[${number}] ${textOf(...named(child, 'noot.al'))}`)
        return `[${number}]`
      }),
    })
    return { text: textOf(without(node)), notes }
  }
  const visit = (node: XmlNode, pad: string, opens = ''): void => {
    // `opens` goes before the first paragraph: the number of a list item.
    let lead = opens
    for (const child of elements(node)) {
      if (NOT_TEXT.has(child.name) || child.name === ITEM_MARKER) continue
      if (child.name === 'kop') lines.push(collapse(`${textOf(...named(child, 'nr'))} ${textOf(...named(child, 'titel'))}`))
      else if (child.name === 'tussenkop') lines.push(textOf(child))
      else if (child.name === 'al') {
        const { text, notes } = paragraph(child)
        if (text === '') continue
        lines.push(`${pad}${lead === '' ? (opens === '' ? '' : '  ') : `${lead} `}${text}`)
        lead = ''
        for (const note of notes) lines.push(`${pad}${opens === '' ? '' : '  '}${note}`)
      } else if (child.name === 'lijst') {
        for (const item of named(child, 'li')) visit(item, opens === '' ? pad : `${pad}  `, textOf(...named(item, ITEM_MARKER)) || '-')
      } else if (child.name === 'table') lines.push(`${pad}${textOf(...named(child, 'title'))}`)
      else visit(child, pad)
    }
  }
  visit({ name: '', attributes: {}, children: [find(root, path)], parent: null }, '  ')
  return lines.join('\n')
}

// "bijlage 1", or "bijlage" for a regulation with one annex, from the path of something inside it.
function annexOf(path: string): string {
  const number = /^\/Bijlage(\d*)/.exec(path)
  if (!number) throw new Error(`${path} is not inside an annex`)
  return `bijlage${number[1] === '' ? '' : ` ${number[1]}`}`
}

// ---------------------------------------------------------------------------
// Statements of the legal text. Each shape of regulation has its reader; what
// a reader gives is then matched with the statements the manifest lists.
// ---------------------------------------------------------------------------

interface Found {
  // The last heading above the statement, as printed: what the last part of its group in the manifest names.
  heading: string
  // The level its column is headed with, in a table with a column per level.
  level?: string
  // What the manifest's `code` holds for it: its code as printed, or the
  // printed labels that lead to it and its position under them. Left out
  // where neither can be read from the text: such statements are paired with
  // the manifest's, heading by heading, in the order they stand in.
  code?: string
  // False for a statement of a level table: the text prints no code for it,
  // so its record has none, and what the manifest names it by goes to its
  // title and locator.
  printsCode: boolean
  wording: string
  // The path of the nearest element that has one.
  path: string
  // How a source line cites the place, up to the code.
  cite: string
  // What stands with the statement and is not part of it.
  note?: string
  // The names of the image files the statement holds, in order. Set once the wording holds no image token any more.
  images?: string[]
}

type Reader = (root: XmlNode, paths: readonly string[]) => Found[]

// The core goals of 2026: one table per goal in the division of its domain.
// The first row holds "Kerndoel N", the second the goal sentence; a row of
// three cells that opens with a capital letter is a doelzin, and the
// paragraphs of its third cell that open with a small letter are its items.
// An item is one line, also where an image splits it over several
// paragraphs: there the paragraphs are the pieces of one sentence.
const coreGoalTables: Reader = (root, paths) =>
  paths.flatMap((path) => {
    const part = find(root, path)
    const kop = named(part, 'kop')[0]
    const cite = `${annexOf(path)}, ${kop ? `${textOf(...named(kop, 'label')).toLowerCase()} ${textOf(...named(kop, 'nr'))}, ` : ''}kerndoel `
    return all(part, 'table').flatMap((table) => {
      const rows = all(table, 'row')
      const number = /^Kerndoel (\d+)$/.exec(rows[0] ? textOf(rows[0]) : '')?.[1]
      if (number === undefined || !rows[1]) throw new Error(`a table of ${path} does not open with "Kerndoel N" and a goal sentence`)
      const at = { heading: `Kerndoel ${number}`, printsCode: true, path: pathOf(table), cite }
      const found: Found[] = [{ ...at, code: number, wording: linesOf(rows[1]) }]
      for (const row of rows.slice(2)) {
        const [opening, sentence, items] = named(row, 'entry')
        const letter = opening && sentence && items ? /^([A-Z])\.$/.exec(textOf(opening))?.[1] : undefined
        if (letter === undefined) continue
        found.push({ ...at, code: `${number} ${letter}`, wording: linesOf(sentence!) })
        // An item runs from the paragraph that opens with its letter to the next such paragraph: an image splits one item over several.
        const pieces: { letter: string; nodes: XmlNode[] }[] = []
        for (const child of elements(items!)) {
          const small = child.name === 'al' ? /^([a-z])\.(?: |$)/.exec(textOf(child))?.[1] : undefined
          if (small !== undefined) pieces.push({ letter: small, nodes: [child] })
          else if (pieces.length > 0) pieces.at(-1)!.nodes.push(child)
          else throw new Error(`kerndoel ${number} ${letter} of ${path} holds text before its first lettered item`)
        }
        for (const piece of pieces) found.push({ ...at, code: `${number} ${letter} ${piece.letter}`, wording: textOf(...piece.nodes).replace(/^[a-z]\. ?/, '') })
      }
      return found
    })
  })

// The core goals of 2006: numbered items in the lists of a division, each list under the heading of its sub-area.
const numberedGoals: Reader = (root, paths) =>
  paths.flatMap((path) => {
    const found: Found[] = []
    let heading = ''
    for (const child of elements(find(root, path))) {
      if (child.name === 'tussenkop') heading = textOf(child)
      if (child.name !== 'lijst') continue
      for (const item of named(child, 'li')) {
        const [number, ...rest] = elements(item)
        const code = number?.name === 'li.nr' ? /^(\d+)\.$/.exec(textOf(number))?.[1] : undefined
        if (code !== undefined) found.push({ heading, code, printsCode: true, wording: linesOf(...rest), path: pathOf(item), cite: `${annexOf(path)}, kerndoel ` })
      }
    }
    return found
  })

// An aim for childcare: a paragraph (lid) of an article, each lettered part
// of an article that is a lead-in and a list, or the first paragraph of an
// article. The text prints no code beside it: the article and the part are
// the manifest's, paired in order.
const aims: Reader = (root, paths) => {
  const heading = textOf(...all(root, 'citeertitel').slice(0, 1))
  return paths.flatMap((path): Found[] => {
    const element = find(root, path)
    const at = { heading, printsCode: true, cite: '' }
    if (element.name === 'lid') return [{ ...at, wording: linesOf(...elements(element).filter((child) => child.name !== 'lidnr')), path }]
    const list = named(element, 'lijst')[0]
    if (!list) return [{ ...at, wording: textOf(...named(element, 'al').slice(0, 1)), path }]
    const note = `The article opens, before its lettered parts: "${textOf(...named(element, 'al'))}"`
    return named(list, 'li').map((item) => ({ ...at, wording: linesOf(...elements(item).filter((child) => child.name !== 'li.nr')), path: pathOf(item), note }))
  })
}

// The columns an entry of a table stands in.
function columnsOf(entry: XmlNode, table: XmlNode): string[] {
  const { colname, namest, nameend } = entry.attributes
  if (namest === undefined || nameend === undefined) return colname === undefined ? [] : [colname]
  const columns = all(table, 'colspec').map((column) => column.attributes.colname!)
  return columns.slice(columns.indexOf(namest), columns.indexOf(nameend) + 1)
}

// The paragraphs of a cell that hold text.
const paragraphsOf = (entry: XmlNode): XmlNode[] => named(entry, 'al').filter((paragraph) => textOf(paragraph) !== '')

// The heading of a division, without the word that marks a table running on.
const headingOf = (division: XmlNode): string => textOf(...named(division, 'kop')).replace(' vervolg ', ' ')

// The reference levels for Dutch: tables with a column per level, one table
// to a division, running on through the divisions headed "vervolg".
//
// Where the columns are headed "Niveau 1F", a record is one paragraph of a
// level cell. Its code is the group label above its row (a row with a label
// and empty cells), the label of its row and its position in the cell. A
// group label holds until the next one, also in the next division of the
// same section. A paragraph that holds only a joining sign ("+": what
// follows comes on top of what stands before it) is no statement: it is
// joined to the paragraph before it, on its line, and the paragraphs after
// it keep the positions the cell gives them.
//
// Where they are headed "1F", a record is a whole cell, named by the label
// of its row, its paragraphs as lines; or, where the cell holds only "+",
// the label of the row itself, which the mark gives to that level. The
// headings above such a row are not read here.
const JOINING_SIGN = /^\+$/

const levelTables: Reader = (root, paths) => {
  const found: Found[] = []
  let section = ''
  let group = ''
  for (const path of paths) {
    const division = find(root, path)
    const heading = headingOf(division)
    if (heading !== section) group = ''
    section = heading
    for (const table of named(division, 'table')) {
      const levels = new Map<string, string>()
      let perParagraph = false
      for (const entry of all(table, 'thead').flatMap((head) => all(head, 'entry'))) {
        const head = /^(Niveau )?(\d[FS])$/.exec(textOf(entry))
        if (!head) continue
        perParagraph = head[1] !== undefined
        for (const column of columnsOf(entry, table)) levels.set(column, head[2]!)
      }
      for (const row of all(table, 'tbody').flatMap((body) => named(body, 'row'))) {
        const [first, ...rest] = named(row, 'entry')
        const label = first ? textOf(first) : ''
        const cells = rest.flatMap((entry) => columnsOf(entry, table).slice(0, 1).map((column) => ({ entry, level: levels.get(column) }))).filter((cell) => cell.level !== undefined)
        const empty = rest.every((entry) => textOf(entry) === '')
        if (label === '' && empty) continue
        if (label === '') throw new Error(`a row of ${path} holds text and has no label`)
        if (perParagraph && empty) {
          group = label
          continue
        }
        for (const { entry, level } of cells) {
          const at = { heading, level: level!, printsCode: false, path, cite: `${annexOf(path)}, ${heading}, niveau ${level}, ` }
          const text = textOf(entry)
          if (perParagraph) {
            let before: Found | undefined
            paragraphsOf(entry).forEach((paragraph, index) => {
              const wording = textOf(paragraph)
              if (before && JOINING_SIGN.test(wording)) before.wording += ` ${wording}`
              else found.push((before = { ...at, code: `${group === '' ? '' : `${group} / `}${label} / ${index + 1}`, wording }))
            })
          } else if (text === '+') found.push({ ...at, wording: linesOf(first!) })
          else if (text !== '') found.push({ ...at, code: label, wording: linesOf(entry) })
        }
      }
    }
  }
  return found
}

// The three kinds of knowledge the arithmetic tables are split by.
const KINDS_OF_KNOWLEDGE = ['Paraat hebben', 'Functioneel gebruiken', 'Weten waarom']
// The dash that opens a statement of an arithmetic table.
const DASH = /^– ?/

// The reference levels for arithmetic: one table per domain for a pair of
// levels, running on through the divisions headed "vervolg". The first
// column names the sub-area ("A Notatie, taal en betekenis"); the others
// hold the levels. A head cell, or a cell inside the table, names the level
// and the kind of knowledge of the cells below it. A record is one paragraph
// that opens with a dash, with every paragraph and image after it up to the
// next dash, kind or sub-area of the same level: its examples, the rest of
// its line, its sub-points, wherever in the level's columns they stand. Each
// of those paragraphs is a line of the wording, and an image stays on the
// line before it. Its code is the sub-area, the kind and its position under
// them.
const arithmeticTables: Reader = (root, paths) => {
  const found: Found[] = []
  const pieces = new Map<Found, XmlNode[]>()
  const positions = new Map<string, number>()
  let domain = ''
  let subArea = ''
  for (const path of paths) {
    const division = find(root, path)
    const name = /^(\d+)\.\d+ (.+) niveau \S+ en \S+$/.exec(headingOf(division))
    if (!name) throw new Error(`the heading of ${path} does not name a domain and a pair of levels`)
    const heading = `${name[1]} ${name[2]}`
    if (heading !== domain) subArea = ''
    domain = heading
    for (const table of named(division, 'table')) {
      const levels = new Map<string, string>()
      const kinds = new Map<string, string>()
      const open = new Map<string, Found>()
      const first = all(table, 'colspec')[0]?.attributes.colname
      for (const row of all(table, 'row')) {
        for (const entry of named(row, 'entry')) {
          const columns = columnsOf(entry, table)
          if (columns[0] === first) {
            const area = paragraphsOf(entry).map((paragraph) => textOf(paragraph)).find((text) => /^[A-Z] [A-Z]/.test(text))
            if (area !== undefined) {
              subArea = area
              open.clear()
            }
            continue
          }
          const headed = /^Niveau (\S+)$/.exec(textOf(...paragraphsOf(entry).slice(0, 1)))?.[1]
          if (headed !== undefined) for (const column of columns) levels.set(column, headed)
          const level = levels.get(columns[0] ?? '')
          if (level === undefined) continue
          for (const child of elements(entry)) {
            const text = textOf(child)
            if (text === '' || text === `Niveau ${level}`) continue
            if (KINDS_OF_KNOWLEDGE.includes(text)) {
              kinds.set(level, text)
              open.delete(level)
            } else if (DASH.test(text)) {
              const kind = kinds.get(level)
              if (subArea === '' || kind === undefined) throw new Error(`a statement of ${path} stands under no sub-area or kind of knowledge: "${text.slice(0, 40)}"`)
              const under = `${subArea} / ${kind}`
              const position = (positions.get(`${heading}\n${level}\n${under}`) ?? 0) + 1
              positions.set(`${heading}\n${level}\n${under}`, position)
              const statement: Found = { heading, level, code: `${under} / ${position}`, printsCode: false, wording: '', path, cite: `${annexOf(path)}, ${heading}, niveau ${level}, ` }
              found.push(statement)
              pieces.set(statement, [child])
              open.set(level, statement)
            } else {
              const statement = open.get(level)
              if (!statement) throw new Error(`a paragraph of ${path}, niveau ${level}, belongs to no statement: "${text.slice(0, 40)}"`)
              pieces.get(statement)!.push(child)
            }
          }
        }
      }
    }
  }
  for (const statement of found) statement.wording = linesOf(...pieces.get(statement)!).replace(DASH, '')
  return found
}

// How each regulation is read. The id of its source record says which it is.
const nl = (key: string): string => sourceId('nl', `nl-${key}`)
const READERS: Readonly<Record<string, Reader>> = {
  [nl('wet-kerndoelen-po-2026')]: coreGoalTables,
  [nl('wet-kerndoelen-po-2006')]: numberedGoals,
  [nl('wet-kerndoelen-po-2006-v2012')]: numberedGoals,
  // Annex 1 is Dutch, annex 2 arithmetic.
  [nl('wet-referentieniveaus-besluit')]: (root, paths) => (paths.every((path) => path.startsWith('/Bijlage2/')) ? arithmeticTables(root, paths) : levelTables(root, paths)),
  [nl('wet-kinderopvang')]: aims,
  [nl('wet-besluit-kwaliteit-kinderopvang')]: aims,
  [nl('wet-besluit-voorschoolse-educatie')]: aims,
}

// ---------------------------------------------------------------------------
// The open data: a tree of flat objects, walked from the top.
// ---------------------------------------------------------------------------

type Json = Record<string, unknown>

// The data files of one clone, by the id of its source record.
export interface Repository {
  // The objects of a file, and the same by their `id`.
  objects: (file: string) => Json[]
  byId: (file: string) => Map<string, Json>
}

const idsIn = (value: unknown): string[] => (Array.isArray(value) ? value.map(String) : [])
const field = (object: Json, name: string): string => (object[name] === undefined || object[name] === null ? '' : String(object[name]))

// One object of the walk, with the objects above it.
interface Visit {
  step: DataStep
  object: Json
  // From the top of the tree down to the object one step up.
  above: Visit[]
  // The objects one step down that it lists, in the order it lists them.
  below: Visit[]
}

// Every object the walk of a selection reaches, parents before children.
function walk(selection: DataSelection, repository: Repository): Visit[] {
  const keeps = (step: DataStep, object: Json): boolean => Object.entries(step.where ?? {}).every(([name, values]) => values.includes(field(object, name)))
  const visits: Visit[] = []
  const descend = (object: Json, index: number, above: Visit[]): Visit => {
    const step = selection.walk[index]!
    const visit: Visit = { step, object, above, below: [] }
    visits.push(visit)
    const next = selection.walk[index + 1]
    if (next?.via !== undefined) {
      const objects = repository.byId(next.file)
      for (const id of idsIn(object[next.via])) {
        const child = objects.get(id)
        if (!child) throw new Error(`${step.entity} ${field(object, 'id')} lists ${next.entity} ${id}, which is not in ${next.file}`)
        if (keeps(next, child)) visit.below.push(descend(child, index + 1, [...above, visit]))
      }
    }
    return visit
  }
  const top = selection.walk[0]!
  for (const object of repository.objects(top.file)) if (keeps(top, object)) descend(object, 0, [])
  return visits
}

// A record object of the open data, as a selection picks it.
interface Node {
  object: Json
  id: string
  // The code as the data has it, less the spaces around it.
  code: string
  wording: string
  // The name of its group in the manifest.
  group: string
  // The value of the field that tells the groups apart.
  groupValue: string
  // The object of the walk that is it, or that lists it.
  visit: Visit
  // The goal its wording was joined from, when it was.
  goal?: string
  // What the manifest corrects of it, and the levels the data itself links it to.
  corrected?: CorrectedGoal
  dataLevels?: string[]
  // Where its wording was read, when it was restored from the part's content-line PDF: the pages it stands on.
  restored?: { pages: number[]; column: string }
  // The official text that accompanies it there, what that text is, and the pages it is printed on.
  example?: { kind: ExampleKind; text: string; pages: number[]; column: string }
}

// "page 3", or "pages 3 and 4" for what runs on overleaf.
export function pagesText(pages: readonly number[]): string {
  return pages.length === 1 ? `page ${pages[0]}` : `pages ${pages.slice(0, -1).join(', ')} and ${pages.at(-1)}`
}

// An example as a record holds it: a digit the page raises as the raised character.
const exampleText = (runs: readonly Run[]): string => printedText(runs, { raised: true })

// How a content-line PDF prints the example of a goal: under the goal, inside
// its sentence, under each of several printings of the goal, or in brackets
// after it without italics.
export type ExampleKind = 'under' | 'inside' | 'printings' | 'plain'

const EXAMPLE_NOTES: Record<ExampleKind, string> = {
  under: 'the example printed under this goal in the content-line PDF, in italics',
  inside: 'this goal as the content-line PDF prints it, with its examples, in italics there, inside the sentence',
  printings: 'the examples printed under this goal in the content-line PDF, which prints the goal more than once, each time with another example in italics',
  plain: 'the example printed in brackets after this goal in the content-line PDF',
}

// What nodesOf() needs to correct the goals of a part read from the open data.
interface Correcting {
  // The corrections of the part's source, by the id of the goal-at-level object.
  goals: Readonly<Record<string, CorrectedGoal>>
  // The lane being imported, as <level>/<subject>.
  here: string
  // Every corrected goal a walk reached at its level: kept as a record, or skipped as a copy.
  applied: Set<string>
  // The copies that were skipped, in the order the walk reached them.
  skipped: { id: string; code: string }[]
}

function nodesOf(selection: DataSelection, from: string, repositoryOf: (id: string) => Repository, correcting?: Correcting): Node[] {
  const repository = repositoryOf(from)
  const { level, join } = selection
  const fixes = correcting?.goals ?? {}
  const kindOf = <K extends CorrectedGoal['corrections'][number]['kind']>(fix: CorrectedGoal | undefined, kind: K) =>
    fix?.corrections.find((each): each is Extract<CorrectedGoal['corrections'][number], { kind: K }> => each.kind === kind)
  const titles = level ? new Map(repositoryOf(level.source).objects('niveaus.json').map((each) => [field(each, 'id'), field(each, 'title')])) : new Map<string, string>()
  const levelsOf = (object: Json): string[] => idsIn(object[level!.field]).map((id) => titles.get(id) ?? id)

  const groupOf = (visit: Visit): { visit: Visit; value: string; name: string } => {
    const group = [...visit.above, visit].find((each) => each.step.entity === selection.groupBy.entity)
    if (!group) throw new Error(`${visit.step.entity} ${field(visit.object, 'id')} stands under no ${selection.groupBy.entity}`)
    const value = field(group.object, selection.groupBy.field)
    const name = selection.groups.find((each) => each.name === value || each.name.endsWith(`(${value})`))?.name
    if (name === undefined) throw new Error(`the manifest names no group for ${selection.groupBy.entity} ${value}`)
    return { visit: group, value, name }
  }

  // Every goal the manifest corrects is one the data holds.
  if (join) for (const id of Object.keys(fixes)) if (!repositoryOf(join.source).byId(join.file).has(id)) throw new Error(`${from}: the manifest corrects the goal ${id}, which is not in ${join.file} of ${join.source}`)

  const nodes: Node[] = []
  for (const visit of walk(selection, repository)) {
    if (join) {
      // The records are goal-at-level objects of another repository, listed by any object of the walk.
      const joined = repositoryOf(join.source)
      const wordingOf = (object: Json, id: string): { text: string; goal: string } => {
        const goals = idsIn(object[join.wording.via])
        const goal = goals.length === 1 ? joined.byId(join.wording.file).get(goals[0]!) : undefined
        if (!goal) throw new Error(`${join.entity} ${id} does not list exactly one goal that is in ${join.wording.file}`)
        return { text: collapse(field(goal, join.wording.field)), goal: goals[0]! }
      }
      for (const id of idsIn(visit.object[join.via])) {
        const object = joined.byId(join.file).get(id)
        if (!object) throw new Error(`${visit.step.entity} ${field(visit.object, 'id')} lists ${join.entity} ${id}, which is not in ${join.file} of ${join.source}`)
        const code = field(object, selection.codeField).trim()
        const fix = fixes[id]
        if (fix && fix.code !== code) throw new Error(`${from}: the data gives the goal ${id} the code ${code}, and the manifest corrects it under the code ${fix.code}`)
        // The level is the one the object links to, whatever its code says, unless the manifest files the goal at another.
        const dataLevels = level ? levelsOf(object) : []
        const relevel = kindOf(fix, 'relevel')
        if (relevel && dataLevels.length === 1 && dataLevels[0] === relevel.level) throw new Error(`${from}: the manifest files the goal ${id} (${code}) at ${relevel.level}, and the data already links it to ${relevel.level}: the correction is not needed`)
        if (relevel && dataLevels.join(', ') !== relevel.from) throw new Error(`${from}: the manifest says the data links the goal ${id} (${code}) to ${relevel.from}, and the data links it to ${dataLevels.join(', ') || 'no level'}`)
        const levels = relevel ? [relevel.level] : dataLevels
        if (level && !(levels.length > 0 && levels.every((title) => level.titles.includes(title)))) continue
        if (fix && correcting) {
          if (fix.lane !== correcting.here) throw new Error(`${from}: the goal ${id} (${code}) is a record of ${correcting.here}, and the manifest lists it under ${fix.lane}`)
          correcting.applied.add(id)
        }
        const { text, goal } = wordingOf(object, id)
        const skip = kindOf(fix, 'skip')
        if (skip) {
          // A copy is skipped only while it still is one: the same text as its twin.
          const twin = joined.byId(join.file).get(skip.copyOf)
          if (!twin || normalise(wordingOf(twin, skip.copyOf).text) !== normalise(text)) throw new Error(`${from}: the goal ${id} (${code}) is no copy of ${skip.copyOf}: ${twin ? 'their texts differ' : `that goal is not in ${join.file}`}`)
          correcting?.skipped.push({ id, code })
          continue
        }
        const listed = groupOf(visit)
        const regroup = kindOf(fix, 'regroup')
        if (regroup && listed.value === regroup.cluster) throw new Error(`${from}: the manifest groups the goal ${id} (${code}) under ${regroup.cluster}, and the data already lists it under ${regroup.cluster}: the correction is not needed`)
        const name = regroup ? selection.groups.find((each) => each.name === regroup.cluster || each.name.endsWith(`(${regroup.cluster})`))?.name : listed.name
        if (name === undefined) throw new Error(`${from}: the manifest groups the goal ${id} (${code}) under ${regroup!.cluster}, which is not a group of the part that reaches it`)
        nodes.push({ object, id, code, wording: text, group: name, groupValue: regroup ? regroup.cluster : listed.value, visit, goal, ...(fix ? { corrected: fix, dataLevels } : {}) })
      }
    } else if (selection.recordEntities.includes(visit.step.entity)) {
      const group = groupOf(visit)
      if (level) {
        // The group's objects carry the level: the group is in when each lists exactly these levels.
        const carriers = (each: Visit): Visit[] => [...(each.step.entity === level.entity ? [each] : []), ...each.below.flatMap(carriers)]
        const under = carriers(group.visit)
        const wanted = [...level.titles].sort().join('\n')
        if (under.length === 0 || !under.every((each) => levelsOf(each.object).sort().join('\n') === wanted)) continue
      }
      nodes.push({
        object: visit.object,
        id: field(visit.object, 'id'),
        code: field(visit.object, selection.codeField).trim(),
        wording: collapse(field(visit.object, selection.wordingField!)),
        group: group.name,
        groupValue: group.value,
        visit,
      })
    }
  }
  return nodes
}

const SMALL_LETTERS = 'abcdefghijklmnopqrstuvwxyz'

// The printed code of the statement a node of the core-goal data carries:
// the number of its goal, the capital letter of its doelzin, and for an item
// the small letter of its place among its doelzin's items, ordered by the
// number in their prefix ("u3" is c) and not by the order of the array. A
// goal of 2006 ("PO Kerndoel 07") is its number.
function printedCode(node: Node, selection: DataSelection): string {
  return [...node.visit.above, node.visit]
    .filter((visit) => selection.recordEntities.includes(visit.step.entity))
    .map((visit) => {
      const code = field(visit.object, selection.codeField).trim()
      const goal = /^PO Kerndoel 0*(\d+)$/.exec(code)
      if (goal) return goal[1]!
      const numbered = (each: Visit): number => Number(/^u(\d+)$/.exec(field(each.object, selection.codeField).trim())?.[1])
      if (Number.isNaN(numbered(visit))) return code
      const before = (visit.above.at(-1)?.below ?? []).filter((each) => numbered(each) < numbered(visit)).length
      return SMALL_LETTERS[before] ?? code
    })
    .join(' ')
}

// ---------------------------------------------------------------------------
// Parts to records.
// ---------------------------------------------------------------------------

export interface Difference {
  // The printed code of the statement.
  code: string
  // Where the legal text and the node of the open data part ways.
  note: string
}

// An image of the legal text inside a statement that was imported.
export interface ImportedImage {
  // The statement, as the manifest names it in its group.
  code: string
  // The name of the image file, as the XML has it.
  image: string
  // False when the manifest lists no transcription: the wording holds IMAGE_PLACEHOLDER there.
  transcribed: boolean
}

// A goal of the open data that the manifest corrects.
export interface CorrectedRecord {
  id: string
  // The code the data gives it.
  code: string
  kinds: ('regroup' | 'relevel' | 'skip')[]
}

export interface PartImport {
  // The lane's folder, relative to education/: corpus/nl/<level>/<subject>.
  lane: string
  // The name of the part in the manifest.
  part: string
  kind: 'legal' | 'data'
  // The records the part should give, by the manifest.
  expected: number
  // One per record written, in the manifest's order. None when the part failed.
  results: WriteResult[]
  // For a legal part whose data nodes pair one to one: each statement whose
  // normalised wording is not its node's. Null for every other part.
  differences: Difference[] | null
  // For a legal part: every image inside a statement it wrote. Empty for every other part, and when the part failed.
  images: ImportedImage[]
  // For a part read from the open data: every goal the manifest corrects that
  // the part holds or skips, with the kinds of its corrections. Empty for
  // every other part, and when the part failed.
  corrected: CorrectedRecord[]
  // The files of releveled goals that were moved into this lane from the lane of their old level.
  moved: { from: string; to: string }[]
  // For a part read from the open data: the statements whose wording was read from the content-line PDF, and the pages each stands on.
  restored: { id: string; code: string; pages: number[] }[]
  // The records that carry an example of the content-line PDF as accompanying text, and how the PDF prints it.
  examples: { id: string; code: string; kind: ExampleKind }[]
  // What else the join with the content-line PDF found: a goal joined only as
  // the last of its cluster, and a statement the PDF prints under a cluster
  // of the part that no goal was joined to.
  notes: string[]
  // Set when the part's count is off, or its statements do not pair with the manifest's or with its nodes. Such a part writes nothing.
  finding: Finding | null
}

// What is read once and kept: a source record, a legal text, a repository.
export const once = <T>(read: (id: string) => T): ((id: string) => T) => {
  const held = new Map<string, T>()
  return (id) => {
    if (!held.has(id)) held.set(id, read(id))
    return held.get(id)!
  }
}

// How a source is read, as its plan in the manifest says.
const planOf = (id: string) => planFor(id, NL_SOURCE_PLANS)

// The clones of the open data in the store, each read once, by the id of its source record.
export function openData(education: string, store: string): (id: string) => Repository {
  return once((id): Repository => {
    const { pages, files = [] } = readSource(planOf(id), store, { education })
    const objects = once((file: string): Json[] => {
      const page = files.indexOf(file)
      if (page < 1) throw new Error(`${id} has no data file ${file}`)
      return JSON.parse(pages[page]!) as Json[]
    })
    const byId = once((file: string) => new Map(objects(file).map((object) => [field(object, 'id'), object])))
    return { objects, byId }
  })
}

// The cluster of a goal as a content-line PDF heads it: the last part of its group, without the code in brackets.
const clusterOf = (group: string): string => group.split(' / ').at(-1)!.replace(/ \([^()]*\)$/, '')

// A goal of a part read from the open data, as it is joined to what a content-line PDF prints.
export interface PartGoal {
  id: string
  code: string
  wording: string
  cluster: string
}

// The goals of a part read from the open data, as the importer makes records
// of them: corrected as the manifest says, without the copies and without
// what the lane skips. None for a part that is read otherwise.
export function goalsOfPart(lane: Lane, part: LanePart, repositoryOf: (id: string) => Repository, additions: NlAdditions = NO_ADDITIONS): PartGoal[] {
  if (!isData(part)) return []
  const skipped = new Set(lane.skipped.map((entry) => entry.code))
  const correcting: Correcting = { goals: additions.goals[part.source] ?? {}, here: `${lane.level}/${lane.subject}`, applied: new Set(), skipped: [] }
  return nodesOf(part.selection, part.source, repositoryOf, correcting)
    .filter((node) => !skipped.has(node.code) && !skipped.has(node.groupValue))
    .map((node) => ({ id: node.id, code: node.code, wording: node.wording, cluster: clusterOf(node.group) }))
}

const few = (items: readonly string[]): string => `${items.slice(0, 8).join('; ')}${items.length > 8 ? `; and ${items.length - 8} more` : ''}`

// Where two texts part ways: what each holds between what they share at both ends.
function partsWays(law: string, data: string): string {
  let start = 0
  while (start < law.length && law[start] === data[start]) start += 1
  let end = 0
  while (end < law.length - start && end < data.length - start && law.at(-1 - end) === data.at(-1 - end)) end += 1
  const cut = (text: string): string => {
    const from = Math.max(0, start - 12)
    const to = Math.min(text.length, Math.max(start, text.length - end) + 12)
    const piece = text.slice(from, to)
    return `${from > 0 ? '…' : ''}${piece.length > 90 ? `${piece.slice(0, 90)}…` : `${piece}${to < text.length ? '…' : ''}`}`
  }
  return `law "${cut(law)}", data "${cut(data)}"`
}

// A record to write, before anything is written.
interface Draft {
  slug: string
  // What it is called when two records of a lane land on one file.
  name: string
  input: ObjectiveInput
  // For a releveled goal: the file it has in the lane of the level the data links it to, relative to education/.
  old?: string
}

interface Reading {
  drafts: Draft[]
  images?: ImportedImage[]
  corrected?: CorrectedRecord[]
  restored?: PartImport['restored']
  examples?: PartImport['examples']
  notes?: string[]
  differences: Difference[] | null
  // Why the part cannot be written.
  problem: string | null
}

const isLegal = (part: LanePart): part is LanePart & { selection: LegalSelection } => part.selection.kind === 'legal'
const isData = (part: LanePart): part is LanePart & { selection: DataSelection } => part.selection.kind === 'data'

// Writes the records of every Dutch lane part read from the legal XML or the
// open data, under `education` (the education folder), reading the sources
// out of the store at `store`. `only` narrows it to one lane, named
// <level>/<subject>. `additions` are the lists of manifest/nl-additions.ts:
// the command line hands in the real ones, a test its own, and without them
// nothing is transcribed or corrected. `read` stands in for reading a
// content-line PDF out of the store.
export function importNetherlands(
  education: string,
  store: string,
  lanes: readonly Lane[],
  only?: string,
  additions: NlAdditions = NO_ADDITIONS,
  read: { contentLine?: (source: string) => ContentLine } = {},
): PartImport[] {
  const mine = (part: LanePart): boolean => isLegal(part) || isData(part)
  const chosen = lanes.filter((lane) => lane.parts.some(mine) && (only === undefined || `${lane.level}/${lane.subject}` === only))
  if (only !== undefined && chosen.length === 0) throw new Error(`no lane ${only} has a part read from the legal text or the open data`)

  // Each source is read once, as its plan in the manifest says.
  const sourceOf = once((id) => readSourceRecord(education, id))
  const legalText = once((id) => {
    const root = parseXml(readSource(planOf(id), store, { education }).pages[1]!)
    // Every image the manifest transcribes is one the text holds, and the
    // file beside the text, where it was fetched, is the one that was viewed.
    const names = new Set(all(root, 'illustratie').map((image) => image.attributes.naam))
    for (const [name, entry] of Object.entries(additions.images[id] ?? {})) {
      if (!names.has(name)) throw new Error(`${id}: the manifest transcribes the image ${name}, which is not in the text`)
      const file = join(store, 'incoming', 'nl', planOf(id).incomingKey, name)
      if (existsSync(file) && sha256(readFileSync(file)) !== entry.sha256) throw new Error(`${id}: the file ${name} in the store is not the image that was transcribed (its sha256 is not the one the manifest lists)`)
    }
    return root
  })
  const repositoryOf = openData(education, store)
  const contentLineOf = once((id) => (read.contentLine ?? ((source: string) => readContentLine(education, store, source)))(id))
  const commit = (source: SourceFrontmatter): string => `${source.title} (commit ${source.pin.slice(0, 7)})`
  // Every corrected goal that a walk reached at its level, by the source of its part.
  const applied = new Map<string, Set<string>>()

  // First every part is read. Nothing is written until all of them are.
  const readings = chosen.flatMap((lane) => {
    const folder = `corpus/${laneKey(lane)}`
    const skipped = new Set(lane.skipped.map((entry) => entry.code))
    const taken = new Map<string, string>()

    // The fields every record of a part shares: they are its source record's.
    const fieldsOf = (source: SourceFrontmatter, slug: string): Omit<ObjectiveFields, 'title' | 'code' | 'code_key' | 'code_scope' | 'locator'> => ({
      id: objectiveId(lane.jurisdiction, lane.level, lane.subject, slug),
      kind: 'objective',
      jurisdiction: lane.jurisdiction,
      level: lane.level,
      subject: lane.subject,
      content_language: 'nl',
      curriculum_version: source.version,
      status: 'draft',
      authority: 'official',
      standing: source.standing,
      ...(source.regime === undefined ? {} : { regime: source.regime }),
      reuse_policy: source.reuse_policy,
      source: source.id,
    })

    const readLegal = (part: LanePart & { selection: LegalSelection }): Reading => {
      const source = sourceOf(part.source)
      const reader = READERS[part.source]
      if (!reader) throw new Error(`${part.source} is not one of the regulations this importer reads`)
      const refs = part.selection.statements.filter((ref) => !skipped.has(ref.code))
      const fits = (ref: StatementRef, found: Found): boolean => {
        const names = ref.group.split(' / ')
        return names.at(-1) === found.heading && (found.level === undefined || names[0]!.split(' ').includes(found.level))
      }
      // The statements of the text under the headings, and at the levels, the part lists, each image written as its transcription.
      const transcriptions = additions.images[part.source] ?? {}
      const found = reader(legalText(part.source), part.selection.elements)
        .filter((each) => !(each.code !== undefined && skipped.has(each.code)) && refs.some((ref) => fits(ref, each)))
        .map((each): Found => ({ ...each, images: imagesIn(each.wording), wording: withImages(each.wording, transcriptions), ...(each.note === undefined ? {} : { note: withImages(each.note, transcriptions) }) }))

      const pairs = new Map<StatementRef, Found>()
      const paired = new Set<Found>()
      const pair = (ref: StatementRef, each: Found): void => {
        pairs.set(ref, each)
        paired.add(each)
      }
      for (const ref of refs) {
        const same = found.filter((each) => each.code === ref.code && fits(ref, each))
        if (same.length === 1) pair(ref, same[0]!)
      }
      // What the text prints no code for stands in the manifest's order, heading by heading.
      for (const group of new Set(refs.map((ref) => ref.group))) {
        const listed = refs.filter((ref) => ref.group === group && !pairs.has(ref))
        const uncoded = found.filter((each) => each.code === undefined && fits(listed[0] ?? refs[0]!, each))
        if (listed.length > 0 && listed.length === uncoded.length) listed.forEach((ref, index) => pair(ref, uncoded[index]!))
      }

      const unlisted = found.filter((each) => !paired.has(each)).map((each) => `${each.heading}${each.level === undefined ? '' : `, niveau ${each.level}`}, ${each.code ?? `"${each.wording.slice(0, 30)}"`}`)
      const unfound = refs.filter((ref) => !pairs.has(ref)).map((ref) => `${ref.group}, ${ref.code}`)
      const mismatch = [...(unlisted.length > 0 ? [`in the text and not in the manifest: ${few(unlisted)}`] : []), ...(unfound.length > 0 ? [`in the manifest and not in the text: ${few(unfound)}`] : [])].join('; ')
      if (found.length !== part.expectedCount) {
        return { drafts: [], differences: null, problem: `${found.length} statement(s) were read and its manifest entry expects ${part.expectedCount}${mismatch === '' ? '' : ` (${mismatch})`}` }
      }
      if (mismatch !== '') return { drafts: [], differences: null, problem: `its statements are not the ones its manifest entry lists (${mismatch})` }

      // The nodes of the open data that carry the same statements, by printed code.
      const nodes = new Map<string, Node>()
      let differences: Difference[] | null = null
      const data: DataNodes | undefined = part.dataNodes?.idsPairOneToOne ? part.dataNodes : undefined
      if (data) {
        const all = nodesOf(data.selection, data.source, repositoryOf)
        for (const node of all) nodes.set(printedCode(node, data.selection), node)
        const without = refs.filter((ref) => !nodes.has(ref.code)).map((ref) => ref.code)
        const codes = new Set(refs.map((ref) => ref.code))
        const stray = [...nodes.keys()].filter((code) => !codes.has(code))
        if (all.length !== refs.length || nodes.size !== all.length || without.length > 0 || stray.length > 0) {
          const detail = [...(without.length > 0 ? [`no node for: ${few(without)}`] : []), ...(stray.length > 0 ? [`no statement for the node(s): ${few(stray)}`] : [])].join('; ')
          return { drafts: [], differences: null, problem: `its ${refs.length} statement(s) and the ${all.length} node(s) of the open data (${data.source}) do not pair one to one${detail === '' ? '' : ` (${detail})`}` }
        }
        differences = refs
          .filter((ref) => normalise(pairs.get(ref)!.wording) !== normalise(nodes.get(ref.code)!.wording))
          .map((ref) => ({ code: ref.code, note: partsWays(normalise(pairs.get(ref)!.wording), normalise(nodes.get(ref.code)!.wording)) }))
      }

      // An image is transcribed in the statement the manifest lists it under, and nowhere else.
      const here = `${lane.level}/${lane.subject}`
      const images = refs.flatMap((ref) => (pairs.get(ref)!.images ?? []).map((image): ImportedImage => ({ code: ref.code, image, transcribed: transcriptions[image] !== undefined })))
      for (const ref of refs) {
        for (const image of pairs.get(ref)!.images ?? []) {
          const entry = transcriptions[image]
          if (entry && (entry.lane !== here || entry.group !== ref.group || entry.code !== ref.code)) {
            throw new Error(`${part.source}: the image ${image} stands in ${here}, ${ref.group}, ${ref.code}, and the manifest lists its transcription under ${entry.lane}, ${entry.group}, ${entry.code}`)
          }
        }
      }
      for (const [image, entry] of Object.entries(transcriptions)) {
        const ref = entry.lane === here ? refs.find((each) => each.group === entry.group && each.code === entry.code) : undefined
        if (ref && !(pairs.get(ref)!.images ?? []).includes(image)) throw new Error(`${part.source}: the manifest lists the image ${image} under ${here}, ${entry.group}, ${entry.code}, and that statement does not hold it`)
      }

      const drafts = refs.map((ref): Draft => {
        const statement = pairs.get(ref)!
        const code = statement.printsCode ? ref.code : ''
        // Without a paired node: a file name made of the group and the code, as the extraction names a located statement.
        const slug = nodes.get(ref.code)?.id ?? slugify(`${ref.group} ${ref.code}`)
        return {
          slug,
          name: `${ref.group}, ${ref.code}`,
          input: {
            frontmatter: {
              ...fieldsOf(source, slug),
              title: code === '' ? `${ref.group}, ${ref.code}` : `${code}, ${ref.group}`,
              code,
              code_key: normaliseCode(code),
              code_scope: `${source.title}, ${ref.group}`,
              locator: `${statement.path}; ${ref.group}, ${ref.code}${statement.note === undefined ? '' : `. ${statement.note}`}`,
            },
            wording: statement.wording,
            source: `${source.publisher}, ${source.title}, ${statement.cite}${ref.code}.`,
          },
        }
      })
      return { drafts, images, differences, problem: null }
    }

    // What the content-line PDF of a part, its check rendition, adds to its
    // goals: the whole statement of a goal the data cuts short, and the
    // example printed with a goal. Each node is given what was found for it.
    const readPrinted = (part: LanePart & { selection: DataSelection }, nodes: Node[]): { notes: string[] } => {
      const here = `${lane.level}/${lane.subject}`
      const pdf = part.checkRendition
      const restoring = additions.restored[part.source] ?? {}
      const plain = additions.examples.plain[part.source] ?? {}
      const italic = additions.examples.italic.includes(pdf)
      const listed = nodes.filter((node) => restoring[node.id] || plain[node.id])
      if (!italic && listed.length === 0) return { notes: [] }

      const content = contentLineOf(pdf)
      const { title, column } = columnOfLevel(content, part.selection, part.name, pdf)
      const statements = statementsOf(content, column)
      const opens = (item: PrintedItem, node: Node): boolean => letters(printedText(item.runs)).startsWith(letters(node.wording))
      const used = new Set<PrintedItem>()

      for (const node of listed) {
        const entry = (restoring[node.id] ?? plain[node.id])!
        const what = restoring[node.id] ? 'restores' : 'takes the example of'
        if (entry.code !== node.code) throw new Error(`${part.source}: the data gives the goal ${node.id} the code ${node.code}, and the manifest ${what} it under the code ${entry.code}`)
        if (entry.lane !== here) throw new Error(`${part.source}: the goal ${node.id} (${node.code}) is a record of ${here}, and the manifest ${what} it under ${entry.lane}`)
        const found = statements.filter((item) => item.page === entry.page && opens(item, node))
        if (found.length !== 1) throw new Error(`${pdf}: ${found.length} statements of page ${entry.page}, column ${title}, open with the wording the data has for ${node.code} (${node.id}), and the manifest ${what} it from there`)
        const item = found[0]!
        const rest = runsAfterWording(item, node.wording)
        const after = exampleText(rest)
        if (after === '') throw new Error(`${pdf}: page ${entry.page}, column ${title}, prints no more for ${node.code} (${node.id}) than the data holds: the manifest need not list it any more`)
        used.add(item)
        const listedAs = restoring[node.id]
        if (listedAs) {
          // The statement ends where its upright text ends: italics that close it are its example.
          const cut = closingExample(item.runs)
          const wording = printedText(cut ? cut.statement : item.runs)
          if (letters(wording) === letters(node.wording)) {
            throw new Error(`${pdf}: page ${entry.page}, column ${title}, prints no more statement text for ${node.code} (${node.id}) than the data holds; what follows is its example in italics: the manifest need not list it as restored`)
          }
          const pages = pagesOf(item, cut ? cut.statement : item.runs)
          const through = listedAs.through ?? listedAs.page
          if (pages.at(-1) !== through) throw new Error(`${pdf}: the statement of ${node.code} (${node.id}) ends on page ${pages.at(-1)}, column ${title}, and the manifest says it ends on page ${through}`)
          node.wording = wording
          node.restored = { pages, column: title }
          if (cut) node.example = { kind: 'under', text: exampleText(cut.example), pages: pagesOf(item, cut.example), column: title }
        } else {
          if (!/^\(.*\)\.?$/s.test(after)) throw new Error(`${pdf}: what page ${entry.page}, column ${title}, prints after the data's wording of ${node.code} (${node.id}) is not one bracketed example`)
          node.example = { kind: 'plain', text: after, pages: pagesOf(item, rest), column: title }
        }
      }
      if (!italic) return { notes: [] }

      // Every goal of the part has its statement in the column, and each goal takes the italic text printed with it.
      const goalOf = new Map(nodes.map((node) => [node, { id: node.id, wording: node.wording, cluster: clusterOf(node.group) }]))
      const { joined, unjoined, unprinted } = joinGoals([...goalOf.values()], statements)
      if (unjoined.length > 0) {
        const codes = unjoined.map((goal) => nodes.find((node) => node.id === goal.id)!).map((node) => `${node.code} (${node.id})`)
        throw new Error(`${pdf}: ${few(codes)} of "${part.name}" cannot be joined to a statement of column ${title} by text`)
      }
      const notes: string[] = []
      for (const { goal, item, how, again } of joined) {
        const node = nodes.find((each) => each.id === goal.id)!
        const upright = letters(uprightOf(item.runs))
        const cut = how === 'prefix' || (how === 'last' && upright !== letters(node.wording) && upright.startsWith(letters(node.wording)))
        if (cut && !node.restored && !node.example) throw new Error(`${pdf}: page ${item.page}, column ${title}, prints more statement text for ${node.code} (${node.id}) than the data holds, and the manifest does not list the goal as restored`)
        if (how === 'last') notes.push(`${node.code} (${node.id}) was joined to the one statement left under its cluster on page ${item.page}: the PDF words it differently`)
        const same = letters(node.wording)
        if (node.restored || node.example || same === letters(printedText(item.runs))) continue
        if (italicStretches(item.runs).length === 0) {
          if (same !== letters(uprightOf(item.runs)) && how === 'exact') throw new Error(`${pdf}: page ${item.page}, column ${title}, prints a bracketed part for ${node.code} (${node.id}) that is not in italics and that the data lacks: list the goal as restored, or its example as plain`)
          continue
        }
        // The example alone where it closes the goal, cut where the italics
        // open; the goal as printed where an example stands inside it.
        const closing = closingExample(item.runs)
        const first = closing ? closing.example : item.runs
        // Each further printing of the goal gives the example that closes it.
        const more = again.map((each) => {
          const other = closingExample(each.runs)
          if (!other) throw new Error(`${pdf}: page ${each.page}, column ${title}, prints ${node.code} (${node.id}) once more, and what it sets in italics there does not close the goal`)
          return { item: each, runs: other.example }
        })
        if (closing && !/^\(.*\)\.?$/s.test(exampleText(first))) notes.push(`the example of ${node.code} (${node.id}) on page ${item.page} is not one bracketed group from the first italic character on: see where the PDF sets its brackets`)
        node.example = {
          kind: more.length > 0 ? 'printings' : closing ? 'under' : 'inside',
          text: [first, ...more.map((each) => each.runs)].map(exampleText).join('\n'),
          pages: [...new Set([...pagesOf(item, first), ...more.flatMap((each) => pagesOf(each.item, each.runs))])].sort((a, b) => a - b),
          column: title,
        }
      }
      // A character of a font that has no Unicode character here would go into a record as a private-use code.
      for (const node of nodes) {
        if (holdsPrivateUse(`${node.restored ? node.wording : ''}${node.example?.text ?? ''}`)) {
          throw new Error(`${pdf}: what is read for ${node.code} (${node.id}) holds a character of a symbol font that tools/content-lines.ts lists no Unicode character for (SYMBOL_CHARACTERS)`)
        }
      }
      for (const item of unprinted) notes.push(`page ${item.page}, column ${title}, prints a statement under "${item.cluster}" that no goal of the part was joined to: "${printedText(item.runs).slice(0, 60)}"`)
      return { notes }
    }

    const readData = (part: LanePart & { selection: DataSelection }): Reading => {
      const source = sourceOf(part.source)
      const { selection } = part
      if (!applied.has(part.source)) applied.set(part.source, new Set())
      const correcting: Correcting = { goals: additions.goals[part.source] ?? {}, here: `${lane.level}/${lane.subject}`, applied: applied.get(part.source)!, skipped: [] }
      const nodes = nodesOf(selection, part.source, repositoryOf, correcting).filter((node) => !skipped.has(node.code) && !skipped.has(node.groupValue))
      if (nodes.length !== part.expectedCount) return { drafts: [], differences: null, problem: `${nodes.length} statement(s) were read and its manifest entry expects ${part.expectedCount}` }
      const printed = readPrinted(part, nodes)
      const kindsOf = (fix: CorrectedGoal): CorrectedRecord['kinds'] => fix.corrections.map((each) => each.kind)
      const corrected: CorrectedRecord[] = [
        ...nodes.filter((node) => node.corrected).map((node) => ({ id: node.id, code: node.code, kinds: kindsOf(node.corrected!) })),
        ...correcting.skipped.map(({ id, code }) => ({ id, code, kinds: kindsOf(correcting.goals[id]!) })),
      ]
      const drafts = nodes.map((node): Draft => {
        const { join } = selection
        // Every object of the open data carries its own code in `prefix`.
        const owner = `${node.visit.step.entity} ${field(node.visit.object, 'prefix')}`
        // What the manifest corrects of the goal, after where the data lists it.
        const fixes = (node.corrected?.corrections ?? []).flatMap((each) => (each.kind === 'regroup' ? [`grouped under ${each.cluster}`] : each.kind === 'relevel' ? [`filed at ${each.level}`] : []))
        const listed = `${node.visit.step.file}, ${node.visit.step.entity} ${field(node.visit.object, 'id')} (${field(node.visit.object, 'prefix')})${fixes.length === 0 ? '' : `. Corrected by manifest/nl-additions.ts: ${fixes.join(', ')}`}`
        // A releveled goal may still have its file in the lane of the level the data links it to.
        const releveled = node.corrected?.corrections.find((each) => each.kind === 'relevel')
        // Where the wording, or the text that accompanies it, was read in the content-line PDF.
        const pdf = node.restored || node.example ? sourceOf(part.checkRendition) : undefined
        const pdfSlug = parseId(part.checkRendition)?.slug
        const from = join ? `${source.publisher}, ${commit(source)}, ${owner}; ${commit(sourceOf(join.source))}, ${join.entity} ${node.id}` : `${source.publisher}, ${commit(source)}, ${owner}`
        const accompanying = node.example ? ` Accompanying text: ${pdf!.publisher}, ${pdf!.title}, ${pagesText(node.example.pages)}, column ${node.example.column}.` : ''
        const cited = node.restored
          ? `${pdf!.publisher}, ${pdf!.title}, ${pagesText(node.restored.pages)}, column ${node.restored.column}: the statement as printed there, which the open data cuts short. The record is the goal of ${from}.${accompanying}`
          : `${from}.${accompanying}`
        const located = `${listed}${node.restored ? `. Wording read from ${pdfSlug}, ${pagesText(node.restored.pages)}, column ${node.restored.column}` : ''}`
        return {
          ...(releveled ? { old: `corpus/${lane.jurisdiction}/${levelSlug(releveled.from)}/${lane.subject}/objectives/${node.id}.md` } : {}),
          slug: node.id,
          name: `${node.code} (${node.id})`,
          input: {
            frontmatter: {
              ...fieldsOf(source, node.id),
              title: `${node.code}, ${node.group}`,
              code: node.code,
              code_key: normaliseCode(node.code),
              code_scope: `${source.title}, ${node.group}`,
              locator: join ? `${join.file}, ${join.entity} ${node.id}, and ${join.wording.file}, doel ${node.goal}, of ${parseId(join.source)!.slug}; listed by ${located}` : located,
            },
            wording: node.wording,
            ...(node.example ? { supplement: node.example.text, supplementNote: EXAMPLE_NOTES[node.example.kind] } : {}),
            source: cited,
          },
        }
      })
      return {
        drafts,
        corrected,
        restored: nodes.filter((node) => node.restored).map((node) => ({ id: node.id, code: node.code, pages: node.restored!.pages })),
        examples: nodes.filter((node) => node.example).map((node) => ({ id: node.id, code: node.code, kind: node.example!.kind })),
        notes: printed.notes,
        differences: null,
        problem: null,
      }
    }

    return lane.parts.filter(mine).map((part) => {
      const kind = isLegal(part) ? ('legal' as const) : ('data' as const)
      const reading = isLegal(part) ? readLegal(part) : readData(part as LanePart & { selection: DataSelection })
      // Two statements of a lane on one slug would overwrite each other.
      for (const draft of reading.drafts) {
        const other = taken.get(draft.slug)
        if (other !== undefined) throw new Error(`${folder}: ${draft.name} and ${other} would be written to the same file, ${draft.slug}.md`)
        taken.set(draft.slug, draft.name)
      }
      return { outcome: { lane: folder, part: part.name, kind, expected: part.expectedCount }, name: part.name, folder, reading }
    })
  })

  // With every lane read, each goal the manifest corrects has been reached by a walk at its level.
  if (only === undefined) {
    for (const [source, reached] of applied) {
      const missed = Object.entries(additions.goals[source] ?? {}).filter(([id]) => !reached.has(id))
      if (missed.length > 0) throw new Error(`${source}: the manifest corrects ${few(missed.map(([id, goal]) => `${goal.code} (${id})`))}, and no part reaches ${missed.length === 1 ? 'it' : 'them'} at ${missed.length === 1 ? 'its' : 'their'} level`)
    }
  }

  // Then every part is written.
  return readings.map(({ outcome, name, folder, reading }): PartImport => {
    if (reading.problem !== null) {
      return { ...outcome, results: [], differences: null, images: [], corrected: [], moved: [], restored: [], examples: [], notes: [], finding: { file: `${folder}/frame.md`, line: 1, rule: 'part-count', message: `part "${name}": ${reading.problem}` } }
    }
    const moved: PartImport['moved'] = []
    const results = reading.drafts.map((draft) => {
      // The file of a releveled goal comes along from the lane of its old level, with what a lane agent wrote in it.
      const to = pathForId(draft.input.frontmatter.id)!
      if (draft.old !== undefined && draft.old !== to && existsSync(join(education, draft.old)) && !existsSync(join(education, to))) {
        mkdirSync(dirname(join(education, to)), { recursive: true })
        renameSync(join(education, draft.old), join(education, to))
        moved.push({ from: draft.old, to })
      }
      return writeObjective(education, store, draft.input)
    })
    return { ...outcome, results, differences: reading.differences, images: reading.images ?? [], corrected: reading.corrected ?? [], moved, restored: reading.restored ?? [], examples: reading.examples ?? [], notes: reading.notes ?? [], finding: null }
  })
}

// What a run did, one line per part, each wording that differs from the open
// data under its part, and whether any part failed.
export function report(imports: readonly PartImport[]): { lines: string[]; failed: boolean } {
  const lines = imports.flatMap((part) => {
    if (part.finding) return [`FAIL  ${part.lane}: ${part.finding.message}`]
    const differs = part.differences === null ? '' : `; ${part.differences.length} wording(s) differ from the open data`
    const transcribed = part.images.filter((image) => image.transcribed).length
    const more = [
      ...(transcribed === 0 ? [] : [`${transcribed} image(s) transcribed`]),
      ...(part.restored.length === 0 ? [] : [`${part.restored.length} statement(s) restored from the content-line PDF`]),
      ...(part.examples.length === 0 ? [] : [`${part.examples.length} with an example of the content-line PDF as accompanying text`]),
    ].map((each) => `; ${each}`)
    return [
      `ok    ${part.lane}, ${part.part}: ${part.results.length} of ${part.expected} (${statusCounts(part.results)})${differs}${more.join('')}`,
      ...(part.differences ?? []).map((difference) => `      differs  ${difference.code}: ${difference.note}`),
      ...part.images.filter((image) => !image.transcribed).map((image) => `      image    ${image.code}: ${image.image} has no transcription and stays ${IMAGE_PLACEHOLDER}`),
      ...part.corrected.map((goal) => `      corrected  ${goal.code} (${goal.id}): ${goal.kinds.join(', ')}`),
      ...part.moved.map((file) => `      moved    education/${file.from} to education/${file.to}`),
      ...part.restored.map((goal) => `      restored   ${goal.code} (${goal.id}): ${pagesText(goal.pages)}`),
      ...part.notes.map((note) => `      note     ${note}`),
    ]
  })
  return { lines, failed: imports.some((part) => part.finding !== null) }
}

// ---------------------------------------------------------------------------
// Files no part gives any more.
// ---------------------------------------------------------------------------

export interface Orphan {
  // The lane's folder, relative to education/.
  lane: string
  // The record file, relative to education/.
  file: string
  // True when the manifest lists the record as removed: the file was deleted.
  removed: boolean
  // The manifest's reason, for a file that was removed.
  reason?: string
}

// Every record the manifest says is no record any more: those it lists, each
// goal of the open data it skips as a copy, and the file a releveled goal
// left in the lane of a level it is not filed at, once the lane it is filed
// in holds the record. Until then that file is the only copy of what a lane
// agent wrote, and it stays.
function removedOf(education: string, additions: NlAdditions): RemovedRecord[] {
  const derived: RemovedRecord[] = []
  for (const goals of Object.values(additions.goals)) {
    for (const [id, goal] of Object.entries(goals)) {
      const [, subject] = goal.lane.split('/')
      for (const correction of goal.corrections) {
        if (correction.kind === 'skip') derived.push({ lane: goal.lane, slug: id, reason: correction.reason })
        if (correction.kind !== 'relevel' || !existsSync(join(education, 'corpus', 'nl', goal.lane, 'objectives', `${id}.md`))) continue
        derived.push({ lane: `${levelSlug(correction.from)}/${subject}`, slug: id, reason: `The record is filed in ${goal.lane}. ${correction.reason}` })
      }
    }
  }
  return [...additions.removed, ...derived]
}

// The record files of each imported lane that no part of the lane gives:
// neither a part that was just imported, nor a part of located statements,
// whose files the extraction names by group and code. A lane is swept only
// when every one of its parts that this importer reads is among `imports`
// and none failed: otherwise what it should hold is not known. A file the
// manifest lists as removed (`additions.removed`) is deleted; any other is
// left where it is and reported. Throws on a record that is listed as removed
// while a part still gives it.
export function sweepOrphans(education: string, lanes: readonly Lane[], imports: readonly PartImport[], additions: NlAdditions = NO_ADDITIONS): Orphan[] {
  const orphans: Orphan[] = []
  for (const lane of lanes) {
    const key = `${lane.level}/${lane.subject}`
    const folder = `corpus/${laneKey(lane)}`
    const mine = lane.parts.filter((part) => isLegal(part) || isData(part))
    const done = imports.filter((part) => part.lane === folder)
    if (mine.length === 0 || done.length !== mine.length || done.some((part) => part.finding !== null)) continue
    const given = new Set(done.flatMap((part) => part.results.map((result) => result.file)))
    for (const part of lane.parts) {
      if (part.selection.kind === 'statements') for (const ref of part.selection.statements) given.add(`${folder}/objectives/${slugify(`${ref.group} ${ref.code}`)}.md`)
    }
    const listed = new Map(removedOf(education, additions).filter((record) => record.lane === key).map((record) => [`${folder}/objectives/${record.slug}.md`, record]))
    for (const [file, record] of listed) if (given.has(file)) throw new Error(`${key}: the manifest lists ${record.slug} as removed, and a part of the lane still gives it`)
    const objectives = join(education, folder, 'objectives')
    if (!existsSync(objectives)) continue
    for (const name of readdirSync(objectives).sort()) {
      const file = `${folder}/objectives/${name}`
      if (!name.endsWith('.md') || given.has(file)) continue
      const record = listed.get(file)
      if (record) rmSync(join(education, file))
      orphans.push({ lane: folder, file, removed: record !== undefined, ...(record ? { reason: record.reason } : {}) })
    }
  }
  return orphans
}

// What a sweep did, one line per file, and whether a file was left that the manifest does not account for.
export function reportOrphans(orphans: readonly Orphan[]): { lines: string[]; failed: boolean } {
  return {
    lines: orphans.map((orphan) =>
      orphan.removed ? `removed  education/${orphan.file}: ${orphan.reason}` : `ORPHAN   education/${orphan.file}: no part of the lane gives this record, and the manifest does not list it as removed. It was left where it is.`,
    ),
    failed: orphans.some((orphan) => !orphan.removed),
  }
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isMain) {
  const args = process.argv.slice(2)
  const only = args[0] === '--lane' ? args[1] : undefined
  if (args.length > 0 && (only === undefined || args.length !== 2)) {
    console.error('usage: node education/tools/import-netherlands.ts [--lane <level>/<subject>]')
    process.exit(2)
  }
  const education = resolve(import.meta.dirname, '..')
  const imports = importNetherlands(education, requireStore(storeRoot()), NL_LANES, only, NL_ADDITIONS)
  const { lines, failed } = report(imports)
  for (const line of lines) console.log(line)
  const swept = reportOrphans(sweepOrphans(education, NL_LANES, imports, NL_ADDITIONS))
  for (const line of swept.lines) console.log(line)
  const total = imports.reduce((sum, part) => sum + part.results.length, 0)
  if (failed) {
    console.error(`\neducation import (Netherlands) failed: a part does not give the records its manifest entry expects, and wrote nothing`)
    process.exit(1)
  }
  if (swept.failed) {
    console.error(`\neducation import (Netherlands) failed: a lane holds a record file that no part gives and the manifest does not list as removed`)
    process.exit(1)
  }
  console.log(`\neducation import (Netherlands): ${total} record(s) in ${imports.length} part(s) of ${new Set(imports.map((part) => part.lane)).size} lane(s)`)
}
