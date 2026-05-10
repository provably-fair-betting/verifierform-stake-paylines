import type { GameConfig } from "../types.js";
import { pumpGameStrategy } from "../strategies/pump-game.js";

export const pump: GameConfig = {
  name: "pump",
  strategy: pumpGameStrategy,
};
