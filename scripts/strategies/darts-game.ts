import type { Page } from "rebrowser-puppeteer-core";
import type { ExtractionContext, GameConfig, GameStrategy } from "../types.js";
import { navigateTo } from "../helpers/navigate.js";
import { sleep } from "../helpers/wait.js";

const GAME_URL = "https://stake.com/casino/games/darts";
const DIFFICULTY_TEST_ID = "game-difficulty";
const PAYOUT_SELECTOR = ".payout .content";
const DIFFICULTIES = ["easy", "medium", "hard", "expert"] as const;

export const dartsGameStrategy: GameStrategy = async (
  game: GameConfig,
  context: ExtractionContext,
) => {
  const { browser, page, logger, interactionOptions } = context;

  logger.info(`[game:${game.name}] Navigating to game page`);
  await navigateTo(browser, page, logger, GAME_URL, { timeoutMs: interactionOptions.timeoutMs });
  await page.waitForSelector(`[data-testid="${DIFFICULTY_TEST_ID}"]`, {
    timeout: interactionOptions.timeoutMs,
  });
  await page.waitForSelector(PAYOUT_SELECTOR, { timeout: interactionOptions.timeoutMs });

  const paylines: Record<string, number[]> = {};

  for (const difficulty of DIFFICULTIES) {
    logger.info(`[game:${game.name}] Extracting difficulty: ${difficulty}`);
    await selectDifficulty(page, difficulty, interactionOptions.timeoutMs);

    const multipliers = await readMultipliers(page);

    if (multipliers == null) {
      throw new Error(
        `[game:${game.name}] Could not read multipliers for difficulty "${difficulty}".`,
      );
    }

    paylines[difficulty] = multipliers;
    logger.verbose(`[game:${game.name}] ${difficulty}: ${multipliers.length} ring(s) extracted`);
  }

  return paylines;
};

async function selectDifficulty(
  page: Page,
  difficulty: string,
  timeoutMs: number,
): Promise<void> {
  const readFingerprint = () =>
    page.evaluate(
      (selector: unknown) =>
        [...document.querySelectorAll(selector as string)]
          .map((el) => el.textContent?.trim())
          .join(","),
      PAYOUT_SELECTOR,
    );

  const prevFingerprint = await readFingerprint();

  await page.$eval(
    `[data-testid="${DIFFICULTY_TEST_ID}"]`,
    (select: Element, value: unknown) => {
      if (!(select instanceof HTMLSelectElement)) return;
      if (select.value === value) return;
      select.value = value as string;
      select.dispatchEvent(new Event("change", { bubbles: true }));
    },
    difficulty,
  );

  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const current = await readFingerprint();
    if (current.length > 0 && current !== prevFingerprint) return;
    await sleep(100);
  }
}

async function readMultipliers(page: Page): Promise<number[] | null> {
  return page.evaluate((selector: unknown) => {
    const els = [...document.querySelectorAll(selector as string)];
    if (els.length === 0) return null;

    const multipliers = els.map((el) =>
      parseFloat(el.textContent!.trim().replace("×", "")),
    );

    if (multipliers.some((n) => !Number.isFinite(n))) return null;

    return multipliers;
  }, PAYOUT_SELECTOR);
}
