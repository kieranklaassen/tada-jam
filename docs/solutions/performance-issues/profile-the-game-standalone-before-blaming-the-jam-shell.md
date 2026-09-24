---
title: When a game lags in the jam shell, run the same build standalone first; Alien Frontier's lag was its own draw calls, not the shell
date: 2026-09-23
category: performance-issues
module: harness
problem_type: performance_issue
component: development_workflow
severity: medium
related_components:
  - tooling
  - testing_framework
applies_when:
  - A game or showcase is reported to lag "in the Tada env" or inside the jam shell but to run fine on its own
  - Changing the harness's storage, attention, resize or overlay code, which runs alongside every game
  - Making a prebuilt game (no source in the repo) run smoothly in the jam
  - Adding a frame-budget test for code whose cost is draw calls rather than simulation
symptoms:
  - The owner heard Alien Frontier lagged inside the jam but "outside the Tada env it works fine", and suspected state saving
  - The same build measured the same standalone and in the shell (WebKit 38.5 vs 38.4 fps, Chrome 6x 21.0 vs 20.7)
  - CPU profiles of the shell page showed no shell code during play; the main thread was idle 80 percent of the time at 20 fps
  - The game issued 1,678 to 3,292 draw calls a frame and its governor started an M4 at Ultra, stepping down with a 170 ms resize each time
root_cause: missing_workflow_step
resolution_type: code_fix
tags: [jam-shell, harness, showcase, alien-frontier, draw-calls, profiling, save-cadence, adaptive-quality]
---

# When a game lags in the jam shell, run the same build standalone first; Alien Frontier's lag was its own draw calls, not the shell

## Problem

Alien Frontier, an owner-approved showcase added from PR #13, runs a prebuilt open world in a same-origin iframe inside the jam shell. The owner reported that it lagged inside the jam, while "outside the Tada env it works fine", and suspected the shell: state saving, or something else in the harness hogging the frame. The shell's candidates were plausible: `ctx.storage` saves, the attention poll, visibility and resize handlers, and React re-rendering the shell.

## What the measurements showed

The same production build ran two ways on the Mac mini (M4), both at 1180×820, DPR 2: its own page (`/alien-frontier/index.html`) and inside the shell (`?chrome=0#/play/alien-frontier`). The probe (`npm run perf:jam`, with `STANDALONE=1` for the page) played the same scripted keyboard and mouse run both times.

| Configuration, game unchanged | Standalone avg fps (worst second) | In the shell |
| --- | --- | --- |
| WebKit | 38.5 (22) | 38.4 (22) |
| Chrome, 6× CPU | 21.0 (12) | 20.7 (12) |
| Chrome, 20× CPU | 6.4 (4) | 6.9 (3) |
| WebKit, 4× pixels | 20.2 (9) | 20.0 (9) |

Both CPU profiles (Chrome, 5 s of the title scene) were almost all the game's own code. In the shell, 105 frames in 5 s and the main thread idle 4.3 s; standalone, 98 frames and idle 4.1 s. No React, storage, polling or observer frames appeared. The game was slow either way: GPU- and submit-bound, not busy on the main thread.

Counting what the game drew answered it. Hooking `drawElements`/`drawArrays` in the iframe showed 1,678 draws a frame in Chrome and 3,292 in WebKit during play, against the jam's budget of about 80. The scene held 2,222 visible meshes (1,991 geometries, 401 materials), 1,934 of them shadow casters, and every character was 25 to 117 separate meshes. Its governor also guessed an M4 could run Ultra and then walked down a tier at a time, each step a canvas resize (about 170 ms in the profile), and it ignored frames over 250 ms.

"Works fine outside" most likely came from a different machine, or from a moment before the governor stepped down, not from the shell: on the same machine the two ways measured the same.

## What was fixed

**The shell, by construction rather than by measurement.** `ctx.storage.save()` re-armed a timer on every call, so a game saving every frame armed 60 a second, though it never serialized until the debounce fired. It now records the state and arms at most one timer. When the timer fires it re-arms for whatever quiet time is left, and the write runs in `requestIdleCallback` where the browser has it (`harness/storage.ts`). `harness/shell.perf.test.tsx` counts it: 600 saves at 16 ms intervals serialize nothing, write nothing and arm a handful of timers, and a mounted dummy game that saves every frame is never re-rendered by the shell.

