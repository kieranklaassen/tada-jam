// What California's exports do not say, or say wrongly: small lists the
// importer reads, and one the extractor reads. The first three hold codes and
// the ids of sources only. The fourth, the export corrections, holds
// fragments of at most four words, and that is all the official wording this
// file may hold; the list after it says which lane each corrected code is in,
// for the frames. The last holds the names of domains: headings of a
// document, as the manifest's lanes hold them, and no wording of a standard.

import { sourceId } from '../tools/schema.ts'

// California's additions to the science standards, by code.
//
// The science export drops the double asterisk that the department's grade
// documents put on a California clarification statement, so the importer
// cannot read the marker in the row and reads it here.
//
// Read on 2026-10-01 in the four grade documents arranged by disciplinary
// core idea (kindergarten, grades 1, 4 and 5), with pdftotext -layout. Every
// double asterisk of each file was accounted for: one in the legend at the
// top, one in the footer of each page, and the rest inside the row of one
// performance expectation, which starts with its code. Kindergarten and
// grade 1 have none. None is on a band-level engineering design expectation.
//
// The export does not always keep the marked text. For 4-PS3-1 it has no
// clarification statement at all, and for 4-LS1-1 it lacks the sentence
// California added to the clarification; the three grade 5 rows keep theirs.
// The second check, against the grade documents, is what shows that.

export const US_CA_SCIENCE_ADDITIONS: readonly string[] = ['4-LS1-1', '4-PS3-1', '5-ESS1-1', '5-ESS2-1', '5-PS1-4']

// The sources read by locator (extract.ts) whose documents mark California's
// additions. A record read from one says whether it is an addition, as an
// imported record does; which statements are marked is in the lane's locator,
// read on the page. A source that is not listed marks none, and its records
// have no such field.
//
// The grade 6 document of the Preferred Integrated Course Model marks them as
// the other grade documents do, with a double asterisk and boldface. Read on
// 2026-10-02 on the page image and with pdftotext -layout: 21 double
// asterisks, one in the legend at the top of page 1, one in the legend at
// the foot of each of the other 18 pages, and two inside the clarification
// statement of MS-LS1-1. No other of the grade's 19 expectations has one.
//
// The two adopted Common Core documents mark them with boldface and " CA".
// The anchor standards are read from the English language arts document (PDF
// pages 16, 26, 32 and 37) and none of the 32 is marked: no " CA" is on those
// pages. The eight mathematical practices are read from the mathematics
// document (PDF pages 13 to 15), which has one mark there: CA 3.1, a sentence
// printed at the end of practice 3 for higher mathematics only. The lane
// leaves that sentence out of practice 3 and records it nowhere, so no record
// of the lane is or holds an addition, and its locator marks none.
//
// Not listed: the framework volumes for infants and toddlers and for
// preschool and transitional kindergarten, the social and emotional learning
// competencies and the health education standards. They are California's own
// documents and mark nothing as added.
export const US_CA_ADDITION_SOURCES: readonly string[] = [
  sourceId('us-ca', 'us-ca-cde-ngss-grade6-integrated-pdf'),
  sourceId('us-ca', 'us-ca-cde-ccss-ela-pdf'),
  sourceId('us-ca', 'us-ca-cde-ccss-math-pdf'),
]

// Mathematics footnotes that hold for more than the one row the export puts
// them in. The adopted document marks these on a domain's heading bar, or on
// the stem of a standard whose lettered parts are separate rows; the export
// attaches each to a single row. Codes only. Read on the page images of the
// adopted document on 2026-10-02.
//   domain  the footnote holds for every standard of that row's domain
//   parent  the footnote holds for every lettered part of that row's parent
export const US_CA_MATH_FOOTNOTE_SCOPE: Readonly<Record<string, 'domain' | 'parent'>> = {
  '4.NBT.1': 'domain',
  '4.NF.1': 'domain',
  '5.NF.7.a': 'parent',
}

// Export corrections: places where the department's export file is itself
// damaged or mistyped, so that a record that follows the export faithfully
// would carry the damage. The importer makes each replacement in the wording
// of the row before it hashes and stores it. Each entry was seen on the page
// images of the adopted documents (2026-10-02); the text layer of those
// documents is not enough, because it flattens a raised digit too.
//
// California's publishers do not grant reproduction, and this file is
// committed, so an entry holds as little official text as will do: `from`
// and `to` are each at most four words, and each `from` is the shortest
// fragment that occurs once in the wording, or is paired with an occurrence
// number. The importer fails on a longer side, on a `from` that is not in the
// wording (the export changed), on one that occurs more than once without an
// occurrence number, and on a code no lane imports.

// Why the export is not what the adopted document prints.
export const EXPORT_CORRECTION_REASONS = [
  // A sign of the adopted document came out as a question mark.
  'symbol lost in the export',
  // A raised digit stands on the line as a plain one.
  'exponent flattened in the export',
  // A word of the export is not the word the adopted document prints.
  'export typo',
  // A sentence or lettered part ends without the full stop the adopted document prints.
  'closing full stop missing in the export',
  // A list lacks a comma the adopted document prints between two of its items, and reads differently without it.
  'comma missing in the export',
  // The export's domain column stops before the last word of the name the adopted document prints.
  'domain name truncated in the export',
] as const
export type ExportCorrectionReason = (typeof EXPORT_CORRECTION_REASONS)[number]

export interface ExportCorrection {
  // The text exactly as the export has it.
  from: string
  // The text as the adopted document prints it.
  to: string
  // Which occurrence of `from` in the wording is meant, counted from 1. Needed when there is more than one.
  occurrence?: number
  reason: ExportCorrectionReason
}

// By the id of the export's source record, then by code. The corrections of
// one code are made in the order they are listed.
export type ExportCorrections = Readonly<Record<string, Readonly<Record<string, readonly ExportCorrection[]>>>>

