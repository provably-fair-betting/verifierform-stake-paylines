import type { GameConfig } from "../types.js";
import { dartsGameStrategy } from "../strategies/darts-game.js";

export const darts: GameConfig = {
  name: "darts",
  strategy: dartsGameStrategy,
};
