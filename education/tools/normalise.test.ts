import { createHash } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { normalise, normaliseCode, wordingHash } from './normalise.ts'

describe('normalise', () => {
  it('makes curly and straight quotes compare equal', () => {
    expect(normalise('the child says “ten” and it’s right')).toBe('the child says "ten" and it\'s right')
    expect(normalise('„ten” ‘ten’')).toBe('"ten" \'ten\'')
  })

  it('makes en dash, em dash, minus and hyphen compare equal', () => {
    const hyphen = 'numbers 1-10'
    for (const dash of ['‐', '‑', '‒', '–', '—', '―', '−']) {
      expect(normalise(`numbers 1${dash}10`)).toBe(hyphen)
    }
  })

  it('collapses runs of whitespace, line breaks and no-break spaces, and trims', () => {
    expect(normalise('  Count   the\tapples\n\n in a basket. \n')).toBe('Count the apples in a basket.')
  })

  it('leaves letters and digits untouched and does not change case', () => {
    const text = 'Tel de Appels: 0123456789 één ABC xyz ² ½'
    expect(normalise(text)).toBe(text)
  })

  it('drops a soft hyphen, so a word that may break compares equal to the word printed whole', () => {
    expect(normalise('koe\u00ADlen en uit\u00ADzetten')).toBe('koelen en uitzetten')
    expect(wordingHash('vriezen/\u00ADkoelen')).toBe(wordingHash('vriezen/koelen'))
    // A hyphen that is printed stays.
    expect(normalise('voor- en nadelen')).toBe('voor- en nadelen')
  })

  it('makes a composed and a decomposed accent compare equal', () => {
    expect(normalise('één')).toBe(normalise('één'))
  })
})

describe('normaliseCode', () => {
  it('gives codes that differ only by punctuation the same key', () => {
    expect(normaliseCode('4.NF.3a')).toBe(normaliseCode('4.NF.3.a'))
    expect(normaliseCode('K-PS2-1')).toBe(normaliseCode('K.PS2.1'))
    expect(normaliseCode(' RF.3.3a ')).toBe(normaliseCode('RF 3.3 a'))
  })

  it('keeps different numbers apart and does not change case', () => {
    expect(normaliseCode('1.12')).not.toBe(normaliseCode('11.2'))
    expect(normaliseCode('4.NF.3a')).toBe('4.NF.3.a')
    expect(normaliseCode('1F')).not.toBe(normaliseCode('1f'))
  })

  it('gives an empty code an empty key', () => {
    expect(normaliseCode('')).toBe('')
  })
})

describe('wordingHash', () => {
  it('is the sha256 of the normalised text', () => {
    const expected = createHash('sha256').update('Count the apples in a basket up to ten.', 'utf8').digest('hex')
    expect(wordingHash('Count the apples in a basket up to ten.')).toBe(expected)
    expect(wordingHash('  Count the apples\nin a   basket up to ten. ')).toBe(expected)
  })

  it('is equal for wording that differs only in quotes, dashes and spacing', () => {
    expect(wordingHash('Count “apples” 1–10.')).toBe(wordingHash('Count "apples"  1-10.'))
    expect(wordingHash('Count apples.')).not.toBe(wordingHash('Count Apples.'))
  })
})
