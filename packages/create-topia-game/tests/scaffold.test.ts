import { scaffold, type ScaffoldOptions } from '../src/scaffold.js';
import { TEMPLATES } from '../src/templates.js';
import { generateFiles } from '../src/generator.js';

const baseOptions: ScaffoldOptions = {
  name: 'my-game',
  gameType: 'continuous',
  maxPlayers: 8,
  bots: true,
  topiaHooks: ['none'],
};

describe('scaffold', () => {
  it('returns files and directory name', () => {
    const result = scaffold(baseOptions);
    expect(result.directory).toBe('my-game');
    expect(result.files.size).toBeGreaterThan(0);
  });

  it('throws on unknown game type', () => {
    expect(() => scaffold({ ...baseOptions, gameType: 'unknown' as any })).toThrow('Unknown game type');
  });

  describe('continuous game type', () => {
    const result = scaffold({ ...baseOptions, gameType: 'continuous' });

    it('generates package.json', () => {
      const pkg = JSON.parse(result.files.get('package.json')!);
      expect(pkg.name).toBe('my-game');
      expect(pkg.dependencies['@topia/multiplayer']).toBeDefined();
    });

    it('generates entity file with float32 fields', () => {
      const entity = result.files.get('src/entities/MyGameEntity.ts');
      expect(entity).toBeDefined();
      expect(entity).toContain("@schema('float32') x");
      expect(entity).toContain("@schema('float32') angle");
    });

    it('generates game definition with tickRate 20', () => {
      const game = result.files.get('src/game.ts');
      expect(game).toContain('tickRate: 20');
    });

    it('generates bot file', () => {
      const bot = result.files.get('src/bots/WanderBot.ts');
      expect(bot).toBeDefined();
      expect(bot).toContain('BotBehavior.define');
    });

    it('generates test file', () => {
      const test = result.files.get('tests/myGame.test.ts');
      expect(test).toBeDefined();
      expect(test).toContain('TestRoom.create');
    });
  });

  describe('grid game type', () => {
    const result = scaffold({ ...baseOptions, gameType: 'grid' });

    it('generates entity with grid fields', () => {
      const entity = result.files.get('src/entities/MyGameEntity.ts');
      expect(entity).toContain("@schema('int16') gridX");
      expect(entity).toContain('direction');
    });

    it('generates game definition with tickRate 0', () => {
      const game = result.files.get('src/game.ts');
      expect(game).toContain('tickRate: 0');
    });
  });

  describe('physics game type', () => {
    const result = scaffold({ ...baseOptions, gameType: 'physics' });

    it('generates entity with velocity fields', () => {
      const entity = result.files.get('src/entities/MyGameEntity.ts');
      expect(entity).toContain("@schema('float32') vx");
      expect(entity).toContain("@schema('float32') vy");
      expect(entity).toContain('thrustX');
    });
  });

  describe('without bots', () => {
    it('does not generate bot file', () => {
      const result = scaffold({ ...baseOptions, bots: false });
      expect(result.files.has('src/bots/WanderBot.ts')).toBe(false);
    });

    it('game definition has no bot config', () => {
      const result = scaffold({ ...baseOptions, bots: false });
      const game = result.files.get('src/game.ts')!;
      expect(game).not.toContain('bots:');
    });
  });

  describe('custom max players', () => {
    it('respects maxPlayers setting', () => {
      const result = scaffold({ ...baseOptions, maxPlayers: 16 });
      const game = result.files.get('src/game.ts')!;
      expect(game).toContain('maxPlayers: 16');
    });
  });
});

describe('TEMPLATES', () => {
  it('has continuous, grid, and physics templates', () => {
    expect(TEMPLATES.continuous).toBeDefined();
    expect(TEMPLATES.grid).toBeDefined();
    expect(TEMPLATES.physics).toBeDefined();
  });

  it('continuous has tickRate 20', () => {
    expect(TEMPLATES.continuous.tickRate).toBe(20);
  });

  it('grid has tickRate 0', () => {
    expect(TEMPLATES.grid.tickRate).toBe(0);
  });
});

describe('generateFiles', () => {
  it('always generates package.json, tsconfig.json, entity, game, test, and env', () => {
    const files = generateFiles(baseOptions, TEMPLATES.continuous);
    expect(files.has('package.json')).toBe(true);
    expect(files.has('tsconfig.json')).toBe(true);
    expect(files.has('.env.example')).toBe(true);
    expect(files.has('src/game.ts')).toBe(true);
  });

  it('env example has required variables', () => {
    const files = generateFiles(baseOptions, TEMPLATES.continuous);
    const env = files.get('.env.example')!;
    expect(env).toContain('INTERACTIVE_KEY');
    expect(env).toContain('INTERACTIVE_SECRET');
    expect(env).toContain('INSTANCE_DOMAIN');
  });
});
