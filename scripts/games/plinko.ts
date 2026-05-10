import type { GameConfig } from "../types.js";
import { plinkoGameStrategy } from "../strategies/plinko-game.js";

export const plinko: GameConfig = {
  name: "plinko",
  strategy: plinkoGameStrategy,
};
