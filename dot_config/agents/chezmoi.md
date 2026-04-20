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
| `private_dot_claude/private_settings.json` | `~/.claude/settings.json` |
| `private_dot_claude/statusline-command.sh` | `~/.claude/statusline-command.sh` |
| `dot_config/nushell/` | `~/.config/nushell/` |
| `dot_config/agents/` | `~/.config/agents/` |
| `dot_config/atuin/config.toml` | `~/.config/atuin/config.toml` |
| `dot_config/helix/config.toml` | `~/.config/helix/config.toml` |
| `dot_config/starship.toml` | `~/.config/starship.toml` |
| `dot_gitconfig.tmpl` | `~/.gitconfig` |
| `dot_gitignore` | `~/.gitignore` |
| `dot_gitattributes_global` | `~/.gitattributes_global` |
| `dot_tmux.conf.tmpl` | `~/.tmux.conf` |
| `Brewfile` | `~/Brewfile` |
| `run_once_install-packages.sh.tmpl` | runs `brew bundle` on first apply |

## Not tracked (stays on machine only)

| Path | Reason |
|------|--------|
| `~/.config/git/private` | url rewrites + `includeIf` — would leak account names |
| `~/.config/git/profiles/` | per-account name/email |
| `~/.config/chezmoi/chezmoi.toml` | contains `[data]` with git identities |
