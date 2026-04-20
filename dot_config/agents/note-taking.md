# Note-Taking Workflows

**Always prefer `just` commands over custom shell scripts.**

Check available recipes before constructing shell commands:
```bash
just --global-justfile --list          # global commands
just --justfile <path>/justfile --list # repo-specific commands
```

## Commands

Run from anywhere as `just --global-justfile <cmd>` (alias: `jg <cmd>`):

| Command | Description |
|---------|-------------|
| `poo [TITULO]` | Pensamiento, Obra, Omisión |
| `jrn` | Daily journal entry |
| `lab [PROYECTO]` | Lab / project note |
| `til [TITULO]` | Today I Learned |
| `mch [TITULO]` | Machete (cheat sheet) |
| `exp [TITULO]` | Exploración |
| `tiw [TITULO]` | Things I Want |
| `ida [TITULO]` | Idea |

## Repositories & file locations

| Category | Repo | Directory |
|----------|------|-----------|
| `poo` | `la-vida-privada-de-los-pensamientos` | root |
| `jrn` / `lab` | `journal` | `YYYY/MM/DD.org` |
| `til` | `borradores` | `hoy-aprendi/` |
| `mch` | `borradores` | `machetes/` |
| `exp` | `borradores` | `exploraciones/` |
| `tiw` | `borradores` | `quiero/` |
| `ida` | `borradores` | `ideas/` |

All repos live under `~/para/areas/dev/gh/ak/`. All content files are `.org` (org-mode syntax).

## Agent-friendly sync (no interactive editor)

```bash
# Pipe content directly
echo "* Content here" | just --justfile ~/para/areas/dev/gh/ak/borradores/justfile note-stdin exp "My Title"

# Copy an existing file
just --justfile ~/para/areas/dev/gh/ak/borradores/justfile note-from-file exp /tmp/my-note.org "Title"

# Sync after writing a file directly
just --justfile ~/para/areas/dev/gh/ak/borradores/justfile sync "Add exploration: my-note"
```
