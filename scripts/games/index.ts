import type { GameConfig } from "../types.js";
import { bars } from "./bars.js";
import { cases } from "./cases.js";
import { chicken } from "./chicken.js";
import { darts } from "./darts.js";
import { packs } from "./packs.js";
import { plinko } from "./plinko.js";
import { pump } from "./pump.js";
import { snakes } from "./snakes.js";
import { tarot } from "./tarot.js";
import { wheel } from "./wheel.js";

export const games: GameConfig[] = [bars, cases, chicken, darts, packs, plinko, pump, snakes, tarot, wheel];
