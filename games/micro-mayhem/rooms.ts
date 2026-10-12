import type { RoomId } from './house'
import type { RoomDef } from './room'
import { bakery } from './roomBakery'
import { bathroom } from './roomBathroom'
import { bedroom } from './roomBedroom'
import { dining } from './roomDining'
import { fair } from './roomFair'
import { garden } from './roomGarden'
import { henhouse } from './roomHenhouse'
import { kitchen } from './roomKitchen'

/** The eight rooms of the house, by the id a save stores. */
export const ROOM: Readonly<Record<RoomId, RoomDef>> = { bedroom, kitchen, bathroom, garden, dining, henhouse, fair, bakery }
