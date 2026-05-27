# env.nu - Nushell environment configuration
# Mirrors Bluefin's fish setup (ublue-brew.fish + config.fish)

# =============================================================================
# Homebrew (from /usr/share/fish/vendor_conf.d/ublue-brew.fish)
# =============================================================================

$env.HOMEBREW_PREFIX = "/home/linuxbrew/.linuxbrew"
$env.HOMEBREW_CELLAR = "/home/linuxbrew/.linuxbrew/Cellar"
$env.HOMEBREW_REPOSITORY = "/home/linuxbrew/.linuxbrew/Homebrew"

# Add Homebrew to PATH (must be done early so other tools are found)
$env.PATH = ($env.PATH | split row (char esep) 
    | prepend "/home/linuxbrew/.linuxbrew/sbin"
    | prepend "/home/linuxbrew/.linuxbrew/bin"
)

# =============================================================================
# Environment Variables (from config.fish)
# =============================================================================

$env.ZK_NOTEBOOK_DIR = $"($env.HOME)/dev/gh/sk/para/areas"
$env.EDITOR = "hx"
$env.JORNAL = $"($env.HOME)/para/areas/jornal"

# =============================================================================
# PATH additions
# =============================================================================

# .NET tools
$env.PATH = ($env.PATH | split row (char esep) | prepend $"($env.HOME)/.dotnet/tools")
$env.DOTNET_ROOT = $"($env.HOMEBREW_PREFIX)/opt/dotnet/libexec"

# rbenv shims (since rbenv doesn't support nushell natively)
$env.PATH = ($env.PATH | split row (char esep) | prepend $"($env.HOME)/.rbenv/shims")

# pixi
$env.PATH = ($env.PATH | split row (char esep) | prepend $"($env.HOME)/.pixi/bin")

# local bin
$env.PATH = ($env.PATH | split row (char esep) | prepend $"($env.HOME)/.local/bin")


$env.CARAPACE_BRIDGES = 'zsh,fish,bash,inshellisense' # optional
carapace _carapace nushell | save --force $"($nu.cache-dir)/carapace.nu"

# go
$env.PATH = ($env.PATH | split row (char esep) | prepend $"($env.HOME)/go/bin")

# Rust/Cargo
$env.PATH = ($env.PATH | split row (char esep) | prepend $"($env.HOME)/.rustup/toolchains/stable-x86_64-unknown-linux-gnu/bin" | prepend $"($env.HOME)/.cargo/bin")

# bun
$env.BUN_INSTALL = $"($env.HOME)/.bun"
$env.PATH = ($env.PATH | split row (char esep) | prepend $"($env.BUN_INSTALL)/bin")

# ROCm (AMD GPU) — unversioned .so symlinks live here; needed by AMDGPU.jl
$env.ROCM_PATH = $"($env.HOME)/.local/rocm"
