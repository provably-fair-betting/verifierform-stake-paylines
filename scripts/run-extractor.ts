import type { ExtractionContext, GameConfig, Logger } from "./types.js";
import { connectBrowser } from "./browser/connect-browser.js";
import { extractorConfig } from "./config/extractor-config.js";
import { games } from "./games/index.js";
import { writeJson } from "./helpers/output.js";
import { join } from "node:path";

type Command = { gameNames: string[]; listGames: boolean; verbose: boolean };

main().catch(handleFatalError);

async function main(): Promise<void> {
  const command = parseCommand(process.argv.slice(2));
  const logger = createLogger(command.verbose);

  if (command.listGames) {
    printAvailableGames();
    return;
  }

  const gamesToRun = resolveGamesToRun(command.gameNames);

  await runExtractor({ gamesToRun, logger });
}

function parseCommand(args: string[]): Command {
  const command: Command = { gameNames: [], listGames: false, verbose: false };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === "--") continue;
    if (arg === "--verbose" || arg === "-v") {
      command.verbose = true;
      continue;
    }
    if (arg === "--list-games") {
      command.listGames = true;
      continue;
    }

    if (arg === "--game" || arg === "-g") {
      const name = args[i + 1] ?? null;
      if (!name) throw new Error(`Missing value for "${arg}"`);
      command.gameNames.push(name);
      i++;
      continue;
    }

    if (!arg.startsWith("-")) {
      command.gameNames.push(arg);
      continue;
    }

    throw new Error(`Unknown argument "${arg}"`);
  }

  return command;
}

function createLogger(verboseEnabled: boolean): Logger {
  return {
    info: (message) => console.log(message),
    verbose: (message) => {
      if (verboseEnabled) console.log(message);
    },
    error: (error) => console.error(error),
  };
}

function printAvailableGames(): void {
  console.log(`Available games:`);
  for (const game of games) console.log(`- ${game.name}`);
}

function resolveGamesToRun(gameNames: string[]): GameConfig[] {
  if (gameNames.length === 0) return games;
  return [...new Set(gameNames)].map(resolveGameByName);
}

function resolveGameByName(gameName: string): GameConfig {
  const match = games.find((game) => game.name === gameName);
  if (!match)
    throw new Error(`Unknown game "${gameName}". Run --list-games to see available games.`);
  return match;
}

async function runExtractor({
  gamesToRun,
  logger,
}: {
  gamesToRun: GameConfig[];
  logger: Logger;
}): Promise<void> {
  assertGamesToRun(gamesToRun);
  logger.info(
    `[extractor] Starting extraction for ${gamesToRun.length} game(s): ${gamesToRun.map((g) => g.name).join(", ")}`,
  );

  const interactionOptions = {
    timeoutMs: extractorConfig.waitTimeoutMs,
    settleDelayMs: extractorConfig.formDelayMs,
  };

  const { browser, page } = await connectBrowser();

  try {
    const context: ExtractionContext = {
      browser,
      page,
      logger,
      interactionOptions,
      config: extractorConfig,
    };

    for (const game of gamesToRun) {
      const paylines = await game.strategy(game, context);
      const outputPath = join(extractorConfig.outputDir, `${game.name}-paylines.json`);
      await writeJson(outputPath, paylines);
      logger.info(`[game:${game.name}] Wrote ${outputPath}`);
    }

    logger.info(`[extractor] Completed all requested games`);
  } finally {
    logger.verbose(`[extractor] Closing browser`);
    await browser.close();
  }
}

function assertGamesToRun(gamesToRun: GameConfig[]): void {
  if (gamesToRun.length === 0) throw new Error(`No games selected to extract paylines for`);
}

function handleFatalError(error: unknown): void {
  printErrorChain(error);
  process.exitCode = 1;
}

function printErrorChain(error: unknown): void {
  let current = error;
  let depth = 0;
  while (current instanceof Error) {
    const prefix = depth === 0 ? "" : `Caused by (${depth}): `;
    console.error(`${prefix}${current.stack ?? current.message}`);
    current = current.cause;
    depth++;
  }
  if (current) console.error(current);
}
