<!-- WAI:START --># Workflow Tools

This project uses **wai** to track the *why* behind decisions — research,
reasoning, and design choices that shaped the code. Run `wai status` first
to orient yourself.

Detected workflow tools:
- **wai** — research, reasoning, and design decisions
- **beads** — issue tracking (tasks, bugs, dependencies). CLI command: **`bd`** (not `beads`)

> **CRITICAL**: Apply TDD and Tidy First throughout — not just when writing code:
> - **Planning/task creation**: each ticket should map to a red→green→refactor cycle; refactoring tasks must be separate tickets from feature tasks.
> - **Design**: define the test shape (inputs/outputs) before designing the implementation.
> - **Implementation**: write the failing test first, then make it pass, then tidy in a separate commit.

> **When beginning research or creating a ticket**: run `wai search "<topic>"` to check for existing patterns before writing new content.

## Quick Start

1. `wai sync` — ensure agent tools are projected
2. `wai status` — see active projects, phase, and suggestions
3. `bd ready` — find available work items

When context reaches ~40%: stop and tell the user — responses degrade past
this point. Recommend `wai close` then `/clear` to resume cleanly.
Do NOT skip `wai close` — it enables resume detection.

## Autonomous Work Policy

Proceed without routine confirmation when the next step is clear.
Do not ask to continue, fix, or commit — just do it.

**Stop and ask** only when:
- Conflicting requirements or ambiguous intent
- Destructive actions (data loss, force-push, drop table)
- Credentials, secrets, or external services not yet authorized
- Unresolved test failures after two attempts
- Push, deploy, or release — always get explicit authorization
- Context approaching 40% — recommend `wai close` then `/clear`

## Detailed Instructions

Full workflow reference — session lifecycle, capturing work, command cheat
sheets, cross-tool sync, and PARA structure — lives in **`.wai/AGENTS.md`**.
Read it at the start of your first session or when you need detailed guidance.

Keep this managed block so `wai init` can refresh the instructions.

<!-- WAI:END -->

# Global Agent Instructions

- Prefer `just` commands over custom shell scripts — check `just --global-justfile --list` first
- All notes in `.org` format (org-mode syntax)
- Dotfiles managed with chezmoi — source at `~/para/areas/dev/gh/ak/dotfiles`

## Details

Full workflows and references in `~/.config/agents/`:

| File | Contents |
|------|----------|
| [`~/.config/agents/chezmoi.md`](~/.config/agents/chezmoi.md) | Dotfiles management, tracked files, chezmoi commands |
| [`~/.config/agents/note-taking.md`](~/.config/agents/note-taking.md) | `just` note commands, repo locations, agent-friendly sync |
| [`~/.config/agents/stream-journaling.md`](~/.config/agents/stream-journaling.md) | Stream journaling methodology and role |

## Context discipline

- Each distinct task gets its own session — do not chain unrelated work in one session
- Summarize tool outputs longer than 50 lines before continuing; never dump full output into context
- When reading files >200 lines, read only the relevant section
- If a tool call fails 2× in a row, stop and report rather than retry
- Research subagents return a ≤500-token summary, not raw findings, into the parent context

<!-- WAI:REFLECT:REF:START -->
## Accumulated Project Patterns

Project-specific conventions, gotchas, and architecture notes live in
`.wai/resources/reflections/`. Run `wai search "<topic>"` to retrieve relevant
context before starting research or creating tickets.

> **Before research or ticket creation**: always run `wai search "<topic>"` to
> check for known patterns. Do not rediscover what is already documented.
<!-- WAI:REFLECT:REF:END -->
