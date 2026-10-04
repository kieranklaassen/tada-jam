import type { Driver, Frac, GameAudit } from '../types.ts'

// Tea Time: the first sitting from the Bear's showing to the change of party,
// a place laid and a cup too full tipped into the bowl, every showing, every
// cell of the grid on a full table (taps, carries, puts, rubs, the pot held
// over each thing and each guest), a swap of seats, a carry to every edge,
// the ending with the party at the gate, and a rest. Things are found by the
// names the view gives its meshes, and places by the table's own numbers.

type Hook = { projectFrac(p: readonly number[]): number[] | null }
type AuditWindow = { __jamAudit: Hook }

const SLOT = 'tada-jam:slot:tea-time'
/** Where a guest sits and where its place is laid, as layout.ts has them. */
const SEAT_XS: readonly (readonly number[])[] = [[], [0], [-2.1, 2.1], [-3.5, 0, 3.5], [-4.2, -1.4, 1.4, 4.2]]
const GUEST_Z = -2.2
const PLACE_Z = 0.3
const TRAY = { saucers: [-5.1, 3.0], spoons: [-3.7, 3.1] } as const
/** How far apart the spoons lie on the tray. */
const SPOON_GAP = 0.46
/** Where the wall stands, behind the far edge of the cloth. */
const WALL_Z = -4.5
/** The party that waits before the gate. */
const WAITING = [-6.38, -3.0] as const

