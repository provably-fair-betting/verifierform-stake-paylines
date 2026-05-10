import type { ExtractionContext, GameConfig, GameStrategy } from "../types.js";
import { navigateTo } from "../helpers/navigate.js";

const GAME_EVENTS_URL = "https://stake.com/provably-fair/game-events";
const WHEEL_HEADING = "Wheel";

export const wheelGameStrategy: GameStrategy = async (
  game: GameConfig,
  context: ExtractionContext,
) => {
  const { browser, page, logger, interactionOptions } = context;

  logger.info(`[game:${game.name}] Navigating to game events page`);
  await navigateTo(browser, page, logger, GAME_EVENTS_URL, {
    timeoutMs: interactionOptions.timeoutMs,
  });

  logger.info(`[game:${game.name}] Extracting PAYOUTS from Wheel section`);
  const codeText = await page.evaluate((heading: unknown) => {
    const headings = [...document.querySelectorAll("h1,h2,h3,h4,h5")];
    const wheelHeading = headings.find((h) => h.textContent?.trim() === heading);
    if (!wheelHeading) return null;

    let el = wheelHeading.nextElementSibling;
    while (el && !["H1", "H2", "H3", "H4", "H5"].includes(el.tagName)) {
      if (el.tagName === "PRE" || el.querySelector("pre,code")) {
        return el.textContent?.trim() ?? null;
      }
      el = el.nextElementSibling;
    }
    return null;
  }, WHEEL_HEADING);

  if (codeText == null) {
    throw new Error(`[game:${game.name}] Could not find Wheel code block on game events page`);
  }

  const payoutsDeclaration = codeText.split("// Game event")[0];
  // eslint-disable-next-line no-new-func
  const paylines = new Function(payoutsDeclaration + "\nreturn PAYOUTS;")();

  if (paylines == null) {
    throw new Error(`[game:${game.name}] Could not parse PAYOUTS from Wheel code block`);
  }

  return paylines;
};
