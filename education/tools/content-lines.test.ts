import { deflateSync } from 'node:zlib'
import { describe, expect, it } from 'vitest'
import { pdfPages, underlinedItems, underlinedOf } from './content-lines.ts'
import { afterWording, closingExample, contentLinePages, holdsPrivateUse, isContentLineSource, italicStretches, italicsClose, joinGoals, letters, pagesOf, parseContentLine, printedLines, runsAfterWording, statementsOf, textOf, uprightOf, withoutBracketedExamples } from './content-lines.ts'
import type { Goal, PrintedItem, Run } from './content-lines.ts'

// Every page here is invented: the headings, the goals, the examples. No
// official wording belongs in a test. The shape is that of the XML which
// pdftohtml gives for a content-line PDF: lines of text with their place, a
// font by number, and italics as <i>.

const UPRIGHT = 0
const WHITE = 2

// Where the three columns start, and where the text of an item starts.
const [C1, C2, C3] = [342, 636, 930] as const
const IN = 17

const line = (top: number, left: number, content: string, font = UPRIGHT): string => `<text top="${top}" left="${left}" width="${content.replace(/<[^>]+>/g, '').length * 7}" height="18" font="${font}">${content}</text>`
const i = (content: string): string => `<i>${content}</i>`
const dash = (top: number, column: number): string => line(top, column, '−', 1)
const page = (number: number, lines: readonly string[]): string =>
  `<page number="${number}" position="absolute" top="0" left="0" height="1785" width="1262">
<fontspec id="0" size="18" family="Peer-Light" color="#000000"/>
<fontspec id="1" size="18" family="Peer-Symbol" color="#000000"/>
<fontspec id="2" size="18" family="Peer-Light" color="#ffffff"/>
<fontspec id="3" size="12" family="Peer-Light" color="#000000"/>
<fontspec id="4" size="19" family="SymbolMT" color="#000000"/>
${lines.join('\n')}
${line(1715, 127, 'pluk@voorbeeld.example ')}
${line(1715, 754, `Voorbeeldlijn Peren | ${number} `)}
</page>`
const file = (...pages: string[][]): string => `<?xml version="1.0" encoding="UTF-8"?>\n<pdf2xml producer="poppler" version="0">\n${pages.map((lines, index) => page(index + 1, lines)).join('\n')}\n</pdf2xml>`

const HEAD = [line(53, 961, 'VOORBEELDONDERWIJS '), line(142, C1, 'Peren ', WHITE), line(326, C1, i('fase 1 ')), line(326, C2, i('fase 2 ')), line(326, C3, i('fase 3 '))]

const FIRST = [
  ...HEAD,
  line(357, 47, 'Peren tellen', WHITE),
  line(389, C1, i('aanbodsdoelen: ')),
  // A goal with an example under it, in italics.
  dash(420, C1),
  line(420, C1 + IN, 'peren tellen tot ten '),
  line(442, C1 + IN, 'minste twintig '),
  line(464, C1 + IN, i('(bijv. drie peren en ')),
  line(486, C1 + IN, i('nog twee)')),
  // A goal with an example inside its sentence.
  dash(420, C2),
  line(420, C2 + IN, `peren verdelen ${i('(bijv. in tweeën)')} en `),
  line(442, C2 + IN, 'uitleggen hoe '),
  dash(520, C1),
  line(520, C1 + IN, 'peren op een rij leggen '),
  line(600, 47, 'Peren (zie ook Pruimen)', WHITE),
  line(632, 47, 'Wat een peer is en hoe je er een herkent, van de boom tot op de schaal en van de schaal tot op het bord van een kind '),
  dash(700, C1),
  line(700, C1 + IN, 'een peer herkennen '),
  // A goal without an example, which runs on at the top of the next page.
  dash(700, C3),
  line(700, C3 + IN, 'peren wegen op een '),
]