// Saved tables the moments start from, written by the game's own rules (order.ts, hands.ts, save.ts) and pasted here:
// a fresh sitting of three, a laid table of four with the tools out, the same with every cup at its guest's taste,
// and the first sitting of each position where a guest shows something new.
const STATES = {
  three: {"v":1,"position":"three-guests","finished":false,"seed":1001376492,"shown":["pour","lay","halfway","twins","sizes"],"guests":[{"who":"hen","seat":0,"note":null,"content":false},{"who":"mouse","seat":1,"note":null,"content":false},{"who":"bear","seat":2,"note":null,"content":false}],"things":[{"id":"pot","kind":"pot","size":"house","ring":null,"owner":null,"x":-1.17,"z":0.83,"on":null,"heldBy":null,"worn":false,"tea":0},{"id":"saucer-0","kind":"saucer","size":"house","ring":null,"owner":null,"x":-5.1,"z":3,"on":null,"heldBy":null,"worn":false,"tea":0},{"id":"saucer-1","kind":"saucer","size":"house","ring":null,"owner":null,"x":-5.1,"z":3,"on":"saucer-0","heldBy":null,"worn":false,"tea":0},{"id":"saucer-2","kind":"saucer","size":"house","ring":null,"owner":null,"x":-5.1,"z":3,"on":"saucer-1","heldBy":null,"worn":false,"tea":0},{"id":"saucer-3","kind":"saucer","size":"house","ring":null,"owner":null,"x":-5.1,"z":3,"on":"saucer-2","heldBy":null,"worn":false,"tea":0},{"id":"spoon-0","kind":"spoon","size":"house","ring":null,"owner":null,"x":-3.7,"z":3.1,"on":null,"heldBy":null,"worn":false,"tea":0},{"id":"spoon-1","kind":"spoon","size":"house","ring":null,"owner":null,"x":-3.24,"z":3.1,"on":null,"heldBy":null,"worn":false,"tea":0},{"id":"spoon-2","kind":"spoon","size":"house","ring":null,"owner":null,"x":-2.78,"z":3.1,"on":null,"heldBy":null,"worn":false,"tea":0},{"id":"spoon-3","kind":"spoon","size":"house","ring":null,"owner":null,"x":-2.32,"z":3.1,"on":null,"heldBy":null,"worn":false,"tea":0},{"id":"cup-hen","kind":"cup","size":"house","ring":0.5,"owner":"hen","x":-3.5,"z":0.3,"on":null,"heldBy":"hen","worn":false,"tea":0},{"id":"cup-mouse","kind":"cup","size":"house","ring":0.15,"owner":"mouse","x":0,"z":0.3,"on":null,"heldBy":"mouse","worn":false,"tea":0},{"id":"cup-bear","kind":"cup","size":"house","ring":0.94,"owner":"bear","x":3.5,"z":0.3,"on":null,"heldBy":"bear","worn":false,"tea":0},{"id":"sponge","kind":"sponge","size":"house","ring":null,"owner":null,"x":2.6,"z":3.6,"on":null,"heldBy":null,"worn":false,"tea":0},{"id":"bowl","kind":"bowl","size":"house","ring":null,"owner":null,"x":5.52,"z":1.72,"on":null,"heldBy":null,"worn":false,"tea":0}],"tools":{"sponge":false,"bowl":false},"puddles":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],"waiting":null},
  full: {"v":1,"position":"full-table","finished":false,"seed":973234181,"shown":["pour","lay","halfway","twins","sizes"],"guests":[{"who":"mouse","seat":0,"note":null,"content":false},{"who":"duckling-a","seat":1,"note":null,"content":false},{"who":"duckling-b","seat":2,"note":null,"content":false},{"who":"hen","seat":3,"note":null,"content":false}],"things":[{"id":"pot","kind":"pot","size":"house","ring":null,"owner":null,"x":0.29,"z":2.46,"on":null,"heldBy":null,"worn":false,"tea":0},{"id":"saucer-0","kind":"saucer","size":"house","ring":null,"owner":null,"x":4.2,"z":0.3,"on":null,"heldBy":null,"worn":false,"tea":0},{"id":"saucer-1","kind":"saucer","size":"house","ring":null,"owner":null,"x":1.4,"z":0.3,"on":null,"heldBy":null,"worn":false,"tea":0},{"id":"saucer-2","kind":"saucer","size":"house","ring":null,"owner":null,"x":-1.4,"z":0.3,"on":null,"heldBy":null,"worn":false,"tea":0},{"id":"saucer-3","kind":"saucer","size":"house","ring":null,"owner":null,"x":-4.2,"z":0.3,"on":null,"heldBy":null,"worn":false,"tea":0},{"id":"spoon-0","kind":"spoon","size":"house","ring":null,"owner":null,"x":-5.52,"z":0.42,"on":null,"heldBy":null,"worn":false,"tea":0},{"id":"spoon-1","kind":"spoon","size":"house","ring":null,"owner":null,"x":-2.72,"z":0.42,"on":null,"heldBy":null,"worn":false,"tea":0},{"id":"spoon-2","kind":"spoon","size":"house","ring":null,"owner":null,"x":0.08,"z":0.42,"on":null,"heldBy":null,"worn":false,"tea":0},{"id":"spoon-3","kind":"spoon","size":"house","ring":null,"owner":null,"x":2.88,"z":0.42,"on":null,"heldBy":null,"worn":false,"tea":0},{"id":"cup-duckling-a","kind":"cup","size":"house","ring":null,"owner":"duckling-a","x":-1.4,"z":0.3,"on":"saucer-2","heldBy":null,"worn":false,"tea":0},{"id":"cup-duckling-b","kind":"cup","size":"house","ring":null,"owner":"duckling-b","x":1.4,"z":0.3,"on":"saucer-1","heldBy":null,"worn":false,"tea":0},{"id":"cup-hen","kind":"cup","size":"house","ring":0.5,"owner":"hen","x":4.2,"z":0.3,"on":"saucer-0","heldBy":null,"worn":false,"tea":0},{"id":"cup-plain-0","kind":"cup","size":"thimble","ring":null,"owner":null,"x":-1.3,"z":3,"on":null,"heldBy":null,"worn":false,"tea":0},{"id":"sponge","kind":"sponge","size":"house","ring":null,"owner":null,"x":2.6,"z":3.6,"on":null,"heldBy":null,"worn":false,"tea":0},{"id":"bowl","kind":"bowl","size":"house","ring":null,"owner":null,"x":5.52,"z":1.72,"on":null,"heldBy":null,"worn":false,"tea":0}],"tools":{"sponge":true,"bowl":true},"puddles":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],"waiting":null},
  poured: {"v":1,"position":"full-table","finished":false,"seed":973234181,"shown":["pour","lay","halfway","twins","sizes"],"guests":[{"who":"mouse","seat":0,"note":null,"content":false},{"who":"duckling-a","seat":1,"note":null,"content":false},{"who":"duckling-b","seat":2,"note":null,"content":false},{"who":"hen","seat":3,"note":null,"content":false}],"things":[{"id":"pot","kind":"pot","size":"house","ring":null,"owner":null,"x":0.29,"z":2.46,"on":null,"heldBy":null,"worn":false,"tea":0},{"id":"saucer-0","kind":"saucer","size":"house","ring":null,"owner":null,"x":4.2,"z":0.3,"on":null,"heldBy":null,"worn":false,"tea":0},{"id":"saucer-1","kind":"saucer","size":"house","ring":null,"owner":null,"x":1.4,"z":0.3,"on":null,"heldBy":null,"worn":false,"tea":0},{"id":"saucer-2","kind":"saucer","size":"house","ring":null,"owner":null,"x":-1.4,"z":0.3,"on":null,"heldBy":null,"worn":false,"tea":0},{"id":"saucer-3","kind":"saucer","size":"house","ring":null,"owner":null,"x":-4.2,"z":0.3,"on":null,"heldBy":null,"worn":false,"tea":0},{"id":"spoon-0","kind":"spoon","size":"house","ring":null,"owner":null,"x":-5.52,"z":0.42,"on":null,"heldBy":null,"worn":false,"tea":0},{"id":"spoon-1","kind":"spoon","size":"house","ring":null,"owner":null,"x":-2.72,"z":0.42,"on":null,"heldBy":null,"worn":false,"tea":0},{"id":"spoon-2","kind":"spoon","size":"house","ring":null,"owner":null,"x":0.08,"z":0.42,"on":null,"heldBy":null,"worn":false,"tea":0},{"id":"spoon-3","kind":"spoon","size":"house","ring":null,"owner":null,"x":2.88,"z":0.42,"on":null,"heldBy":null,"worn":false,"tea":0},{"id":"cup-duckling-a","kind":"cup","size":"house","ring":null,"owner":"duckling-a","x":-1.4,"z":0.3,"on":"saucer-2","heldBy":null,"worn":false,"tea":0.5},{"id":"cup-duckling-b","kind":"cup","size":"house","ring":null,"owner":"duckling-b","x":1.4,"z":0.3,"on":"saucer-1","heldBy":null,"worn":false,"tea":0.5},{"id":"cup-hen","kind":"cup","size":"house","ring":0.5,"owner":"hen","x":4.2,"z":0.3,"on":"saucer-0","heldBy":null,"worn":false,"tea":0.5},{"id":"cup-plain-0","kind":"cup","size":"thimble","ring":null,"owner":null,"x":-4.2,"z":0.3,"on":"saucer-3","heldBy":null,"worn":false,"tea":0.15},{"id":"sponge","kind":"sponge","size":"house","ring":null,"owner":null,"x":2.6,"z":3.6,"on":null,"heldBy":null,"worn":false,"tea":0},{"id":"bowl","kind":"bowl","size":"house","ring":null,"owner":null,"x":5.52,"z":1.72,"on":null,"heldBy":null,"worn":false,"tea":0}],"tools":{"sponge":true,"bowl":true},"puddles":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],"waiting":null},
  lay: {"v":1,"position":"lay-a-place","finished":false,"seed":336141829,"shown":["pour"],"guests":[{"who":"bear","seat":0,"note":null,"content":false}],"things":[{"id":"pot","kind":"pot","size":"house","ring":null,"owner":null,"x":2.33,"z":1.03,"on":null,"heldBy":null,"worn":false,"tea":0},{"id":"saucer-0","kind":"saucer","size":"house","ring":null,"owner":null,"x":-5.1,"z":3,"on":null,"heldBy":null,"worn":false,"tea":0},{"id":"saucer-1","kind":"saucer","size":"house","ring":null,"owner":null,"x":-5.1,"z":3,"on":"saucer-0","heldBy":null,"worn":false,"tea":0},{"id":"saucer-2","kind":"saucer","size":"house","ring":null,"owner":null,"x":-5.1,"z":3,"on":"saucer-1","heldBy":null,"worn":false,"tea":0},{"id":"saucer-3","kind":"saucer","size":"house","ring":null,"owner":null,"x":-5.1,"z":3,"on":"saucer-2","heldBy":null,"worn":false,"tea":0},{"id":"spoon-0","kind":"spoon","size":"house","ring":null,"owner":null,"x":-3.7,"z":3.1,"on":null,"heldBy":null,"worn":false,"tea":0},{"id":"spoon-1","kind":"spoon","size":"house","ring":null,"owner":null,"x":-3.24,"z":3.1,"on":null,"heldBy":null,"worn":false,"tea":0},{"id":"spoon-2","kind":"spoon","size":"house","ring":null,"owner":null,"x":-2.78,"z":3.1,"on":null,"heldBy":null,"worn":false,"tea":0},{"id":"spoon-3","kind":"spoon","size":"house","ring":null,"owner":null,"x":-2.32,"z":3.1,"on":null,"heldBy":null,"worn":false,"tea":0},{"id":"cup-bear","kind":"cup","size":"house","ring":0.94,"owner":"bear","x":0,"z":0.3,"on":null,"heldBy":"bear","worn":false,"tea":0},{"id":"sponge","kind":"sponge","size":"house","ring":null,"owner":null,"x":2.6,"z":3.6,"on":null,"heldBy":null,"worn":false,"tea":0},{"id":"bowl","kind":"bowl","size":"house","ring":null,"owner":null,"x":5.52,"z":1.72,"on":null,"heldBy":null,"worn":false,"tea":0}],"tools":{"sponge":false,"bowl":false},"puddles":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],"waiting":null},
  half: {"v":1,"position":"halfway","finished":false,"seed":3472693697,"shown":["pour","lay"],"guests":[{"who":"bear","seat":0,"note":null,"content":false},{"who":"hen","seat":1,"note":null,"content":false}],"things":[{"id":"pot","kind":"pot","size":"house","ring":null,"owner":null,"x":0.23,"z":1.03,"on":null,"heldBy":null,"worn":false,"tea":0},{"id":"saucer-0","kind":"saucer","size":"house","ring":null,"owner":null,"x":-5.1,"z":3,"on":null,"heldBy":null,"worn":false,"tea":0},{"id":"saucer-1","kind":"saucer","size":"house","ring":null,"owner":null,"x":-5.1,"z":3,"on":"saucer-0","heldBy":null,"worn":false,"tea":0},{"id":"saucer-2","kind":"saucer","size":"house","ring":null,"owner":null,"x":-5.1,"z":3,"on":"saucer-1","heldBy":null,"worn":false,"tea":0},{"id":"saucer-3","kind":"saucer","size":"house","ring":null,"owner":null,"x":-5.1,"z":3,"on":"saucer-2","heldBy":null,"worn":false,"tea":0},{"id":"spoon-0","kind":"spoon","size":"house","ring":null,"owner":null,"x":-3.7,"z":3.1,"on":null,"heldBy":null,"worn":false,"tea":0},{"id":"spoon-1","kind":"spoon","size":"house","ring":null,"owner":null,"x":-3.24,"z":3.1,"on":null,"heldBy":null,"worn":false,"tea":0},{"id":"spoon-2","kind":"spoon","size":"house","ring":null,"owner":null,"x":-2.78,"z":3.1,"on":null,"heldBy":null,"worn":false,"tea":0},{"id":"spoon-3","kind":"spoon","size":"house","ring":null,"owner":null,"x":-2.32,"z":3.1,"on":null,"heldBy":null,"worn":false,"tea":0},{"id":"cup-bear","kind":"cup","size":"house","ring":0.94,"owner":"bear","x":-2.1,"z":0.3,"on":null,"heldBy":"bear","worn":false,"tea":0},{"id":"cup-hen","kind":"cup","size":"house","ring":0.5,"owner":"hen","x":2.1,"z":0.3,"on":null,"heldBy":"hen","worn":false,"tea":0},{"id":"sponge","kind":"sponge","size":"house","ring":null,"owner":null,"x":2.6,"z":3.6,"on":null,"heldBy":null,"worn":false,"tea":0},{"id":"bowl","kind":"bowl","size":"house","ring":null,"owner":null,"x":5.52,"z":1.72,"on":null,"heldBy":null,"worn":false,"tea":0}],"tools":{"sponge":false,"bowl":false},"puddles":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],"waiting":null},
  twins: {"v":1,"position":"twins","finished":false,"seed":811107,"shown":["pour","lay"],"guests":[{"who":"duckling-a","seat":0,"note":null,"content":false},{"who":"duckling-b","seat":1,"note":null,"content":false}],"things":[{"id":"pot","kind":"pot","size":"house","ring":null,"owner":null,"x":0.23,"z":0.63,"on":null,"heldBy":null,"worn":false,"tea":0},{"id":"saucer-0","kind":"saucer","size":"house","ring":null,"owner":null,"x":-5.1,"z":3,"on":null,"heldBy":null,"worn":false,"tea":0},{"id":"saucer-1","kind":"saucer","size":"house","ring":null,"owner":null,"x":-5.1,"z":3,"on":"saucer-0","heldBy":null,"worn":false,"tea":0},{"id":"saucer-2","kind":"saucer","size":"house","ring":null,"owner":null,"x":-5.1,"z":3,"on":"saucer-1","heldBy":null,"worn":false,"tea":0},{"id":"saucer-3","kind":"saucer","size":"house","ring":null,"owner":null,"x":-5.1,"z":3,"on":"saucer-2","heldBy":null,"worn":false,"tea":0},{"id":"spoon-0","kind":"spoon","size":"house","ring":null,"owner":null,"x":-3.7,"z":3.1,"on":null,"heldBy":null,"worn":false,"tea":0},{"id":"spoon-1","kind":"spoon","size":"house","ring":null,"owner":null,"x":-3.24,"z":3.1,"on":null,"heldBy":null,"worn":false,"tea":0},{"id":"spoon-2","kind":"spoon","size":"house","ring":null,"owner":null,"x":-2.78,"z":3.1,"on":null,"heldBy":null,"worn":false,"tea":0},{"id":"spoon-3","kind":"spoon","size":"house","ring":null,"owner":null,"x":-2.32,"z":3.1,"on":null,"heldBy":null,"worn":false,"tea":0},{"id":"cup-duckling-a","kind":"cup","size":"house","ring":null,"owner":"duckling-a","x":-2.1,"z":0.3,"on":null,"heldBy":"duckling-a","worn":false,"tea":0},{"id":"cup-duckling-b","kind":"cup","size":"house","ring":null,"owner":"duckling-b","x":2.1,"z":0.3,"on":null,"heldBy":"duckling-b","worn":false,"tea":0},{"id":"sponge","kind":"sponge","size":"house","ring":null,"owner":null,"x":2.6,"z":3.6,"on":null,"heldBy":null,"worn":false,"tea":0},{"id":"bowl","kind":"bowl","size":"house","ring":null,"owner":null,"x":5.52,"z":1.72,"on":null,"heldBy":null,"worn":false,"tea":0}],"tools":{"sponge":false,"bowl":false},"puddles":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],"waiting":null},
  sizes: {"v":1,"position":"whose-cup","finished":false,"seed":3025432647,"shown":["pour","lay"],"guests":[{"who":"mouse","seat":0,"note":null,"content":false},{"who":"bear","seat":1,"note":null,"content":false}],"things":[{"id":"pot","kind":"pot","size":"house","ring":null,"owner":null,"x":0.5,"z":0.9,"on":null,"heldBy":null,"worn":false,"tea":0},{"id":"saucer-0","kind":"saucer","size":"house","ring":null,"owner":null,"x":-5.1,"z":3,"on":null,"heldBy":null,"worn":false,"tea":0},{"id":"saucer-1","kind":"saucer","size":"house","ring":null,"owner":null,"x":-5.1,"z":3,"on":"saucer-0","heldBy":null,"worn":false,"tea":0},{"id":"saucer-2","kind":"saucer","size":"house","ring":null,"owner":null,"x":-5.1,"z":3,"on":"saucer-1","heldBy":null,"worn":false,"tea":0},{"id":"saucer-3","kind":"saucer","size":"house","ring":null,"owner":null,"x":-5.1,"z":3,"on":"saucer-2","heldBy":null,"worn":false,"tea":0},{"id":"spoon-0","kind":"spoon","size":"house","ring":null,"owner":null,"x":-3.7,"z":3.1,"on":null,"heldBy":null,"worn":false,"tea":0},{"id":"spoon-1","kind":"spoon","size":"house","ring":null,"owner":null,"x":-3.24,"z":3.1,"on":null,"heldBy":null,"worn":false,"tea":0},{"id":"spoon-2","kind":"spoon","size":"house","ring":null,"owner":null,"x":-2.78,"z":3.1,"on":null,"heldBy":null,"worn":false,"tea":0},{"id":"spoon-3","kind":"spoon","size":"house","ring":null,"owner":null,"x":-2.32,"z":3.1,"on":null,"heldBy":null,"worn":false,"tea":0},{"id":"cup-plain-0","kind":"cup","size":"thimble","ring":null,"owner":null,"x":-1.3,"z":3,"on":null,"heldBy":null,"worn":false,"tea":0},{"id":"cup-plain-1","kind":"cup","size":"house","ring":null,"owner":null,"x":0,"z":3,"on":null,"heldBy":null,"worn":false,"tea":0},{"id":"sponge","kind":"sponge","size":"house","ring":null,"owner":null,"x":2.6,"z":3.6,"on":null,"heldBy":null,"worn":false,"tea":0},{"id":"bowl","kind":"bowl","size":"house","ring":null,"owner":null,"x":5.52,"z":1.72,"on":null,"heldBy":null,"worn":false,"tea":0}],"tools":{"sponge":false,"bowl":false},"puddles":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],"waiting":null},
  cups: {"v":1,"position":"three-cups","finished":false,"seed":1395765508,"shown":["pour","lay","halfway","twins","sizes"],"guests":[{"who":"mouse","seat":0,"note":null,"content":false},{"who":"hen","seat":1,"note":null,"content":false},{"who":"bear","seat":2,"note":null,"content":false}],"things":[{"id":"pot","kind":"pot","size":"house","ring":null,"owner":null,"x":0.5,"z":0.9,"on":null,"heldBy":null,"worn":false,"tea":0},{"id":"saucer-0","kind":"saucer","size":"house","ring":null,"owner":null,"x":-5.1,"z":3,"on":null,"heldBy":null,"worn":false,"tea":0},{"id":"saucer-1","kind":"saucer","size":"house","ring":null,"owner":null,"x":-5.1,"z":3,"on":"saucer-0","heldBy":null,"worn":false,"tea":0},{"id":"saucer-2","kind":"saucer","size":"house","ring":null,"owner":null,"x":-5.1,"z":3,"on":"saucer-1","heldBy":null,"worn":false,"tea":0},{"id":"saucer-3","kind":"saucer","size":"house","ring":null,"owner":null,"x":-5.1,"z":3,"on":"saucer-2","heldBy":null,"worn":false,"tea":0},{"id":"spoon-0","kind":"spoon","size":"house","ring":null,"owner":null,"x":-3.7,"z":3.1,"on":null,"heldBy":null,"worn":false,"tea":0},{"id":"spoon-1","kind":"spoon","size":"house","ring":null,"owner":null,"x":-3.24,"z":3.1,"on":null,"heldBy":null,"worn":false,"tea":0},{"id":"spoon-2","kind":"spoon","size":"house","ring":null,"owner":null,"x":-2.78,"z":3.1,"on":null,"heldBy":null,"worn":false,"tea":0},{"id":"spoon-3","kind":"spoon","size":"house","ring":null,"owner":null,"x":-2.32,"z":3.1,"on":null,"heldBy":null,"worn":false,"tea":0},{"id":"cup-plain-0","kind":"cup","size":"small","ring":null,"owner":null,"x":-1.3,"z":3,"on":null,"heldBy":null,"worn":false,"tea":0},{"id":"cup-plain-1","kind":"cup","size":"house","ring":null,"owner":null,"x":0,"z":3,"on":null,"heldBy":null,"worn":false,"tea":0},{"id":"cup-plain-2","kind":"cup","size":"thimble","ring":null,"owner":null,"x":1.3,"z":3,"on":null,"heldBy":null,"worn":false,"tea":0},{"id":"sponge","kind":"sponge","size":"house","ring":null,"owner":null,"x":2.6,"z":3.6,"on":null,"heldBy":null,"worn":false,"tea":0},{"id":"bowl","kind":"bowl","size":"house","ring":null,"owner":null,"x":5.52,"z":1.72,"on":null,"heldBy":null,"worn":false,"tea":0}],"tools":{"sponge":false,"bowl":false},"puddles":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],"waiting":null},
} as const

