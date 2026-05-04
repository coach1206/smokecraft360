export type { BasePosAdapter, PosAdapterConfig, PosProduct, PosInventoryItem, PosOrder, PosSalesReport } from "./baseAdapter";
export { toastAdapter } from "./toastAdapter";
export { squareAdapter } from "./squareAdapter";
export { cloverAdapter } from "./cloverAdapter";
export { lightspeedAdapter } from "./lightspeedAdapter";
export { manualImportAdapter } from "./manualImportAdapter";

import type { BasePosAdapter } from "./baseAdapter";
import { toastAdapter } from "./toastAdapter";
import { squareAdapter } from "./squareAdapter";
import { cloverAdapter } from "./cloverAdapter";
import { lightspeedAdapter } from "./lightspeedAdapter";
import { manualImportAdapter } from "./manualImportAdapter";

export const posAdapters: Record<string, BasePosAdapter> = {
  toast: toastAdapter,
  square: squareAdapter,
  clover: cloverAdapter,
  lightspeed: lightspeedAdapter,
  manual_import: manualImportAdapter,
};

export function getAdapter(name: string): BasePosAdapter | undefined {
  return posAdapters[name];
}
