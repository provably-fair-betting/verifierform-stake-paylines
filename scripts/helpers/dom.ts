const escapeAttributeValue = (value: string): string => value.replace(/"/g, '\\"');

// Centralize data-testid selector construction so low-level DOM selectors are not duplicated.
export const byTestId = (testId: string): string =>
  `[data-testid="${escapeAttributeValue(testId)}"]`;

// Calculation form test ids follow a predictable pattern such as calculation-input-clientSeed.
export const calculationTestId = (kind: string, name: string): string => {
  if (!kind || !name) {
    throw new Error(
      `calculationTestId requires both kind and name, received kind="${kind}" name="${name}"`,
    );
  }

  return `calculation-${kind}-${name}`;
};
