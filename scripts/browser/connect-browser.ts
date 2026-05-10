import type { Browser, Page } from "rebrowser-puppeteer-core";
import { connect } from "puppeteer-real-browser";

type ConnectOptions = {
  headless?: boolean;
  enableFingerprint?: boolean;
};

// Keep all puppeteer-real-browser specifics here so strategies and helpers stay browser-agnostic.
export const connectBrowser = async ({
  headless = false,
  enableFingerprint = true,
}: ConnectOptions = {}): Promise<{ browser: Browser; page: Page }> => {
  const { browser, page } = await connect({
    headless,
    turnstile: true,
    args: ["--start-maximized"],
    customConfig: {},
    connectOption: { defaultViewport: null },
    ...(enableFingerprint ? { fingerprint: true } : {}),
  });

  return { browser, page };
};