const SECOND = [
  line(51, C3 + IN, 'weegschaal met gewichten '),
  // A label in the column of labels opens a row: what stands above it is closed.
  line(120, 47, 'aanpak: '),
  dash(120, C1),
  line(120, C1 + IN, 'kiezen van een vraag-'),
  line(142, C1 + IN, 'antwoordspel over peren '),
  // The second column prints its goal without a dash.
  line(120, C2 + IN, 'kiezen van een spel '),
  line(142, C2 + IN, 'over peren '),
  line(200, C1 + 4, i('tekstkenmerken: ')),
  line(232, 47, 'tekstlengte: '),
  line(230, C1, '▪', 1),
  line(232, C1 + IN, 'perenverhalen: tot vijf minuten '),
  line(230, C2, '▪', 1),
  line(232, C2 + IN, 'perenverhalen: tot tien minuten '),
  line(300, 47, 'taak '),
  line(300, C1 + 4, i('aanbodsdoelen: ')),
  line(340, C1, 'groep 1/2: '),
  dash(370, C1),
  line(370, C1 + IN, 'luisteren naar een perenverhaal '),
  line(400, C1, 'groep 3: '),
  dash(430, C1),
  line(430, C1 + IN, 'navertellen van een perenverhaal '),
  line(600, C1 - 1, i('*  Bij deze voorbeeldlijn is fase 1 de eerste mand en ')),
  line(622, C1 + 28, i('fase 2 de tweede. ')),
  line(650, C1 - 1, i('NB  Onderstreepte woorden staan in een ander boekje. ')),
  line(1566, 44, i('Deze lijn is verzonnen voor een toets en zegt niets over echte peren. ')),
]

const content = parseContentLine(file(FIRST, SECOND))
const show = (item: PrintedItem): string => `${item.page}/${item.column} ${item.kind}: ${textOf(item.runs)}`

describe('reading a content-line PDF with its type styles', () => {
  it('finds the three columns by the labels over them, and reads nothing above those labels or in the footer', () => {
    expect(content.columns).toEqual(['fase 1', 'fase 2', 'fase 3'])
    expect(content.items.map(show).join('\n')).not.toMatch(/VOORBEELDONDERWIJS|voorbeeld\.example|Voorbeeldlijn/)
  })

  it('reads a goal from its dash through the lines under it, also where it runs on at the top of the next page, and keeps apart what is set in italics', () => {
    const first = content.items.filter((item) => item.page === 1).map(show)
    expect(first).toEqual([
      '1/1 goal: peren tellen tot ten minste twintig (bijv. drie peren en nog twee)',
      '1/2 goal: peren verdelen (bijv. in tweeën) en uitleggen hoe',
      '1/1 goal: peren op een rij leggen',
      '1/1 goal: een peer herkennen',
      '1/3 goal: peren wegen op een weegschaal met gewichten',
    ])
    const [counting, sharing, , , weighing] = content.items
    expect(uprightOf(counting!.runs)).toBe('peren tellen tot ten minste twintig')
    expect(italicStretches(counting!.runs)).toEqual(['(bijv. drie peren en nog twee)'])
    expect(italicsClose(counting!.runs)).toBe(true)
    expect(italicStretches(sharing!.runs)).toEqual(['(bijv. in tweeën)'])
    expect(italicsClose(sharing!.runs)).toBe(false)
    expect(italicStretches(weighing!.runs)).toEqual([])
    expect(italicsClose(weighing!.runs)).toBe(false)
  })

  it('gives every item the heading bar above it, the label of its row, the line that heads its stretch of the columns and the label inside its column', () => {
    const at = (text: string): PrintedItem => content.items.find((item) => textOf(item.runs).startsWith(text))!
    expect(at('peren tellen')).toMatchObject({ cluster: 'Peren tellen', label: '', section: 'aanbodsdoelen', group: '' })
    expect(at('een peer herkennen')).toMatchObject({ cluster: 'Peren (zie ook Pruimen)', label: '' })
    expect(at('kiezen van een vraag')).toMatchObject({ cluster: 'Peren (zie ook Pruimen)', label: 'aanpak:', section: 'aanbodsdoelen' })
    expect(at('perenverhalen: tot vijf')).toMatchObject({ kind: 'feature', label: 'tekstlengte:', section: 'tekstkenmerken' })
    expect(at('luisteren naar')).toMatchObject({ kind: 'goal', label: 'taak', section: 'aanbodsdoelen', group: 'groep 1/2:' })
    expect(at('navertellen van')).toMatchObject({ group: 'groep 3:' })
    expect(content.clusters).toEqual([
      { title: 'Peren tellen', page: 1, description: '' },
      { title: 'Peren (zie ook Pruimen)', page: 1, description: 'Wat een peer is en hoe je er een herkent, van de boom tot op de schaal en van de schaal tot op het bord van een kind' },
    ])
  })

  it('reads a line that ends in a hyphen as a compound that goes on, a goal printed without its dash as unmarked, and a square bullet as a text feature', () => {
    const second = content.items.filter((item) => item.page === 2).map(show)
    expect(second).toEqual([
      '2/1 goal: kiezen van een vraag-antwoordspel over peren',
      '2/2 unmarked: kiezen van een spel over peren',
      '2/1 feature: perenverhalen: tot vijf minuten',
      '2/2 feature: perenverhalen: tot tien minuten',
      '2/1 label: groep 1/2:',
      '2/1 goal: luisteren naar een perenverhaal',
      '2/1 label: groep 3:',
      '2/1 goal: navertellen van een perenverhaal',
      '2/1 text: * Bij deze voorbeeldlijn is fase 1 de eerste mand en fase 2 de tweede.',
      // A second note under the first is a text of its own.
      '2/1 text: NB Onderstreepte woorden staan in een ander boekje.',
    ])
  })

  it('keeps the closing note of the file apart, and lists as statements only goals, marked or not, outside the text features', () => {
    expect(content.note).toBe('Deze lijn is verzonnen voor een toets en zegt niets over echte peren.')
    expect(statementsOf(content, 2).map(show)).toEqual(['1/2 goal: peren verdelen (bijv. in tweeën) en uitleggen hoe', '2/2 unmarked: kiezen van een spel over peren'])
    expect(statementsOf(content, 1).map((item) => item.kind)).toEqual(['goal', 'goal', 'goal', 'goal', 'goal', 'goal'])
  })

  it('fails on a file that prints no row of column labels', () => {
    expect(() => parseContentLine(file([line(100, C1, 'peren tellen ')]))).toThrow(/no row of column labels/)
  })
})

