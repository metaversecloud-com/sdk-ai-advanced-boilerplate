export interface InputPackage {
  seq: number;
  timestamp: number;
  input: Record<string, any>;
}

export class InputHandler {
  private seqCounter = 0;
  readonly unconfirmed: InputPackage[] = [];

  package(input: Record<string, any>): InputPackage {
    const pkg: InputPackage = {
      seq: ++this.seqCounter,
      timestamp: Date.now(),
      input,
    };
    this.unconfirmed.push(pkg);
    return pkg;
  }

  confirmUpTo(seq: number): void {
    const idx = this.unconfirmed.findIndex(p => p.seq > seq);
    if (idx === -1) {
      this.unconfirmed.length = 0;
    } else {
      this.unconfirmed.splice(0, idx);
    }
  }

  reset(): void {
    this.seqCounter = 0;
    this.unconfirmed.length = 0;
  }
}
