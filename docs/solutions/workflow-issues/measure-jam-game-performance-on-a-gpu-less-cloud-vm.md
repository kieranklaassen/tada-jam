---
title: On a GPU-less cloud VM, judge a jam game by Chromium frame CPU under throttle and by WebKit fps relative to Pebble Table, never by absolute fps
date: 2026-09-23
category: workflow-issues
module: performance
problem_type: workflow_issue
component: development_workflow
severity: medium
related_components:
  - testing_framework
  - tooling
applies_when:
  - Measuring or reporting a jam game's performance from a cloud VM or container that has no GPU
  - The only browsers available render WebGL in software (SwiftShader in Chromium, WebKit's software GL)
  - Deciding on a noisy shared machine whether a tier, material, or draw-order change made a game faster
  - Comparing a game's frame rate against Pebble Table or another game
  - Writing the performance section of a jam game's ART.md, REFINEMENT.md, or PR body
symptoms:
  - Pebble Table holds 60 fps in WebKit on the Mac mini but runs at 13 to 25 fps in WebKit and under 2 fps in Chromium at 20x throttle on the VM
  - Three games were flagged slow at full quality on the VM and all three held 60 fps at iPad size on a real GPU
  - The automatic tier settles on the lowest tier, so an unpinned number describes the fallback look
  - The same build reads 1.5 ms apart between two runs, and a VM reset moves the whole baseline
tags: [gpu-less-vm, software-gl, swiftshader, cpu-throttling, jam-perf, webkit, perf-measurement, kids-games]
---

# On a GPU-less cloud VM, judge a jam game by Chromium frame CPU under throttle and by WebKit fps relative to Pebble Table, never by absolute fps

## Context

The ten style-showcase games (PRs #2 to #10 and #14) were built and refined by agents on cloud VMs with no GPU. There, Chromium renders WebGL through SwiftShader (`games/frog-choir/ART.md` quotes the renderer string, `ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero)))`), and Playwright's WebKit uses its own software GL even though it reports "Apple GPU". Frame rate on those machines measures software fill rate, not the game.

The reference game shows the size of the error. Pebble Table holds 60 fps in WebKit on the Mac mini's M4 (the before/after table in [measure on the target device](../performance-issues/measure-on-the-target-device-and-ship-adaptive-quality.md)). On the VMs, the same game ran at 13 to 25 fps in WebKit, depending on the session, and under 2 fps in Chromium at 20x CPU throttle (1.8 to 1.9 in `games/felt-meadow/REFINEMENT.md` pass 25, 1.7 to 1.8 in `games/critter-clay/REFINEMENT.md`).

The VM numbers were wrong in both directions:

- **False alarms.** Bedtime Forest, Felt Meadow, and Critter Clay looked slow at full quality on the VM (top tier pinned in WebKit: 8.3 to 9.3 fps, 7 fps, and 11.4 fps). Re-measured on the M4, all three held 60 at iPad size.
- **No discrimination.** Only one of the three had a real problem. At four times the pixels on the M4, Bedtime Forest and Critter Clay still held 60 and Felt Meadow fell to 39, because of its multisampled post target. On the VM all three looked equally slow, since everything there is fill-bound.

Passes also spent effort on costs that only a software rasterizer has. Kite Tower pass 29 switched its biggest surfaces to a cheaper material, saw no change, and reverted it.

## Guidance

**1. Never report absolute fps from a GPU-less host as a performance result.** Read `WEBGL_debug_renderer_info` and name the renderer next to any fps figure. Say plainly that no physical iPad was measured.

**2. Budget CPU from Chromium under CDP throttle.** Throttle with `Emulation.setCPUThrottlingRate` at 4x and 6x, and read the 95th percentile of `window.__jamPerf.cpuMs`, each game's own update plus render submit per frame (the header comment of `games/frog-choir/view/perf.ts`). The jam's target is under 8 ms at 6x (`games/bedtime-forest/REFINEMENT.md`, "How each pass was measured"). Report the renderer's draw calls beside it. These two numbers carry over to an iPad; the frame rate does not. In Chromium the GPU work runs in another process, so the timed span stays the game's own work.

**3. Do not budget CPU from WebKit.** WebKit cannot be CPU-throttled, and its software rasterizer can do its work inside the draw calls the timer brackets. After Cosy Scarf turned multisampling off, WebKit's `cpuMs` rose to about 20 ms while Chromium's stayed where it was (`games/cosy-scarf/REFINEMENT.md` pass 25).

**4. Use WebKit fps only as a ratio against Pebble Table in the same session.** Alternate the two games in one session (game, Pebble Table, game, Pebble Table) at the same size and DPR, and report the ratio. Felt Meadow pass 25 gives the reason: "A comparison across sessions on this VM says little, because the software renderer's speed drifts with whatever else the machine is doing." Pebble Table exposes no `window.__jamPerf`, so only frame rates compare with it.

**5. Pin the top tier for any claim about the full look.** A working governor steps down on software GL, and every one of the ten games' automatic tiers settles at its lowest tier on the VM (Turning Tower's `ART.md`: "On this VM the governor settles on tier 3 (DPR 1), because software fill, not CPU, is the limit"). An unpinned number describes the fallback look. Report the automatic tier and the pinned top tier as separate rows, as `games/critter-clay/REFINEMENT.md` does ("these numbers are for the lowest look"). Tier numbering differs per game: `?tier=0` is full quality in most games, `?tier=3` in Light Garden, Bedtime Forest, and Critter Clay.

**6. Treat noise as the default and design runs around it.**

- One run is not a measurement. A 30 s run at 6x swings by about 1.5 ms either way (`games/cosy-scarf/REFINEMENT.md`, "How each pass was measured"). Four runs of one Hillside Spring build, full garden, top tier pinned, read 6.8, 8.8, 7.6, and 5.2 ms over 40 minutes.
- Sample long enough to have frames. At software frame rates a short sample holds a few dozen frames: Cosy Scarf at 2.6 fps got 26 in 10 s, and Hillside Spring's pinned top tier kept about 96 frames in 60 s, so its p95 was about the fifth-worst frame.
- Compare builds with an interleaved A/B in one session (old, new, old, new), and report medians or ranges. Hillside Spring pass 30's single back-to-back pair read 7.6 against 8.8 ms, the wrong way round, for a change that does nothing in the scene measured; a longer interleaved A/B showed the pairs were measuring the host.
- Re-baseline after the VM changes. Kite Tower's same code on a new VM read 16.0 to 16.6 fps in WebKit against 18.7 to 19.1 before, and a Chromium 6x p50 of 5.8 to 6.3 ms against 3.5 to 3.8. Only an interleaved run of the pre-merge and merged builds on the new VM told the merge apart from the machine.

**7. Know what the VM cannot tell you, and leave it to a true-GPU pass.** Full-tier fill at DPR 2 on a tile-based GPU is invisible here. A pinned-top-tier gap against Pebble Table in WebKit (Kite Tower at 0.53x to 0.63x, Critter Clay at 11.4 against 15.6 fps) is software fill and does not predict the iPad. Do not give up look or detail for a software-only win: Turning Tower pass 22 found 4x antialiasing was its largest software cost and kept it, because a tile-based GPU resolves it on-chip, and Frog Choir pass 21 kept its triangles because on an iPad fill, not vertices, is the limit. The full tier's verdict belongs to the 4x-pixel WebKit stress test on a real GPU and to a physical iPad (both in [measure on the target device](../performance-issues/measure-on-the-target-device-and-ship-adaptive-quality.md)).

**8. Check the probe you run.** The VM workers used a probe, `perf-probe.mjs`, that was never committed. The committed shared probe, `scripts/jam-perf.mjs`, reports `cpuP95` from `window.__jamPerf` but was written for the Mac mini. Its Chrome runs use the installed Google Chrome (`channel: 'chrome'`) with `--use-angle=metal`. On a Linux VM, run Playwright's bundled Chromium instead. Its `full` mode pins the top tier in every game (tier 3 in Light Garden, Bedtime Forest, and Critter Clay, which count up; tier 0 elsewhere), and `tierN` pins raw tier N.

## Why This Matters

A GPU-less VM gets one thing right that an iPad and a desktop agree on, the CPU cost of a frame, and gets the rest wrong in ways that look like findings. Reading fps from it sends a game back for fixes it does not need and cannot point at the one it does. Ratios within one session cancel the host's speed, CPU proxies take the software rasterizer out of the number, and interleaving cancels the drift that makes a single pair of runs point the wrong way. Full-tier fill, which the VM cannot measure, stays an open question until a real GPU answers it, instead of being answered wrongly.

## When to Apply

- Any performance number from a cloud VM, container, or CI runner without a GPU.
- Before logging a refinement pass's perf column, writing an ART.md budget section, or making a performance claim in a PR body.
- Before cutting geometry, materials, antialiasing, or a post pass because a software-rendered frame rate looked low.

## Examples

A reading that follows this, from the final table in `games/kite-tower/REFINEMENT.md`:

> **WebKit.** Kite Tower on auto runs at 1.06× Pebble Table, and 1.23× at the minimal tier. With the full tier pinned it runs 0.53×. That is DPR-2 fill in software GL: pass 29 swapped the two biggest surfaces to a cheaper material and it changed nothing. It is the same gap other games show with their top tier pinned, so the full tier belongs in the true-GPU pass on a Mac.

Software fps used correctly, as a signal next to a flat CPU number rather than as the result, from `games/shadow-lantern/REFINEMENT.md` pass 12:

> The software renderer's frame rate slid from 13 to 8.9 while CPU time stayed flat, so the cost was fill, not script. The floor area was being painted three times (meadow, board, strips), back to front.

A reporting shape for one pass (fill in the values):

```text
Renderer: SwiftShader (Chromium), software GL (WebKit). No physical iPad measured.
Chromium 6x (CDP), 1180x820, DPR 2, touch, 5 s warm-up, 30 s sample, 12 taps
  auto (settled tier):  cpuP95 per run, median; draw calls
  top tier pinned:      cpuP95 per run, median; draw calls
WebKit, one session, alternating with Pebble Table
  auto and top pinned:  fps per run for both games; ratio to Pebble Table
A/B against the previous pass: interleaved in the same session, not against an older log
```

## Related

- [`measure-on-the-target-device-and-ship-adaptive-quality.md`](../performance-issues/measure-on-the-target-device-and-ship-adaptive-quality.md): the true-GPU side of the same problem, with the M4 re-measure, the 4x-pixel fill stress test, and the budgets.
- [`building-a-jam-game.md`](../conventions/building-a-jam-game.md): step 7 and the checklist, which assume a Mac with a GPU.
- [`refinement-loop-for-kid-3d-readability.md`](refinement-loop-for-kid-3d-readability.md): the refinement loop whose perf column these numbers fill.
