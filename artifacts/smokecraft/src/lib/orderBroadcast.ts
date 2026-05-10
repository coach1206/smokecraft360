/**
 * orderBroadcast — BroadcastChannel utility for Archive Blend orders.
 *
 * When a guest hits "ARCHIVE BLEND" in CigarArtisan360, the success handler
 * calls orderBroadcast.publish(). The EEIECommandCenter's Live Order Ticker
 * subscribes and surfaces the order in Champagne Gold on the staff screen.
 *
 * BroadcastChannel works across same-origin tabs/windows — no server needed.
 * Safe-guarded for environments where BroadcastChannel is unavailable.
 */

export interface ArchiveBlendOrder {
  orderId:      string;
  guestName:    string;
  wood:         string;
  band:         string;
  harmonyScore: number;
  ts:           string;
}

const CHANNEL_NAME = "novee-archive-orders";

class OrderBroadcastChannel {
  private ch: BroadcastChannel | null = null;

  private getChannel(): BroadcastChannel | null {
    if (typeof BroadcastChannel === "undefined") return null;
    if (!this.ch) this.ch = new BroadcastChannel(CHANNEL_NAME);
    return this.ch;
  }

  /** Publish a completed Archive Blend order to all listening staff screens. */
  publish(order: ArchiveBlendOrder): void {
    try { this.getChannel()?.postMessage(order); } catch { /* ignore */ }
  }

  /**
   * Subscribe to incoming orders. Returns an unsubscribe function.
   * Safe to call in useEffect — cleanup prevents memory leaks.
   */
  subscribe(handler: (order: ArchiveBlendOrder) => void): () => void {
    const ch = this.getChannel();
    if (!ch) return () => {};
    const listener = (e: MessageEvent<ArchiveBlendOrder>) => handler(e.data);
    ch.addEventListener("message", listener);
    return () => ch.removeEventListener("message", listener);
  }
}

export const orderBroadcast = new OrderBroadcastChannel();
