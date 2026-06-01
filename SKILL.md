---
name: agent-workflow-kit
description: Deploy or upgrade a portable AI-agent memory-and-workflow system in any project. Use when the user wants to bootstrap `docs/ai/` + an entry-point `AGENTS.md` (+ `CLAUDE.md` alias) + cap/archive/index enforcement in a new or existing repo, set up the Memory Map and session protocols, install the docs-rotation pre-commit hook, or run `/agent-workflow-kit` / `/agent-workflow-kit upgrade`. Triggers on phrases like "set up the memory system", "deploy the AI workflow here", "bootstrap docs/ai", "upgrade the workflow".
disable-model-invocation: true
metadata:
  version: '1.0.0'
---

# agent-workflow-kit

Deploys a **portable AI-agent memory-and-workflow system** into a project, and upgrades it as the kernel evolves. After it runs, any future agent (including a fresh session of yourself) can reconstruct project context in ~60 seconds, find the current task, and avoid repeating past mistakes.

The kernel is **stack-agnostic workflow** — `docs/ai/` structure, entry-point doc, session protocols, plan lifecycle, frontmatter caps, 3-tier archive, index-freshness gate. Enforcement ships as **Node `.mjs` scripts** (the reference implementation; non-Node stacks follow the same policy manually). This skill is **English-only**.

This kernel is distilled from a canonical, battle-tested reference implementation. The skill is the single source of truth — projects deploy from it and upgrade against it.

---

## Two modes

Pick the mode from the user's invocation. Auto-detect an existing `docs/ai/` to guard against bootstrapping over a live system, but the user makes the final call.

- **`/agent-workflow-kit`** (default) — bootstrap a new or empty project. If `docs/ai/` already exists, stop and ask whether they meant `upgrade`.
- **`/agent-workflow-kit upgrade`** — upgrade an existing deployment to the skill's current `version`.

### Mode: bootstrap

> Bundled sources below (templates, scripts) live in **this skill's own directory** — `${CLAUDE_SKILL_DIR}/` in Claude Code, or the folder containing this `SKILL.md` in Codex / other agents. Use that as the copy/read source; the working directory is the **target project**, not the skill.

1. **Recon (read-only).** Before writing anything:
   - `package.json` / `pyproject.toml` / `go.mod` / `Cargo.toml` → stack, package manager, scripts.
   - `ls -la` root → `README`, existing `AGENTS.md`/`CLAUDE.md`, CI configs, linter/formatter configs.
   - `git log --oneline -30` + `git status` → recent activity, branch, uncommitted changes.
   - `src/` (or equivalent) 2–3 levels deep → modules, routes/pages, components, services, types.
   - Tests (framework, location, E2E?) and linter rules.
   - Record: stack, package manager, daily commands (`dev`/`test`/`lint`/`type-check`), routes/pages, architecture layers.
2. **Choose visibility — ASK the user explicitly and wait for the answer, before writing anything.** This decides what gets tracked and is hard to reverse after a commit, so never assume the default silently: `visible` (committed — canonical, recommended) or `hidden` (in-tree, hidden via `~/.gitignore_global`). See *Visibility contract*.
3. **Entry-point doc.** If `AGENTS.md` / `CLAUDE.md` already exist (step-1 recon), do **not** overwrite — show the user and ask whether to merge or replace. Otherwise create `AGENTS.md` (the cross-agent standard — Codex / Cursor / Windsurf / Copilot read it natively) from `${CLAUDE_SKILL_DIR}/references/templates/AGENTS.md`, and symlink `CLAUDE.md -> AGENTS.md` (`ln -s AGENTS.md CLAUDE.md`) for Claude Code — single source, no duplication. For nested context, add a subdir `AGENTS.md` (+ a `CLAUDE.md` symlink beside it for Claude Code).
4. **Deploy `docs/ai/`.** Create the 11 files + `pages/` from `${CLAUDE_SKILL_DIR}/references/templates/`. Keep each file's frontmatter (`type / lastUpdated / scope / staleAfter / owner / maxLines`).
5. **Fill templates** per the table below.
6. **Install enforcement (Node projects).** Copy `${CLAUDE_SKILL_DIR}/references/scripts/*.mjs` (+ `*.test.mjs`) into the project's `scripts/`. They self-configure (project name from `package.json`, hierarchical/on-demand sections auto-discovered). **If the project has no Node runtime** (step-1 recon), skip this step and the hook in step 7 — follow the cap/archive/index policy manually, or port the scripts to the project's language.
7. **Wire / hide** per visibility (see contract). Install the pre-commit hook (Node projects): `node scripts/install-git-hooks.mjs`. If the installer reports a pre-existing non-marker hook, stop and ask the user to merge it manually rather than overwriting.
8. **Stamp version.** Write the skill's `version` into `docs/ai/.workflow-version` (one semver line).
9. **Report & ask.** Show `tree docs/ai/`, 2–3 lines on what was filled with real data vs left as TODO, then **ask before committing** — never auto-commit.

Fill strategy:

| File | Strategy |
|------|----------|
| `current_state.md`, `architecture.md`, `env_commands.md`, `technical_specification.md`, `pages/index.md` | Fill with **real** recon data (stack, scripts, layers, routes). |
| `tech_reference.md` | Carry over real configs/patterns found in deps. |
| `active_plan.md`, `handover.md` | TODO seed (e.g. "Bootstrap session — fill domain sections after first real work"). |
| `decisions.md` | Seed `AD-001` (adopting this memory system). |
| `known_issues.md`, `changelog.md`, `pages/shared-patterns.md` | Empty template / first bootstrap entry. |

