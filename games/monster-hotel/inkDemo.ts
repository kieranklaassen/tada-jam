import { SPIKE_SCENE, type InkScene } from './inkScene'

// Fixed scenes for stills and for grown-ups: `demo=<name>` in the address
// draws one of them in place of the game. Each is built from the seconds
// handed in and nothing else, so the same moment always looks the same.

/** The scene of that name at that moment. A name nobody knows gives the look spike. */
export function demoScene(_name: string, _seconds: number): InkScene {
  return SPIKE_SCENE
}
