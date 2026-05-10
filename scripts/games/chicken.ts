import type { GameConfig } from "../types.js";
import { chickenGameStrategy } from "../strategies/chicken-game.js";

export const chicken: GameConfig = {
  name: "chicken",
  strategy: chickenGameStrategy,
};
