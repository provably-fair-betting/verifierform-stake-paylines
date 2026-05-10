import type { Payline } from "../types.js";
import type { CalculationGame } from "../strategies/calculation-game.js";
import type { Page } from "rebrowser-puppeteer-core";
import { readFloatRangeTables } from "../helpers/payline-table.js";
import { calculationGameStrategy } from "../strategies/calculation-game.js";

type TarotCardResult = { minor: Payline[]; major: Payline[] };

type TarotPaylinesByDifficulty = {
  minor: Record<string, Payline[]>;
  major: Record<string, Payline[]>;
};

export const tarot: CalculationGame = {
  name: "tarot",
  strategy: calculationGameStrategy<Partial<TarotCardResult>, TarotPaylinesByDifficulty>({
    difficultySelectName: "tarotDifficulty",
    difficulties: ["easy", "medium", "hard", "expert"],
    readPaylines: readTarotPaylines,
    initialPaylines: (): TarotPaylinesByDifficulty => ({ minor: {}, major: {} }),
    mergeResult: mergeTarotPaylines,
  }),
  selectValue: "tarot",
};

async function readTarotPaylines(page: Page): Promise<Partial<TarotCardResult>> {
  const tables = await readFloatRangeTables(page);
  const result: Partial<TarotCardResult> = {};

  for (const paylines of tables) {
    if (!paylines) continue;

    // Floor multiplier identifies the card type: 0 = minor, 1 = major.
    const floor = paylines[paylines.length - 1]?.multiplier;
    const type = floor === 0 ? "minor" : floor === 1 ? "major" : null;

    if (type && !result[type]) {
      result[type] = paylines;
    }
  }

  return result;
}

function mergeTarotPaylines(
  paylines: TarotPaylinesByDifficulty,
  difficulty: string,
  result: Partial<TarotCardResult>,
): void {
  const { minor, major } = result;

  if (!minor || !major) {
    throw new Error(
      `[game:tarot] Could not read both minor and major paylines for difficulty "${difficulty}". ` +
        `The current seed pair may not produce cards of both types — try different seeds.`,
    );
  }

  paylines.minor[difficulty] = minor;
  paylines.major[difficulty] = major;
}
