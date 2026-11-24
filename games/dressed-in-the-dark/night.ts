import { FIRST_OUT, LOVES, SLEEPERS, verdictOf, type Garment, type Sleeper, type Verdict } from './things'

// The rules, with no picture, sound or clock. A change is applied whole when it is made: a walk is over in here
// from its first step, so a put-away in the middle of one finds it done. What the show plays comes back as events.

export const BEDS = 5

export type Walk = {
  walker: Sleeper
  /** How it goes: on foot in slippers, rolling on skates. */
  by: 'slippers' | 'skates'
  from: number
  to: number
  /** Whoever lay in the other bed and goes back to the empty one; null when there was no bed left on that side. */
  other: Sleeper | null
}

export type Given = {
  garment: Garment
  /** Who has it on now, and where that one lay when it went on. */
  sleeper: Sleeper
  bed: number
  /** Whom it came off, or null from the line. */
  off: Sleeper | null
  walk: Walk | null
}

export type Pulled =
  | { lit: true; shown: { sleeper: Sleeper; bed: number; verdict: Verdict }[] }
  | { lit: false; thrown: { sleeper: Sleeper; garment: Garment }[] }

export type NightRecord = { beds: Sleeper[]; worn: Record<Sleeper, Garment[]>; lit: boolean; open: boolean }

export function freshNight(open: boolean): NightRecord {
  return { beds: [...SLEEPERS], worn: { goat: [], hippo: [], hen: [], croc: [], pig: [] }, lit: true, open }
}

export class Night {
  readonly beds: Sleeper[]
  readonly worn: Record<Sleeper, Garment[]>
  lit: boolean
  open: boolean

  constructor(record: NightRecord) {
    this.beds = [...record.beds]
    this.worn = { goat: [...record.worn.goat], hippo: [...record.worn.hippo], hen: [...record.worn.hen], croc: [...record.worn.croc], pig: [...record.worn.pig] }
    this.lit = record.lit
    this.open = record.open
  }

  record(): NightRecord {
    return { beds: [...this.beds], worn: { goat: [...this.worn.goat], hippo: [...this.worn.hippo], hen: [...this.worn.hen], croc: [...this.worn.croc], pig: [...this.worn.pig] }, lit: this.lit, open: this.open }
  }

  bedOf(sleeper: Sleeper): number {
    return this.beds.indexOf(sleeper)
  }

  wearerOf(garment: Garment): Sleeper | null {
    for (const sleeper of SLEEPERS) if (this.worn[sleeper].includes(garment)) return sleeper
    return null
  }

  /** Whether a garment is in the room at all: the last four are behind the wardrobe door until it is opened. */
  out(garment: Garment): boolean {
    return this.open || FIRST_OUT.includes(garment) || this.wearerOf(garment) !== null
  }

  /** A garment goes on whoever lies in that bed, over everything that one already wears. */
  give(garment: Garment, bed: number): Given | null {
    if (!this.out(garment) || !(bed >= 0 && bed < BEDS)) return null
    const off = this.takeOff(garment)
    const sleeper = this.beds[bed]
    this.worn[sleeper].push(garment)
    const walk = !this.lit && (garment === 'slippers' || garment === 'skates') ? this.walk(sleeper, bed, garment) : null
    return { garment, sleeper, bed, off, walk }
  }

  /** A garment goes back to its peg. Returns whom it came off. */
  home(garment: Garment): Sleeper | null {
    return this.takeOff(garment)
  }

  /** The cord. */
  pull(): Pulled {
    this.lit = !this.lit
    if (this.lit) return { lit: true, shown: this.beds.map((sleeper, bed) => ({ sleeper, bed, verdict: verdictOf(sleeper, this.worn[sleeper]) })) }
    const thrown: { sleeper: Sleeper; garment: Garment }[] = []
    for (const sleeper of this.beds) {
      for (const garment of this.worn[sleeper]) if (garment !== LOVES[sleeper]) thrown.push({ sleeper, garment })
      this.worn[sleeper] = this.worn[sleeper].filter((garment) => garment === LOVES[sleeper])
    }
    return { lit: false, thrown }
  }

  private takeOff(garment: Garment): Sleeper | null {
    const off = this.wearerOf(garment)
    if (off) this.worn[off] = this.worn[off].filter((one) => one !== garment)
    return off
  }

  private walk(walker: Sleeper, from: number, by: 'slippers' | 'skates'): Walk {
    const to = by === 'slippers' ? Math.max(0, from - 1) : BEDS - 1
    if (to === from) return { walker, by, from, to, other: null }
    const other = this.beds[to]
    this.beds[to] = walker
    this.beds[from] = other
    return { walker, by, from, to, other }
  }
}
