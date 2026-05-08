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