describe('a line of print that comes in pieces of another height', () => {
  const SMALL = 3
  const SYMBOL = 4
  // A piece with its own place and height, as the text layer gives a sign or an exponent.
  const piece = (top: number, left: number, width: number, height: number, font: number, content: string): string => `<text top="${top}" left="${left}" width="${width}" height="${height}" font="${font}">${content}</text>`
  const X = C1 + IN
  const PIECES = [
    ...HEAD,
    line(357, 47, 'Peren meten', WHITE),
    line(389, C1, i('aanbodsdoelen: ')),
    dash(420, C1),
    piece(420, X, 180, 18, UPRIGHT, "peren wegen en 'schatten' "),
    // A sign of the symbol font stands six points higher than its line and is taller; a raised digit is smaller and stands at the top of its line.
    piece(448, X, 100, 18, UPRIGHT, i('(bijv. 4,9 kilo ')),
    piece(442, X + 100, 10, 23, SYMBOL, '\uF0BB'),
    piece(448, X + 110, 90, 18, UPRIGHT, i(' 5 kilo per m')),
    piece(447, X + 200, 6, 12, SMALL, i('2')),
    piece(448, X + 206, 8, 18, UPRIGHT, i(')')),
    dash(520, C1),
    // A lowered digit is smaller too, and its foot stands on the foot of the line: it is not raised.
    piece(520, X, 110, 18, UPRIGHT, 'peren wassen in H'),
    piece(526, X + 110, 6, 12, SMALL, '2'),
    piece(520, X + 116, 12, 18, UPRIGHT, 'O '),
    // A sign of the symbol font that has no character listed stays the code the text layer gives.
    piece(542, X, 60, 18, UPRIGHT, 'en dan '),
    piece(536, X + 60, 10, 23, SYMBOL, '\uF0B7'),
  ]
  const pieces = parseContentLine(file(PIECES))
  const [weighing, washing] = pieces.items

  it('reads a taller sign where the page prints it, as the character it prints, and not ahead of its line', () => {
    expect(textOf(weighing!.runs)).toBe("peren wegen en 'schatten' (bijv. 4,9 kilo ≈ 5 kilo per m2)")
    expect(holdsPrivateUse(textOf(weighing!.runs))).toBe(false)
    // The sign is not set in italics; the italics around it still close the goal.
    expect(italicsClose(weighing!.runs)).toBe(true)
    expect(holdsPrivateUse(textOf(washing!.runs))).toBe(true)
  })

  it('knows a raised digit from a lowered one, and writes it raised only where it is asked to', () => {
    expect(weighing!.runs.filter((run) => run.raised).map((run) => run.text)).toEqual(['2'])
    expect(washing!.runs.some((run) => run.raised)).toBe(false)
    expect(textOf(weighing!.runs, { raised: true })).toBe("peren wegen en 'schatten' (bijv. 4,9 kilo ≈ 5 kilo per m²)")
    expect(textOf(washing!.runs, { raised: true })).toMatch(/^peren wassen in H2O en dan/)
    expect(printedLines(weighing!.runs).at(-1)).toBe('(bijv. 4,9 kilo ≈ 5 kilo per m2)')
  })

  it('gives the marks that close a wording to the wording, and cuts an example that closes its goal where the italics open', () => {
    // The closing quotation mark is the statement's, not the first character of the example.
    expect(afterWording(weighing!, "Peren wegen en 'schatten'", { raised: true })).toBe('(bijv. 4,9 kilo ≈ 5 kilo per m²)')
    expect(afterWording(weighing!, 'peren wegen en ‘schatten’')).toBe('(bijv. 4,9 kilo ≈ 5 kilo per m2)')
    // A wording without the mark leaves it where the page prints it.
    expect(afterWording(weighing!, "peren wegen en 'schatten")).toBe("' (bijv. 4,9 kilo ≈ 5 kilo per m2)")
    const cut = closingExample(weighing!.runs)!
    expect(textOf(cut.statement)).toBe("peren wegen en 'schatten'")
    expect(textOf(cut.example, { raised: true })).toBe('(bijv. 4,9 kilo ≈ 5 kilo per m²)')
  })
})

