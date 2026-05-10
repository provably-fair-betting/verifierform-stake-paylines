import type { Page } from "rebrowser-puppeteer-core";
import type { ExtractionContext, GameConfig, GameStrategy } from "../types.js";
import { navigateTo } from "../helpers/navigate.js";

const GAME_URL = "https://stake.com/casino/games/chicken";
const DIFFICULTY_TEST_ID = "game-difficulty";
const DIFFICULTIES = ["easy", "medium", "hard", "expert"] as const;

export const chickenGameStrategy: GameStrategy = async (
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

    const multipliers = await readMultipliers(page, difficulty);

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

  await page.waitForFunction(
    (diff: unknown) => {
      const el = document.querySelector(".multiplier");
      return el?.className.includes(`difficulty-${diff}`);
    },
    { timeout: 10_000 },
    difficulty,
  );
}

async function readMultipliers(page: Page, difficulty: string): Promise<number[] | null> {
  return page.evaluate((diff: unknown) => {
    const els = [...document.querySelectorAll(".multiplier")].filter((el) =>
      el.className.includes(`difficulty-${diff}`),
    );

    if (els.length === 0) return null;

    const steps = els.map((el) => parseFloat(el.textContent?.trim().replace("x", "") ?? ""));

    if (steps.some((n) => !Number.isFinite(n))) return null;

    // Step 0 (1x) is not rendered on the board — prepend it.
    return [1, ...steps];
  }, difficulty);
}
