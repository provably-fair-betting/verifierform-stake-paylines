import { Page } from "rebrowser-puppeteer-core";
import type { CalculationGame } from "../strategies/calculation-game.js";
import { calculationGameStrategy } from "../strategies/calculation-game.js";

export const packs: CalculationGame = {
  name: "packs",
  strategy: calculationGameStrategy<PacksPayline[] | null, PacksPayline[]>({
    readPaylines: readPacksPaylineTable,
    initialPaylines: () => [],
    mergeResult: (paylines, _, result) => paylines.push(...(result as PacksPayline[])),
  }),
  selectValue: "packs",
};

type PacksPayline = { min: number; cardId: number; multiplier: number };

// Reads the packs "Card ID / Cumulative Probability / Multiplier" table.
async function readPacksPaylineTable(page: Page): Promise<PacksPayline[] | null> {
  return page.evaluate(() => {
    const table = [...document.querySelectorAll("table")].find((t) => {
      const headers = [...t.querySelectorAll("th")].map((th) => th.textContent?.trim());
      return headers.includes("Card ID") && headers.includes("Cumulative Probability");
    });
    if (!table) return null;

    const dataRows = [...table.querySelectorAll("tr")].filter(
      (row) => row.querySelectorAll("td").length === 3,
    );
    if (dataRows.length === 0) return null;

    const paylines = dataRows.map((row) => {
      const cells = [...row.querySelectorAll("td")];
      const cardId = parseInt(cells[0].textContent!.trim(), 10);
      const min = parseFloat(cells[1].textContent!.trim().split("-")[0].trim());
      const multiplier = parseFloat(cells[2].textContent!.trim().replace("×", ""));
      return { min, cardId, multiplier };
    });

    // Table renders lowest cardId last — reverse to match reference order (cardId 1 first).
    return paylines.reverse();
  }) as unknown as Promise<PacksPayline[] | null>;
}
