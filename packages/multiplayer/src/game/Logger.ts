export interface LoggerOptions {
  channels: string[];
  sink?: (message: string) => void;
  roomId?: string;
}

export class Logger {
  private enabledChannels: Set<string>;
  private sink: (message: string) => void;
  private roomId?: string;

  constructor(options: LoggerOptions) {
    this.enabledChannels = new Set(options.channels);
    this.sink = options.sink ?? console.log;
    this.roomId = options.roomId;
  }

  log(channel: string, message: string): void {
    if (!this.enabledChannels.has(channel)) return;

    const prefix = this.roomId
      ? `[${channel}][${this.roomId}]`
      : `[${channel}]`;

    this.sink(`${prefix} ${message}`);
  }

  enable(channel: string): void {
    this.enabledChannels.add(channel);
  }

  disable(channel: string): void {
    this.enabledChannels.delete(channel);
  }

  isEnabled(channel: string): boolean {
    return this.enabledChannels.has(channel);
  }
}
