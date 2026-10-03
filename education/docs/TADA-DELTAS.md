# Departures from the Tada record format

The pack's records follow the record format of the Tada education pack plan (`docs/plans/2026-08-22-001-feat-tada-education-pack-corpus-plan.md` in the Tada repo), so the corpus can be lifted into the Tada plugin later. What is carried as it is: Markdown files with constrained frontmatter, one stable id and one kind per file, the id shape `edu.<jurisdiction>.<level>.<subject>.<kind>.<slug>`, the authority levels, dates as quoted ISO strings, unknown keys rejected, and jurisdiction, level, subject and language as separate selectors.

This file lists every difference and its reason. The format itself is defined in `education/tools/schema.ts`.

## Kinds

Tada has five kinds: `frame`, `objective`, `constraint`, `format`, `source`. The pack uses three: `source`, `frame`, `objective`. It records what the official frameworks publish; `constraint` and `format` records are Tada's own design rules and are not written here.

## Ids

| Kind | Id | Why |
|---|---|---|
| objective | `edu.<jurisdiction>.<level>.<subject>.objective.<slug>` | As Tada. |
| frame | `edu.<jurisdiction>.<level>.<subject>.frame.lane` | As Tada. A lane has one frame, so the slug is always `lane`; the Tada plan names no slug for a frame. |
| source | `edu.<jurisdiction>.source.<slug>` | Departure. One official document feeds many levels and subjects, so a source id has no level and no subject. |

An id always matches its path. Source records sit in `education/sources/<slug>.md`, outside the corpus tree, for the same reason.

## Status and authority

- **`status` is always `draft`.** Tada reserves `reviewed` for a registered human reviewer, and the pack has none. The pack's own second check is not Tada's review and is never written as one.
- **The check state is not on the record.** Whether a record was confirmed against its source lives in a separate review file per lane, bound to the text by hash. A record is never edited to say it is confirmed. Tada keeps its review receipt (`reviewed_by`, `reviewed_on`, `reviewed_version`, `reviewed_sha256`) in the record's frontmatter; the pack has none of those fields.
- **`authority: official` describes the official fields only.** Tada labels a whole document with one authority. Here every objective carries `authority: official`, and that covers its code and its official wording or wording hash. The summary, the English gloss and the design notes are the pack's own text and count as `inferred` in Tada's sense, never `reviewed`. They are labelled by region in the body: each opens with a fixed line saying whose text it is. A lift has to carry that labelling, since one `authority` value per document cannot.
- Source and frame records carry no `authority`. A frame carries `status: draft`; a source carries no `status`.

## Fields added to objectives

| Field | Why |
|---|---|
| `standing` | What the publisher says the statement is (a State Board-adopted standard, a legal core goal, guidance, a draft). A closed list per jurisdiction. Tada's `authority` cannot say this. |
| `regime` | Netherlands only. Which set of core goals: `2006`, `2026` or `2027-draft`. Two sets are in force until 2031. |
| `code` | The official code exactly as printed. Empty when the source prints none, with one exception: a bullet of one of SLO's young-child cards, which print no codes, carries a code of the pack's own, the sub-heading the bullet stands under and its position there ("<sub-heading> / <position>"), so that the lookup can find it. Its frame says so. |
| `code_key` | The lookup key made from `code`, so codes that differ only in punctuation are found together. |
| `code_scope` | The document and domain the code belongs to. Printed codes are not unique: numbering restarts per domain, and "core goal 1" exists in three Dutch sets. |
| `parent_code` | Optional. The printed code of the statement this one is a part of. |
| `california_addition` | Optional. Marks a statement California added to the national standard. |
| `age_band` | Optional. The age range the source gives for the statement, where it gives one. |
| `reuse_policy` | `verbatim` or `description-only`, copied from the source record. It decides whether the official wording may sit in the file. |
| `source` | The id of the one source record the statement was read from. Tada has a list, `sources`; here an official statement has one canonical rendition. On a lift it becomes a one-item list. |
| `locator` | Where in the source the statement is. Tada keeps `locator` on the source record; one source holds hundreds of statements, so here it is per objective. |
| `wording_sha256` | The hash of the official wording after normalisation, present whether or not the wording is committed. It is Tada's `passage_sha256`, moved from the source record to the objective for the same reason as `locator`. |
| `supplement_sha256` | Optional. The hash, made the same way, of official text that accompanies the statement without being part of it: a footnote in California's mathematics, English language arts and health exports, the cluster heading of a row of its mathematics export, an example that a Dutch content-line PDF prints with a goal. The text is kept in the store beside the wording. A `verbatim` record also holds it in its file, in the official wording section under a line that opens "Accompanying official text, not part of the statement"; a `description-only` record never does. A record whose source prints no such text has no field. Tada has no counterpart. |

## Fields added to frames

