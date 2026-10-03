<!-- template: cartridge/REFINEMENT.md v1 -->
# Refinement log

## Status

- Stage: sheet. The whole design sheet is in `ART.md` at commit `2f24260` (sheet part sha256 `64167625dec6f9e1821e04482569c2e21ea02080d10c06c93a0d1e06fec34ad7`).
- Open: sheet ready for check, round 1
- Look in use: none yet. Next is the spike of the first reserved look, enamel toy cars.
- Work built while the check runs: none yet. Anything built before the pass is recorded here with the sheet commit it was written against.
- Requests to the lead: none.
- Findings not fixed: none.
- Where this run differs from the cloud page: nothing so far.
- Machine: Node 24 installed with nvm (the machine came with 22). Ran green at the sheet: `npx tsc --noEmit`, `npx vitest run games/muddy-truck-wash test/games.test.ts`, `npm run -s wordless:check`, `node scripts/egress-check.ts`, `npm run build`, `npm run egress:built`, `npm run education:built`.

### Template notes

One line a file, kept current as each helper is used in the running game.

- `config.ts`: changed. `LADDER` and `FIRST_VISIT` hold the game's three ids; nothing else touched yet.
- `state.ts`: not used yet.
- `input.ts`: not used yet.
- `audio.ts`: not used yet.
- `guidance.ts`: not used yet.
- `scene.ts`: not used yet.
- The Mount: not used yet.
- `ART.md` outline: used as copied. The heading "The designed order, and what is stored" asks for the ids "as they stand in `config.ts`", so the ladder ids went into `config.ts` with the sheet, before any other code.

The stages in order are sheet, toy, game, gates. Someone with no session to read resumes from this block and the files.

### For the owner to decide

- Nothing yet beyond the defaults in the guide, which the sheet works under as written.

## Pass log

No pass yet. One row per pass: what was looked at, the critique written as the child, the one themed fix set, what was reverted, the measured frame rate, and what is still weak.

| Pass | Looked at | Critique | Fix set | Frame rate | Still weak |
| --- | --- | --- | --- | --- | --- |

## For the pull request

Written as the game is built; the lead builds the pull request from it.

### How the game meets the quality bar so far

- Nothing is drawn yet. Each line of the bar is filled in here as it is met.

### What the next builder should know

- Node 24 is not on the cloud machine by default: `nvm install 24` in `/opt/nvm`, then put its `bin` first on `PATH` in every command, since the shell does not keep it.
- Read the records with `npm run -s education:find -- --id <pack id>` and then the file it names; the Summary or gloss and the Limits are all a sheet needs.
