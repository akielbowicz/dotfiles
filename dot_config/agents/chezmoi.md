# Dotfiles & Configuration Management

Configurations are managed with **chezmoi**.

| | |
|---|---|
| Source repo | `~/para/areas/dev/gh/ak/dotfiles` |
| Symlink | `~/para/resources/dotfiles` |

## Common commands

```bash
chezmoi add <path>     # track a new file
chezmoi edit <path>    # edit source and apply
chezmoi apply          # apply source to home
chezmoi diff           # preview changes
chezmoi managed        # list tracked files
```

## Tracked files

| Source | Target |
|--------|--------|
| `AGENTS.md` | `~/AGENTS.md` |
| `private_dot_claude/CLAUDE.md` | `~/.claude/CLAUDE.md` |
| `private_dot_claude/settings.json` | `~/.claude/settings.json` |
| `private_dot_claude/statusline-command.sh` | `~/.claude/statusline-command.sh` |
| `dot_config/nushell/` | `~/.config/nushell/` |
| `dot_config/agents/` | `~/.config/agents/` |
| `Brewfile` | `~/Brewfile` |
| `run_once_install-packages.sh.tmpl` | runs `brew bundle` on first apply |
