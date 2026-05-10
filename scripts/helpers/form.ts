import type { Page } from "rebrowser-puppeteer-core";
import type { InteractionOptions } from "../types.js";
import { byTestId, calculationTestId } from "./dom.js";
import { sleep } from "./wait.js";

const defaultInteractionOptions: InteractionOptions = {
  timeoutMs: 10_000,
  settleDelayMs: 120,
};

export const setCalculationInput = (
  page: Page,
  name: string,
  value: string | number,
  options: Partial<InteractionOptions> = {},
): Promise<void> =>
  updateFormControl(page, calculationTestId("input", name), value, { ...options, mode: "input" });

export const setCalculationSelect = (
  page: Page,
  name: string,
  value: string,
  options: Partial<InteractionOptions> = {},
): Promise<void> =>
  updateFormControl(page, calculationTestId("select", name), value, { ...options, mode: "select" });

// Sequential awaited form updates keep reactive UI state stable on pages that break under rapid writes.
const updateFormControl = async (
  page: Page,
  testId: string,
  value: string | number,
  { mode = "input", ...options }: Partial<InteractionOptions> & { mode?: "input" | "select" } = {},
): Promise<void> => {
  const settings = { ...defaultInteractionOptions, ...options };
  const selector = byTestId(testId);
  const expectedValue = String(value);

  await waitForControl(page, selector, settings.timeoutMs);

  if (mode === "select") {
    await updateSelectControl(page, selector, testId, expectedValue);
  } else {
    await updateTextControl(page, selector, expectedValue);
  }

  await sleep(settings.settleDelayMs);
};

const waitForControl = async (page: Page, selector: string, timeoutMs: number): Promise<void> => {
  const handle = await page.waitForSelector(selector, { timeout: timeoutMs });
  if (!handle) throw new Error(`Timed out waiting for form control ${selector} to appear`);
};

const updateSelectControl = async (
  page: Page,
  selector: string,
  testId: string,
  value: string,
): Promise<void> => {
  const didApply = await applySelectValue(page, selector, value);
  if (!didApply) throw new Error(`Select ${testId} does not contain option value "${value}"`);
  await commitControlUpdate(page, selector);
};

const applySelectValue = (page: Page, selector: string, nextValue: string): Promise<boolean> =>
  page.$eval(selector, setSelectControlValue, nextValue);

const setSelectControlValue = (element: Element, nextValue: unknown): boolean => {
  if (!(element instanceof HTMLSelectElement)) {
    throw new Error(`Expected select element for ${element.tagName}`);
  }

  const descriptor = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value");
  const hasOption = Array.from(element.options).some((o) => o.value === nextValue);

  if (!hasOption) return false;
  if (!descriptor?.set) throw new Error(`Could not resolve native value setter`);

  descriptor.set.call(element, nextValue);
  return true;
};

const updateTextControl = async (page: Page, selector: string, value: string): Promise<void> => {
  await applyTextValue(page, selector, value);
  await commitControlUpdate(page, selector);
};

const applyTextValue = (page: Page, selector: string, nextValue: string): Promise<void> =>
  page.$eval(selector, setTextControlValue, nextValue);

const setTextControlValue = (element: Element, nextValue: unknown): void => {
  if (!(element instanceof HTMLInputElement) && !(element instanceof HTMLTextAreaElement)) {
    throw new Error(`Expected input or textarea element for ${element.tagName}`);
  }

  const proto =
    element instanceof HTMLInputElement
      ? HTMLInputElement.prototype
      : HTMLTextAreaElement.prototype;
  const descriptor = Object.getOwnPropertyDescriptor(proto, "value");

  if (!descriptor?.set) throw new Error(`Could not resolve native value setter`);
  descriptor.set.call(element, nextValue);
};

const commitControlUpdate = (page: Page, selector: string): Promise<void> =>
  page.$eval(selector, (element: Element) => {
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
    (element as HTMLElement).blur();
  });
