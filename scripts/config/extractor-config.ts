import type { ExtractorConfig } from "../types.js";
import { fileURLToPath } from "node:url";

const outputsDirectoryUrl = new URL("../../outputs/", import.meta.url);

export const extractorConfig: ExtractorConfig = {
  formDelayMs: 120,
  waitTimeoutMs: 30_000,
  waitIntervalMs: 150,
  outputDir: fileURLToPath(outputsDirectoryUrl),
};
