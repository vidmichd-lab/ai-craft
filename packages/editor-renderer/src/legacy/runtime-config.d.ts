export type LegacyRendererRuntimeBindings = {
  getCheckedSizes?: () => Array<{ width: number; height: number; platform?: string }>;
  createStateSnapshot?: () => Record<string, unknown> | null;
  fontNameToWeight?: Record<string, string>;
};

export declare const configureLegacyRendererRuntime: (
  bindings?: LegacyRendererRuntimeBindings
) => void;

export declare const getLegacyCheckedSizes: () => Array<{
  width: number;
  height: number;
  platform?: string;
}>;

export declare const getLegacyStateSnapshot: () => Record<string, unknown> | null;

export declare const getLegacyFontNameToWeight: () => Record<string, string>;
