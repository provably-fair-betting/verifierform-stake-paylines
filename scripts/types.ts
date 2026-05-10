import type { Browser, Page } from "rebrowser-puppeteer-core";

export type Payline = { min: number; multiplier: number };

export type Logger = {
  info(message: string): void;
  verbose(message: string): void;
  error(error: unknown): void;
};

export type InteractionOptions = {
  timeoutMs: number;
  settleDelayMs: number;
};

export type ExtractorConfig = {
  formDelayMs: number;
  waitTimeoutMs: number;
  waitIntervalMs: number;
  outputDir: string;
};

export type ExtractionContext = {
  browser: Browser;
  page: Page;
  logger: Logger;
  interactionOptions: InteractionOptions;
  config: ExtractorConfig;
};

export type GameStrategy = (game: GameConfig, context: ExtractionContext) => Promise<unknown>;

export type GameConfig = {
  name: string;
  strategy: GameStrategy;
};
