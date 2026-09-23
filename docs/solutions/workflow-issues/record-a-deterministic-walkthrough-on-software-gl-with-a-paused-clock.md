---
title: On a GPU-less VM, record a jam game's walkthrough on a clock paused before load and stepped 33 ms per frame from the first drawn frame, with randomness seeded, and review all of it before calling the game done
date: 2026-09-23
category: workflow-issues
module: walkthrough-capture
problem_type: workflow_issue
component: development_workflow
severity: medium
related_components:
  - testing_framework
  - tooling
applies_when:
  - Recording a jam game's walkthrough, cold playtest proxy, or motion clip on a machine that renders WebGL in software
  - Taking refinement stills at a fixed moment of game time on a slow machine
  - Comparing two captures of the same scripted scene frame by frame, before and after a change
  - Deciding whether a jam game is done
symptoms:
  - With the clock only installed, Shadow Lantern ran 338 to 904 ms of game time between screenshots
  - Pausing the clock after load gave exact 33 ms steps, but no frame of two captures matched
  - Two Kite Tower captures matched only on their blank opening frames until Math.random was seeded
  - Seeded screenshots never showed Shadow Lantern dropping a flying creature, and the first full walkthrough did
tags: [walkthrough, playwright, fake-clock, software-gl, ffmpeg, deterministic-capture, cloud-vm, kids-games]
---

# On a GPU-less VM, record a jam game's walkthrough on a clock paused before load and stepped 33 ms per frame from the first drawn frame, with randomness seeded, and review all of it before calling the game done

## Context