describe('cutting an item into its statement and the example that closes it', () => {
  const runs = (...pieces: (string | readonly [italic: string])[]): Run[] => pieces.map((each) => (typeof each === 'string' ? { text: each, italic: false } : { text: each[0], italic: true }))
  const cut = (...pieces: (string | readonly [italic: string])[]): [string, string] | null => {
    const found = closingExample(runs(...pieces))
    return found ? [textOf(found.statement), textOf(found.example)] : null
  }

  it('keeps a bracket or a quotation mark that closes the statement with the statement', () => {
    expect(cut('peren sorteren (groen, geel) ', '\n', ['(bijv. op de schaal)'], ' ')).toEqual(['peren sorteren (groen, geel)', '(bijv. op de schaal)'])
    expect(cut("een 'perenroute' ", ['(bijv. van boom naar mand)'])).toEqual(["een 'perenroute'", '(bijv. van boom naar mand)'])
  })

  it('gives the example a bracket that opens it, also where the bracket is set upright before the italics', () => {
    expect(cut('peren schatten ', '\n', '(', ['bijv. hoeveel in de mand?)'])).toEqual(['peren schatten', '(bijv. hoeveel in de mand?)'])
    expect(cut('peren schatten ', ['('], ['bijv. hoeveel in de mand?'], ')')).toEqual(['peren schatten', '(bijv. hoeveel in de mand?)'])
  })

  it('does not cut an item whose example stands inside its sentence, or that has none', () => {
    expect(cut('peren verdelen ', ['(bijv. in tweeën)'], ' en uitleggen hoe ', ['(bijv. hardop)'])).toBeNull()
    expect(cut('peren wegen')).toBeNull()
  })

  it('counts a wording off by its letters, and takes its closing marks with it only where the page prints them', () => {
    const item: PrintedItem = { kind: 'goal', page: 1, column: 1, cluster: '', label: '', section: '', group: '', runs: runs('peren sorteren (groen, geel) ', ['(bijv. op de schaal)']) }
    expect(textOf(runsAfterWording(item, 'peren sorteren (groen, geel)'))).toBe('(bijv. op de schaal)')
    expect(textOf(runsAfterWording(item, 'peren sorteren (groen, geel).'))).toBe('(bijv. op de schaal)')
    expect(textOf(runsAfterWording(item, 'peren sorteren'))).toBe('(groen, geel) (bijv. op de schaal)')
    expect(runsAfterWording(item, 'peren sorteren groen geel bijv op de schaal en nog meer')).toEqual([])
  })
})

