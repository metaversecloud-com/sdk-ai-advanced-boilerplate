import { generateFiles } from './generator.js';
import { TEMPLATES } from './templates.js';

export interface ScaffoldOptions {
  name: string;
  gameType: 'continuous' | 'grid' | 'physics';
  maxPlayers: number;
  bots: boolean;
  topiaHooks: ('leaderboard' | 'badges' | 'none')[];
}

export interface ScaffoldResult {
  files: Map<string, string>;
  directory: string;
}

export function scaffold(options: ScaffoldOptions): ScaffoldResult {
  const template = TEMPLATES[options.gameType];
  if (!template) {
    throw new Error(`Unknown game type: ${options.gameType}. Valid types: ${Object.keys(TEMPLATES).join(', ')}`);
  }

  const files = generateFiles(options, template);
  return {
    files,
    directory: options.name,
  };
}
