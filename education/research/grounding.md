# Grounding dossier: education pack and learning games (extraction only)

Gathered 2026-10-01 by a read-only scout; transcribed here by the orchestrator because the scout could not write files.
JAM = /Users/kieranklaassen/tada-jam/.claude/worktrees/game-prototypes-ideation-253d02, TADA = /Users/kieranklaassen/tada.

## 1. Tada Education Pack: planned, not built

Status on disk: not built. Searched TADA, /Users/kieranklaassen/tada-deploy, tada-jam and its siblings, ~/worktrees, ~/plans, ~/docs, ~/.claude, ~/.codex for pack / education / standards / curricul / ccss / common-core / tada-education / corpus-index.json; grep for `edu.us-ca`, `edu.nl.groep`, `tada-education`; `git log --all -- plugins/tada-education` (empty). `TADA/plugins`, `TADA/.agents/plugins`, `TADA/.compound-engineering` do not exist. Only hits: two plans, three ideation HTML files, `app/frontend/lib/countries.ts`, `db/migrate/20260728210000_add_country_to_children.rb`.

Corpus plan (TADA/docs/plans/2026-08-22-001-feat-tada-education-pack-corpus-plan.md):
- :7 `artifact_readiness: implementation-ready`
- :29 "The corpus is human-readable Markdown with constrained YAML frontmatter; generated JSON is only a searchable index. This is a development-time system and never ships as a live child-facing 'brain.'"
- :41 "R1. `plugins/tada-education/` is a self-contained plugin with Codex and Claude manifests, one public provider skill, its corpus, tooling, tests, and documentation."
- :55 "R9. ... Every document has a stable ID and exactly one kind: `frame`, `objective`, `constraint`, `format`, or `source`."
- :57 "R11. V1 ships four independently grounded lanes: Netherlands `groep-5` mathematics, Netherlands `groep-5` Dutch spelling, California `grade-3` mathematics, and California `grade-3` English spelling. Tada's current `childCountry: us` is not enough to select California, so developer requests must name `us-ca`; v1 adds no child state field."
- :58 "R12. Local standards never map directly to each other."
- :133 Deferred: "Serving curriculum to cartridges, changing `CartridgeContext`, or adding a Rails curriculum database."
- :138 Deferred: "Jurisdictions, grades, subjects, and languages beyond the four v1 lanes."
- :151 "California Common Core English Language Arts standards (fixed PDF) and California Common Core Mathematics standards (fixed PDF) are the primary California sources; corpus records use stable standard-code locators such as `L.3.2`, `RF.3.3`, and `3.OA`"
- :161 "IDs follow `edu.<jurisdiction>.<level>.<subject>.<kind>.<slug>`"
- :167 "`authority: official | reviewed | inferred`"
- :168 "KTD10. Treat the first corpus as a benchmark slice, not a complete curriculum."
- :236 frontmatter fields: `jurisdiction`, `level`, `subject`, `content_language`, `curriculum_version`, `effective_from`; sources need `publisher`, `url`, `retrieved_on`, `revalidate_after`, `reuse_status`, `quote_policy`, `locator`, `passage_sha256`.
- :335-336 planned paths `plugins/tada-education/corpus/us-ca/grade-3/mathematics/frame.md`, `.../us-ca/grade-3/spelling/frame.md`
- No NGSS, Head Start/ELOF, pre-K, kindergarten, or grade 4 to 7 lane appears anywhere in this plan (grep).

Benchmark plan (TADA/docs/plans/2026-08-22-002-feat-localized-education-pack-benchmark-plan.md):
- :43 "R1. The build suite contains exactly four lanes: `nl/groep-5/mathematics/nl`, `nl/groep-5/spelling/nl`, `us-ca/grade-3/mathematics/en`, and `us-ca/grade-3/spelling/en`."
- :80 "R26. V1 does not merge generated cartridges into Tada, recruit children, measure learning outcomes"
- :128 out of scope: "Broader Netherlands/US claims, state crosswalks, other ages, subjects, languages, or curricula."

Ideation:
- TADA/docs/ideation/2026-07-23-top20-country-pack-feasibility.html:84 "1 United States ... All 50 states free in 1EdTech CASE; build state-layer deltas"
- same:109 "machine-readable standards source verified (US: CASE Network all 50 states; NL: kerndoelen JSON API; AU: MRAC RDF/JSON-LD/SPARQL)"
- TADA/docs/ideation/2026-07-23-learning-standards-middleware-ideation.html:273 "adopt and de-anchor. The UNESCO Global Proficiency Framework for reading and mathematics (grades 1–9 ...)"

What Tada has today instead of a pack:
- TADA/app/frontend/lib/schoolClasses.ts:25 `us: [{ key: 'kindergarten', label: 'Kindergarten' }, ...range(6, (n) => \`grade-${n}\`, ...)]`
- TADA/docs/cartridges.md:62-63 `childCountry?: string | null // ISO country when set; school-system hint`, `childClass?: string | null // country-local class key, e.g. 'groep-5'`

