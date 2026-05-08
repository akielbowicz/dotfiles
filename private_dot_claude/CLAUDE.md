# Global Claude Instructions

- Prefer `just` commands over custom shell scripts
- All notes in `.org` format (org-mode syntax)
- Dotfiles managed with chezmoi — source at `~/para/areas/dev/gh/ak/dotfiles`

@~/.config/agents/chezmoi.md
@~/.config/agents/note-taking.md
@~/.config/agents/stream-journaling.md

## Context discipline

- Each distinct task gets its own session — do not chain unrelated work in one session
- Summarize tool outputs longer than 50 lines before continuing; never dump full output into context
- When reading files >200 lines, read only the relevant section
- If a bash command fails 2× in a row, stop and report rather than retry
- Research subagents return a ≤500-token summary, not raw findings, into the parent context
