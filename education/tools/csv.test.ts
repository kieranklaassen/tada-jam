import { describe, expect, it } from 'vitest'
import { parseCsv, readTable } from './csv.ts'

// Every cell here is invented. No official wording belongs in a test.

describe('parsing an export', () => {
  it('reads rows that end in CRLF as lists of fields', () => {
    expect(parseCsv('Code,Grade,Text\r\nA.1,K,Count pears\r\nA.2,1,Sort pears\r\n')).toEqual([
      ['Code', 'Grade', 'Text'],
      ['A.1', 'K', 'Count pears'],
      ['A.2', '1', 'Sort pears'],
    ])
  })

  it('keeps a quoted field with a bare line feed and a doubled quote as one field', () => {
    const rows = parseCsv('Code,Text\r\nA.1,"Label:\nSay ""pear"" aloud, twice"\r\nA.2,Sort pears\r\n')

    expect(rows).toHaveLength(3)
    expect(rows[1]).toEqual(['A.1', 'Label:\nSay "pear" aloud, twice'])
    expect(rows[2]).toEqual(['A.2', 'Sort pears'])
  })

  it('reads a last row that has no line break after it, and keeps empty fields', () => {
    expect(parseCsv('Code,Note,Text\r\nA.1,,Count pears')).toEqual([
      ['Code', 'Note', 'Text'],
      ['A.1', '', 'Count pears'],
    ])
  })

  it('leaves spaces and tabs inside a field as they are', () => {
    expect(parseCsv('Code,Grade\r\nA.1 ,6-8\t\r\n')[1]).toEqual(['A.1 ', '6-8\t'])
  })
})

describe('reading an export as a table', () => {
  it('names a header that occurs twice by its occurrence', () => {
    const table = readTable('Area,Code,Area,Text\r\nPears,A.1,Orchard,Count pears\r\n')

    expect(table.header).toEqual(['Area', 'Code', 'Area#2', 'Text'])
    expect(table.rows).toEqual([{ Area: 'Pears', Code: 'A.1', 'Area#2': 'Orchard', Text: 'Count pears' }])
  })

  it('keeps the rows in file order', () => {
    const table = readTable('Code\r\nA.1\r\nA.2\r\n')

    expect(table.rows.map((row) => row.Code)).toEqual(['A.1', 'A.2'])
  })
})