Standards statements that exist in the jam (the only ones found):
- JAM/docs/solutions/conventions/wordless-clarity-for-the-declared-age-band.md:114 "recognizing numerals 0–10 is a US Pre-K expectation"; "Texas 2022 orders concrete, then pictorial, then abstract"
- same:113 "perceptual subitizing to 4 lands at about age 4"; :114 "Conceptual subitizing (seeing 2+3 as 5) arrives around 5"
- JAM/docs/plans/2026-09-22-001-feat-pebble-table-plan.md:92 "US Pre-K expects number names and numerals 0–10 by age 4"
- grep of JAM for common core / CCSS / NGSS / education pack / learning standard / head start: no hits beyond the above.

## 2. What a real jam game must satisfy (for the games run that follows the pack)

JAM/AGENTS.md:
- :9 "`npm run check` runs TypeScript, vitest, the source egress scan, and the wordless check (no words or numerals rendered by kid-side game code)."
- :42 "an `ageBand` naming one audience (whole years, 2 to 12, at most five years wide; `test/games.test.ts` enforces it)"
- :48 "**No engagement mechanics (Tada R15).** No scores, XP, streaks, timers pushing continuation, daily mechanics, counters dangled at the child, or punishment for leaving."
- :54 quality bar: "wordless clarity for the declared age band (... no words or numerals on the kid side, enforced by `npm run wordless:check`; no voice instructions)"
- :56 "**A distinct look per game.** ... pick a style nobody has claimed in the registry in `docs/art-direction.md`"
- :64 "**Δ3 — Spoken words.** ... recorded number words are the worked case ... On-device `speechSynthesis` is permitted for the same purpose."

JAM/docs/solutions/conventions/wordless-clarity-for-the-declared-age-band.md:
- :98 "**The material corrects, nothing judges.** No ticks, crosses, 'wrong' sounds, or scores."
- :113 row 3–4 Avoid: "Any text, numerals, or pictorial icons that must be decoded; spoken instructions; verdicts; several activities live at once"
- :114 row 5–6: "Optional numerals the child reaches for, never required, and self-correcting ... Kid-side numerals need a `wordless-ok: <reason>` exception"
- :115 row 7+: "Optional light iconography; text still not required to play"; Basis: "Mostly owner/agent default. The research in the doc targets ages 4–6"
- :117 "Rows below 3 are not covered ... If a game starts at 2, treat the 3–4 row as the ceiling and cut further"

JAM/scripts/wordless-check.ts:
- :7-13 rules: `kid-text-jsx`, `kid-text-literal`, `kid-text-number`, `kid-text-api` (`ctx.fillText(...)`), `kid-text-component`, `kid-text-attribute`.
- :20-22 "A deliberate exception ... carries a `wordless-ok: <reason>` comment on the same or the previous line."
- Every current `wordless-ok` use is a grown-up performance overlay. None exempts a kid-side numeral.

Claimed looks (JAM/docs/art-direction.md:38-53): Pebble Table = Claymation 3D | Felt Meadow = Felted wool 3D | Light Garden = Glass and light table 3D | Frog Choir = Dusk-pastel toon 3D | Shadow Lantern = Paper-craft diorama | Bedtime Forest = Picture-book gouache 3D | Turning Tower = Geometric (Monument Valley) | Critter Clay = Claymation 3D, second entry | Hillside Spring = Painterly, Ghibli-like | Cosy Scarf = Knitted and crocheted yarn 3D | Alien Frontier (showcase) = Low-poly space western | Kite Tower = Rainbow wood 3D | Bad Neighbours = Pixel-drawn city façades | Moon Phases = Brass orrery by lamplight.

The 13 existing games: youngest minimum age is 3 (pebble-table [3,7]); oldest maximum is 10. No game starts at 2 and none reaches 11 or 12. Pebble Table's plan specifies spoken number words and numeral stickers (plan :187, :193-194) but its code contains neither.

Home page: JAM/harness/games.ts:5 globs `../games/*/index.ts` eagerly, sorted by name; no cap, pagination or grouping.

## 3. lab/arcade ratings on 2026-10-01 (JAM/lab/arcade/RATINGS.json, 37 entries, notes empty)

- build (11): monster-pizza (5 stars), balloon-pop-parade (4 stars), boo-boo-vet, bread-day, campfire-nights, claw-machine, fire-truck-hero, fruit-slicer, muddy-truck-wash, princess-playground, wild-hair-salon
- maybe (5): choo-choo-draw, draw-a-bridge, mutant-garden, surprise-eggs, tea-time
- no (21): advent-market, animal-tower, bark-boats, box-fort, chalk-town, dress-for-weather, fairy-house, farm-morning, feed-the-monster, glow-pegs, goodnight-teddy, ice-palace, lantern-walk, mushroom-village, peg-blaster, rainbow-world, rocket-penguin, slingshot-smash, tiny-island, wash-day, whack-a-mole
- unrated (19): flower-table, block-castle, sand-kingdom, treetop-village, leaf-creatures, wet-paint, wool-picture, nature-walk, hungry-hole, snack-merge, dig-for-the-duck, hop-across, egg-heist, deep-sea-fishing, gem-miner, lane-runner, blob-dash, micro-mayhem, brick-buster
