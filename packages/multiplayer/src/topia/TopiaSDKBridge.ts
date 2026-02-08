import { DeferQueue } from './DeferQueue.js';
import type { TopiaRoomBridge, TopiaSDKContext } from '../game/types.js';

export interface TopiaSDKBridgeOptions {
  urlSlug: string;
  interactiveKey?: string;
  interactiveSecret?: string;
  onError?: (error: Error) => void;
}

export class TopiaSDKBridge implements TopiaRoomBridge {
  readonly urlSlug: string;
  private queue: DeferQueue;
  private hasCredentials: boolean;

  constructor(options: TopiaSDKBridgeOptions) {
    this.urlSlug = options.urlSlug;
    this.hasCredentials = !!(options.interactiveKey && options.interactiveSecret);
    this.queue = new DeferQueue({
      maxRetries: 3,
      baseDelayMs: 1000,
      onError: options.onError,
    });
  }

  defer(fn: ((sdk: TopiaSDKContext) => Promise<void>) | (() => Promise<void>)): void {
    if (this.hasCredentials) {
      // In production, would create real SDK context and pass it
      this.queue.defer(fn as () => Promise<void>);
    }
    // In test mode (no credentials), silently drop — use deferTracked instead
  }

  deferTracked(method: string, args: any[]): void {
    this.queue.deferTracked(method, args);
  }

  get tracked(): readonly { method: string; args: any[] }[] {
    return this.queue.tracked;
  }

  async flush(): Promise<void> {
    return this.queue.flush();
  }

  reset(): void {
    this.queue.reset();
  }
}
