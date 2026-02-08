export interface DeferQueueOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  onError?: (error: Error) => void;
}

type DeferredFn = () => Promise<void>;

interface TrackedCall {
  method: string;
  args: any[];
}

export class DeferQueue {
  private queue: DeferredFn[] = [];
  private processing = false;
  private processingPromise: Promise<void> | null = null;
  private maxRetries: number;
  private baseDelayMs: number;
  private onError?: (error: Error) => void;

  readonly tracked: TrackedCall[] = [];

  constructor(options: DeferQueueOptions = {}) {
    this.maxRetries = options.maxRetries ?? 3;
    this.baseDelayMs = options.baseDelayMs ?? 1000;
    this.onError = options.onError;
  }

  defer(fn: DeferredFn): void {
    this.queue.push(fn);
    if (!this.processing) {
      this.processingPromise = this.process();
    }
  }

  deferTracked(method: string, args: any[]): void {
    this.tracked.push({ method, args });
  }

  async flush(): Promise<void> {
    if (this.processingPromise) {
      await this.processingPromise;
      this.processingPromise = null;
    }
    while (this.queue.length > 0) {
      const fn = this.queue.shift()!;
      await this.executeWithRetry(fn);
    }
  }

  private async process(): Promise<void> {
    if (this.processing) return;
    this.processing = true;

    while (this.queue.length > 0) {
      const fn = this.queue.shift()!;
      await this.executeWithRetry(fn);
    }

    this.processing = false;
  }

  private async executeWithRetry(fn: DeferredFn): Promise<void> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        await fn();
        return;
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        if (attempt < this.maxRetries) {
          const delay = this.baseDelayMs * Math.pow(2, attempt);
          await new Promise(r => setTimeout(r, delay));
        }
      }
    }

    if (lastError && this.onError) {
      this.onError(lastError);
    }
  }

  reset(): void {
    this.queue = [];
    this.tracked.length = 0;
  }
}