describe('the pages an item stands on', () => {
  it('are the page it opens on and each page it runs on to, for the item or for some of its runs', () => {
    const weighing = content.items.find((item) => textOf(item.runs).startsWith('peren wegen'))!
    expect(pagesOf(weighing)).toEqual([1, 2])
    expect(pagesOf(weighing, weighing.runs.filter((run) => run.page === 2)).length).toBe(1)
    expect(textOf(weighing.runs.filter((run) => run.page === 2))).toBe('weegschaal met gewichten')
    expect(pagesOf(content.items[0]!)).toEqual([1])
    expect(content.items[0]!.runs.every((run) => run.page === undefined)).toBe(true)
  })
})

describe('the terms a PDF underlines', () => {
  // A PDF as a word processor writes one: plain objects, a page tree, the
  // drawing instructions of each page deflated. One page of 800 by 1200
  // points; a place is counted from the foot of the page.
  const pdf = (...pages: string[]): Uint8Array => {
    const objects: string[] = ['<</Type/Catalog/Pages 2 0 R>>', `<</Type/Pages/Count ${pages.length}/Kids[${pages.map((_, index) => `${3 + 2 * index} 0 R`).join(' ')}]/MediaBox[0 0 800 1200]>>`]
    for (const [index, content] of pages.entries()) {
      const packed = deflateSync(Buffer.from(content, 'latin1')).toString('latin1')
      objects.push(`<</Type/Page/Parent 2 0 R/Contents ${4 + 2 * index} 0 R>>`, `<</Filter/FlateDecode/Length ${packed.length}>>\nstream\n${packed}\nendstream`)
    }
    return Buffer.from(`%PDF-1.7\n${objects.map((body, index) => `${index + 1} 0 obj\n${body}\nendobj`).join('\n')}\n%%EOF`, 'latin1')
  }
  const rule = (x: number, top: number, width: number, height = 0.7): string => `${x} ${1200 - top - height} ${width} ${height} re\nf*`
  const word = (left: number, top: number, right: number, text: string): string => `<word xMin="${left}" yMin="${top}" xMax="${right}" yMax="${top + 12}">${text}</word>`
  const bbox = (...pages: string[][]): string => pages.map((words) => `<page width="800" height="1200">\n${words.join('\n')}\n</page>`).join('\n')

  const DRAWN = [
    // A rule of a table: it fits no words.
    rule(200, 110.5, 190, 0.3),
    rule(200, 110.5, 190),
    // Under one word but for its colon; under two words; under the first part of a compound.
    rule(230, 110.5, 30),
    rule(300, 110.5, 62),
    rule(230, 130.5, 40),
    // The first half of a term that goes on in the next line, and its second half.
    rule(330, 130.5, 50),
    rule(230, 150.5, 44),
    // Inside a transformation, as an image is placed: not a rule of the page.
    `q 2 0 0 2 0 0 cm ${rule(115, 55, 15)} Q`,
    // Drawn and not filled.
    `230 1000 30 0.7 re\nS`,
  ].join('\n')
  const WORDS = [
    word(230, 100, 264, 'weeg:'),
    word(300, 100, 330, 'rijpe'),
    word(333, 100, 362, 'peren'),
    word(230, 120, 300, 'perenschillen'),
    word(330, 120, 380, 'zachte'),
    word(230, 140, 274, 'pruimen'),
    word(280, 140, 300, 'en'),
  ]
  const pages = pdfPages(pdf(DRAWN))
  const underlined = underlinedOf(pages, bbox(WORDS))

  it('are read from the thin rules the page draws in its own coordinates, where a rule fits the words above it', () => {
    expect(pages).toHaveLength(1)
    expect(pages[0]).toMatchObject({ width: 800, height: 1200 })
    // The filled rules, in page coordinates: not the one inside a transformation, not the one that is only stroked.
    expect(pages[0]!.rules).toHaveLength(7)
    expect(underlined.map((each) => each.term)).toEqual(['weeg', 'rijpe peren', 'perenschillen (in part)', 'zachte', 'pruimen'])
    expect(underlined.map((each) => each.toEnd)).toEqual([false, true, false, true, true])
  })

  it('go to the item whose line of print they stand in, and a term broken over two lines is one term', () => {
    // The XML counts in units of one and a half points: the item starts at 345 and its lines are 18 high.
    const goal: PrintedItem = {
      kind: 'goal',
      page: 1,
      column: 1,
      cluster: '',
      label: '',
      section: '',
      group: '',
      runs: [{ text: 'weeg: rijpe peren perenschillen zachte pruimen en', italic: false }],
      boxes: [
        // The first line goes on after its last underlined word; the second ends with one.
        { page: 1, top: 150, left: 345, width: 260, height: 18 },
        { page: 1, top: 180, left: 345, width: 228, height: 18 },
        { page: 1, top: 210, left: 345, width: 110, height: 18 },
      ],
    }
    const other: PrintedItem = { ...goal, column: 2, boxes: [{ page: 1, top: 150, left: 700, width: 200, height: 18 }] }
    const content = { columns: ['fase 1'], clusters: [], note: '', items: [other, goal], sizes: [{ width: 1200, height: 1800 }] }

    const { terms, elsewhere } = underlinedItems(content, pages, underlined)

    expect(terms.get(goal)).toEqual(['weeg', 'rijpe peren', 'perenschillen (in part)', 'zachte pruimen'])
    expect(terms.has(other)).toBe(false)
    expect(elsewhere).toEqual([])
    // Without an item that holds it, a stretch is reported apart.
    expect(underlinedItems({ ...content, items: [other] }, pages, underlined).elsewhere).toHaveLength(5)
  })

  it('stops on a file whose pages cannot be found among its plain objects', () => {
    expect(() => pdfPages(Buffer.from('%PDF-1.7\n1 0 obj\n<</Type/ObjStm>>\nendobj', 'latin1'))).toThrow(/cannot be read for its rules: it has no catalog/)
  })
})

