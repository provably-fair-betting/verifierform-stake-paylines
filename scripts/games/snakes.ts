import type { GameConfig } from "../types.js";
import { snakesGameStrategy } from "../strategies/snakes-game.js";

export const snakes: GameConfig = {
  name: "snakes",
  strategy: snakesGameStrategy,
};
