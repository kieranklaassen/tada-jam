---
title: Official California wording is never pasted into the repo, a plan, a PR or a game file, the record's Summary is used in its place, and Dutch wording is quoted only with its source line
applies_when:
  - planning a game with a learning goal that follows California standards
  - writing a game's ART.md or PR text that names a school skill
  - quoting a standard, a foundation or a core goal in a plan, a review or a commit message
  - reviewing a game that claims to follow a curriculum
tags: [learning-games, reuse, california, official-wording, licence]
---

Every record has a `reuse_policy`. Every California record is `description-only`: no California publisher grants this repo the right to reproduce its wording, and the repo is public. The Dutch records are `verbatim`: their wording is in the record under `## Official wording`, which ends with a `Source:` line.

Do:

- For a California record, the plan or the PR uses the record's `## Summary`, which is the pack's own text, or new words with the same meaning, and cites the code.
- Where a Summary reads "No summary: a faithful one could not differ from the official wording.", the record is cited by code only and the text describes the game, not the statement.
- For a record whose `reuse_policy` is `verbatim`, the official wording may be quoted in a plan or a PR, in Dutch, followed by the record's `Source:` line. The `## English gloss` is the pack's gloss and is labelled as that when it is used.
- `npm run education:find` with `--wording` prints official wording from the local store. For a California record that output is for reading only.

Do not:

- No California wording, whole or in part, in a committed file, a plan, a PR title or body, a commit message, a review comment or a game file. Not from the publisher's site, not from memory, not from the `--wording` output. The one exception is the two kinds of fragment listed below, which the pack's tools read and nobody writes anywhere else.
- No rewrite that keeps the official sentence and changes a few words. The overlap check (`npm run education:overlap`) fails on a run of eight consecutive words shared with California wording in the files it reads. Under `education/` those are the California records, frames, locators and review files, the source records, the top-level markdown and `.ts` files, and every file under `docs/`, `research/`, `manifest/` and `tools/`.
- No Dutch wording without its source line, and no official wording of either jurisdiction under `games/`.

The fragments the repo holds:

- In a locator file under `education/locators/us-ca/`: the bounding words of each span, at most four words an anchor, and the two sides of each correction, at most four words a side. The two anchors of a span together hold at most half of the words they locate. A located text of three words or fewer cannot be bounded with less, so that limit does not apply to it and its anchors may hold it whole. Two spans are of that kind, and each is a table cell of two words that says the earlier age range has no foundation: in `us-ca/preschool-tk/mathematics` under Strand 3.0, code 3.3, and in `us-ca/preschool-tk/reading-language` under Strand 4.0, code 4.2.
- In `education/manifest/us-ca-additions.ts`: the two sides of each export correction, at most four words a side.

The extraction and the California importer fail on anything longer (`WORD_CAP`, `ANCHOR_SHARE_ONE_IN` and `ANCHOR_SHARE_FROM` in `education/tools/extract.ts`), and the extraction names each span that is too short for the limit of half every time it runs. Nothing else in the repo may hold California wording, whole or in part. A code, the printed name of a document, a domain, a strand or a foundation, and the label of an age range are not wording, and records, frames and locators hold them as printed. No publisher has permitted the fragments. Whether the repo keeps them is the owner's decision.

Reason: on a public repo a push has already published. The overlap check reads nothing outside `education/`, and outside a record it finds only a run of eight words. So in a plan, a PR, a commit message or a game file nothing catches a pasted sentence after it is written, and nothing catches a statement shorter than eight words pasted whole into a file that is not a record. There the rule is kept by hand.
