const DEFAULT_FONT_NAME_TO_WEIGHT = {
  Thin: '100',
  ExtraLight: '200',
  Light: '300',
  Regular: '400',
  Medium: '500',
  SemiBold: '600',
  Bold: '700',
  Heavy: '800',
  Black: '900'
};

const runtimeBindings = {
  getCheckedSizes: () => [],
  createStateSnapshot: () => null,
  fontNameToWeight: DEFAULT_FONT_NAME_TO_WEIGHT
};

export const configureLegacyRendererRuntime = (bindings = {}) => {
  if (typeof bindings.getCheckedSizes === 'function') {
    runtimeBindings.getCheckedSizes = bindings.getCheckedSizes;
  }
  if (typeof bindings.createStateSnapshot === 'function') {
    runtimeBindings.createStateSnapshot = bindings.createStateSnapshot;
  }
  if (bindings.fontNameToWeight && typeof bindings.fontNameToWeight === 'object') {
    runtimeBindings.fontNameToWeight = {
      ...DEFAULT_FONT_NAME_TO_WEIGHT,
      ...bindings.fontNameToWeight
    };
  }
};

export const getLegacyCheckedSizes = () => {
  try {
    const sizes = runtimeBindings.getCheckedSizes();
    return Array.isArray(sizes) ? sizes : [];
  } catch {
    return [];
  }
};

export const getLegacyStateSnapshot = () => {
  try {
    const snapshot = runtimeBindings.createStateSnapshot();
    return snapshot && typeof snapshot === 'object' ? snapshot : null;
  } catch {
    return null;
  }
};

export const getLegacyFontNameToWeight = () => runtimeBindings.fontNameToWeight;
