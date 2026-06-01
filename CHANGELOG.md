# Changelog — agent-workflow-kit

Semantically versioned ([semver](https://semver.org)), newest first. The `version:` in `SKILL.md`
is the current release. `upgrade` mode reads a project's `docs/ai/.workflow-version` and applies
every `migrations/<version>-<slug>.md` newer than it, in semver order.

## 1.0.0 — Initial public release

First public release of `@sabaiway/agent-workflow-kit`. The kernel — distilled from a battle-tested, multi-year-verified reference implementation — ships on npm + GitHub so it installs (and self-upgrades) in one command. Adoption is countable from the registry's public per-version download numbers — no telemetry, no phone-home.

**The kernel — a portable AI-agent memory & workflow system**

- **Entry point** — `AGENTS.md` (cross-agent open standard: Codex / Cursor / Windsurf / Copilot read it natively) + `CLAUDE.md` symlink for Claude Code; concise Memory Map, protocols delegated to `agent_rules.md`.
- **`docs/ai/` structure** — `handover`, `active_plan`, `current_state`, `technical_specification`, `architecture`, `known_issues`, `decisions`, `changelog`, `env_commands`, `tech_reference`, `agent_rules` + `pages/` (`index`, `shared-patterns`, `PAGE_TEMPLATE`). Layered lazy-loading: always-loaded / on-demand / hierarchical subdir `AGENTS.md` / archive.
- **Frontmatter caps** — every file declares `maxLines` + `staleAfter`; the validator errors over cap, warns when stale.
- **Index-freshness gate** — `check-docs-size.mjs --check-index` regenerates the navigator in memory and diffs it against the on-disk `index.md`, using the on-disk header date so a day-rollover is not a false positive.
- **3-tier rolling archive** — `archive-changelog.mjs` (HOT changelog → WARM `recent.md` → COLD `YYYY-MM.md`) + condensed-index META; `archive-issues.mjs` for resolved issues.
- **Pre-commit hook** — `install-git-hooks.mjs` wires caps + index freshness + archive checks + the `scripts/` test suite; package-manager-agnostic (`node` directly).
- **Tests** — rotation/cap pure functions covered by `*.test.mjs`, runnable under `node --test` via a zero-dependency `expect` shim.
- **Planning** — `references/planning.md`: Plan→Phase→Step→Substep, ephemeral plan lifecycle, `queue.md` series-index, mandatory Cleanup, plan-then-execute split + session-continuity heuristic.
- **Two modes** — `/agent-workflow-kit` (new) and `/agent-workflow-kit upgrade` (existing).
- **Cross-agent invocation** — `launchers/`: `SKILL.md` is a native Codex skill (same cross-agent standard); a Windsurf workflow launcher + `install-launchers.sh` let Codex/Windsurf users run the bootstrapper too, not just Claude Code.
- **Visibility** — `visible` (committed) and `hidden` (in-tree, hidden via `~/.gitignore_global`).

**Distribution & install**

- **`npx @sabaiway/agent-workflow-kit init`** — `bin/install.mjs` (dependency-free, Node ≥ 18) copies the kit into `~/.claude/skills/agent-workflow-kit/` and runs `launchers/install-launchers.sh` (auto-detects Codex / Windsurf). `--dir` / `AGENT_WORKFLOW_KIT_DIR` override the target; `--no-launchers` skips the wiring.
- **Self-upgrade** — `npx @sabaiway/agent-workflow-kit@latest init` refreshes the kit's own files; distinct from `/agent-workflow-kit upgrade`, which migrates a project's `docs/ai/` deployment.
- **Manual install still supported** — `git clone` + `install-launchers.sh`; only the npx path is reflected in install stats.
- **Additive & safe** — the installer writes only the kit's own namespaced slots and never deletes your settings. A pre-existing non-kit Codex link or Windsurf workflow is left untouched unless you pass `--force`, which backs it up to `*.bak.<timestamp>` and prints a restore command first. Windsurf launcher files carry an `agent-workflow-kit:managed` marker so the installer can tell its own file from yours.

**Known limitation** — condensed-index grows O(total archived entries); shard per-year on a multi-year horizon (noted in `archive-changelog.mjs`). Fully-external hidden mode is deferred to a later release.
