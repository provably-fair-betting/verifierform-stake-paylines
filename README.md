# verifierform-stake-payline-extractor

[![CI](https://github.com/provably-fair-betting/verifierform-stake-payline-extractor/actions/workflows/ci.yml/badge.svg)](https://github.com/provably-fair-betting/verifierform-stake-payline-extractor/actions/workflows/ci.yml)
[![Version](https://img.shields.io/github/v/release/provably-fair-betting/verifierform-stake-payline-extractor)](https://github.com/provably-fair-betting/verifierform-stake-payline-extractor/releases/latest)

Automated payline extractor for [Stake.com](https://stake.com) provably fair games. Drives a real browser via Puppeteer to navigate each game's provably fair calculation page or live game page, interact with difficulty/row selectors, and scrape the resulting multiplier tables into structured JSON.

## Consumer usage

Install as a dev dependency in another project using the GitHub package URL pinned to a release tag:

```bash
pnpm add -D github:provably-fair-betting/verifierform-stake-payline-extractor#v1.0.0
```

Add a script to the consumer's `package.json` and pass `--output-dir` to control where payline JSON files are written:

```json
"scripts": {
  "sync:paylines": "stake-paylines --output-dir ./src/lib/paylines"
}
```

Then run it:

```bash
pnpm sync:paylines
```

This writes one `{game-name}-paylines.json` file per game directly into the specified directory. The output directory is created automatically if it does not exist.

All other flags (`--game`, `--list-games`, `--verbose`) work the same way as in standalone usage.

The following peer dependencies must be declared in the consumer project:

```json
"devDependencies": {
  "puppeteer-real-browser": "^1.3.12",
  "rebrowser-puppeteer-core": "^23.10.3",
  "tsx": "^4.19.2"
}
```

## How it works

Two extraction patterns are used depending on what Stake.com exposes for each game:

| Pattern | Games | How |
|---|---|---|
| **Calculation page** | Bars, Cases, Packs, Plinko, Tarot | Navigates to `stake.com/provably-fair/calculation`, selects the game and difficulty, applies dummy seeds, reads the rendered table |
| **Game page scraper** | Chicken, Darts, Pump, Snakes | Navigates to the live game page, interacts with in-game difficulty/row controls, reads multipliers from the DOM |
| **Game events page** | Wheel | Navigates to `stake.com/provably-fair/game-events`, finds the Wheel code block, and evaluates the embedded `PAYOUTS` variable |

Each game is a `GameConfig` (name + async strategy function). The main runner opens one browser, runs each strategy in sequence, and writes results to `outputs/{game-name}-paylines.json`.

## Supported games

| Game | Slug |
|---|---|
| Bars | `bars` |
| Cases | `cases` |
| Chicken | `chicken` |
| Darts | `darts` |
| Packs | `packs` |
| Plinko | `plinko` |
| Pump | `pump` |
| Snakes | `snakes` |
| Tarot | `tarot` |
| Wheel | `wheel` |

## Requirements

- **Node.js** ≥ 20
- **pnpm** 10 (managed via `packageManager` field)
- A working Chrome/Chromium install (Puppeteer will find or download one)

## Installation

```bash
pnpm install
```

## Usage

```bash
# Extract all games
pnpm extract

# Extract a single game
pnpm extract --game plinko

# Extract multiple specific games
pnpm extract --game plinko --game chicken

# List available game slugs
pnpm extract --list-games

# Verbose logging
pnpm extract --verbose
pnpm extract -v
```

Output files are written to `outputs/` as `{game-name}-paylines.json`.

## Output format

Output shape varies by game. Plinko, for example, nests by row count then risk level:

```json
{
  "8": {
    "low":    [0.5, 1, 1.1, 2.1, 5.6],
    "medium": [0.5, 1, 1.4, 3.0, 13],
    "high":   [0.5, 1, 2.6, 9.5, 29]
  },
  "9": { ... }
}
```

Games with a flat difficulty structure (e.g. Chicken) produce a single-level object keyed by difficulty name.

## Project structure

```
scripts/
  run-extractor.ts          CLI entry point — argument parsing, browser lifecycle, orchestration
  types.ts                  Core types (GameConfig, GameStrategy, ExtractionContext, Payline …)
  browser/
    connect-browser.ts      puppeteer-real-browser initialisation with anti-bot detection
  config/
    extractor-config.ts     Timeouts, settle delays, output directory
  games/
    index.ts                Master game registry (name → strategy binding)
    bars.ts, cases.ts …     Per-game GameConfig objects
  strategies/
    calculation-game.ts     Reusable helper for provably-fair/calculation page games
    plinko-game.ts …        Game-specific strategy implementations
  helpers/
    dom.ts                  data-testid selector builder
    form.ts                 Safe select/input updates with change-event dispatch
    navigate.ts             Page navigation with Cloudflare challenge handling
    output.ts               JSON file writer
    payline-table.ts        Multiplier table parser
    wait.ts                 Sleep utility
outputs/
  .gitkeep                  Keeps the directory tracked by git
  *.json                    Generated payline files (git-ignored)
```

## Adding a new game

1. Create `scripts/games/{name}.ts` exporting a `GameConfig` with a `name` and `strategy`.
2. Implement the strategy in `scripts/strategies/{name}-game.ts` (or reuse `calculation-game.ts` if the game appears on the provably fair calculation page).
3. Register the game by adding it to the array in `scripts/games/index.ts`.

## Configuration

Edit `scripts/config/extractor-config.ts` to tune:

| Setting | Default | Purpose |
|---|---|---|
| `waitTimeoutMs` | `30_000` | Max wait for DOM elements / navigation |
| `formDelayMs` | `500` | Settle delay between form interactions |
| `waitIntervalMs` | `250` | Poll interval when waiting for elements |
| `outputDir` | `outputs` | Directory for generated JSON files |

## Versioning

This project uses [release-please](https://github.com/googleapis/release-please) with [Conventional Commits](https://www.conventionalcommits.org/). Merging a release-please PR bumps the version in `package.json` and updates `CHANGELOG.md` automatically.

Commit message prefixes that affect the version:

| Prefix | Version bump |
|---|---|
| `fix:` | patch |
| `feat:` | minor |
| `feat!:` / `BREAKING CHANGE:` | major |
