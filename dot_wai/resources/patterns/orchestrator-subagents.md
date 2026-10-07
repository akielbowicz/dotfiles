# Pattern: orchestrator + pi subagents

**Canon.** This file is the single source of truth for the orchestrator
pattern. Repo-local reflections and pipelines are *projections*; on conflict,
this file wins, and repo files should be updated to match.

Established 2026-10-06 during specodelic-txo. Tooling-enforced in specodelic
since 2026-10-07 (epic-orchestrator pipeline). Promoted to global 2026-10-07
after the same failure (ephemeral `--no-session` spawn) was user-corrected in
three repos across two days.

## Invariants (tool-agnostic — never optional)

1. **The session lead orchestrates only.** Track beads/openspec/wai state,
   verify gates, push, close. Never implement ticket work inline when a
   subagent can do it — inline execution is the path of least resistance and
   the historical failure mode.
2. **Subagents are never ephemeral.** A spawned agent that leaves no session
   record loses usage/cost/trace forever. Every spawn must be resumable and
   discoverable.
3. **One ticket per advance.** Claim → brief → spawn → verify → push → close
   → STOP. No chaining past the ticket boundary.
4. **Briefs are repo artifacts, not /tmp files.** Written from the repo's
   template into `.wai/projects/<name>/briefs/<ticket>.md` and committed
   before spawn, so the subagent starts from a clean tree and the brief
   survives reboots.
5. **Verify before trust.** After each subagent run: `git log` vs the report,
   repo gates, beads state. Reports are claims, not facts.
6. **Retry is a new named session.** Check git state first (zero commits =
   clean retry; partial commits = resume manually). Retry session name gets a
   `-retry` suffix. Never "resume" a wedged spawn in-place — that path is
   where the discipline gets skipped.
7. **Repo reflections reference this canon** and carry only repo specifics
   (gates, ratchets, verify commands, worktree strategy).

## Tool syntax: pi (projection — update when pi CLI changes)

```bash
# Spawn (from repo cwd), never --no-session:
pi -p -n "subagent:<ticket>:<steps>" "$(cat .wai/projects/<name>/briefs/<ticket>.md)"

# Discover subagent sessions:
grep -l "subagent:<ticket>" ~/.pi/agent/sessions/<cwd-key>/*.jsonl
```

Parallel tickets: one git worktree per ticket on its own branch, one named
session each, reconcile at merge.

## Repo layer (projection — per-repo reflections own this)

- Verify gates (e.g. specodelic: `just test` + `ah check` + `openspec
  validate`; wanna: `ah check --run-tests` + eslint + pretender; tambor:
  vitest + lefthook).
- Structural ratchets and their escape hatches (e.g. pretender shrink-only).
- Worktree/merge strategy for parallel tickets.

## Pipeline as enforcement

Where the pattern must be tooling-enforced, encode the loop as a wai pipeline
(`.wai/resources/pipelines/epic-orchestrator.toml`) + shared brief template
(`.wai/resources/templates/subagent-brief.md`) + a status surface
(`just epic-status`). Prose alone did not hold: see specodelic-k9v.
