import type { InputPackage } from '../game/InputHandler.js';

export interface PredictorOptions {
  applyInput: (state: Record<string, number>, input: Record<string, any>) => Record<string, number>;
  smoothingFrames?: number;  // Frames over which to blend corrections (default 3)
}

export class Predictor {
  private applyInput: PredictorOptions['applyInput'];
  private smoothingFrames: number;
  private correctionOffset: Record<string, number> = {};
  private correctionFrame = 0;
  private lastConfirmedSeq = 0;

  constructor(options: PredictorOptions) {
    this.applyInput = options.applyInput;
    this.smoothingFrames = options.smoothingFrames ?? 3;
  }

  predict(
    serverState: Record<string, number>,
    unconfirmedInputs: InputPackage[],
  ): Record<string, number> {
    let state = { ...serverState };
    for (const pkg of unconfirmedInputs) {
      state = this.applyInput(state, pkg.input);
    }
    return state;
  }

  setServerState(state: Record<string, number>, lastProcessedSeq: number): void {
    this.lastConfirmedSeq = lastProcessedSeq;
  }

  setCorrection(
    predicted: Record<string, number>,
    serverTruth: Record<string, number>,
  ): void {
    this.correctionOffset = {};
    for (const key of Object.keys(serverTruth)) {
      const diff = (predicted[key] ?? 0) - (serverTruth[key] ?? 0);
      if (Math.abs(diff) > 0.01) {
        this.correctionOffset[key] = diff;
      }
    }
    this.correctionFrame = 0;
  }

  getSmoothed(currentState: Record<string, number>): Record<string, number> {
    this.correctionFrame++;
    const t = Math.min(this.correctionFrame / this.smoothingFrames, 1);
    const result = { ...currentState };

    for (const key of Object.keys(this.correctionOffset)) {
      const remaining = this.correctionOffset[key] * (1 - t);
      result[key] = (currentState[key] ?? 0) + remaining;
    }

    if (t >= 1) {
      this.correctionOffset = {};
    }

    return result;
  }

  get confirmedSeq(): number {
    return this.lastConfirmedSeq;
  }

  reset(): void {
    this.correctionOffset = {};
    this.correctionFrame = 0;
    this.lastConfirmedSeq = 0;
  }
}
