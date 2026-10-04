# A check or a reading, on a cloud machine

For a session on a cloud machine that was started to check one design sheet or to read one game folder, and nothing else. It is not a builder: it builds nothing, changes no game file and never touches a lane's branch. The lead starts one such session for each check, so many run at once and none runs on the lead's machine.

The message that started you names four things: the game's key, what to do (a **check** of the sheet, round N, or a **reading** of the folder), the commit of the lane to work from, and the base branch. For a check of round 2 or later it also names the commit the round before read.

## What you work from

- The repository's rules are in `AGENTS.md`. Read it first.
- Fetch, and work only from the commits the message names: `git fetch origin`, then `git worktree add --detach ../read <commit>` gives you the lane's files at that commit in a folder of their own. Read them there. Never check a lane branch out in your own tree and never push to one.
- The repository as it stands on the base branch is yours to read: the guide, the packs, the lookup.

## A check of the sheet

The sheet is `games/<key>/ART.md` at the named commit, everything above the line `## The look`. Read only that file of the game: never the builder's log, its other files or its reasoning.

Your brief is the sections "The design sheet" and "The check of the sheet" of `docs/solutions/conventions/building-a-jam-game.md`, with its numbered rulings, and with them "How a cycle restarts", "Found as left", "The hidden position", "Symbols, and the defaults awaiting the owner" and "By age". Read also every rule file at the top level of `compound-packs/game-design/` and of `education/` (and `education/README.md`, the guide to reading a record), and `docs/solutions/conventions/wordless-clarity-for-the-declared-age-band.md`.

- **The records.** For every record the sheet names, run `npm run -s education:find -- --id <pack id>` and compare code, standing (and regime, for a Dutch core goal) and check state with what the sheet says. Open the record file named on the `file:` line and compare each limit the sheet takes with its Limits section. Check levels and their basis with `npm run -s education:find -- --jurisdiction <us-ca|nl> --age <N> --outline`. Never pass `--wording`, never run a bare `--age` query without `--outline`, and never look for official wording anywhere.
- **Round 2 or later.** Diff the sheet part at the two named commits. Where the round before had findings, confirm each replacement is in the sheet as written, and check only the text that is changed or new, reading the neighbours of each change. Where the round before passed and the builder has since changed sentences so that the sheet says what the built game does, the builder's list of them is in the status block of `games/<key>/REFINEMENT.md` at the named commit: that list is the one thing you read outside the sheet. A change may say a detail as the game does it, and must not write a promise away.
- **Every finding carries its exact replacement**: the heading, the line number, one sentence on why it is wrong, and the sentence that should stand there, ready to paste. Name the ruling where one applies.
- Before the findings, three lines at most on what you verified (records, limits, levels). After them, one line for each finding of the round before (`finding N: pasted` or `not pasted (what differs)`) or for each change the builder lists (`change N: in the sheet` or what differs). Then exactly one verdict line: `PASSED round N` with the sha256 of the sheet part (`awk '/^## The look/{exit} {print}' ART.md | sha256sum`), or `OPEN round N: M findings`. Then, if there is any, a short list headed `Seen in this sheet that other sheets may share`.

## A reading of the folder

Your brief is the section "For the reader" of [`reader.md`](reader.md): six rules, the report under 600 words, and its one verdict line. The folder is `games/<key>/` at the named commit, and `scripts/intersections/games/<key>.ts` where there is one. The message may add what the lead wants looked at in particular.

## How you hand it over

1. Cut a branch from the base branch: `check/<key>-r<N>` for a check, `read/<key>-<first eight of the commit>` for a reading.
2. Write the report, and nothing else, to `docs/build/checks/<key>-r<N>.md` or `docs/build/checks/<key>-read-<first eight>.md`. Its first line names the game, what was done, and the commit it was done on.
3. One commit, ending with the line `Co-Authored-By: Claude Code <noreply@anthropic.com>` and no other trailer, and push that branch. Then stop. The lead fetches the branch, scans it, and passes the report on; it deletes the branch afterwards.

## Hard rules

- No official wording of any learning standard in the report, California's or Dutch; a suspected paste is reported by heading and line number only, with a replacement in the game's own words.
- No name of any AI model, vendor or coding assistant anywhere. A subagent, if you use one, runs on your own model with no model setting.
- Nothing is sent to any service outside the repository's own remote.
- No test suite and no build: a check runs the lookup and reads files; a reading reads files.
