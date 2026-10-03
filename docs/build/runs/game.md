# The game run

For a cloud builder whose toy is built and pushed, and whose message names this page. It is a later run in the words of [`../CLOUD.md`](../CLOUD.md): fetch, switch to your branch, fast-forward to its remote tip, and work from there. `CLOUD.md`, your brief and the guide still decide; this page says what the run covers and where it ends.

## Before you build

1. Read [`../pilot-notes.md`](../pilot-notes.md) (`git show origin/feat/learning-games-build:docs/build/pilot-notes.md`), the parts on scenes and state above all. The template files have not changed since your branch was cut: there is nothing to merge or refresh.
2. Look under `docs/build/answers/` on the base branch for a file for your game with a higher number than you have handled, and act on it first. The game is built on the sheet as it stands after the last round you have handled; where a later round changes the mechanic, the error, the designed order or the saved state, you bring the game into line in the run that handles it.
3. The owner has been shown your toy and may not have answered yet. You build on at your own risk: if he rejects the look, the view is redone in your next reserved look and the rules stay. So keep everything that is not drawing out of the view.

## What the run covers

Steps 5 to 9 of the guide, on your toy.

- **The cycle**, as "The designed order, and what is stored" in your sheet has it: the ids as they stand in `config.ts`, the judging, the move of the position, the first-visit default from the age hint with `null` handled and both ends open, the harder option where the sheet has one, and the hidden position. The age is a hint and never gates anything.
- **The error as a consequence**, cell by cell as the sheet lists it. Nothing is rated, counted or praised.
- **Every cell of the grid**, each with its own motion and its own sound, and what the sheet says is new on day 15.
- **The scenes**, on `scene.ts`, each with what it saves when it starts and a test for that. A touch ends a scene and is then an ordinary touch. No scene replays on load.
- **How a cycle restarts** and **found as left**, as the guide's two sections say: the next customer, patient or vehicle waits for the child's touch, and a put-away at any instant, a scene included, loses nothing.
- **The characters and their fixed tastes**, each moving like itself.
- **The whole idle ladder**, and one obvious want in every scene.
- **Performance**: the adaptive quality and the overlay are already in. Add the frame-budget test the template names, and keep to the budget of your renderer (three.js: under about 80 draw calls, no shadow maps, at most one post pass; canvas: at most one full-surface composite a frame).
- **Nothing passes through anything.** A three.js game writes its moments in `scripts/intersections/games/<key>.ts` so that they reach every state, runs the audit with the browser your machine has, fixes or allows each finding with a reason and a cap, and sets `enforce: true`. A canvas game covers overlap with its own model tests.
- **Logged passes** (step 8) and **the cold playtest proxy** (step 9) on the production build, with your own stills kept outside the repository. At least three passes, each with the critique in the child's words and one fix set.

## What it does not cover

- Frame rates on a graphics card, the look registry row and the pull request are the lead's. Keep "For the pull request" in `REFINEMENT.md` current, and leave the text of the registry row at the end of `ART.md`.
- A game whose band starts at 6 or above, other than Fruit Slicer, draws no numeral until the message that names the commit of the shared `symbols.ts`. Build every position that needs none, and leave the ones that need one laid out in the rules and unwired in the view; say which in the status block.
- Speech. No game depends on a spoken word until the owner has tried it on his iPad.

## Where it ends

- The gates as far as your machine takes them: the checks `CLOUD.md` names, `npm run build` with `npm run egress:built` and `npm run education:built`, and for a three.js game `npm run check:intersections -- <key>`. Say what could not be run and why.
- The status block: `Stage: gates`, the sheet round and hash the game stands on, what the lead should try first, what is still weak, what is open, and one line for each thing only the owner can settle.
- Push, and stop with the short report.