describe('a content-line PDF as pages and columns', () => {
  it('gives every page the column of labels first and then the fase columns, each item a paragraph on the page it opens on', () => {
    const { pages, columns } = contentLinePages(content)

    expect(columns!.length).toBe(3)
    expect(columns![1]).toEqual([
      'Peren tellen\n\nPeren (zie ook Pruimen)',
      'peren tellen tot ten minste twintig (bijv. drie peren en nog twee)\n\nperen op een rij leggen\n\neen peer herkennen',
      'peren verdelen (bijv. in tweeën) en uitleggen hoe',
      // The goal that runs on overleaf is whole on the page it opens on.
      'peren wegen op een weegschaal met gewichten',
    ])
    expect(columns![2]![3]).toBe('')
    expect(columns![2]![2]).toBe('kiezen van een spel over peren\n\nperenverhalen: tot tien minuten')
    expect(pages[0]).toBe('')
    expect(pages[1]).toContain('een peer herkennen')
  })

  it('is read for one line of an area, not for an overview, the booklet or the list of terms', () => {
    expect(['nl-slo-inhoudslijn-rw-meten', 'nl-slo-inhoudslijn-ne-schrijven', 'nl-slo-inhoudslijn-ojw-samenleving'].map((slug) => isContentLineSource(`edu.nl.source.${slug}`))).toEqual([true, true, true])
    expect(['nl-slo-inhoudslijn-ne-kerndoelen-overzicht', 'nl-slo-inhoudslijn-ojw-boekje', 'nl-slo-inhoudslijn-ne-taalbeschouwing', 'nl-slo-inhoudskaart-taal-fase1'].map((slug) => isContentLineSource(`edu.nl.source.${slug}`))).toEqual([false, false, false, false])
    expect(isContentLineSource('edu.us-ca.source.nl-slo-inhoudslijn-rw-meten')).toBe(false)
  })
})

