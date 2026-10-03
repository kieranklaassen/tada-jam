---
id: edu.us-ca.kindergarten.science.frame.lane
kind: frame
title: "Kindergarten science"
jurisdiction: us-ca
level: kindergarten
subject: science
sources:
  - edu.us-ca.source.us-ca-cde-cacs-science-export
  - edu.us-ca.source.us-ca-cde-ngss-kindergarten-dci-pdf
expected_count: 10
counting_method: "Rows of the science export whose Grade Range is K: 13. Less the three engineering design expectations of the K-2 band, listed as skipped: 10. Cross-checked against the codes printed in the grade's document."
check_renditions:
  - edu.us-ca.source.us-ca-cde-ngss-kindergarten-dci-pdf
check_strength: second-rendition
nothing_published: false
status: draft
---

## What this lane covers

10 records, under 3 official domains:

- **Physical Science**: 4
- **Life Science**: 1
- **Earth and Space Science**: 5

## What one record is

One record is one performance expectation. The Description column packs a whole page into one field under labels; only the paragraph labelled Performance Expectation is the standard, with its bracketed clarification statement and assessment boundary inline. The discipline is the second Content Area column. The export drops the double asterisk the PDF puts on California clarification statements, so that flag is set from the PDF; a single asterisk (engineering integration) is kept.

## Parts and how each is checked

- **Science export, kindergarten rows**: 10 records, read from `edu.us-ca.source.us-ca-cde-cacs-science-export`. Checked against `edu.us-ca.source.us-ca-cde-ngss-kindergarten-dci-pdf`, a second rendition. The department's document for the grade, arranged by disciplinary core idea, read with pdftotext -layout. Same granularity: one performance expectation per code. All 13 codes of the export's rows for the grade are in it, none missing on either side. It prints the engineering codes with an en dash (K–2-ETS1-1) and marks California clarification statements with a double asterisk. Its text layer has stray spaces inside words, which a wording comparison must tolerate. No double asterisk in this grade.

The expected count was counted in the file the records are read from, which is the only index. Such a count cannot show a statement that file lacks; the second check, which lists what the check rendition holds and no record carries, is what can.

## Statements skipped

- `K-2-ETS1-1`: Band-level engineering design expectation, which the export repeats under every grade of its band: recorded once, in the cross-grade science lane.
- `K-2-ETS1-2`: Band-level engineering design expectation, which the export repeats under every grade of its band: recorded once, in the cross-grade science lane.
- `K-2-ETS1-3`: Band-level engineering design expectation, which the export repeats under every grade of its band: recorded once, in the cross-grade science lane.

## Gaps if an optional source is missing

None.

## Left out at this level

Official material for this level that the pack records in none of its four subjects:

- **Arts**: Outside the four subjects.
- **Career Technical Education**: Outside the four subjects.
- **Computer Science**: Outside the four subjects.
- **English Language Development**: Outside the four subjects: English language development is deferred by the plan.
- **History–Social Science**: Outside the four subjects.
- **Physical Education**: Outside the four subjects.
- **School Library**: Outside the four subjects.
- **World Languages**: Outside the four subjects.