async function world(d: Driver, x: number, z: number, y = 0): Promise<Frac> {
  const at = await d.page.evaluate((p) => (window as unknown as AuditWindow).__jamAudit.projectFrac(p), [x, y, z])
  return at ? [at[0], at[1]] : [0.5, 0.5]
}
const seat = (d: Driver, party: number, index: number) => world(d, SEAT_XS[party][index], GUEST_Z, 1.2)
const place = (d: Driver, party: number, index: number) => world(d, SEAT_XS[party][index], PLACE_Z, 0.3)
const cloth = (d: Driver, x: number, z: number) => world(d, x, z)

/** A thing by the name of its mesh. It must be there: a moment that taps where a thing is not is a different game. */
async function thing(d: Driver, name: string): Promise<Frac> {
  const at = await d.find(`(^|[/>:])${name}`)
  if (!at) throw new Error(`tea-time audit: no mesh named ${name}`)
  return at
}
const pot = (d: Driver) => thing(d, 'pot-body')

/** A drag that is over when it ends: a finger that comes back at once carries on the same drag (input.ts), so each one is followed by a pause longer than that grace. */
async function carry(d: Driver, from: Frac, to: Frac, ms: number): Promise<void> {
  await d.drag(from, to, ms)
  await d.wait(400)
}

