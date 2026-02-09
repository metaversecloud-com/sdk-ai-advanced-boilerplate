import type { ScaffoldOptions } from './scaffold.js';
import type { GameTemplate } from './templates.js';

export interface GeneratedFile {
  path: string;
  content: string;
}

function toClassName(name: string): string {
  return name
    .split(/[-_\s]+/)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join('');
}

function toCamelCase(name: string): string {
  const cls = toClassName(name);
  return cls.charAt(0).toLowerCase() + cls.slice(1);
}

function generateSchemaFields(template: GameTemplate): string {
  return template.entityFields
    .map(f => {
      const [name, type] = f.split(': ');
      return `  @schema('${type}') ${name} = 0;`;
    })
    .join('\n');
}

function generateInputHandler(template: GameTemplate): string {
  switch (template.inputPattern) {
    case 'angle':
      return `  onInput(input: { angle: number }): void {
    this.angle = input.angle;
  }`;
    case 'direction':
      return `  onInput(input: { action: string; direction: string }): void {
    if (input.action !== 'move') return;
    switch (input.direction) {
      case 'north': this.gridY = Math.max(0, this.gridY - 1); break;
      case 'south': this.gridY = Math.min(9, this.gridY + 1); break;
      case 'east':  this.gridX = Math.min(9, this.gridX + 1); break;
      case 'west':  this.gridX = Math.max(0, this.gridX - 1); break;
    }
  }`;
    case 'thrust':
      return `  onInput(input: { thrustX: number; thrustY: number }): void {
    this.vx += (input.thrustX ?? 0) * 0.5;
    this.vy += (input.thrustY ?? 0) * 0.5;
  }`;
    default:
      return `  onInput(input: Record<string, any>): void {
    // Handle input
  }`;
  }
}

function generatePackageJson(options: ScaffoldOptions): string {
  return JSON.stringify({
    name: options.name,
    version: '0.1.0',
    type: 'module',
    scripts: {
      build: 'tsc',
      test: 'jest --config jest.config.ts',
      dev: 'ts-node-esm src/server.ts',
    },
    dependencies: {
      '@topia/multiplayer': '^0.1.0',
      express: '^4.18.0',
    },
    devDependencies: {
      typescript: '^5.9.0',
      jest: '^30.0.0',
      'ts-jest': '^29.0.0',
      '@types/express': '^4.17.0',
    },
  }, null, 2);
}

function generateTsConfig(): string {
  return JSON.stringify({
    compilerOptions: {
      target: 'ESNext',
      module: 'ESNext',
      moduleResolution: 'bundler',
      declaration: true,
      sourceMap: true,
      outDir: './dist',
      rootDir: './src',
      strict: true,
      esModuleInterop: true,
      experimentalDecorators: true,
      emitDecoratorMetadata: true,
      skipLibCheck: true,
    },
    include: ['src/**/*.ts'],
    exclude: ['tests/**/*.ts', 'dist'],
  }, null, 2);
}

function generateEntity(options: ScaffoldOptions, template: GameTemplate): string {
  const className = toClassName(options.name) + 'Entity';

  return `import { Entity, schema } from '@topia/multiplayer';

export class ${className} extends Entity {
  @schema('string') name = '';
  @schema('boolean') isAlive = true;
  @schema('int16') score = 0;
${generateSchemaFields(template)}

${generateInputHandler(template)}
}
`;
}

function generateBotBehavior(options: ScaffoldOptions): string {
  const entityName = toClassName(options.name) + 'Entity';

  return `import { BotBehavior } from '@topia/multiplayer';

export const WanderBot = BotBehavior.define({
  think(bot, room, delta) {
    // Simple random behavior — customize for your game
    bot.sendInput(${
      options.gameType === 'grid'
        ? `{ action: 'move', direction: ['north', 'south', 'east', 'west'][Math.floor(Math.random() * 4)] }`
        : options.gameType === 'physics'
          ? `{ thrustX: (Math.random() - 0.5) * 2, thrustY: (Math.random() - 0.5) * 2 }`
          : `{ angle: Math.random() * Math.PI * 2 }`
    });
  },
});
`;
}