Every style-showcase PR (#2 to #10 and #14) ships a `walkthrough.mp4` in the Project store, and the quality bar in `docs/art-direction.md` asks for a scripted walkthrough. The games were built on cloud VMs where Chromium renders WebGL with SwiftShader. There, one Kite Tower frame (two animation frames and a DPR 2 screenshot) takes about 0.8 s of real time. Recorded in real time, the game runs ahead between screenshots, and no two recordings show the same frames.

The plans for Felt Meadow, Shadow Lantern, and Turning Tower name Playwright's `page.clock` for the capture. The REFINEMENT logs describe the result. Kite Tower's says: "The page clock is frozen and stepped 33 ms at a time, so game time matches wall time on a 60 fps tablet however slowly this VM's software GL renders." Shadow Lantern's says "every capture of the same scene is the same frame". The details that make that true were learned game by game. This doc collects them and measures each one again against the production build of `main`.

## Guidance

1. **Seed `Math.random` in an init script.** A paused clock fixes time, not randomness, and all eleven games call `Math.random` outside their tests. Without a seed, two Kite Tower captures of the same script matched only on their three blank opening frames.
2. **Install the clock and pause it before navigating.** `page.clock.install()` alone keeps time flowing at real speed. Pausing after load leaves the load itself on the clock, and load time varies from run to run.
3. **Count from the first drawn frame.** After load, step the clock until the game has drawn. The first drawn frame is time zero for the script and frame 0 of the video. How long that takes differs by game (see Examples). Ten games publish `window.__jamPerf`. On every blank frame its `drawCalls` is 0 or the handle is missing, and it turns positive on the first drawn frame. In Cosy Scarf and Turning Tower it turns positive one step later, which costs one drawn frame, never adds a blank one. Pebble Table publishes no `__jamPerf`, so step it until the screenshot is no longer the blank page.
4. **Take one `runFor(33)` and one screenshot per video frame.** Each 33 ms step runs two animation frames 16 ms apart, so the game sees a 60 Hz tablet however long the screenshot takes. Send each scripted touch in the step where its time falls.
5. **Stitch at 30 fps.** `ffmpeg -framerate 30 -i %05d.png -c:v libx264 -pix_fmt yuv420p walkthrough.mp4` gives H.264 High, yuv420p, which is what PR #9 describes. The video is silent, since it is captured frame by frame (PR #2 says so).
6. **Record the whole walkthrough before calling the game done, and play it like a quick child.** Cover the hands-off opening with its guidance, the core loop, every verb, and a poke of every character. Start each step as soon as the game allows, not after the last one has settled. Then review it frame by frame or as contact sheets. Seeded stills show one moment; only a continuous run shows what overlapping moments do.
7. **Judge behaviour and readability from the video, not smoothness.** The quality bar's "about 60 fps average and no frame over 25 ms" cannot be judged on software GL (PRs #3, #5, and #7 say so). That is a device measurement.
8. **Run it where it can outlive a command.** At the 0.8 s a frame Kite Tower took at DPR 2, a 45 s walkthrough is about 1,360 frames and about 19 minutes. Use a named tmux session, as [agent delivery](agent-delivery-push-branches-and-keep-secrets-out.md) advises for long measurements.

The capture, run against `npx vite preview` (port 4173) after `npm run build`:

```js
import { chromium } from 'playwright'

const STEP_MS = 33
const browser = await chromium.launch()
const context = await browser.newContext({ viewport: { width: 1180, height: 820 }, deviceScaleFactor: 2, hasTouch: true })
await context.addInitScript(() => {
  let s = 0x2545f491
  Math.random = () => {
    s ^= s << 13; s ^= s >>> 17; s ^= s << 5
    return (s >>> 0) / 2 ** 32
  }
})
const page = await context.newPage()
await page.clock.install({ time: 0 })
await page.clock.pauseAt(1000)
await page.goto('http://localhost:4173/?chrome=0#/play/<key>')

const drawn = () => page.evaluate(() => (window.__jamPerf?.drawCalls ?? 0) > 0)
for (let i = 0; !(await drawn()); i++) {
  if (i > 60) throw new Error('no frame drawn after 2 s of game time')
  await page.clock.runFor(STEP_MS)
}

const script = [{ at: 6400, run: () => page.touchscreen.tap(590, 520) }]
let frame = 0
for (let t = 0; t < 45_000; t += STEP_MS) {
  for (const step of script) if (step.at >= t && step.at < t + STEP_MS) await step.run()
  await page.screenshot({ path: `frames/${String(frame++).padStart(5, '0')}.png`, scale: 'css' })
  await page.clock.runFor(STEP_MS)
}
await browser.close()
```

`scale: 'css'` saves a 1180×820 frame of the DPR 2 render. Stills for a refinement pass use the same setup: take the one screenshot at 6.4 s of game time after the first drawn frame.

## Why This Matters

- On software GL, real time is the wrong clock. Timed guidance only shows up when enough game time has passed: the glow at 3 s idle and the ghost hand at 5 s, as the refinement loop notes. A recording that lets the game run on while each screenshot renders jumps past those moments. A game that caps its step does the opposite: Bedtime Forest advances at most 1/20 s per frame (`Math.min(delta, 1 / 20)` in `games/bedtime-forest/view/stage.tsx`), so on the VM its game time falls behind wall time, and its log counts frames instead.
- A capture that repeats frame for frame turns "did this pass help?" into a comparison of the same frame before and after. It also lets a bug seen on one frame, like the frame the fish woke in Shadow Lantern, be recorded again on demand.
- The full walkthrough catches what seeded stills cannot. Shadow Lantern's first full walkthrough ended with four friends in the sky, not six, and every seeded shot had looked fine (see Examples).

## When to Apply

- Recording a walkthrough, a cold playtest proxy, or a motion clip on a VM or container without a GPU.
- Taking refinement stills at a fixed moment of game time on any machine slower than the target.
- Comparing captures across passes or reproducing a frame-specific bug.
- Before calling a game done or handing off its PR.

## Examples

**What each setup gives (measured for this doc).** Production build of `main`, headless Chromium with SwiftShader, 1180×820 at DPR 1, two captures of the same script at 33 ms steps:

| Setup | Frames identical across the two captures |
| --- | --- |
| `install()` only | 1 of 30 (Shadow Lantern); the game ran 338 to 904 ms per screenshot |
| Paused after load | 0 of 30 (Shadow Lantern); load took 677 ms in one run and 633 ms in the other |
| Paused before load | 44 of 46 (Shadow Lantern), 3 of 46 (Kite Tower, the three blank frames) |
| Paused before load, `Math.random` seeded | 46 of 46 (both) |

**Where the first drawn frame falls.** With the clock paused before load, Cosy Scarf, Frog Choir, Shadow Lantern, and Turning Tower had drawn before the first step. Felt Meadow and Hillside Spring drew after one step. Bedtime Forest, Critter Clay, Kite Tower, Light Garden, and Pebble Table drew after three, so a script timed from navigation opens on three blank frames and runs 99 ms early against the game.

**Caught by the walkthrough (PR #5).** Shadow Lantern's walkthrough follows the game's own hints through all six creatures, starting each one 1.5 s before the last is home. Played back frame by frame, the sky ended with four friends: the bird vanished on the frame the fish woke, and the fox when the dragon woke. The controller had one waking slot, and a new wake overwrote a creature still flying home. That creature was already saved, so it came back on the next open, which is why the seeded shots never showed it. The fix flies each creature home as a companion. A new test wakes the fish while the bird is still flying and expects both at home, and it failed before the fix. In the re-recorded walkthrough all six are home by 51 s.

**More from walkthroughs.** Light Garden's walkthrough showed the awake moth fluttering straight through the jelly (pass 18, PR #3), and its final walkthrough found the awake snail reading as a flat yellow lemon (pass 30). Kite Tower's 39 s walkthrough, reviewed as contact sheets every 0.8 s, found Pip cheering with both arms when the kite was straight above her, and Bean wandering into the one spot the scene points to (passes 24 and 25, PR #9).

## Related

- [`refinement-loop-for-kid-3d-readability.md`](refinement-loop-for-kid-3d-readability.md): the pass loop these captures serve. Its 6.4 s delay was wall time on a Mac mini; on a VM it is game time on the paused clock.
- [`measure-jam-game-performance-on-a-gpu-less-cloud-vm.md`](measure-jam-game-performance-on-a-gpu-less-cloud-vm.md): why frame rate on the VM measures software GL, not the game.
- [`building-a-jam-game.md`](../conventions/building-a-jam-game.md): step 8, refinement in logged passes, reviewing motion from video.
- [`wordless-clarity-for-the-declared-age-band.md`](../conventions/wordless-clarity-for-the-declared-age-band.md): the cold playtest proxy, recorded the same way.
