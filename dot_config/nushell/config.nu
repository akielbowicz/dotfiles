# config.nu - Nushell configuration
# Mirrors Bluefin's fish/bling.fish setup

# =============================================================================
# Aliases (from bling.fish)
# =============================================================================

# eza aliases (ls replacement)
alias ll = eza -l --icons=auto --group-directories-first
alias l. = eza -d .*
# alias ls = eza
alias l1 = eza -1

# ugrep aliases (grep replacement)
alias grep = ug
alias egrep = ug -E
alias fgrep = ug -F
alias xzgrep = ug -z
alias xzegrep = ug -zE
alias xzfgrep = ug -zF

# bat for cat
alias cat = bat --style=plain --pager=never

# Custom aliases (from your config.fish)
alias jg = just --global-justfile

# =============================================================================
# Tool Initializations
# =============================================================================

# Zoxide (smarter cd)
source ~/.zoxide.nu

# Atuin (shell history)
source ~/.cache/nushell/atuin.nu

# Starship is auto-loaded from vendor/autoload

# =============================================================================
# rbenv (Ruby version manager)
# =============================================================================
# Note: rbenv doesn't have native nushell support
# Add shims to PATH in env.nu instead

# =============================================================================
# Settings
# =============================================================================

$env.config.show_banner = false

source "~/.cache/nushell/carapace.nu"

# Ptyxis tab color based on git repository
source "~/.config/nushell/ptyxis_tab_color.nu"

# =============================================================================
# GitHub CLI auto-auth per directory (account mappings in private.nu)
# =============================================================================

source "~/.config/nushell/private.nu"