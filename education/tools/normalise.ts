// The one place text is normalised before it is compared or hashed (plan
// KTD9). Two renditions of the same official statement differ in spacing, in
// curly or straight quotes and in the kind of dash; none of that is a change
// to the wording, and neither is a soft hyphen, which only says where a word
// may break. Letters, digits and case are never changed.

import { createHash } from 'node:crypto'

const SINGLE_QUOTES = /[‘’‚‛]/g
const DOUBLE_QUOTES = /[“”„‟]/g
// Hyphen, non-breaking hyphen, figure dash, en dash, em dash, horizontal bar, minus sign.
const DASHES = /[‐‑‒–—―−]/g
// The invisible mark of a place where a word may be broken over two lines.
const SOFT_HYPHENS = /\u00AD/g

// Text as it is compared: quotes straight, every dash a hyphen, no soft
// hyphen, each run of whitespace one space, no space at either end. An accent written as a letter
// plus a combining mark is composed into the one letter (NFC), so a PDF and a
// data file holding the same Dutch word compare equal.
export function normalise(text: string): string {
  return text
    .normalize('NFC')
    .replace(SINGLE_QUOTES, "'")
    .replace(DOUBLE_QUOTES, '"')
    .replace(DASHES, '-')
    .replace(SOFT_HYPHENS, '')
    .replace(/\s+/gu, ' ')
    .trim()
}

// Text with each run of whitespace one space, no space at either end and no
// soft hyphen: that mark is invisible and defeats a search of committed text.
// Nothing else is changed, so this is not what is compared or hashed: it is
// how a record holds a text and how a printed line is read.
export function collapse(text: string): string {
  return text.replace(SOFT_HYPHENS, '').replace(/\s+/gu, ' ').trim()
}

// The lookup key of a printed code: its runs of letters and runs of digits,
// joined by dots. `4.NF.3a` and `4.NF.3.a` both give `4.NF.3.a`, while `1.12`
// and `11.2` stay apart. Case is kept. The record keeps the code as printed;
// this key is only for finding it.
export function normaliseCode(code: string): string {
  return (code.normalize('NFC').match(/\p{L}+|\p{N}+/gu) ?? []).join('.')
}

// The hash a record pins its official wording by: sha256 of the normalised text.
export function wordingHash(text: string): string {
  return createHash('sha256').update(normalise(text), 'utf8').digest('hex')
}
