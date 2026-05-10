import type { Page } from "rebrowser-puppeteer-core";
import type { Payline } from "../types.js";

// Reads the "Cumulative Probability / Multiplier" Final Result table (bars, cases, etc.).
export async function readProbabilityTable(page: Page): Promise<Payline[] | null> {
  const tables = await readTables(page, {
    rangeHeader: "Cumulative Probability",
    limit: 1,
  });
  return tables[0] ?? null;
}

// Reads the first N "Float Range / Multiplier" tables (tarot cards).
// Multipliers are prefixed with "×" on this table type.
export async function readFloatRangeTables(
  page: Page,
  limit = 2,
): Promise<Array<Payline[] | null>> {
  return readTables(page, {
    rangeHeader: "Float Range",
    multiplierPrefix: "×",
    limit,
  });
}

type ReadTablesParams = {
  rangeHeader: string;
  multiplierPrefix?: string;
  limit: number;
};

async function readTables(page: Page, params: ReadTablesParams): Promise<Array<Payline[] | null>> {
  return page.evaluate(({ rangeHeader, multiplierPrefix, limit }: ReadTablesParams) => {
    const matched = [...document.querySelectorAll("table")]
      .filter((t) => {
        const headers = [...t.querySelectorAll("th")].map((th) => th.textContent?.trim());
        return headers.includes(rangeHeader) && headers.includes("Multiplier");
      })
      .slice(0, limit);

    return matched.map((table) => extractPaylines(table, multiplierPrefix));

    function extractPaylines(table: Element, prefix: string | undefined) {
      const dataRows = [...table.querySelectorAll("tr")].filter(
        (row) => row.querySelectorAll("td").length === 2,
      );

      const paylines = dataRows.map((row) => {
        const cells = row.querySelectorAll("td");
        // Range format: "0.35000001 - 0.70000000" — take the lower bound as min.
        const min = parseFloat(cells[0].textContent!.trim().split("-")[0].trim());
        const multiplier = parseFloat(cells[1].textContent!.trim().replace(prefix ?? "", ""));
        return { min, multiplier };
      });

      // Rows are lowest-multiplier first on the page; reverse to match paylines JSON convention.
      return paylines.reverse();
    }
  }, params) as Promise<Array<Payline[] | null>>;
}