**The game, with a runtime shim.** The source is not in the repo, so `public/alien-frontier/jam-smooth.js` runs after the boot loader's `__bootDone` and adjusts the built scene; the minified bundle is untouched. `showcase/alien-frontier/PERF.md` lists each change for the game's source. The biggest wins, from a ce-optimize run of six experiments:

- **Merge still scenery by material, but only after watching play.** Snapshot every mesh's world matrix once play has started, wait 2 s, and merge only top-level groups where nothing moved and nothing is held by a game system. Watching the title screen was not enough: windmills and signs only move in play, and a merge there froze them. 797 meshes became 85.
- **Draw far characters from their largest parts.** Beyond 50 m each rig keeps its five largest meshes. The rest go off the camera's render layer, so the game's own `visible` flags are never touched.
- **Fewer shadow draws.** About 1,000 parts under 0.25 m stop casting shadows, and the sun's shadow map redraws every third frame.
- **A governor that follows the jam's rules** (see the perf doc): it starts at Medium, counts missed frames over short windows, ignores one isolated long frame and only real stalls (over 1 s), climbs only with CPU work under 8 ms, and never retries a failed upgrade.

Pooling the 14 point lights to the nearest four and dropping the composer's 4× multisampling made no measurable difference and were not the bottleneck; multisampling was reverted.

| Configuration | Before, in the shell | After, in the shell | After, standalone |
| --- | --- | --- | --- |
| WebKit | 38.4 (22) | 56.9 (44) | 57.6 (45) |
| Chrome, 6× CPU | 20.7 (12) | 43.1 (28), median of three | 44.5 (26), median of three |
| Chrome, 20× CPU | 6.9 (3) | 10.2 (3) | 12.9 (4) |
| WebKit, 4× pixels | 20.0 (9) | 41.1 (18) | 50.0 (35) |

Chrome 6× runs of the same build varied by about ±8 fps, and interleaved shell and standalone pairs showed no systematic gap. Chrome at 20× stays far below 60: the game's own work is still about 3.5 ms a frame at 1×, which needs source changes.

## Why this matters

A same-origin iframe shares its host page's main thread, so the shell is a fair suspect whenever a game lags only inside it. But the shell's code is small and quiet, and blaming it without an A/B measurement sends the work to the wrong place. One standalone run and one profile moved the whole effort from the harness to the scene in minutes.

## Prevention

- [ ] **A/B the host before blaming it.** Run the same production build standalone and in the shell, on the same machine, with the same scripted play, and profile both. Only a gap between them implicates the shell. `STANDALONE=1 npm run perf:jam -- <showcase> ...` does this for showcases.
- [ ] **Count draw calls, not only frames.** Hook `drawElements`/`drawArrays` for a frame of play. A game far over the jam's budget of about 80 is submit-bound whatever the frame rate on a fast machine says.
- [ ] **Keep the shell off the hot path by construction.** `save()` records the state and arms at most one timer. The write happens once per quiet stretch, in idle time. The shell never re-renders a game during play, and `harness/shell.perf.test.tsx` counts that.
- [ ] **For a prebuilt game, watch before merging.** Merge only what stayed still during play and what no game system holds, whole groups at a time; hide detail with render layers, not `visible`.
- [ ] **Measure the noise.** Interleave A/B runs and repeat them. A single Chrome-throttled run of a heavy scene can be off by 8 fps.

## Related

- [Measure on the target device and ship adaptive quality](measure-on-the-target-device-and-ship-adaptive-quality.md): the governor rules the shim's governor follows, and the four-times-the-pixels stress test.
- [Frame-budget tests that hold on a shared CI runner](../test-failures/frame-budget-tests-that-hold-on-a-shared-ci-runner.md): why the shim's test counts draws and decisions instead of timing them.
- `showcase/alien-frontier/PERF.md`: the showcase's own record, for porting the changes into the game's source.