export const US_CA_EXPORT_CORRECTIONS: ExportCorrections = {
  [sourceId('us-ca', 'us-ca-cde-cacs-math-export')]: {
    // Adopted mathematics document, PDF page 23: the first unknown of the example is a question mark there too, the second and third are boxes.
    '1.OA.8': [
      { from: '5 = ?', to: '5 = □', reason: 'symbol lost in the export' },
      { from: '6 = ?', to: '6 = □', reason: 'symbol lost in the export' },
    ],
    // PDF page 49: the not-equal-to sign.
    '6.RP.2': [{ from: 'b ? 0', to: 'b ≠ 0', reason: 'symbol lost in the export' }],
    // PDF page 51: the two digits are raised, and nothing else there is.
    '6.EE.2.c': [
      { from: 's3', to: 's³', reason: 'exponent flattened in the export' },
      { from: 's2', to: 's²', reason: 'exponent flattened in the export' },
    ],
  },
  [sourceId('us-ca', 'us-ca-cde-cacs-ela-export')]: {
    // Adopted English language arts document, PDF page 40, kindergarten column: the end of part b.
    'L.K.4': [{ from: 'word', to: 'word.', occurrence: 3, reason: 'closing full stop missing in the export' }],
    // PDF page 39, grade 1 column: the end of the opening line, before part a.
    'L.1.2': [{ from: 'writing', to: 'writing.', reason: 'closing full stop missing in the export' }],
    // PDF page 35, grade 4 column.
    'SL.4.3': [{ from: 'of', to: 'or', reason: 'export typo' }],
    // PDF page 35, grade 5 column.
    'SL.5.3': [
      { from: 'reason', to: 'reasons', reason: 'export typo' },
      { from: 'and logical', to: 'any logical', reason: 'export typo' },
    ],
    // PDF page 30: the grade 5 column breaks the compound at its hyphen, the grade 4 column prints it on one line.
    'W.5.4': [{ from: 'multipleparagraph', to: 'multiple-paragraph', reason: 'export typo' }],
    // PDF page 95 (printed page 89), column for grades 6–8: the comma after the first item of the closing list of three.
    'WHST.6-8.9': [{ from: 'analysis', to: 'analysis,', reason: 'comma missing in the export' }],
  },
}

// The lane each corrected row is imported into, as <level>/<subject>: by the
// id of the export's source record, then by lane, its corrected codes. A
// frame is generated from the manifest, without the export, and cannot look a
// row up, so it reads here which of its lane's codes are corrected and says
// so. The importer, which has the export, fails when a corrected code is
// listed under another lane than the one that imports its row, or under
// none, and when a listed code has no correction.
export type ExportCorrectionLanes = Readonly<Record<string, Readonly<Record<string, readonly string[]>>>>

export const US_CA_EXPORT_CORRECTION_LANES: ExportCorrectionLanes = {
  [sourceId('us-ca', 'us-ca-cde-cacs-math-export')]: {
    'grade-1/mathematics': ['1.OA.8'],
    'grade-6/mathematics': ['6.RP.2', '6.EE.2.c'],
  },
  [sourceId('us-ca', 'us-ca-cde-cacs-ela-export')]: {
    'kindergarten/reading-language': ['L.K.4'],
    'grade-1/reading-language': ['L.1.2'],
    'grade-4/reading-language': ['SL.4.3'],
    'grade-5/reading-language': ['SL.5.3', 'W.5.4'],
    'grade-6/reading-language': ['WHST.6-8.9'],
  },
}

// Domain names the export has wrong. The importer makes a row's title and
// code scope from its domain column, so a name that is cut short there would
// be cut short in every record of the domain. A row is still found, selected
// and counted by what the export holds; only the name a record carries is the
// corrected one, and no id or file name is made of it. The manifest names the
// domain of such a lane as corrected too, since batches are told apart by the
// name a record's code scope ends in.
//
// The importer fails on a name no imported row has in its domain column (the
// export changed), and on an entry that gives the same name back.

export interface ExportDomainCorrection {
  // The name as the adopted document prints it, in the export's own form: the strand, a colon, the name.
  to: string
  reason: ExportCorrectionReason
}

// By the id of the export's source record, then by the name exactly as the export's domain column holds it.
export type ExportDomainCorrections = Readonly<Record<string, Readonly<Record<string, ExportDomainCorrection>>>>

export const US_CA_EXPORT_DOMAIN_CORRECTIONS: ExportDomainCorrections = {
  [sourceId('us-ca', 'us-ca-cde-cacs-ela-export')]: {
    // The ten RST rows for grades 6 to 8. Adopted English language arts document, PDF pages 89 and 90 (printed pages 83
    // and 84): the title of the table ends, before the span of grades, with the word the export lacks. The export's
    // name for the writing standards of the same section keeps that word.
    'Reading: Literacy in Science and Technical': { to: 'Reading: Literacy in Science and Technical Subjects', reason: 'domain name truncated in the export' },
  },
}

// What the importer puts right on the way from an export to its records, and
// what a frame says of it: the three lists above as one.
export interface ExportFixes {
  // Replacements in the wording of a row, by source and code.
  corrections: ExportCorrections
  // The lane each corrected code is listed under for the frames. The importer
  // checks it against the lane that imports the row; given none, it checks nothing.
  lanes: ExportCorrectionLanes
  // Names of domains, by source and the name the export's domain column holds.
  domains: ExportDomainCorrections
}

export const US_CA_EXPORT_FIXES: ExportFixes = { corrections: US_CA_EXPORT_CORRECTIONS, lanes: US_CA_EXPORT_CORRECTION_LANES, domains: US_CA_EXPORT_DOMAIN_CORRECTIONS }
