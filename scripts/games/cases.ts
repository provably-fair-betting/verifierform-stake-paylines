import type { CalculationGame } from "../strategies/calculation-game.js";
import { readProbabilityTable } from "../helpers/payline-table.js";
import { calculationGameStrategy } from "../strategies/calculation-game.js";

export const cases: CalculationGame = {
  name: "cases",
  strategy: calculationGameStrategy({
    difficultySelectName: "casesDifficulty",
    difficulties: ["easy", "medium", "hard", "expert"],
    readPaylines: readProbabilityTable,
  }),
  selectValue: "cases",
};