function generateGameDefinition(options: ScaffoldOptions, template: GameTemplate): string {
  const className = toClassName(options.name) + 'Game';
  const entityName = toClassName(options.name) + 'Entity';
  const gameName = toCamelCase(options.name);

  const botImport = options.bots
    ? `import { WanderBot } from './bots/WanderBot.js';\n`
    : '';

  const botConfig = options.bots
    ? `
  bots: {
    fillTo: Math.min(${Math.floor(options.maxPlayers / 2)}, ${options.maxPlayers}),
    behaviors: [WanderBot],
    despawnOnJoin: true,
    names: ['Bot Alpha', 'Bot Beta', 'Bot Gamma', 'Bot Delta'],
  },`
    : '';

  const onTick = template.tickRate > 0
    ? `
  onTick(room, delta) {
    // Game loop — runs ${template.tickRate} times per second
    // Move entities, check collisions, update scores
  },
`
    : '';

  const onInput = template.tickRate === 0
    ? `
  onInput(room, player, input) {
    // Handle player input (event-driven mode)
  },
`
    : '';

  return `import { TopiaGame } from '@topia/multiplayer';
import { ${entityName} } from './entities/${entityName}.js';
${botImport}
export const ${className} = TopiaGame.define({
  name: '${gameName}',
  tickRate: ${template.tickRate},
  maxPlayers: ${options.maxPlayers},${botConfig}

  onCreate(room) {
    // Spawn initial entities
  },
${onTick}${onInput}
  onPlayerJoin(room, player) {
    const entity = room.spawnEntity(${entityName}, {
      name: player.topia.displayName,
    });
    player.entity = entity;
  },

  onPlayerLeave(room, player) {
    if (player.entity) {
      room.despawnEntity(player.entity);
    }
  },
});
`;
}

function generateTest(options: ScaffoldOptions): string {
  const className = toClassName(options.name) + 'Game';
  const entityName = toClassName(options.name) + 'Entity';
  const gameName = toClassName(options.name);

  return `import { TestRoom } from '@topia/multiplayer/testing';
import { ${className} } from '../src/game.js';
import { ${entityName} } from '../src/entities/${entityName}.js';

describe('${gameName}', () => {
  it('creates a room', () => {
    const room = TestRoom.create(${className});
    expect(room).toBeDefined();
  });

  it('adds a player', () => {
    const room = TestRoom.create(${className});
    const player = room.addPlayer({ displayName: 'Test Player' });
    expect(player.entity).toBeDefined();
  });

  it('removes a player', () => {
    const room = TestRoom.create(${className});
    const player = room.addPlayer({ displayName: 'Leaver' });
    const entityId = player.entity.id;

    room.removePlayer(player.id);
    expect(room.entities.all().find(e => e.id === entityId)).toBeUndefined();
  });

  it('serializes entity snapshots', () => {
    const room = TestRoom.create(${className});
    const player = room.addPlayer({ displayName: 'Snapshot' });
    const snapshot = player.entity.toSnapshot();
    expect(snapshot.name).toBe('Snapshot');
    expect(snapshot.id).toBeDefined();
  });
});
`;
}

function generateEnvExample(): string {
  return `INTERACTIVE_KEY=your-interactive-key
INTERACTIVE_SECRET=your-interactive-secret
INSTANCE_DOMAIN=api.topia.io
INSTANCE_PROTOCOL=https
`;
}

export function generateFiles(options: ScaffoldOptions, template: GameTemplate): Map<string, string> {
  const files = new Map<string, string>();
  const entityName = toClassName(options.name) + 'Entity';

  files.set('package.json', generatePackageJson(options));
  files.set('tsconfig.json', generateTsConfig());
  files.set('.env.example', generateEnvExample());
  files.set(`src/entities/${entityName}.ts`, generateEntity(options, template));
  files.set('src/game.ts', generateGameDefinition(options, template));
  files.set(`tests/${toCamelCase(options.name)}.test.ts`, generateTest(options));

  if (options.bots) {
    files.set('src/bots/WanderBot.ts', generateBotBehavior(options));
  }

  return files;
}
