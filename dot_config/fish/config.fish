if status is-interactive
    # Commands to run in interactive sessions can go here
    alias jg="just --global-justfile"
end
### bling.fish source start
test -f /usr/share/ublue-os/bluefin-cli/bling.fish && source /usr/share/ublue-os/bluefin-cli/bling.fish
### bling.fish source end

set -gx ZK_NOTEBOOK_DIR $HOME/dev/gh/sk/para/areas
set -gx EDITOR hx
set -gx JORNAL $HOME/para/areas/jornal
set -gx KAGGLE_API_TOKEN KGAT_38acc9ff0517553979641a10ed24891d

# bun
if test -d "$HOME/.bun/bin"
    set -gx BUN_INSTALL "$HOME/.bun"
    fish_add_path $BUN_INSTALL/bin
end

# Added by `rbenv init` on Thu Nov 28 10:51:04 PM -03 2024
status --is-interactive; and rbenv init - --no-rehash fish | source

source $HOME/.config/.env

goose term init fish | source