describe('a table whose columns are headed by something else than a fase', () => {
  const GROUPS = /^mand \d\*?$/
  const TABLE = [
    line(53, 961, 'VOORBEELDONDERWIJS '),
    line(142, C1, 'Fruitwoorden ', WHITE),
    line(382, 47, 'Fruit benoemen ', WHITE),
    line(422, 47, 'Deze woorden zijn van belang om over fruit te praten met kinderen in de eerste en de tweede mand van de school '),
    line(456, C1 + 4, i('aanbodsdoelen: ')),
    dash(491, C1),
    line(491, C1 + IN, 'praten over fruit '),
    line(523, 47, 'Woordenlijst* ', WHITE),
    // One line across the columns, which the text layer gives in three pieces.
    line(563, 47, 'NB  Woorden die in deze voorbeeldlijst hieronder '),
    line(563, C1 + 70, i('schuin')),
    line(563, C1 + 120, ' staan komen later. '),
    line(600, C1 + 4, i('woorden: ')),
    line(640, C1, i('mand 1* ')),
    line(640, C2, i('mand 2* ')),
    line(640, C3, i('mand 3* ')),
    line(680, 47, 'steenfruit: '),
    line(700, 47, 'fruit met een pit '),
    line(680, C2, 'pruim, kers, '),
    line(700, C2, `perzik, ${i('abrikoos')} `),
    line(680, C3, '-pit (kersenpit) '),
    line(700, C3, 'steel-'),
    line(720, C3, 'aanzet (boven) '),
    // The text layer gives two cells of this row as one line.
    line(760, 47, 'pitfruit: '),
    `<text top="760" left="${C2}" width="${C3 - C2 + 120}" height="18" font="0">appel, peer, kweepeer, mispel, meidoorn,  klokhuis, schil </text>`,
  ]
  const table = parseContentLine(file(TABLE), { columnLabel: GROUPS })
  const cell = (label: string, column: number): string[] => printedLines(table.items.find((item) => item.label === label && item.column === column)!.runs, (text) => `_${text}_`)

  it('is read from its first heading bar on, with the columns of its own labels, and a line across the columns belongs to the bar above it', () => {
    expect(table.columns).toEqual(['mand 1*', 'mand 2*', 'mand 3*'])
    expect(table.clusters).toEqual([
      { title: 'Fruit benoemen', page: 1, description: 'Deze woorden zijn van belang om over fruit te praten met kinderen in de eerste en de tweede mand van de school' },
      { title: 'Woordenlijst*', page: 1, description: 'NB Woorden die in deze voorbeeldlijst hieronder schuin staan komen later.' },
    ])
    expect(table.items.map(show)).toEqual([
      '1/1 goal: praten over fruit',
      '1/2 text: pruim, kers, perzik, abrikoos',
      '1/3 text: -pit (kersenpit) steel-aanzet (boven)',
      '1/2 text: appel, peer, kweepeer, mispel, meidoorn,',
      '1/3 text: klokhuis, schil',
    ])
  })

  it('gives a cell the whole label of its row, the line that heads its table, and its lines as printed, with what is set in italics marked', () => {
    const stones = table.items.find((item) => item.column === 2 && item.kind === 'text')!
    expect(stones).toMatchObject({ cluster: 'Woordenlijst*', label: 'steenfruit: fruit met een pit', section: 'woorden' })
    expect(cell('steenfruit: fruit met een pit', 2)).toEqual(['pruim, kers,', 'perzik, _abrikoos_'])
    // A line that ends in a hyphen after a letter goes on in the next: the compound is one word on one line.
    expect(cell('steenfruit: fruit met een pit', 3)).toEqual(['-pit (kersenpit)', 'steel-aanzet (boven)'])
    expect(statementsOf(table, 2)).toEqual([])
    expect(statementsOf(table, 1).map(show)).toEqual(['1/1 goal: praten over fruit'])
  })
})

