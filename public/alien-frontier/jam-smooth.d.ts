// Types for the Alien Frontier smoothness shim, so the showcase's tests can import it.
import type { Object3D, Scene, Camera, WebGLRenderer } from 'three'

export type SmoothGame = {
  scene: Scene
  camera: Camera
  renderer: WebGLRenderer
  [key: string]: unknown
}

export type MergeReport = { removed: number; added: number; skipped: Record<string, number>; ms?: number }

export function referencedObjects(game: SmoothGame): Set<Object3D>
export function snapshot(game: SmoothGame): Map<Object3D, number[]>
export function mergeStatic(game: SmoothGame, before: Map<Object3D, number[]>): MergeReport
export function smallCastersOff(game: SmoothGame, radius: number): { off: number }
export function throttleShadows(game: SmoothGame, every: number): void
export function poolLights(game: SmoothGame, keep: number): { lights: number; kept: number }
export function characterDetail(game: SmoothGame, distance: number, keep: number): { rigs: number; farParts: number }
export function dropMultisampling(game: SmoothGame): void

export type GovernorSettings = {
  startTier: number
  windowFrames: number
  windowSeconds: number
  missedMs: number
  badShare: number
  cleanShare: number
  farOffMs: number
  stallMs: number
  cleanWindowsToClimb: number
  lightWorkMs: number
  failedWithinSeconds: number
  settleSeconds: number
}
export const GOVERNOR: GovernorSettings

export type Governor = { tier: number; ceiling: number; sample(dt: number): number | null; settle(seconds?: number): void }
export function createGovernor(startTier: number, workMs: () => number, settings?: GovernorSettings): Governor
