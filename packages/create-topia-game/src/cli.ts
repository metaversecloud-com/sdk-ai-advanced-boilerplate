#!/usr/bin/env node

import * as readline from 'node:readline';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { scaffold, type ScaffoldOptions } from './scaffold.js';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => resolve(answer.trim()));
  });
}

function askChoice(question: string, choices: string[]): Promise<string> {
  const lines = choices.map((c, i) => `  ${i + 1}) ${c}`).join('\n');
  return ask(`${question}\n${lines}\n> `);
}

async function main(): Promise<void> {
  console.log('\n🎮 create-topia-game — Scaffold a new Topia multiplayer game\n');

  // 1. Game name
  const name = await ask('Game name (kebab-case): ');
  if (!name || !/^[a-z][a-z0-9-]*$/.test(name)) {
    console.error('Invalid name. Use lowercase letters, numbers, and hyphens.');
    process.exit(1);
  }

  // 2. Game type
  const typeChoice = await askChoice('Game type:', [
    'continuous — Real-time movement (snake, racing)',
    'grid — Turn-based grid (puzzle, board game)',
    'physics — Physics-based (bumper balls, platformer)',
  ]);
  const typeMap: Record<string, ScaffoldOptions['gameType']> = { '1': 'continuous', '2': 'grid', '3': 'physics' };
  const gameType = typeMap[typeChoice] ?? 'continuous';

  // 3. Max players
  const maxStr = await ask('Max players (default 8): ');
  const maxPlayers = parseInt(maxStr, 10) || 8;

  // 4. Bot support
  const botAnswer = await ask('Bot support? (Y/n): ');
  const bots = botAnswer.toLowerCase() !== 'n';

  // 5. Topia hooks
  const hookChoice = await askChoice('Topia hooks (comma-separate for multiple):', [
    'leaderboard',
    'badges',
    'none',
  ]);
  const hookMap: Record<string, 'leaderboard' | 'badges' | 'none'> = {
    '1': 'leaderboard', '2': 'badges', '3': 'none',
  };
  const topiaHooks: ScaffoldOptions['topiaHooks'] = hookChoice
    .split(',')
    .map(h => hookMap[h.trim()] ?? 'none')
    .filter((v, i, a) => a.indexOf(v) === i);

  rl.close();

  const options: ScaffoldOptions = { name, gameType, maxPlayers, bots, topiaHooks };
  const result = scaffold(options);

  // Write files
  const baseDir = path.resolve(process.cwd(), result.directory);
  let fileCount = 0;

  for (const [filePath, content] of result.files) {
    const fullPath = path.join(baseDir, filePath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, content, 'utf-8');
    fileCount++;
    console.log(`  created ${path.relative(process.cwd(), fullPath)}`);
  }

  console.log(`\n✅ Scaffolded ${fileCount} files in ./${result.directory}/`);
  console.log('\nNext steps:');
  console.log(`  cd ${result.directory}`);
  console.log('  npm install');
  console.log('  npm test');
  console.log('  npm run dev\n');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