describe('text as it is compared', () => {
  it('is its letters and digits, without case, accents, spacing or punctuation', () => {
    expect(letters('Peren  tellen: tot  ’twintig’ (in tweeën).')).toBe('perentellentottwintigintweeen')
  })

  it('is told apart from a bracketed example, also one with brackets inside it', () => {
    expect(withoutBracketedExamples('peren verdelen (bijv. in tweeën (of in drieën)) en uitleggen (zie boven) hoe (bijvoorbeeld hardop)')).toBe('peren verdelen  en uitleggen (zie boven) hoe ')
  })
})

describe('joining the goals of the data to the statements a column prints', () => {
  const goal = (id: string, wording: string, cluster = 'Peren tellen'): Goal => ({ id, wording, cluster })
  const column = (n: number): PrintedItem[] => statementsOf(content, n)

  it('joins a goal to the statement whose upright text, whole text or text without bracketed examples is its wording, under its own heading first', () => {
    const goals = [goal('a', 'Peren tellen tot ten minste twintig'), goal('b', 'peren op een rij leggen'), goal('c', 'een peer herkennen', 'Peren')]

    const { joined, unjoined, unprinted } = joinGoals(goals, column(1).slice(0, 3))

    expect(joined.map((each) => [each.goal.id, each.how, textOf(each.item.runs)])).toEqual([
      ['a', 'exact', 'peren tellen tot ten minste twintig (bijv. drie peren en nog twee)'],
      ['b', 'exact', 'peren op een rij leggen'],
      // The heading is compared without the note in brackets after it.
      ['c', 'exact', 'een peer herkennen'],
    ])
    expect(unjoined).toEqual([])
    expect(unprinted).toEqual([])
    expect(joinGoals([goal('d', 'peren verdelen en uitleggen hoe')], column(2)).joined.map((each) => each.how)).toEqual(['exact'])
  })

  it('joins a goal whose wording only opens the statement as a prefix, and says what the statement prints after it', () => {
    const { joined } = joinGoals([goal('a', 'peren tellen tot ten minste')], column(1))

    expect(joined.map((each) => each.how)).toEqual(['prefix'])
    expect(afterWording(joined[0]!.item, 'Peren tellen tot ten minste')).toBe('twintig (bijv. drie peren en nog twee)')
    expect(afterWording(joined[0]!.item, 'peren tellen tot ten minste twintig')).toBe('(bijv. drie peren en nog twee)')
  })

  it('joins the one goal left under a heading to the one statement left under it, and reports what it could not join', () => {
    const goals = [goal('a', 'kan peren tellen tot minstens twintig'), goal('b', 'peren op een rij leggen'), goal('c', 'een peer schillen', 'Peren'), goal('d', 'een peer wassen', 'Peren')]

    const { joined, unjoined, unprinted } = joinGoals(goals, column(1).slice(0, 3))

    expect(joined.map((each) => [each.goal.id, each.how])).toEqual([
      ['a', 'last'],
      ['b', 'exact'],
    ])
    // Two goals are left under one heading, and one statement: neither is joined.
    expect(unjoined.map((each) => each.id)).toEqual(['c', 'd'])
    expect(unprinted.map((item) => textOf(item.runs))).toEqual(['een peer herkennen'])
  })

  it('finds a statement that is printed once more under the same heading with other italic text, and gives it to the goal already joined', () => {
    const again: PrintedItem = { ...column(1)[0]!, runs: [{ text: 'peren tellen tot ten minste twintig ', italic: false }, { text: '(bijv. vijf peren)', italic: true }] }

    const { joined, unprinted } = joinGoals([goal('a', 'peren tellen tot ten minste twintig')], [column(1)[0]!, again])

    expect(joined[0]!.again).toEqual([again])
    expect(unprinted).toEqual([])
  })
})
