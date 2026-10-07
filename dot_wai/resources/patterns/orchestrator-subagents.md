# Pattern: orchestrator + pi subagents

**Canon** — single source of truth for orchestrating implementation work with
subagents. Repo reflections and pipelines are *projections*: they carry repo
specifics (gates, ratchets, commands, worktree strategy) and must match this
file. On conflict, this file wins.

**Scope.** This file holds only tool-agnostic invariants and thin tool-syntax
projections. Repo names, ticket IDs, gate lists, and session history belong in
repo reflections and wai research notes — never here.

Managed via chezmoi (`~/para/areas/dev/gh/ak/dotfiles`, `dot_wai/`): edit the
source file and `chezmoi apply`, never edit in place.
Established 2026-10-06, promoted to global 2026-10-07.

## Invariants (tool-agnostic — never optional)

1. **The lead orchestrates only.** Track beads/openspec/wai state, verify
   gates, push, close. Never implement ticket work inline when a subagent can
   do it — inline execution is the path of least resistance and the
   historical failure mode.
2. **Subagents are never ephemeral.** A spawn that leaves no session record
   loses usage/cost/trace forever. Every spawn must be resumable and
   discoverable.
3. **One ticket per advance.** Claim → brief → spawn → verify → push → close
   → STOP. No chaining past the ticket boundary.
4. **Briefs are repo artifacts, not /tmp files.** Written from the repo's
   template into a committed path (`.wai/projects/<name>/briefs/`), committed
   before spawn so the subagent starts from a clean tree.
5. **Verify before trust.** After each run: `git log` vs the report, repo
   gates, ticket state. Reports are claims, not facts.
6. **Retry is a new named session.** Check git state first (zero commits =
   clean retry; partial commits = manual resume). Retry names get a `-retry`
   suffix. Never resume a wedged spawn in-place — that path is where the
   discipline gets skipped.
7. **Progress must be pokeable.** Every spawn streams output to a known log
   path, and one command answers: what is running, which step, done or
   stuck, where is the log. If answering "why is it taking so long?"
   requires opening session JSONLs, observability has failed. The
   orchestrator polls/logs rather than blind-blocking, so it (or the user)
   can check progress at any time without stopping the work.
8. **Prose does not enforce.** Wherever the pattern is load-bearing, encode
   the loop as a wai pipeline + brief template + status recipe, and let the
   tooling refuse bad spawns. Prose alone has repeatedly failed.

## Tool syntax: pi (projection — update when pi CLI changes)

```bash
# Spawn (repo cwd): named, streaming to a log the orchestrator can tail.
pi -p -n "subagent:<ticket>:<steps>" "$(cat .wai/projects/<name>/briefs/<ticket>.md)" \
  > .wai/projects/<name>/runs/<ticket>.log 2>&1 &
tail -f .wai/projects/<name>/runs/<ticket>.log   # poke progress

# Discover subagent sessions:
grep -l "subagent:<ticket>" ~/.pi/agent/sessions/<cwd-key>/*.jsonl

# Poke overall state: `wai pipeline current` or the repo's status recipe
# (e.g. just epic-status) — one command, run state + ticket state.
```

Parallel tickets: one git worktree per ticket on its own branch, one named
session each, reconcile at merge.

## Repo layer (owned by per-repo reflections and pipelines)

Verify gates, structural ratchets, log/run path conventions, worktree and
merge strategy, status recipe. Each repo reflection must open with a pointer
to this canon.