/** Presses a spot for a while and lets go: the pot pours for as long as it is held. */
async function hold(d: Driver, at: Frac, ms: number): Promise<void> {
  await d.press(at)
  await d.wait(ms)
  await d.release()
}

/** Calls the pot to a thing with a tap, waits for its hop, and holds it. */
async function pour(d: Driver, at: Frac, ms: number): Promise<void> {
  await d.tap(at)
  await d.wait(700)
  await hold(d, await pot(d), ms)
}

/** To and fro on the spot, turning back before the finger has gone as far as the thing is wide. */
async function rub(d: Driver, at: Frac): Promise<void> {
  await d.press(at)
  for (let i = 0; i < 6; i++) await d.move([at[0] + (i % 2 ? -0.014 : 0.014), at[1]], 110)
  await d.release()
}

async function open(d: Driver, state: object): Promise<void> {
  // The game hands its newest state to storage as the page goes: reload once to let that happen, then write the table.
  await d.reload()
  await d.reload({ [SLOT]: state })
  await d.wait(400)
}

const JOINED = 'a guest is one figure: its head, arms, wings, tail and comb meet its body where they hinge'
const DRINKS = 'a guest that drinks has its nose in its cup'

export default {
  enforce: true,
  // A fixed stream for the table of a first visit, so two runs lay and play the same.
  query: 'seed=20261003',
  // The guide's glow and ghost hand, the steam, the soft shadows and the tea in the air or on the cloth are not solids.
  ignore: ['^guide-', '^steam$', '^shadows$', '^puddles$', '^ripples$', '^stream$', '^drops$'],
  allow: [
    // A guest is one figure of several turned parts, and each part meets the next where it hinges. Measured over seven
    // runs: arms, wings and tails in the body up to 105%, the head on its neck up to 41%, the comb and the tail by the
    // head up to 25%, a small guest on its stool 8%.
    { a: '>body-', b: '>funny-', kind: 'pose', upTo: 1.3, reason: JOINED },
    { a: '>body-', b: '>head-', kind: 'pose', upTo: 0.55, reason: JOINED },
    // The Mouse's tail is thin, so where it lies against her head at all it is through its own thickness (101%, behind
    // her head and out of the child's sight in every run so far).
    { a: '>head-', b: '>funny-', kind: 'pose', upTo: 1.2, reason: "the Hen's comb grows from her head, and the Mouse's tail curls up over hers, an umbrella in the stream and a brush when she grooms" },
    { a: '>body-', b: '>stool-', kind: 'pose', upTo: 0.15, reason: 'a small guest sits on its stool' },
    // The Mouse's whiskers are six fine hairs at the tip of her snout: they grow from it, and brush her chest when she
    // bows her head. Measured against her body up to 47%.
    { a: '>(body|head)-', b: '>whiskers-', kind: 'pose', upTo: 0.8, reason: "the Mouse's whiskers grow from her snout and brush her chest when she bows her head" },
    // The lid sits in the mouth of the pot, and hops and rattles in it. Measured 8%.
    { a: '^pot>pot-body$', b: '^pot>pot-lid$', kind: 'pose', upTo: 0.2, reason: 'the lid sits in the mouth of the pot and rattles in it' },
    // The Bear is so wide that he and the guest next to him squeeze past each other when they change seats (the
    // sheet's word): the row is not as deep as the two are wide. Measured 6% with the Hen, the widest pair.
    { a: '>(body|funny)-bear$', b: '>(body|funny|stool)-(hen|mouse|duckling-a|duckling-b)$', kind: 'penetration', upTo: 0.3, reason: 'the Bear and the guest next to him squeeze past each other when they change seats' },
    // Tea is in what holds it. Measured: the tea against the wall of its cup up to 44%, spilled tea in a saucer 7%.
    { a: '-glaze$', b: '-tea$', kind: 'pose', upTo: 0.6, reason: 'the tea lies in its cup, against the wall all round' },
    { a: '^saucer-\\d+>saucer-\\d+-glaze$', b: '^saucer-\\d+>saucer-\\d+-pool$', kind: 'pose', upTo: 0.15, reason: 'spilled tea lies in the dish of the saucer' },
    // A guest that drinks has its nose in its cup. Measured: the rim at the face up to 26%, at an eye up to 17%; the
    // tea is a thin sheet, so a nose that is in it at all is most of the way through it (74%).
    { a: '^cup-[^>]+>cup-.+-glaze$', b: '>(head-|whiskers-|eyes$)', kind: 'penetration', upTo: 0.35, reason: DRINKS },
    { a: '^cup-[^>]+>cup-.+-tea$', b: '>head-', kind: 'penetration', upTo: 0.9, reason: DRINKS },
    { a: '^cup-hen>cup-hen-glaze$', b: '>funny-hen$', kind: 'penetration', upTo: 0.25, reason: 'the Hen dips her head into her cup to drink, and the comb on her head comes down to the rim with her beak' },
    // A cup on a saucer that tea ran into stands in that tea. Measured 6 to 7%.
    { a: '^cup-[^>]+>cup-.+-glaze$', b: '^saucer-\\d+>saucer-\\d+-pool$', kind: 'penetration', upTo: 0.2, reason: 'a cup stands in the tea that ran into its saucer' },
    // The Hen stirs her tea with her spoon before she drinks: the bowl of the spoon goes round in the tea. Measured 48%.
    { a: '^cup-[^>]+>cup-.+-tea$', b: '^spoon-\\d+>spoon-\\d+-glaze$', kind: 'penetration', upTo: 0.9, reason: "a spoon that stands in a cup stands in its tea, and the Hen's stirs in hers" },
    // A guest that drinks while a spoon lies on its nose brings the rim of the cup up under the spoon's handle. Measured 6%.
    { a: '^cup-[^>]+>cup-.+-glaze$', b: '^spoon-\\d+>spoon-\\d+-glaze$', kind: 'penetration', upTo: 0.12, reason: 'a cup lifted to drink meets the handle of a spoon balanced on the same nose' },
  ],
  moments: [
    {
      name: 'first-sitting',
      run: async (d) => {
        // Hands off: the Bear shows the pour once, and the idle ladder comes up.
        await d.wait(11000)
        await hold(d, await pot(d), 4400)
        // He lifts his cup, drinks, the sitting ends with the clink, and the Mouse comes to the gate.
        await d.wait(9000)
        await d.tap(await world(d, WAITING[0], WAITING[1], 0.7))
        await d.wait(4500)
        // Too much for the Mouse: the cup runs over and the sponge comes out. She will not lift her cup by a puddle,
        // so it is wiped, to and fro and then across; then she finds too much, and the bowl comes out.
        await pour(d, await thing(d, 'cup-mouse-glaze'), 6000)
        await d.wait(1500)
        await carry(d, await thing(d, 'sponge-body'), await cloth(d, -0.6, PLACE_Z + 1.4), 500)
        await rub(d, await thing(d, 'sponge-body'))
        // The puddle lies round the saucer, not under it: the sponge is carried across in front of the place, side to side,
        // each stroke longer than the sponge is wide, so it is a carry and not a rub.
        for (const [x, z] of [[-1.6, 1.0], [1.6, 1.0], [-1.6, 1.7], [1.6, 1.7], [-1.2, 2.4], [1.2, 2.4]]) await carry(d, await thing(d, 'sponge-body'), await cloth(d, x, PLACE_Z + z), 400)
        await carry(d, await thing(d, 'sponge-body'), await cloth(d, -3, 2.2), 400)
        await d.wait(4000)
        await carry(d, await thing(d, 'cup-mouse-glaze'), await thing(d, 'bowl-glaze'), 600)
        await d.wait(1200)
        await pour(d, await thing(d, 'cup-mouse-glaze'), 550)
        await d.wait(8000)
      },
    },
    {
      name: 'lay-and-pour-three',
      run: async (d) => {
        await open(d, STATES.three)
        // Before a place is laid every cup is in a paw: the Bear changes seats with the Mouse next to him and back again,
        // each with its cup held over its head, and the two squeeze past each other.
        await carry(d, await seat(d, 3, 2), await seat(d, 3, 1), 900)
        await d.wait(2600)
        await carry(d, await seat(d, 3, 1), await seat(d, 3, 2), 900)
        await d.wait(2600)
        // A saucer and a spoon for each guest, quickly, one after the other.
        for (let i = 0; i < 3; i++) {
          await carry(d, await cloth(d, TRAY.saucers[0], TRAY.saucers[1]), await place(d, 3, i), 450)
          await carry(d, await cloth(d, TRAY.spoons[0] + SPOON_GAP * (3 - i), TRAY.spoons[1] + 0.2), await cloth(d, SEAT_XS[3][i] - 1.32, PLACE_Z + 0.5), 450)
          await d.wait(300)
        }
        // The Hen half, the Mouse too little and then enough, the Bear to the brim and over.
        await pour(d, await thing(d, 'cup-hen-glaze'), 2100)
        await pour(d, await thing(d, 'cup-mouse-glaze'), 150)
        await d.wait(2500)
        await pour(d, await thing(d, 'cup-mouse-glaze'), 420)
        await pour(d, await thing(d, 'cup-bear-glaze'), 5200)
        await d.wait(12000)
      },
    },
    {
      name: 'spoons-on-things',
      run: async (d) => {
        await open(d, STATES.three)
        const spoon = (k: number) => cloth(d, TRAY.spoons[0] + SPOON_GAP * k, TRAY.spoons[1] + 0.2)
        // A spoon let go on the stack lies on its top saucer; a tap flips it there.
        await carry(d, await spoon(3), await cloth(d, TRAY.saucers[0] + 0.2, TRAY.saucers[1]), 450)
        await d.wait(900)
        await d.tap(await thing(d, 'spoon-3-glaze'))
        await d.wait(1200)
        // The top saucer is carried off with the spoon on it, set down alone on the cloth, and carried again.
        await carry(d, await cloth(d, TRAY.saucers[0] - 0.65, TRAY.saucers[1]), await cloth(d, 1.6, 2.1), 600)
        await d.wait(900)
        await carry(d, await cloth(d, 1.6 - 0.65, 2.1), await cloth(d, 3.2, 2.2), 500)
        await d.wait(900)
        // The first place is laid, and its spoon is let go a little too near the saucer: it lies on the rim, beside the cup.
        await carry(d, await cloth(d, TRAY.saucers[0], TRAY.saucers[1]), await place(d, 3, 0), 450)
        await d.wait(700)
        await carry(d, await spoon(2), await cloth(d, SEAT_XS[3][0] - 0.75, PLACE_Z + 0.25), 450)
        await d.wait(900)
        // The second place: its spoon is let go on the cup, and stands in it while the cup is poured and drunk.
        await carry(d, await cloth(d, TRAY.saucers[0], TRAY.saucers[1]), await place(d, 3, 1), 450)
        await d.wait(700)
        await carry(d, await spoon(1), await place(d, 3, 1), 450)
        await d.wait(900)
        await pour(d, await place(d, 3, 0), 2100)
        await d.wait(6500)
        await pour(d, await place(d, 3, 1), 600)
        await d.wait(6500)
        // A spoon that stands in a cup is tapped, rubbed and taken out again.
        await d.tap(await thing(d, 'spoon-1-glaze'))
        await d.wait(1200)
        await carry(d, await thing(d, 'spoon-1-glaze'), await cloth(d, SEAT_XS[3][1] - 1.32, PLACE_Z + 0.5), 450)
        await d.wait(900)
        // Tiles of the wall are touched, one beside the gate: each comes loose and does what its picture would.
        for (const [x, y] of [[-5.2, 2.4], [-1.8, 4.0], [1.5, 2.4], [4.6, 4.0], [-7.4, 0.8]]) {
          await d.tap(await world(d, x, WALL_Z, y))
          await d.wait(500)
        }
        await d.wait(700)
      },
    },
    {
      name: 'showings',
      run: async (d) => {
        for (const state of [STATES.lay, STATES.half, STATES.twins, STATES.sizes]) {
          await open(d, state)
          await d.wait(6500)
        }
        // A touch in the middle of a showing ends it and is then an ordinary touch.
        await open(d, STATES.twins)
        await d.wait(2200)
        await d.tap(await cloth(d, 0, 1.5))
        await d.wait(1500)
      },
    },
    {
      name: 'grid-on-a-full-table',
      run: async (d) => {
        await open(d, STATES.full)
        const hen = await seat(d, 4, 3), mouse = await seat(d, 4, 0), duck = await seat(d, 4, 1)
        // Taps: a cup, a saucer, a spoon, the sponge, the pot, each guest.
        await d.tap(await thing(d, 'cup-hen-glaze'))
        await d.tap(await cloth(d, SEAT_XS[4][0], PLACE_Z + 0.75))
        await d.tap(await cloth(d, SEAT_XS[4][2] - 1.32, PLACE_Z + 0.5))
        await d.tap(await thing(d, 'sponge-body'))
        await d.wait(900)
        await d.tap(await pot(d))
        for (const guest of [mouse, duck, await seat(d, 4, 2), hen]) await d.tap(guest)
        await d.wait(1200)
        // Rubs: each kind of thing, and a guest.
        await rub(d, await thing(d, 'cup-duckling-a-glaze'))
        await rub(d, await cloth(d, SEAT_XS[4][0], PLACE_Z + 0.75))
        await rub(d, await cloth(d, SEAT_XS[4][2] - 1.32, PLACE_Z + 0.5))
        await rub(d, await pot(d))
        await rub(d, hen)
        await d.wait(1200)
        // The pot held over a saucer, a spoon, the sponge, the bare cloth, and each guest in turn.
        await pour(d, await cloth(d, SEAT_XS[4][0], PLACE_Z + 0.75), 900)
        await pour(d, await cloth(d, SEAT_XS[4][2] - 1.32, PLACE_Z + 0.5), 900)
        await pour(d, await cloth(d, 0, 2.0), 900)
        for (const guest of [mouse, duck, hen]) {
          await carry(d, await pot(d), guest, 600)
          await d.wait(900)
          await hold(d, await pot(d), 900)
        }
        // Puts: a cup as a hat, a saucer as a flat hat, a spoon on a nose, the sponge on a face and in a cup, a cup tipped into a cup.
        await carry(d, await thing(d, 'cup-hen-glaze'), hen, 500)
        await d.wait(900)
        await carry(d, await thing(d, 'cup-hen-glaze'), await place(d, 4, 3), 500)
        await carry(d, await cloth(d, SEAT_XS[4][0], PLACE_Z + 0.75), mouse, 500)
        await carry(d, await cloth(d, SEAT_XS[4][2] - 1.32, PLACE_Z + 0.5), duck, 500)
        await carry(d, await thing(d, 'sponge-body'), hen, 500)
        await carry(d, await thing(d, 'sponge-body'), await thing(d, 'cup-duckling-b-glaze'), 500)
        await d.tap(await thing(d, 'sponge-body'))
        await carry(d, await thing(d, 'cup-duckling-a-glaze'), await thing(d, 'cup-hen-glaze'), 500)
        await carry(d, await thing(d, 'cup-plain-0-glaze'), await place(d, 4, 0), 500)
        await d.wait(1500)
        // The pot over the bowl, and carried across everything to each edge.
        await carry(d, await pot(d), await cloth(d, 3.3, 1.4), 500)
        await d.wait(600)
        await carry(d, await pot(d), await cloth(d, -6.4, -2.6), 900)
        await carry(d, await pot(d), await cloth(d, 6.4, 3.9), 900)
        await carry(d, await pot(d), await cloth(d, 0, 2.2), 600)
        // Two guests swap seats, and one is led a little way and let go.
        await carry(d, hen, await seat(d, 4, 2), 900)
        await d.wait(2500)
        await carry(d, mouse, await world(d, -3.2, GUEST_Z, 1.2), 500)
        await d.wait(2500)
      },
    },
    {
      name: 'three-cups',
      run: async (d) => {
        await open(d, STATES.cups)
        // The wrong cup for each guest first, then changed round; a saucer under each.
        const cups = ['cup-plain-0-glaze', 'cup-plain-1-glaze', 'cup-plain-2-glaze']
        for (let i = 0; i < 3; i++) await carry(d, await thing(d, cups[i]), await place(d, 3, i), 450)
        for (let i = 0; i < 3; i++) await carry(d, await cloth(d, TRAY.saucers[0], TRAY.saucers[1]), await place(d, 3, i), 450)
        // And a spoon by each place: no guest drinks at a place that is not laid.
        for (let i = 0; i < 3; i++) await carry(d, await cloth(d, TRAY.spoons[0] + SPOON_GAP * (3 - i), TRAY.spoons[1] + 0.2), await cloth(d, SEAT_XS[3][i] - 1.32, PLACE_Z + 0.5), 450)
        await pour(d, await thing(d, 'cup-plain-2-glaze'), 1200)
        await d.wait(3500)
        await carry(d, await thing(d, 'cup-plain-2-glaze'), await cloth(d, 1.5, 2.2), 450)
        await carry(d, await thing(d, 'cup-plain-0-glaze'), await cloth(d, -1.5, 2.2), 450)
        await d.wait(2500)
        // The widest two, the Bear and the Hen, change seats at a laid table.
        await carry(d, await seat(d, 3, 2), await seat(d, 3, 1), 900)
        await d.wait(2600)
      },
    },
    {
      name: 'ending-and-rest',
      run: async (d) => {
        await open(d, STATES.poured)
        // Every cup is at its guest's taste: the sips, the clink, the settled table, the party at the gate.
        await d.wait(17000)
        // Put away and opened again at the settled table: nothing replays.
        await d.reload()
        await d.wait(3000)
        // The party that drank walks off with its cups and the next one walks in and sits down.
        await d.tap(await world(d, WAITING[0], WAITING[1], 0.7))
        await d.wait(10000)
      },
    },
  ],
} satisfies GameAudit
