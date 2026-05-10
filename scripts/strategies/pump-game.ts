import type { Page } from "rebrowser-puppeteer-core";
import type { ExtractionContext, GameConfig, GameStrategy } from "../types.js";
import { navigateTo } from "../helpers/navigate.js";

const GAME_URL = "https://stake.com/casino/games/pump";
const DIFFICULTY_TEST_ID = "game-difficulty";
const PROGRESSION_CARD_SELECTOR = '[data-testid^="pump-progression-card-"]';
const DIFFICULTIES = ["easy", "medium", "hard", "expert"] as const;

export const pumpGameStrategy: GameStrategy = async (
  game: GameConfig,
  context: ExtractionContext,
) => {
  const { browser, page, logger, interactionOptions } = context;

  logger.info(`[game:${game.name}] Navigating to game page`);
  await navigateTo(browser, page, logger, GAME_URL, { timeoutMs: interactionOptions.timeoutMs });
  await page.waitForSelector(`[data-testid="${DIFFICULTY_TEST_ID}"]`, {
    timeout: interactionOptions.timeoutMs,
  });

  const paylines: Record<string, number[]> = {};

  for (const difficulty of DIFFICULTIES) {
    logger.info(`[game:${game.name}] Extracting difficulty: ${difficulty}`);
    await selectDifficulty(page, difficulty);

    const multipliers = await readMultipliers(page);

    if (multipliers == null) {
      throw new Error(
        `[game:${game.name}] Could not read multipliers for difficulty "${difficulty}".`,
      );
    }

    paylines[difficulty] = multipliers;
    logger.verbose(`[game:${game.name}] ${difficulty}: ${multipliers.length} step(s) extracted`);
  }

  return paylines;
};

async function selectDifficulty(page: Page, difficulty: string): Promise<void> {
  await page.$eval(
    `[data-testid="${DIFFICULTY_TEST_ID}"]`,
    (select: Element, value: unknown) => {
      if (!(select instanceof HTMLSelectElement)) return;
      select.value = value as string;
      select.dispatchEvent(new Event("change", { bubbles: true }));
    },
    difficulty,
  );

  // Wait for progression cards to re-render for the new difficulty.
  await page.waitForFunction(
    (selector: unknown) => document.querySelectorAll(selector as string).length > 0,
    { timeout: 10_000 },
    PROGRESSION_CARD_SELECTOR,
  );
}

async function readMultipliers(page: Page): Promise<number[] | null> {
  return page.evaluate((selector: unknown) => {
    const cards = [...document.querySelectorAll(selector as string)];

    if (cards.length === 0) return null;

    const multipliers = cards.map((card) => {
      const span = card.querySelector("span");
      return parseFloat(span?.textContent?.trim().replace("x", "") ?? "");
    });

    return multipliers;
  }, PROGRESSION_CARD_SELECTOR);
}
