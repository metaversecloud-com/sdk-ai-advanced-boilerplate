import { Logger } from '../../src/game/Logger.js';

describe('Logger', () => {
  it('logs to enabled channels', () => {
    const output: string[] = [];
    const logger = new Logger({
      channels: ['physics', 'scoring'],
      sink: (msg) => output.push(msg),
    });

    logger.log('physics', 'tick 42, 8 entities');
    logger.log('scoring', 'player scored');
    logger.log('input', 'should not appear');

    expect(output).toHaveLength(2);
    expect(output[0]).toContain('[physics]');
    expect(output[1]).toContain('[scoring]');
  });

  it('supports runtime channel toggle', () => {
    const output: string[] = [];
    const logger = new Logger({ channels: [], sink: (msg) => output.push(msg) });

    logger.log('debug', 'invisible');
    expect(output).toHaveLength(0);

    logger.enable('debug');
    logger.log('debug', 'visible');
    expect(output).toHaveLength(1);
  });

  it('attaches room context to messages', () => {
    const output: string[] = [];
    const logger = new Logger({
      channels: ['game'],
      sink: (msg) => output.push(msg),
      roomId: 'wiggle:scene-123',
    });

    logger.log('game', 'started');
    expect(output[0]).toContain('wiggle:scene-123');
  });
});
