// What the shell imports. Exports `proto` and nothing else. The panel does not
// load this file (or view.ts): it reads meta.ts and sim.ts only.

import type { Proto } from '../../kit/proto.ts'
import { meta } from './meta.ts'
import { createSim } from './sim.ts'
import type { AnswerSnapshot } from './sim.ts'
import { draw } from './view.ts'

export const proto: Proto<AnswerSnapshot> = { meta, createSim, draw }
