import type { Browser, Page } from "rebrowser-puppeteer-core";
import type { Logger } from "../types.js";
import { sleep } from "./wait.js";

const STAKE_LOADER_SELECTOR = ".loading";
const DEFAULT_WAIT_INTERVAL_MS = 150;

type PageState = {
  title: string;
  url: string;
  hasVisibleStakeLoader: boolean;
  bodyPreview: string;
};

export type NavigateOptions = {
  timeoutMs: number;
  waitIntervalMs?: number;
};

export async function navigateTo(
  browser: Browser,
  page: Page,
  logger: Logger,
  url: string,
  { timeoutMs, waitIntervalMs = DEFAULT_WAIT_INTERVAL_MS }: NavigateOptions,
): Promise<Page> {
  const targetPath = new URL(url).pathname;
  await page.goto(url, { waitUntil: "domcontentloaded" });
  return waitForPageReady({ browser, page, logger, targetPath, timeoutMs, waitIntervalMs });
}

type PageReadyOptions = Required<NavigateOptions> & {
  browser: Browser;
  page: Page;
  logger: Logger;
  targetPath: string;
};

async function waitForPageReady({
  browser,
  page: initialPage,
  logger,
  targetPath,
  timeoutMs,
  waitIntervalMs,
}: PageReadyOptions): Promise<Page> {
  const startedAt = Date.now();
  let didLogCfChallenge = false;
  let didLogStakeLoader = false;
  let lastInitialPageState: PageState | null = null;

  while (Date.now() - startedAt < timeoutMs) {
    const { readyPage, initialPageState, waitingForRedirect } = await pollPages(
      browser,
      initialPage,
      targetPath,
    );

    lastInitialPageState = initialPageState;

    if (waitingForRedirect) {
      logger.info(`[navigate] Cloudflare challenge passed. Waiting for redirect to settle.`);
      await sleep(1500);
    }

    if (readyPage) {
      if (readyPage !== initialPage) {
        logger.verbose(`[navigate] Switched to the browser page that became ready`);
      }
      return readyPage;
    }

    if (!didLogCfChallenge && looksLikeChallengePage(initialPageState)) {
      logger.info(
        `[navigate] Cloudflare still in progress on "${initialPageState.title}". Wait unless the page asks for manual verification.`,
      );
      didLogCfChallenge = true;
    }

    if (!didLogStakeLoader && initialPageState.hasVisibleStakeLoader) {
      logger.info(`[navigate] Stake loader still visible. Waiting for it to clear.`);
      didLogStakeLoader = true;
    }

    await sleep(waitIntervalMs);
  }

  const pageState = lastInitialPageState ?? (await readPageState(initialPage));
  throw new Error(
    `[navigate] Page did not become ready within ${timeoutMs}ms. ` +
      `title="${pageState.title}" url="${pageState.url}" body="${pageState.bodyPreview}"`,
  );
}

async function pollPages(
  browser: Browser,
  initialPage: Page,
  targetPath: string,
): Promise<{ readyPage: Page | null; initialPageState: PageState; waitingForRedirect: boolean }> {
  const pages = await browser.pages();
  let initialPageState: PageState | null = null;
  let waitingForRedirect = false;

  for (const currentPage of pages) {
    const state = await readPageState(currentPage);

    if (currentPage === initialPage) initialPageState = state;
    if (state.title.length === 0) waitingForRedirect = true;

    if (isPageReady(state, targetPath)) {
      return {
        readyPage: currentPage,
        initialPageState: initialPageState ?? state,
        waitingForRedirect,
      };
    }
  }

  return {
    readyPage: null,
    initialPageState: initialPageState ?? (await readPageState(initialPage)),
    waitingForRedirect,
  };
}

function isPageReady(state: PageState, targetPath: string): boolean {
  return (
    state.title.length > 0 &&
    !looksLikeChallengePage(state) &&
    !state.hasVisibleStakeLoader &&
    state.url.includes(targetPath)
  );
}

async function readPageState(page: Page): Promise<PageState> {
  try {
    return (await page.evaluate((loaderSelector: unknown) => {
      const bodyText = document.body?.innerText ?? "";

      return {
        title: document.title,
        url: window.location.href,
        hasVisibleStakeLoader: hasVisibleLoader(loaderSelector as string),
        bodyPreview: bodyText.replace(/\s+/g, " ").trim().slice(0, 240),
      };

      function hasVisibleLoader(selector: string) {
        return Array.from(document.querySelectorAll(selector)).some(isVisible);
      }

      function isVisible(element: Element) {
        const style = window.getComputedStyle(element);
        const rect = element.getBoundingClientRect();

        return (
          style.display !== "none" &&
          style.visibility !== "hidden" &&
          style.opacity !== "0" &&
          rect.width > 0 &&
          rect.height > 0
        );
      }
    }, STAKE_LOADER_SELECTOR)) as unknown as Promise<PageState>;
  } catch {
    return {
      title: "<unavailable>",
      url: page.url(),
      hasVisibleStakeLoader: false,
      bodyPreview: "",
    };
  }
}

const looksLikeChallengePage = (s: PageState): boolean => {
  const title = s.title.toLowerCase();
  const body = s.bodyPreview.toLowerCase();
  return (
    title.includes("just a moment") ||
    body.includes("verify you are human") ||
    body.includes("checking if the site connection is secure") ||
    body.includes("turnstile")
  );
};
