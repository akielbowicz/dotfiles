#!/usr/bin/env bash
# Claude Code status line

input=$(cat)

# DEBUG: dump raw payload
printf '%s\n' "$input" | jq '.' > /tmp/statusline-debug.json 2>/dev/null

cyan=$(printf '\033[36m')
blue=$(printf '\033[34m')
magenta=$(printf '\033[35m')
green=$(printf '\033[32m')
yellow=$(printf '\033[33m')
red=$(printf '\033[31m')
reset=$(printf '\033[0m')

# Batch all JSON extraction into one jq call (fix: 7 separate subprocesses → 1)
# Values are tab-separated; tabs in model names or paths are effectively impossible
_jq=$(printf '%s\n' "$input" | jq -r '
    (.model.display_name // "") + "\t" +
    (.workspace.current_dir // "") + "\t" +
    ((.context_window.used_percentage // "") | tostring) + "\t" +
    ((.context_window.current_usage.input_tokens // 0) | tostring) + "\t" +
    ((.context_window.current_usage.cache_creation_input_tokens // 0) | tostring) + "\t" +
    ((.context_window.current_usage.cache_read_input_tokens // 0) | tostring) + "\t" +
    ((.context_window.current_usage.output_tokens // 0) | tostring) + "\t" +
    ((.cost.total_cost_usd // "") | tostring) + "\t" +
    (.transcript_path // "") + "\t" +
    ((.context_window.context_window_size // 0) | tostring)
')
IFS=$'\t' read -r model cwd used_pct fresh cache_w cache_r out total_cost transcript_path ctx_size <<< "$_jq"

# Working directory basename
dir_name=$(basename "$cwd")

# Git branch
git_branch=""
if git -C "$cwd" rev-parse --git-dir > /dev/null 2>&1; then
    branch=$(git -C "$cwd" --no-optional-locks branch --show-current 2>/dev/null || echo "detached")
    [ -n "$branch" ] && git_branch=" on ${magenta}${branch}${reset}"
fi

# Token formatting helper (e.g. 26398 -> 26k)
fmt_tok() {
    local n=$1
    if [ "$n" -ge 1000 ]; then
        printf "%dk" $(( n / 1000 ))
    else
        printf "%d" "$n"
    fi
}

# Context usage with disaggregation and cache hit ratio
context_info=""
if [ -n "$used_pct" ] && [ "$used_pct" != "null" ] && [ "$used_pct" != "" ]; then
    used_int=$(printf "%.0f" "$used_pct")
    if [ "$used_int" -gt 40 ]; then
        ctx_color="$red"
    elif [ "$used_int" -gt 35 ]; then
        ctx_color="$yellow"
    else
        ctx_color="$green"
    fi

    total_in=$(( fresh + cache_w + cache_r ))
    if [ "$total_in" -gt 0 ]; then
        hit_pct=$(( cache_r * 100 / total_in ))
    else
        hit_pct=0
    fi

    context_info=" | ${ctx_color}ctx:${used_int}%${reset} i:$(fmt_tok $fresh) w:$(fmt_tok $cache_w) r:$(fmt_tok $cache_r) o:$(fmt_tok $out) ${cyan}hit:${hit_pct}%${reset}"
fi

# Session cost
cost_info=""
if [ -n "$total_cost" ] && [ "$total_cost" != "null" ] && [ "$total_cost" != "" ]; then
    cost_fmt=$(printf "%.3f" "$total_cost")
    cost_info=" | ${yellow}\$${cost_fmt}${reset}"
fi

# Context category breakdown parsed from transcript (shown on line 2)
category_line=""
if [ -n "$transcript_path" ] && [ "$transcript_path" != "null" ] && [ -f "$transcript_path" ]; then
    category_line=$(timeout 2 python3 - "$transcript_path" "$ctx_size" 2>/dev/null <<'PYEOF'
import json, sys, os
from collections import deque

path = sys.argv[1]
try:
    ctx_size = int(sys.argv[2]) if len(sys.argv) > 2 else 200000
except (ValueError, TypeError):
    ctx_size = 200000

# Safety: bail if file is missing or too large (>100MB)
try:
    size = os.path.getsize(path)
except OSError:
    sys.exit(0)
if size > 100 * 1024 * 1024:
    sys.exit(0)

# HEAD_LINES: full-parse only this many lines to find non-zero system baseline
# TAIL_KEEP:  keep this many recent lines to find last_usage without full parse cost
HEAD_LINES = 200
TAIL_KEEP  = 30

turns = 0
first_cache_creation = None
last_usage = None
recent = deque(maxlen=TAIL_KEEP)

def parse_line(raw):
    try:
        return json.loads(raw)
    except (json.JSONDecodeError, ValueError):
        return None

def to_int(v):
    try:
        return max(0, int(v or 0))
    except (TypeError, ValueError):
        return 0

try:
    with open(path, 'r', errors='replace') as f:
        for i, raw in enumerate(f):
            raw = raw.strip()
            if not raw:
                continue

            recent.append(raw)

            # Fast turn count: string match on top-level JSONL objects only
            if raw.startswith('{') and ('"type":"user"' in raw or '"type": "user"' in raw):
                turns += 1
                continue

            # Full-parse only early lines to find non-zero system overhead baseline
            if i < HEAD_LINES and first_cache_creation is None:
                if '"type":"assistant"' in raw or '"type": "assistant"' in raw:
                    entry = parse_line(raw)
                    if entry:
                        usage = entry.get('message', {}).get('usage')
                        if isinstance(usage, dict):
                            # Fix: skip 0 values (e.g. post-compaction) until we find real baseline
                            cc = to_int(usage.get('cache_creation_input_tokens'))
                            if cc > 0:
                                first_cache_creation = cc

    # Parse the recent tail to find the actual last assistant usage
    for raw in recent:
        if '"type":"assistant"' in raw or '"type": "assistant"' in raw:
            entry = parse_line(raw)
            if entry:
                usage = entry.get('message', {}).get('usage')
                if isinstance(usage, dict):
                    last_usage = usage  # keep overwriting → ends up as last

except OSError:
    sys.exit(0)
except Exception:
    sys.exit(0)

if not last_usage:
    sys.exit(0)

cache_r    = to_int(last_usage.get('cache_read_input_tokens'))
cache_w    = to_int(last_usage.get('cache_creation_input_tokens'))
fresh      = to_int(last_usage.get('input_tokens'))
sys_tok    = first_cache_creation or 0
total_used = cache_r + cache_w + fresh
msg_tok    = max(0, total_used - sys_tok)
free_tok   = max(0, ctx_size - total_used)
used_pct   = int(total_used * 100 / ctx_size) if ctx_size > 0 else 0

def fmt(n):
    return f"{n // 1000}k" if n >= 1000 else str(n)

CYAN   = '\033[36m'
YELLOW = '\033[33m'
RED    = '\033[31m'
WHITE  = '\033[97m'
DIM    = '\033[2m\033[37m'
RESET  = '\033[0m'

BAR_WIDTH  = 40
LIMIT_POS  = round(0.4 * BAR_WIDTH)  # 40% warning threshold marker

if ctx_size > 0:
    sys_w  = round(sys_tok / ctx_size * BAR_WIDTH)
    msg_w  = round(msg_tok / ctx_size * BAR_WIDTH)
    free_w = max(0, BAR_WIDTH - sys_w - msg_w)
else:
    sys_w = msg_w = 0
    free_w = BAR_WIDTH

# Build bar character by character so the limit marker sits at the right position
bar_parts = []
cur_color = ''
for pos in range(BAR_WIDTH):
    if pos == LIMIT_POS:
        bar_parts.append(RESET + WHITE + '\u254e' + RESET)  # ╎ limit marker
        cur_color = ''  # force color re-emit on next char
        continue
    if pos < sys_w:
        color, char = CYAN, '\u2588'
    elif pos < sys_w + msg_w:
        color, char = YELLOW, '\u2588'
    else:
        color, char = DIM, '\u2591'
    if color != cur_color:
        bar_parts.append(color)
        cur_color = color
    bar_parts.append(char)
bar = ''.join(bar_parts) + RESET

print(
    f"[{bar}] "
    f"{CYAN}sys{RESET}:~{fmt(sys_tok)} "
    f"{YELLOW}msgs{RESET}:~{fmt(msg_tok)} "
    f"{DIM}free{RESET}:{fmt(free_tok)} ({100 - used_pct}%) "
    f"turns:{turns}",
    end=''
)
PYEOF
    )
fi

printf "${blue}%s${reset} in ${cyan}%s${reset}%s%s%s" \
    "$model" "$dir_name" "$git_branch" "$context_info" "$cost_info"
if [ -n "$category_line" ]; then
    printf '\n%s' "$category_line"
fi
