---
title: A game that makes three.js materials, geometries or objects at module load draws from Math.random in every other game's page, and turns Pebble Table's seeded intersection audit red on a pull request that does not touch Pebble Table
date: 2026-10-12
category: test-failures
module: intersection-audit
problem_type: test_failure
component: testing_framework
severity: medium
related_components:
  - development_workflow
  - tooling
applies_when:
  - Adding a three.js game to the jam, or moving a shared material, geometry or mesh to the top of a module
  - Pebble Table's enforced intersection audit fails on a pull request that changes no Pebble Table file
  - An audit failure in another game repeats the same finding on every rerun
  - Checking a new game's audit in a worktree cut from an older base than main
  - Before pushing a three.js game
symptoms:
  - The intersection audit job failed in Pebble Table on pull request 55, which added Block Castle and changed nothing in Pebble Table
  - The findings were real crossings on the Honest Scale, a shell sinking into an acorn and a pan into an acorn
  - Every rerun failed the same way, so it looked like a flake and was not one
  - On an older base the audit showed a pan-into-acorn crossing whatever game was added, seen with Hungry Hole, which was clean on the merged tree
root_cause: test_isolation
resolution_type: code_fix
tags: [intersection-audit, three-js, math-random, determinism, module-load, ci, pebble-table, kids-games]
---

# A game that makes three.js materials, geometries or objects at module load draws from Math.random in every other game's page, and turns Pebble Table's seeded intersection audit red on a pull request that does not touch Pebble Table

## Context

The jam shell loads every game's code at once: `harness/games.ts:5` registers the games with an eager glob. So whatever a game's modules do when they load, they do in every other game's page too.

A three.js material, geometry, object or texture takes a uuid when it is made, and the uuid comes from four draws of `Math.random` (`node_modules/three/src/math/MathUtils.js:21`, called from `Material.js:52`, `BufferGeometry.js:81`, `Object3D.js:97` and `Texture.js:76` under `node_modules/three/src/`). One made at the top level of a module makes those draws at load, in every page of the jam.

Pebble Table takes the seed of its own stream from `Math.random` at mount (`games/pebble-table/pebble-table.tsx:62`). The intersection audit replaces `Math.random` with a fixed sequence before the page loads (`scripts/jam-intersections.mjs:164`), so the audit plays one fixed table. A new game that draws at module load shifts that sequence, Pebble Table mounts with another seed, and the audit plays another table. On some tables Pebble Table has real crossings.

Seen on pull request 55 (2026-10-11). Block Castle had three shared materials made at module load. The `Intersection audit` job (`.github/workflows/ci.yml:49`) then failed in Pebble Table, with a shell sinking into an acorn on the scale and a pan into an acorn, the same way on every run. The fix was commit `6e9d2bd`, which makes the three materials on first use (`games/block-castle/view/folkView.ts:44`).

## Guidance

**1. Make nothing at module load that draws from `Math.random`.** No `new THREE.*Material`, `new THREE.*Geometry`, `new THREE.Mesh` or `new THREE.Object3D` at the top level of a module, and nothing that makes one there (a helper called at top level, a module-level object literal that holds them). Make them on first use or in the Mount. Block Castle keeps its three shared materials behind one function that makes them the first time it is called (`games/block-castle/view/folkView.ts:47`).

**2. When Pebble Table's audit goes red on a pull request that adds a game, grep the new game for module-level `new THREE.` first.** Do this before reading Pebble Table's findings as a regression in Pebble Table, and before rerunning the job. A failure from this cause repeats on every run, because the shifted sequence is as fixed as the old one.

**3. Always check on the merged tree, from a fresh production build.** The merged tree is main plus the new game. Never judge it in a worktree on an older base: an older base shows a pan-into-acorn crossing whatever game is added. That was seen with Hungry Hole, which was clean on the merged tree.

**4. Before pushing a three.js game, run Pebble Table's audit and the game's own audit on the merged tree.** `npm run check:intersections -- pebble-table`, and the same for the new game's key. A clean run of the new game alone says nothing about what its module load did to the others.

**5. Say what is still open.** Pebble Table under another seed does have real crossings. That is not fixed. It is only avoided, by keeping the sequence before its mount stable.

## Why This Matters

The failure lands in a game the pull request does not touch, so the first reading is that the audit is flaky, and the first move is a rerun. The rerun fails the same way, and the next reading is that Pebble Table regressed on main. Both readings send the work to the wrong game. The cause is a few lines at the top of one module in the new game, and the grep in rule 2 finds them in seconds.

It also matters beyond the audit. Module-level three.js objects are made in every game's page whether the child opens that game or not.

## When to Apply

- Writing a shared material, geometry or mesh for a new three.js game.
- Reviewing a pull request that adds a game, before its audit run.
- Reading a red `Intersection audit` shard whose failing game is not in the diff.
- Comparing an audit result from a worktree with one from CI.

## Examples

The search for rule 2, run from the repo root. It finds the declarations written at the left margin. Read the top of each view module as well, for a helper called at top level:

```bash
grep -rnE "^(export )?(const|let) .*new THREE\.[A-Za-z0-9]*(Material|Geometry|Mesh|Object3D|Group|Texture)" games/<key>
```

A `new THREE.Vector3`, `Quaternion` or `Color` at module level takes no uuid and is not this problem. Block Castle still has some (`games/block-castle/view/room.ts:12`, `games/block-castle/view/folkView.ts:80`).

Before, in outline (three shared materials made when the module loads):

```ts
const matte = new THREE.MeshLambertMaterial({ vertexColors: true })
```

After, as it is in `games/block-castle/view/folkView.ts:47`:

```ts
let materials: { matte: THREE.Material; glossy: THREE.Material; dark: THREE.Material } | null = null
const shared = () =>
  (materials ??= {
    matte: new THREE.MeshLambertMaterial({ vertexColors: true }),
    glossy: new THREE.MeshPhongMaterial({ vertexColors: true, shininess: 70, specular: new THREE.Color('#8a6a48') }),
    dark: new THREE.MeshBasicMaterial({ color: '#2b160c' }),
  })
```

The check for rules 3 and 4, on main with the new game merged in:

```bash
npm run build
npm run check:intersections -- pebble-table <key> --ci
```

## Related

- [Run the intersection audit before showing the owner](../workflow-issues/run-the-intersection-audit-before-showing-the-owner.md): what the audit reads, how a game is enforced, and in its rule 7 the earlier work that gave Pebble Table a seeded stream of its own. That stream still takes its seed from the shared `Math.random`, which is the route this page is about.
- [Fan out parallel agents in worktrees from an explicit base SHA](../workflow-issues/fan-out-parallel-agents-in-worktrees-from-an-explicit-base-sha.md): why a worktree may sit on an older base than main.
