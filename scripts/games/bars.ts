import type { CalculationGame } from "../strategies/calculation-game.js";
import { readProbabilityTable } from "../helpers/payline-table.js";
import { calculationGameStrategy } from "../strategies/calculation-game.js";

export const bars: CalculationGame = {
  name: "bars",
  strategy: calculationGameStrategy({
    difficultySelectName: "barsDifficulty",
    difficulties: ["easy", "medium", "hard", "expert"],
    readPaylines: readProbabilityTable,
  }),
  selectValue: "bars",
};