### Mode: upgrade

1. Read `docs/ai/.workflow-version` (the project's stamped version). If missing, treat as a pre-versioned deployment and offer to re-bootstrap conservatively.
2. Compare to this skill's `metadata.version` (frontmatter). If equal → report "up to date" and stop.
3. Show the relevant `${CLAUDE_SKILL_DIR}/CHANGELOG.md` diff (entries newer than the project's stamp).
4. Apply `${CLAUDE_SKILL_DIR}/migrations/<version>-<slug>.md` in **semver order**, only those newer than the project's stamp. Migrations are **idempotent** — safe to re-run.
5. Reconcile drift: add any kernel files/scripts the project is missing; never clobber project-authored content (their `decisions.md`, `known_issues.md`, page specs stay).
6. Re-stamp `docs/ai/.workflow-version` to the skill's `version`. Report changes; **ask before committing**.

---

## Visibility contract

The user chooses at bootstrap whether the AI artifacts are visible in the repo or hidden — an **explicit up-front question** (step 2), never an assumed default. The two modes then diverge:

- **visible** — artifacts are committed. Wire the project's `package.json` scripts (`docs:check` / `docs:index` / `docs:index:check` / `docs:archive` / `docs:archive:check` / `docs:archive:issues` / `docs:archive:issues:check` / `prepare: node scripts/install-git-hooks.mjs`) and add a minimal `.gitignore` (`docs/plans/`, `.claude/settings.local.json`). This is the canonical model.
- **hidden** (in-tree) — same files on disk, but the repo "looks normal": append the artifact paths (`AGENTS.md`, `CLAUDE.md`, `docs/ai/`, `docs/plans/`, `scripts/*.mjs` you added, `docs/ai/.workflow-version`) to the global excludes file git **already uses** (`git config --get core.excludesFile`); if none is set, point it at `~/.gitignore_global` (`git config --global core.excludesFile ~/.gitignore_global`) and append there. **Verify `git status` shows the artifacts as ignored** afterwards. **Do not edit `package.json`** — that is a tracked change and would leak; the pre-commit hook (always untracked in `.git/hooks/`) calls the scripts via `node scripts/<x>.mjs` directly.

Not in this version: a fully-external hidden mode (artifacts relocated outside the repo tree). Deferred to a later release + migration.

---

## System principles (encode these into the project's `AGENTS.md`)

1. **Single entry point.** `AGENTS.md` is the only entry point (tool aliases like `CLAUDE.md` symlink to it); it never bloats — details live in `docs/ai/`.
2. **Memory Map.** A "read-when / update-when" table for every file. Without it agents get lost.
3. **Three protocols.** Start of Session → During Work → Task Completion, each a short checklist.
4. **Update docs BEFORE code.** Page behaviour changing? Update `pages/<page>.md` first, then the code.
5. **No silent failures.** Every internal validation/guard that rejects an action logs structured context (component, action, ids, inputs); user-facing failures also surface in the UI.
6. **TDD by default.** Test before code (unit for functions, E2E for user flows).
7. **ADR for strategic choices.** Long-term-consequence decisions get a `decisions.md` entry.
8. **Hard Constraints are tool-enforced.** Style rules live in linter/type-checker configs, not prose.
9. **Ask before commit.** The agent reports quality-gate results and waits for explicit approval; it never auto-commits.
10. **Honest `known_issues.md`.** Every bug with a workaround gets Impact + Plan so it isn't re-discovered later.

---

## Hard Constraints (template — adapt to the stack)

Deploy these into `AGENTS.md`; remove rows that don't apply to the stack.

| Rule | Enforcement |
|------|-------------|
| No `export default` (named exports only) | Linter |
| No `any` / no unsafe casts | Linter / type-checker |
| Functional style (no mutation in app code) | Linter |
| No single-letter variables | Code review |
| Interactive elements semantic (button/link, not div+onClick) | Linter / a11y |
| No hardcoded colors — design tokens only | Code review |
| No business logic in components → hooks/services | Architecture review |
| No changes without tests (TDD) | Required |
| Check page docs before changes; update them after | Process |
| Ask user before committing | Process |
| Every page has an HTML-validity / a11y E2E test | Required |
| **No silent failures** — structured logging on every rejected action | Required |

---

## References

- [`references/planning.md`](references/planning.md) — plan vocabulary (Plan→Phase→Step→Substep), lifecycle, `queue.md` series-index, mandatory Cleanup, session-continuity heuristic.
- [`references/templates/`](references/templates/) — stack-agnostic `AGENTS.md`, `agent_rules.md`, and all `docs/ai/` files to deploy.
- [`references/scripts/`](references/scripts/) — the Node enforcement scripts (caps + staleness + index-freshness gate, 3-tier archive, hook installer) and their unit tests.
- [`migrations/`](migrations/) — per-version upgrade steps; see `migrations/README.md`.
- [`launchers/`](launchers/) — run the bootstrapper from non-Claude agents (`SKILL.md` is a native Codex skill; a Windsurf workflow launcher + install script). See `launchers/README.md`.
- [`CHANGELOG.md`](CHANGELOG.md) — version history of this kernel.
