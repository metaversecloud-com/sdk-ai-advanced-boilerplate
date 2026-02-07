#!/usr/bin/env node

import { createInterface } from "readline";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { execSync } from "child_process";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ENV_PATH = resolve(__dirname, "../.env");

const rl = createInterface({ input: process.stdin, output: process.stdout });

function ask(question, defaultValue = "") {
  const suffix = defaultValue ? ` (${defaultValue})` : "";
  return new Promise((resolve) => {
    rl.question(`${question}${suffix}: `, (answer) => {
      resolve(answer.trim() || defaultValue);
    });
  });
}

function askYesNo(question, defaultYes = true) {
  const hint = defaultYes ? "[Y/n]" : "[y/N]";
  return new Promise((resolve) => {
    rl.question(`${question} ${hint} `, (answer) => {
      const val = answer.trim().toLowerCase();
      if (val === "") resolve(defaultYes);
      else resolve(val === "y" || val === "yes");
    });
  });
}

async function main() {
  console.log("\n🚀 Lunch Swap — Developer Setup\n");

  // Check if .env already exists
  if (existsSync(ENV_PATH)) {
    const existing = readFileSync(ENV_PATH, "utf-8");
    console.log("Found existing .env file:");
    console.log("─".repeat(40));
    // Show keys only, not values
    existing.split("\n").forEach((line) => {
      const match = line.match(/^([A-Z_]+)=/);
      if (match) console.log(`  ${match[1]}=****`);
    });
    console.log("─".repeat(40));

    const reconfigure = await askYesNo("Reconfigure?", false);
    if (!reconfigure) {
      console.log("\nKeeping existing .env. Done!\n");
      rl.close();
      return;
    }
  }

  console.log("Enter your Topia credentials.\n");
  console.log("Interactive Key and Secret are required for production auth.");
  console.log("API Key is optional but enables dev-mode routes for local development.\n");

  // Required
  const interactiveKey = await ask("Interactive Key (required)");
  if (!interactiveKey) {
    console.error("\n❌ Interactive Key is required. Aborting.\n");
    rl.close();
    process.exit(1);
  }

  const interactiveSecret = await ask("Interactive Secret (required)");
  if (!interactiveSecret) {
    console.error("\n❌ Interactive Secret is required. Aborting.\n");
    rl.close();
    process.exit(1);
  }

  // Optional
  console.log("\n── Optional (enables dev routes) ──\n");

  const apiKey = await ask("API Key (optional, enables dev routes)");
  let worldSlug = "";
  if (apiKey) {
    worldSlug = await ask("Development World URL Slug (optional)");
  }

  // Build .env content
  const lines = [
    `API_URL=http://localhost:3001`,
    `INSTANCE_DOMAIN=api.topia.io`,
    `INSTANCE_PROTOCOL=https`,
    `INTERACTIVE_KEY=${interactiveKey}`,
    `INTERACTIVE_SECRET=${interactiveSecret}`,
    `NODE_ENV="development"`,
    ``,
    `# Optional: enables dev-mode routes (GET /api/dev/world-info, POST /api/dev/drop-asset)`,
    apiKey ? `API_KEY=${apiKey}` : `# API_KEY=`,
    `# Optional: default world for dev routes`,
    worldSlug ? `DEVELOPMENT_WORLD_SLUG=${worldSlug}` : `# DEVELOPMENT_WORLD_SLUG=`,
    ``,
  ];

  writeFileSync(ENV_PATH, lines.join("\n"), "utf-8");
  console.log(`\n✅ .env written to ${ENV_PATH}\n`);

  // Offer to install skills
  const installSkills = await askYesNo("Install Claude Code skills?", true);
  if (installSkills) {
    const skillsScript = resolve(__dirname, "setup-skills.sh");
    if (existsSync(skillsScript)) {
      console.log("\nInstalling skills...\n");
      try {
        execSync(`bash "${skillsScript}"`, { stdio: "inherit" });
      } catch {
        console.warn("⚠️  Skills installation had issues — you can retry with: bash scripts/setup-skills.sh\n");
      }
    } else {
      console.warn("⚠️  scripts/setup-skills.sh not found — skipping.\n");
    }
  }

  // Next steps
  console.log("\n── Next Steps ──\n");
  console.log("  npm install");
  console.log("  npm run dev\n");
  if (apiKey) {
    console.log("  Dev routes available at:");
    console.log("    GET  http://localhost:3000/api/dev/world-info");
    console.log("    POST http://localhost:3000/api/dev/drop-asset\n");
  }

  rl.close();
}

main().catch((err) => {
  console.error("Setup failed:", err);
  rl.close();
  process.exit(1);
});
