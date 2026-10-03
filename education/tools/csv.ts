// A reader for the standards search exports: comma-separated text whose rows
// end in CRLF, whose quoted fields may hold bare line feeds and commas, and
// in which a quote inside a quoted field is doubled. Nothing is trimmed here:
// the exports carry stray spaces and tabs, and what to do with them is the
// importer's decision.

// The rows of the file, each a list of fields. A line break outside quotes
// ends a row; inside quotes it is part of the field. The last row may lack
// its line break.
export function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let quoted = false
  // Whether the row under way holds anything, so the line break that ends the
  // file does not make an empty last row.
  let open = false
  const endRow = (): void => {
    row.push(field)
    rows.push(row)
    row = []
    field = ''
    open = false
  }
  for (let index = 0; index < text.length; index++) {
    const char = text[index]!
    if (quoted) {
      if (char !== '"') field += char
      else if (text[index + 1] === '"') {
        field += '"'
        index++
      } else quoted = false
    } else if (char === '"') {
      quoted = true
      open = true
    } else if (char === ',') {
      row.push(field)
      field = ''
      open = true
    } else if (char === '\n' || (char === '\r' && text[index + 1] === '\n')) {
      if (char === '\r') index++
      endRow()
    } else {
      field += char
      open = true
    }
  }
  if (open) endRow()
  return rows
}

export interface Table {
  // The column names. A name that occurs more than once keeps its plain form
  // the first time and is `Name#2`, `Name#3` after that, which is how the
  // manifest's selections name such a column.
  header: string[]
  // One entry per row after the header, in file order: column name to field.
  rows: Record<string, string>[]
}

export function readTable(text: string): Table {
  const [first = [], ...rest] = parseCsv(text)
  const seen = new Map<string, number>()
  const header = first.map((name) => {
    const occurrence = (seen.get(name) ?? 0) + 1
    seen.set(name, occurrence)
    return occurrence === 1 ? name : `${name}#${occurrence}`
  })
  const rows = rest.map((fields) => Object.fromEntries(header.map((name, index) => [name, fields[index] ?? ''])))
  return { header, rows }
}
