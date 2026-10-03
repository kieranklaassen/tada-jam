# Building a jam game from a cloud machine

The owner asked on 2026-10-02 for the learning games to be built on remote machines, as many at once as possible. This page is the standing brief for a builder that starts on a cloud machine. It adds no rule of its own: it says how the remote path of the guide works in practice.

Read, in this order, before you write anything:

1. `AGENTS.md` (the jam's rules).
2. `docs/solutions/conventions/building-a-jam-game.md` (the guide: all of it; you are a **remote builder** in its words).
3. This page.
4. Your brief, `docs/build/cloud-briefs/<key>.md`.
5. The two packs your game is designed from: every rule file at the top level of `compound-packs/game-design/` and of `education/` (not their subfolders), and `docs/art-direction.md`.

Where this page and the guide differ, the guide wins, and you say so in your status block.

## The machine

A Linux sandbox with a few cores, Node and git. It has no graphics card and no sound card.

- Node 24 or later is required (`node -v`). The machine's default is older. The first lane found `nvm` under `/opt/nvm`: `export NVM_DIR=/opt/nvm; . /opt/nvm/nvm.sh; nvm install 24`. A shell's settings do not last from one command to the next, so put that version's `bin` folder first on `PATH` at the start of every command that runs `node` or `npm`.
- `npx playwright install --with-deps --only-shell chromium` gives you a browser for stills and for the audits, as CI does it. If it cannot be installed, say so in the status block and carry on: write the spike scene anyway, and the lead takes the still.
- Everything you see is drawn in software. A still tells you about layout, silhouettes and colour; it tells you nothing about frame rate, and a three.js scene looks rougher than it will on an iPad. Measure as [measure on a GPU-less cloud VM](../solutions/workflow-issues/measure-jam-game-performance-on-a-gpu-less-cloud-vm.md) says and take stills as [record a deterministic walkthrough on software GL](../solutions/workflow-issues/record-a-deterministic-walkthrough-on-software-gl-with-a-paused-clock.md) says. The frame rate of your look spike, and every frame rate for the pull request, is taken by the lead on a real graphics card and comes back in your next message.
- You cannot hear. Keep every voice of the game as plain numbers (pitch, peak, attack, length) in one pure module, with a test that holds each voice inside a range you state. The lead checks loudness on a real machine and the owner is the first to listen.
- No key for any outside service is on this machine, and none is needed. `compound find` will not work; grep the frontmatter under `docs/solutions/` instead.
- The education lookup works here (`npm run -s education:find -- …`). The store of official wording is not on this machine and you never need it. Never pass `--wording`.

## Getting the code

1. Add the repository `kieranklaassen/tada-jam` to your session with write access, clone it once, and register the clone as your repository root.
2. Set a neutral identity for your commits: `git config user.name "Tada Jam builder"` and `git config user.email "noreply@anthropic.com"`.
3. Ask the remote whether your branch exists: `git ls-remote --heads origin lane/<key>`.
   - **It does not exist: this is a first run.** Cut the branch straight from the base commit your message names, `git switch -c lane/<key> <BASE_SHA>`, and confirm that `git rev-parse HEAD` equals that commit and `git status --short` is clean. If either fails, write nothing, say so in your report, and stop. Then push at once, before anything is installed: `git push -u origin lane/<key>`. If the push is refused, do not work around it: no other token, no credential helper, no raw API call, no other publishing route, and no key or token written anywhere. Report the refusal as printed, and stop.
   - **It exists: this is a later run, whatever your message says.** `git fetch origin`, `git switch lane/<key>` (or `git switch -c lane/<key> origin/lane/<key>` in a fresh clone), `git merge --ff-only origin/lane/<key>`, and confirm the commit your message names is the tip or an ancestor of it. Then read the status block in `games/<key>/REFINEMENT.md` before anything else. Never run the generator a second time.
4. `npm ci`.
5. First run only: make the game folder with the generator, with the values in your brief: `npm run new:game -- <key> "<Name>" <youngest>-<oldest> <emoji>`. Commit it and push.

Every run starts as if on a new machine: assume no earlier session, checkout or file survives, and that only what was pushed exists.

## Branches, commits, pushes

- One game, one branch: `lane/<key>`. Never push to any other branch, with one exception below. Never force-push, rebase or stash, and never merge anything but the fast-forward to your own branch's remote tip at the start of a later run.
- If a push is rejected because the remote branch moved under you (the lead wrote to it while you ran), do not merge and do not force. Push your work once to `lane/<key>-rescue`, say so in your report, and stop. That is the only other branch name you may ever use.
- Commit and push at each stage boundary the guide names (the sheet, the toy, the game, the gates), and in between after every piece that leaves your folder green, at least once an hour. A machine can go away; only what is pushed exists.
- Commit by path: `git add games/<key>` (and your audit config if you have one), never `git add -A`.
- A commit message says what changed and why, in plain words. It names no model and no official wording, and no tool other than in its last line, which is always: `Co-Authored-By: Claude Code <noreply@anthropic.com>`.
- CI runs the `check` job on every push of your branch. You cannot read it from the machine; the lead reads it and tells you in your next message what failed. A green run on your machine is not the gate.
- The branch is public from the first push, and a pushed commit cannot be taken back. Nothing on your machine can compare a sentence with official wording, so you keep that rule by hand, in every file and every message. For a California record, use the record's Summary as it stands or say what the child does with your game's objects. Never restate a standard from memory, however short and well known it is. A record is named by its pack id or its official code.

## Work in small steps

A cloud session's single reply is cut off at a fixed length, and a session that is cut off repeatedly ends with nothing pushed.

- Never hold a whole large file or a whole design in one reply. Decide the next small piece, write it to a file, run it, commit, push; then the next.
- Write the design sheet heading by heading, and code a file at a time in parts of a couple of hundred lines at most.
- Push the generated folder with the first two headings of the sheet within your first twenty minutes.
- If you use subagents, they run on the same model as you, with no model override and no cheaper tier. Give each a piece small enough to finish, in your own checkout, and collect each result before you end your turn. Never write the name or id of a model anywhere: not in a file, a commit, a prompt or a report.

## What is yours and what is not

- Yours: `games/<key>/` and, for a three.js game, `scripts/intersections/games/<key>.ts`. Nothing else.
- Frozen for you: `package.json` and the lockfile, `templates/`, `scripts/` other than your audit config, `harness/`, `test/`, the root configs, `.github/`, `AGENTS.md`, `CONCEPTS.md`, `docs/` (the look ledger included), `education/`, `compound-packs/`, `lab/`, and every other game. If you need one changed, write the request in your status block (the file, the change, the reason), push, and work on something that does not need it. The lead makes the change and names the new commit in your next message.
- The demo your brief names under `lab/arcade/protos/` is there to be read for its idea, its verb and its feel in the hand. No line of it is copied into `games/`.
- The four frozen template files in your folder (`perf.ts`, `quality.ts`, `attention.ts`, `saveCadence.ts`) are never edited. A fault in one is a request to the lead.
- The other copied files (`state.ts`, `config.ts`, `audio.ts`, `input.ts`, `guidance.ts`, `scene.ts`, the Mount) are yours to change, and the template they came from is still being proven by two pilot games. So put your game's own rules in new modules, and leave a copied file as it was wherever you can: the lead can then replace an untouched copy when the template improves. When a copied file is wrong or lacks something any game would need, add a line under **Template notes** in your status block (the file, what is wrong, what you changed if you had to) and fix it locally only if your folder cannot go green without it.

## What a run does, and where it ends

Your brief says which stages this run covers. Whatever it covers:

- The sheet comes first and is pushed as soon as it is whole, with `Open: sheet ready for check, round 1` in the status block and the commit that holds it. The lead starts a checker who is not you. You do not check your own sheet and you do not wait idle for the check: carry on with what the brief allows meanwhile, and record in the status block the sheet commit that work was built on.
- The sheet part of `ART.md` is everything above the line `## The look`. Its hash, which a pass names, is `awk '/^## The look/{exit} {print}' games/<key>/ART.md | sha256sum`.
- The look: build the spike for your first reserved look as the guide says: the game's real scene in the style at the quality bar, before gameplay. Until the toy replaces it, the Mount shows that scene at load, with a fixed seed, so the lead can open your branch and take the still at 1180 by 820 on a real graphics card. Keep your own stills outside the repository and commit none. If the first look cannot be made clear at your youngest age, say why in the status block and spike the second. If your game has no second row, or none of its rows works, propose a look in the status block in the columns of the ledger in `docs/art-direction.md`, and do not spike it until the lead has answered: two builders cannot see each other and may propose the same look. If the row you fall back to needs the other kind of renderer, say so in the status block before you switch.
- When the next thing you could do needs an answer you do not have (a frozen file changed, a look ruled on, an owner decision), you are blocked: write it in the status block, push, and stop. The answer comes in your next message, or, when it is long, in a file on the base branch that the message names; read it with `git fetch origin` and `git show origin/<base branch>:<path>`, without merging.
- Run before each push: `npx tsc --noEmit`, `npx vitest run games/<key> test/games.test.ts`, `npm run -s wordless:check`, and `node scripts/egress-check.ts`. At each stage boundary also run `npm run build`, `npm run egress:built` and `npm run education:built`. Report a failure with its output. Never say something passes without having run it. When a test of another game fails or times out on your machine, say so and leave it.
- Keep, at the end of `REFINEMENT.md`, a section **For the pull request**: how the game meets each line of the quality bar so far, and what you learned that the next builder should know. Write it as you go. The lead builds the pull request from it.

## The report

Your last message of every run gives, in this order: the branch and its last commit; the stage reached; what you ran and what passed; what is open (the sheet's check, requests to the lead, findings not fixed, the look in use and why); your template notes; and anything the owner has to decide. Keep it short: the same facts are in the status block, which is what the next run reads, and a long reply is the one thing that gets cut off.
