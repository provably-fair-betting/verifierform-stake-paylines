import type { ExtractionContext, GameConfig, GameStrategy, InteractionOptions } from "../types.js";
import type { Page } from "rebrowser-puppeteer-core";
import { navigateTo } from "../helpers/navigate.js";
import { setCalculationInput, setCalculationSelect } from "../helpers/form.js";

const CALCULATION_PAGE_URL = "https://stake.com/provably-fair/calculation";

// Dummy seeds used to trigger the calculation result — the specific values don't affect paylines.
const DUMMY_CLIENT_SEED = "aabbccddeeff00112233445566778899";
const DUMMY_SERVER_SEED = "99887766554433221100ffeeddccbbaa";
const DUMMY_NONCE = "1";

export type CalculationGameOptions<
  TResult = unknown,
  TPaylines extends object = Record<string, unknown>,
> = {
  difficultySelectName?: string;
  difficulties?: readonly string[];
  readPaylines: (page: Page) => Promise<TResult>;
  initialPaylines?: () => TPaylines;
  mergeResult?: (paylines: TPaylines, difficulty: string, result: TResult) => void;
};

export type CalculationGame = GameConfig & {
  selectValue: string;
};

export function calculationGameStrategy<
  TResult = unknown,
  TPaylines extends object = Record<string, unknown>,
>(options: CalculationGameOptions<TResult, TPaylines>): GameStrategy {
  const { difficultySelectName, difficulties, readPaylines, initialPaylines, mergeResult } =
    options;

  return async (game: GameConfig, context: ExtractionContext) => {
    const { browser, page, logger, interactionOptions, config } = context;
    const calcGame = game as CalculationGame;

    logger.info(`[game:${calcGame.name}] Opening calculation page`);
    const calcPage = await navigateTo(browser, page, logger, CALCULATION_PAGE_URL, {
      timeoutMs: config.waitTimeoutMs,
    });

    logger.info(`[game:${calcGame.name}] Selecting game and applying seeds`);
    await setCalculationSelect(calcPage, "game", calcGame.selectValue, interactionOptions);
    await applyCalculationSeeds(calcPage, interactionOptions);

    const paylines = (initialPaylines ?? emptyPaylines)() as TPaylines;
    const mergePaylineResult: (paylines: TPaylines, difficulty: string, result: TResult) => void =
      mergeResult ??
      ((accumulator, difficulty, result) => {
        (accumulator as Record<string, unknown>)[difficulty] = result;
      });

    for (const difficulty of difficulties ?? [""]) {
      if (difficultySelectName) {
        logger.info(`[game:${calcGame.name}] Extracting difficulty: ${difficulty}`);
        await setCalculationSelect(calcPage, difficultySelectName, difficulty, interactionOptions);
      }

      const result = await readPaylines(calcPage);

      if (result == null) {
        throw new Error(
          `[game:${calcGame.name}] Could not read paylines for difficulty "${difficulty}". ` +
            `The extraction strategy may need updating to match the current DOM.`,
        );
      }

      mergePaylineResult(paylines, difficulty, result);
      logger.verbose(`[game:${calcGame.name}] ${difficulty}: extracted`);
    }

    return paylines;
  };
}

async function applyCalculationSeeds(
  page: Page,
  interactionOptions: InteractionOptions,
): Promise<void> {
  await setCalculationInput(page, "clientSeed", DUMMY_CLIENT_SEED, interactionOptions);
  await setCalculationInput(page, "serverSeed", DUMMY_SERVER_SEED, interactionOptions);
  await setCalculationInput(page, "nonce", DUMMY_NONCE, interactionOptions);
}

const emptyPaylines = (): Record<string, unknown> => ({});
