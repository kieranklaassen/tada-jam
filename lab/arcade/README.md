# Demos

The lab's second round. These are **demos, not games**: each one is a quick prototype of a single idea, made to feel good in the hand (sound, weight, faces, a real scene) and judged by a person playing it. None is a Tada cartridge. A demo the owner rates highly is rebuilt to fit the jam and the Tada contract before it goes anywhere near the kid shell.

The first round (`../protos/`, `../panel/`) invented loops and scored them with simulated children; the owner liked none of them.

## How the set grew

1. **The arcade set (31).** Loops borrowed from things children already play in large numbers (`RESEARCH.md`, `BRIEFS.md`), plus one designed by the owner's four-year-old (`princess-playground`). The owner's verdict: "really fun, but also addictive."
2. **The gentle set (25).** His steer after rating: rooted in Montessori and Waldorf, room for imagination, then "calm and building games, and really fantasy", then a wide spread of looks. `GENTLE.md` holds the rules that follow (real work or real pretend, child-paced, no rewards or praise, a natural ending, quiet feedback) and the look assigned to each demo; `GENTLE-BRIEFS.md` holds the briefs.

His ratings are in `RATINGS.json`. What he marked "Build it" in the arcade set is almost all real-life making and caring; what he marked "No" is abstract skill at speed.

## What each demo is testing

`catalog.ts` groups the demos by type and says what each group, and each demo, is trying to find out. The demo list and the jam's home page are both drawn from it.

| Group | What it tests |
|---|---|
| Real work, calmly | Whether a real task with real steps, the child's own pace and a natural ending is fun enough without rewards. |
| Jobs with jokes | The same making and caring played for laughs: how much of the fun is the task and how much the comedy. |
| Build it, and someone moves in | Whether the world using exactly what the child built can replace a score. Also where most of the looks are tried. |
| Open play and making pictures | Whether a beautiful material and no goal at all is enough. |
| Tap-and-see toys for the youngest | How little structure a two-to-five-year-old needs. |
| One-finger verbs from hit games | Whether a single borrowed verb feels good in the hand, before its scores are stripped. |
| Arcade loops for older children | What coins, upgrades and instant retry feel like: a reference for the pull the owner called addictive, not a direction. |

## Play and rate

```bash
npm run lab:serve
```

Then open `http://localhost:4174/arcade/`. Pick a card, play for a minute with sound on, and give it stars, a verdict and a note in the strip at the top. Left and right arrows move between demos, `R` restarts, `1` to `5` set the stars. `?chrome=0` hides the strip.

Ratings are saved to `lab/arcade/RATINGS.json` by the lab's own Vite server (and to the browser as a fallback), so the next working session can read them. "Copy my ratings" on the list page puts them on the clipboard as text.

## On the jam's home page

`npm run build` at the repo root builds the jam and then this lab into `dist/lab/`, so the deployed jam serves the demo player at `lab/arcade/index.html`. The lab build writes `arcade/catalog.json` (the catalog plus each demo's name, emoji, ages and pitch), and the jam's home page reads that file to list the demos, folded by type, with what each is testing. The home page links out to the player and shares no code with the lab. Ratings made on that copy stay in the browser; only the lab's own server writes `RATINGS.json`.

## What is here

| Path | What |
|---|---|
| `catalog.ts` | The demos grouped by type, with what each group and demo is testing, and the look where one was assigned. |
| `RESEARCH.md` | What the research found children play, and what makes a small prototype feel fun. |
| `BRIEFS.md` | The arcade set's briefs. |
| `GENTLE.md` | Why the gentle set exists, its rules, the fantasy-building additions, the look table, how to build a 3D look, and the sources. |
| `GENTLE-BRIEFS.md` | The gentle set's briefs. |
| `BUILD.md` | How to build a demo: the contract, the code rules, the look-critique-fix loop. |
| `kit/` | The contract (`types.ts`), the stage that runs a demo (`stage.ts`), juice (`fx.ts`), synthesized sound (`sfx.ts`), drawing helpers (`draw.ts`), cached text (`text.ts`), easing and springs (`math.ts`), and a reference demo (`example/`). |
| `protos/<key>/` | One demo per folder; `index.ts` exports `proto`. Three are real 3D with three.js. |
| `shell/` | The grouped card list, the play view and the rating strip. |
| `shot.mjs` | Plays a demo in headless Chromium from a small action script and saves screenshots, so a builder can look at it. `--all` is the smoke check. |
| `registry.test.ts` | Runs in `npm run lab:check`: every folder exports a well-formed `proto`, stays in the lab and offline, and appears in the catalog exactly once. |

## Adding a demo

1. Copy `kit/example/` to `protos/<key>/` and follow `BUILD.md` (and `GENTLE.md` if it is a gentle one).
2. Add it to a group in `catalog.ts` with the one question it is testing.
3. `npm run lab:check`, then look at it with `node lab/arcade/shot.mjs <key>` against a running lab server.

`LAB_HIDE=key,key` on any lab build leaves unfinished demos out of that build.

## Known limits

- No builder could hear their demo. Every sound was written by reasoning about it.
- Touch feel, timing and difficulty were tuned from headless screenshots, not hands.
- The three 3D demos were checked for draw calls and triangles, not for frame rate on an iPad: the screenshot tool renders WebGL in software.
- Both Montessori and Waldorf are wary of screens for young children. The gentle demos are inspired by the two traditions and do not claim to be either.
