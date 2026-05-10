import type { GameConfig } from "../types.js";
import { wheelGameStrategy } from "../strategies/wheel-game.js";

export const wheel: GameConfig = {
  name: "wheel",
  strategy: wheelGameStrategy,
};
