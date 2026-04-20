# Automatic Ptyxis tab color based on the current git repository.
#
# - Sends OSC 666 (vte.icon.color) for native tab color in future Ptyxis versions
# - Sets the tab title with a colored circle emoji so tabs are identifiable now
# - Same 8 colors as the fish version; the same repo always gets the same color

# Disable nushell's built-in OSC 2 title so our pre_prompt hook controls it fully
$env.config.shell_integration.osc2 = false

# Helper: map a git repo path to {emoji, color}
def _ptyxis_repo_info [repo_root: string] {
    # 8 Solarized accent colors (red orange yellow green blue violet cyan magenta)
    let emojis = ["🔴" "🟠" "🟡" "🟢" "🔵" "🟣" "🩵" "🩷"]
    let colors = ["#dc322f" "#cb4b16" "#b58900" "#859900" "#268bd2" "#6c71c4" "#2aa198" "#d33682"]

    let hash_str = ($repo_root | hash md5 | str substring 0..<2)
    let idx = (("0x" + $hash_str) | into int) mod 8

    {emoji: ($emojis | get $idx), color: ($colors | get $idx)}
}

# PWD hook: recompute emoji + send VTE termprop whenever the directory changes
$env.config.hooks.env_change.PWD = (
    $env.config.hooks.env_change.PWD? | default [] | append {||
        let git = (git rev-parse --show-toplevel | complete)

        if $git.exit_code != 0 {
            $env.PTYXIS_REPO_EMOJI = ""
            if (($env.VTE_VERSION? | default "") != "") {
                print --no-newline $"\u{1b}]666;vte.icon.color\u{1b}\\"
            }
            return
        }

        let info = (_ptyxis_repo_info ($git.stdout | str trim))
        $env.PTYXIS_REPO_EMOJI = $info.emoji

        if (($env.VTE_VERSION? | default "") != "") {
            print --no-newline $"\u{1b}]666;vte.icon.color=($info.color)\u{1b}\\"
        }
    }
)

# pre_prompt hook: update the tab title with the emoji prefix before each prompt
$env.config.hooks.pre_prompt = (
    $env.config.hooks.pre_prompt? | default [] | append {||
        let emoji = ($env.PTYXIS_REPO_EMOJI? | default "")
        let prefix = if ($emoji | is-empty) { "" } else { $"($emoji) " }
        let cwd = (pwd | str replace $env.HOME "~")
        print --no-newline $"\u{1b}]0;($prefix)($cwd)\u{1b}\\"
    }
)

# Initialize for the current directory on shell startup
do {
    let git = (git rev-parse --show-toplevel | complete)
    if $git.exit_code == 0 {
        let info = (_ptyxis_repo_info ($git.stdout | str trim))
        $env.PTYXIS_REPO_EMOJI = $info.emoji
        if (($env.VTE_VERSION? | default "") != "") {
            print --no-newline $"\u{1b}]666;vte.icon.color=($info.color)\u{1b}\\"
        }
    } else {
        $env.PTYXIS_REPO_EMOJI = ""
    }
}
