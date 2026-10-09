# canticos — Personal CLI Tools

Source repo: `~/para/areas/dev/gh/charly/canticos` (bin/* symlinked into `~/.local/bin` via `./install`).

## terapia

Typed query CLI (nushell 0.116) over the Pi agent session corpus (`~/.pi/agent/sessions`).
Implements recommendation #2 of the toolpath autopsy report
(`~/para/areas/dev/gh/charly/pain/report.org`): stop writing bespoke
heredoc-python parsers over session JSONLs — one typed command instead.

```sh
terapia list [--project P] [--since D] [--until D]     # sessions as JSON (id, project, counts, errors)
terapia tools <session-id> [--tool T] [--errors-only]  # matched toolCall/toolResult pairs
terapia errors <session-id> | --all [--group-by class|tool|project|session]
terapia stats  <session-id> | --all                    # counts + error-class breakdown
terapia raw    <session-id> [--type T]                 # raw JSONL entries
```

- Session ids resolve by **prefix** across all projects (ambiguous → error listing matches).
- Error classes mirror the pain report taxonomy: `edit_mismatch`, `file_not_found`,
  `cli_flag_drift`, `lang_runtime`, `network`, `exit_nonzero`, `other`.
- Output: JSON on stdout; errors to stderr, exit 1.

### Cache

Incremental, per-file, mtime+size-keyed. Cache entries in `~/.cache/terapia/*.json`
(override: `TERAPIA_CACHE`). Cold full-corpus scan ~35s; cached ~1s. Changed
files are re-scanned automatically — safe for live/active sessions.

### Development

- Tests: `python3 ~/para/areas/dev/gh/charly/canticos/tests/test_terapia.py`
  (synthetic fixture via `TERAPIA_SESSIONS`/`TERAPIA_CACHE` env overrides; no real corpus needed).
- Syntax gate: canticos `lefthook.yml` runs `nu --ide-check` and greps diagnostics
  (`--ide-check` always exits 0, so severity must be grepped).

### Nushell gotchas (0.116)

- `else if` chains cannot break across lines in nu scripts — parse error "Command `else` not found".
- `$nu.home-dir` / `$nu.cache-dir` (the old `$nu.home-path` is gone).
- Parameter names cannot contain hyphens (`session-id` invalid; use `session_id`).
- `ls` with an interpolated glob string treats it literally — use the `glob` command.
- `reject -i` deprecated → `reject -o`; `str downcase` deprecated → `str lowercase`.
- `nu | nu` pipes can race (broken pipe) — verify output via file redirect.
