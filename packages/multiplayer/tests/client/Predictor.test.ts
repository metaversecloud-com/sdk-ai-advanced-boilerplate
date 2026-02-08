import { Predictor } from '../../src/client/Predictor.js';

describe('Predictor', () => {
  const applyInput = (state: Record<string, number>, input: Record<string, any>) => {
    // Simple: move in direction of angle at speed 5
    return {
      ...state,
      x: state.x + Math.cos(input.angle) * 5,
      y: state.y + Math.sin(input.angle) * 5,
    };
  };

  it('predicts state by applying unconfirmed inputs', () => {
    const predictor = new Predictor({ applyInput });

    const serverState = { x: 0, y: 0 };
    const unconfirmedInputs = [
      { seq: 1, timestamp: 1000, input: { angle: 0 } },       // +5,0
      { seq: 2, timestamp: 1050, input: { angle: 0 } },       // +5,0
    ];

    const predicted = predictor.predict(serverState, unconfirmedInputs);

    expect(predicted.x).toBeCloseTo(10, 1);
    expect(predicted.y).toBeCloseTo(0, 1);
  });

  it('reconciles when server confirms inputs', () => {
    const predictor = new Predictor({ applyInput, smoothingFrames: 3 });

    // Server says we're at (5, 0) after processing seq 1
    predictor.setServerState({ x: 5, y: 0 }, 1);

    // We still have seq 2 unconfirmed
    const unconfirmedInputs = [
      { seq: 2, timestamp: 1050, input: { angle: 0 } },
    ];

    const predicted = predictor.predict({ x: 5, y: 0 }, unconfirmedInputs);

    // Server (5,0) + unconfirmed seq2 (+5,0) = (10, 0)
    expect(predicted.x).toBeCloseTo(10, 1);
  });

  it('smooths corrections over multiple frames', () => {
    const predictor = new Predictor({ applyInput, smoothingFrames: 3 });

    // We predicted (10, 0) but server says (8, 0)
    predictor.setCorrection({ x: 10, y: 0 }, { x: 8, y: 0 });

    // Frame 1: should be partially corrected (not snapped)
    const frame1 = predictor.getSmoothed({ x: 8, y: 0 });
    expect(frame1.x).toBeGreaterThan(8);
    expect(frame1.x).toBeLessThan(10);

    // After all smoothing frames, should converge to server truth
    predictor.getSmoothed({ x: 8, y: 0 });
    const frame3 = predictor.getSmoothed({ x: 8, y: 0 });
    expect(frame3.x).toBeCloseTo(8, 0);
  });
});
