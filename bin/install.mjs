#!/usr/bin/env node
// One-shot installer for @sabaiway/agent-workflow-kit.
//
//   npx @sabaiway/agent-workflow-kit init
//
// Copies the kit into the canonical skill home (~/.claude/skills/agent-workflow-kit),
// then runs the cross-agent launcher (auto-detects Codex / Windsurf — only touches tools
// you actually have). Re-running refreshes the skill to this package's version, which is
// how you upgrade the *skill files* themselves:
//
//   npx @sabaiway/agent-workflow-kit@latest init
//
// That is distinct from `/agent-workflow-kit upgrade`, which migrates a *project's*
// docs/ai deployment — see README "Use".
//
// No telemetry, no phone-home: adoption is the npm registry's public, passive per-version
// download numbers (api.npmjs.org/downloads). Nothing here contacts a server.
//
// Dependency-free, Node >= 18.

import { readFile, mkdir, readdir, copyFile, lstat, readlink, symlink } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';
import { spawnSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PKG_ROOT = resolve(__dirname, '..');

// The deployable skill = everything except the npm wrapper (package.json, bin/).
const PAYLOAD = ['SKILL.md', 'README.md', 'CHANGELOG.md', 'references', 'launchers', 'migrations'];

const tildify = (path) => path.replace(homedir(), '~');

const readVersion = async () => {
  try {
    const pkg = JSON.parse(await readFile(resolve(PKG_ROOT, 'package.json'), 'utf8'));
    return pkg.version ?? 'unknown';
  } catch {
    return 'unknown';
  }
};

const copyRecursive = async (src, dest) => {
  const stat = await lstat(src);
  if (stat.isSymbolicLink()) {
    if (existsSync(dest)) return; // additive: never delete/replace an existing entry
    const linkTarget = await readlink(src);
    await symlink(linkTarget, dest);
  } else if (stat.isDirectory()) {
    await mkdir(dest, { recursive: true });
    const entries = await readdir(src);
    await Promise.all(entries.map((entry) => copyRecursive(join(src, entry), join(dest, entry))));
  } else {
    await mkdir(dirname(dest), { recursive: true });
    await copyFile(src, dest);
  }
};

const parseArgs = (argv) => {
  const dirFlag = argv.indexOf('--dir');
  return {
    help: argv.includes('--help') || argv.includes('-h'),
    version: argv.includes('--version') || argv.includes('-v'),
    noLaunchers: argv.includes('--no-launchers'),
    force: argv.includes('--force'),
    dir: dirFlag >= 0 ? argv[dirFlag + 1] : undefined,
  };
};

const resolveTarget = (dirArg) => {
  if (dirArg) return resolve(dirArg);
  if (process.env.AGENT_WORKFLOW_KIT_DIR) return resolve(process.env.AGENT_WORKFLOW_KIT_DIR);
  return resolve(homedir(), '.claude/skills/agent-workflow-kit');
};

const printHelp = (version) => {
  console.log(`agent-workflow-kit ${version}

Usage:
  npx @sabaiway/agent-workflow-kit init [--dir <path>] [--no-launchers] [--force]
  npx @sabaiway/agent-workflow-kit --version
  npx @sabaiway/agent-workflow-kit --help

Installs/refreshes the kit at ~/.claude/skills/agent-workflow-kit
  (override with --dir <path> or AGENT_WORKFLOW_KIT_DIR), then wires any
  Codex / Windsurf you have. --no-launchers skips that wiring; --force replaces a
  pre-existing non-kit launcher file (backed up first). init is additive — it never
  deletes your settings.

After install, invoke the skill in your agent, inside a project:
  first time in the project  ->  /agent-workflow-kit
  project already has it     ->  /agent-workflow-kit upgrade
  (Claude Code / Codex / Windsurf Cascade all use the same /agent-workflow-kit.)

Re-running this npx command updates the kit's own files; /agent-workflow-kit
upgrade then migrates a project's deployment to that version.`);
};

const main = async () => {
  const version = await readVersion();
  const args = parseArgs(process.argv.slice(2));

  if (args.help) return printHelp(version);
  if (args.version) return console.log(version);

  if (!existsSync(resolve(PKG_ROOT, 'SKILL.md'))) {
    console.error('[agent-workflow-kit] package payload missing (no SKILL.md) — corrupt install?');
    process.exit(1);
  }

  const target = resolveTarget(args.dir);
  const wasPresent = existsSync(resolve(target, 'SKILL.md'));
  await mkdir(target, { recursive: true });
  await Promise.all(
    PAYLOAD.filter((entry) => existsSync(resolve(PKG_ROOT, entry))).map((entry) =>
      copyRecursive(resolve(PKG_ROOT, entry), resolve(target, entry)),
    ),
  );
  console.log(`[agent-workflow-kit] ${wasPresent ? 'updated the kit to' : 'installed'} v${version} -> ${tildify(target)}`);

  // Wire non-Claude agents — best-effort; the launcher only touches tools you have.
  const launcher = resolve(target, 'launchers/install-launchers.sh');
  if (args.noLaunchers) {
    console.log('[agent-workflow-kit] --no-launchers: skipped Codex/Windsurf wiring.');
  } else if (process.platform === 'win32') {
    console.log('[agent-workflow-kit] Windows: skipped POSIX launcher. Claude Code reads the kit natively.');
  } else if (existsSync(launcher)) {
    const launcherArgs = args.force ? [launcher, '--force'] : [launcher];
    const launcherRun = spawnSync('bash', launcherArgs, { stdio: 'inherit' });
    if (launcherRun.status !== 0) {
      console.warn('[agent-workflow-kit] launcher step skipped/failed — run it by hand if you use Codex/Windsurf:');
      console.warn(`  bash ${tildify(launcher)}`);
    }
  }

  // This command (de)installed the *kit* globally. Deploying it into a project is a
  // separate, in-agent step — and which sub-command depends on whether that project
  // already has the kit. Spell both out so it's unambiguous (see README "Use").
  console.log(`
Next — open your agent inside a project and run the skill:
  • first time in this project  ->  /agent-workflow-kit
  • project already has the kit  ->  /agent-workflow-kit upgrade

This command only installs/updates the kit itself (in ${tildify(target)}).
To update the kit later, re-run:  npx @sabaiway/agent-workflow-kit@latest init`);
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
