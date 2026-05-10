import type { Page } from "rebrowser-puppeteer-core";
import type { ExtractionContext, GameConfig, GameStrategy } from "../types.js";
import { navigateTo } from "../helpers/navigate.js";
import { setCalculationInput, setCalculationSelect } from "../helpers/form.js";

const CALCULATION_PAGE_URL = "https://stake.com/provably-fair/calculation";
const DUMMY_CLIENT_SEED = "aabbccddeeff00112233445566778899";
const DUMMY_SERVER_SEED = "99887766554433221100ffeeddccbbaa";
const DUMMY_NONCE = "1";

const ROWS = ["8", "9", "10", "11", "12", "13", "14", "15", "16"] as const;
const RISKS = ["low", "medium", "high", "expert"] as const;

export const plinkoGameStrategy: GameStrategy = async (
  game: GameConfig,
  context: ExtractionContext,
) => {
  const { browser, page, logger, interactionOptions, config } = context;

  logger.info(`[game:${game.name}] Opening calculation page`);
  const calcPage = await navigateTo(browser, page, logger, CALCULATION_PAGE_URL, {
    timeoutMs: config.waitTimeoutMs,
    waitIntervalMs: config.waitIntervalMs,
  });

  logger.info(`[game:${game.name}] Selecting game and applying seeds`);
  await setCalculationSelect(calcPage, "game", "plinko", interactionOptions);
  await setCalculationInput(calcPage, "clientSeed", DUMMY_CLIENT_SEED, interactionOptions);
  await setCalculationInput(calcPage, "serverSeed", DUMMY_SERVER_SEED, interactionOptions);
  await setCalculationInput(calcPage, "nonce", DUMMY_NONCE, interactionOptions);

  const paylines: Record<string, Record<string, number[]>> = {};

  for (const rows of ROWS) {
    logger.info(`[game:${game.name}] Extracting rows: ${rows}`);
    await setCalculationSelect(calcPage, "plinkoRow", rows, interactionOptions);
    paylines[rows] = {};

    for (const risk of RISKS) {
      await setCalculationSelect(calcPage, "plinkoRisk", risk, interactionOptions);

      const multipliers = await readPlinkoMultipliers(calcPage, rows);

      if (multipliers == null) {
        throw new Error(
          `[game:${game.name}] Could not read multipliers for rows=${rows} risk=${risk}.`,
        );
      }

      paylines[rows][risk] = multipliers;
      logger.verbose(
        `[game:${game.name}] rows=${rows} risk=${risk}: ${multipliers.length} value(s)`,
      );
    }
  }

  return paylines;
};

async function readPlinkoMultipliers(page: Page, rows: string): Promise<number[] | null> {
  return page.evaluate((numRows: unknown) => {
    const n = parseInt(numRows as string, 10);
    const expectedCells = n + 1;

    const table = [...document.querySelectorAll("table")].find((t) => {
      const rows = t.querySelectorAll("tr");
      return rows.length === 2 && rows[1].querySelectorAll("td").length === expectedCells;
    });
    if (!table) return null;

    // Row 0 contains column indices; row 1 contains the actual multiplier values.
    const cells = [...(table.querySelectorAll("tr")[1]?.querySelectorAll("td") ?? [])];
    const allValues = cells.map((td) => parseFloat(td.textContent?.trim() ?? ""));

    if (allValues.some((v) => !Number.isFinite(v))) return null;

    // Board is symmetric — take the unique half from center to right edge (ascending multipliers).
    // ceil(n/2) correctly handles both even and odd row counts.
    return allValues.slice(Math.ceil(n / 2));
  }, rows) as unknown as Promise<number[] | null>;
}