| Field | Why |
|---|---|
| `expected_count`, `counting_method` | How many records the lane should hold, and how that was counted from the source's own index. |
| `check_renditions` | The ids of the source records the second check reads that are not a part's own canonical file. A list, because a lane can have several parts, each checked against a different file. Empty when every part is read a second time in its own file. |
| `check_strength` | `second-rendition` when every part is checked against a different official file, `second-reading` when every part is read again in the same file, `mixed` when the lane has parts of both kinds. The frame's body says which part is which. A lane with nothing published has no parts: an empty list and `second-reading`. |
| `nothing_published` | The jurisdiction publishes nothing for this level and subject. |

Tada's frames declare coverage in prose only. Here a frame is generated from the lane manifest (`education/tools/frames.ts`) and is never edited by hand; its `sources` and `check_renditions` must name source records that exist.

## Source records

| Tada | Pack | How it maps |
|---|---|---|
| `reuse_status` (`permitted`, `restricted`, `unknown`) and `quote_policy` (`short_quote_allowed`, `paraphrase_only`) | `reuse_policy` (`verbatim`, `description-only`) | `verbatim` is `permitted` with quoting allowed. `description-only` is `paraphrase_only`, with `restricted` or `unknown` read from the terms. One field, because the pack makes one decision per source: may the wording be committed or not. |
| none | `terms_quote`, `terms_url` | The publisher's own words on reuse and where they are published, so the policy can be checked against its evidence. |
| `quote` | the `## Official wording` section of each objective | A source holds many statements, so the quoted text is per objective. It is present only when the policy is `verbatim`. |
| `locator`, `passage_sha256` | `locator`, `wording_sha256` on each objective | See above. |
| `archive_sha256` | `pin_kind`, `pin` | The pin is the hash of the fetched bytes (`bytes`), of the extracted text for a page that stamps the day it was read into itself (`extracted-text`), or a commit (`git-commit`). Empty before the first fetch. |
| `published_on` | `version` | The version or edition as the publisher states it; not every publisher gives a date. Note the name: in Tada, `version` is the revision number of the record. Rename on a lift. |
| `revalidate_after` (required) | `revalidate_after` (optional) | The pack is built from pinned files, and a later fetch that returns different content shows as a mismatch against the pin. |
| none | `landing_url`, `media_type`, `required` | The page a person opens, the type of the fetched file, and whether a failed fetch stops the build. |
| none | `standing`, `regime` | As on objectives. |

## Tada fields not carried

| Field | Why |
|---|---|
| `version` (revision of the record) | Records are written by importers and tracked by git and by hash, not by a hand-kept counter. |
| `authored_by` | Tada uses it to keep author and reviewer apart. The pack has no registered reviewers; its second check is a separate pass, recorded in the review files. |
| `relationships` | The pack records statements as published and states no prerequisite, support or equivalence between them. A Dutch goal is never related to a California standard. |
| `effective_until` | Not recorded. `regime` and `standing` say which Dutch set a goal belongs to and whether it is in force. `effective_from` is optional here, since not every source states one. |
| `content_language`, `curriculum_version`, `effective_from`, `authority` on frames | A frame describes a lane and how it is checked, and makes no curriculum claim of its own. |

## Body

Tada's plan asks for a testable claim and optional labelled examples in the body, with no fixed sections. An objective here has fixed sections in a fixed order, each owned by one writer:

| Section | Owner | Present |
|---|---|---|
| `## Official wording` | importer | Only when `reuse_policy` is `verbatim`. The wording, then the accompanying official text where the source prints any, then a `Source: ` line. |
| `## Summary` | lane agent | Only when `reuse_policy` is `description-only`. |
| `## English gloss` | lane agent | Only when `content_language` is `nl`. |
| `## Design notes` | lane agent | Always. |

The reason is the reuse rule and the re-import: a script can prove that a record holds no official wording it may not hold, and can rewrite its own section without touching the others.

## Frontmatter subset

As in Tada's plan, only a documented subset is read: scalars, double-quoted strings, lists of scalars, one level of map. The pack is stricter in one way: a string that is not a bare word (letters, digits, `.`, `_`, `-`, starting with a letter) must be double-quoted. Dates, number-like codes and words such as `yes` are therefore always quoted, and a full YAML parser reads every file the same way.

## Tooling

Tada's plan specifies Ruby with its standard library. The pack's tools are TypeScript run by Node, with a small parser for the frontmatter subset and no added dependency, because the jam has no Ruby toolchain. The files are the interface; the tools are not lifted.

## Normalisation

Wording is hashed after normalisation: whitespace runs collapsed, curly quotes straightened, dashes unified, accents composed. Tada's plan says records are normalised before hashing without saying how. A lift must use the same rules (`education/tools/normalise.ts`) or recompute the hashes.
