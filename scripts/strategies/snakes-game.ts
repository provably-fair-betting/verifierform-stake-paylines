import type { Page } from "rebrowser-puppeteer-core";
import type { ExtractionContext, GameConfig, GameStrategy } from "../types.js";
import { navigateTo } from "../helpers/navigate.js";
import { sleep } from "../helpers/wait.js";

const GAME_URL = "https://stake.com/casino/games/snakes";
const DIFFICULTY_TEST_ID = "game-difficulty";
const DIFFICULTIES = ["easy", "medium", "hard", "expert", "master"] as const;

export const snakesGameStrategy: GameStrategy = async (
  game: GameConfig,
  context: ExtractionContext,
) => {
  const { browser, page, logger, interactionOptions } = context;

  logger.info(`[game:${game.name}] Navigating to game page`);
  await navigateTo(browser, page, logger, GAME_URL, { timeoutMs: interactionOptions.timeoutMs });
  await page.waitForSelector(`[data-testid="${DIFFICULTY_TEST_ID}"]`, {
    timeout: interactionOptions.timeoutMs,
  });
  await page.waitForSelector(".board .tile", { timeout: interactionOptions.timeoutMs });

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
    logger.verbose(`[game:${game.name}] ${difficulty}: ${multipliers.length} tile(s) extracted`);
  }

  return paylines;
};

async function selectDifficulty(page: Page, difficulty: string, timeoutMs: number): Promise<void> {
  const prevFingerprint = await page.evaluate(boardFingerprint);

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
    const fp = await page.evaluate(boardFingerprint);
    if (fp.length > 0 && fp !== prevFingerprint) return;
    await sleep(100);
  }
  throw new Error(`Snakes grid did not update within ${timeoutMs}ms`);
}

async function readMultipliers(page: Page): Promise<number[] | null> {
  const fingerprint = await page.evaluate(boardFingerprint);
  const tiles = fingerprint.split(",");
  if (tiles.length < 2) return null;

  // tiles[0] is the snake head start — impossible to land on, so excluded.
  return tiles.slice(1).map((t) => (t === "snake" ? 0 : parseFloat(t.replace("x", ""))));
}

// Serialised into the browser by page.evaluate — must have no module-level closures.
function boardFingerprint(): string {
  return [...document.querySelectorAll(".board .tile")]
    .filter((t) => !t.classList.contains("tile-overlay") && !t.classList.contains("center-tile"))
    .map((t) => t.querySelector(".multiplier-value")?.textContent?.trim() ?? "snake")
    .join(",");
}
