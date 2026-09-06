# CodeNotch for Ubuntu

A small black screen-edge pill showing **Claude Code, Cursor, and Codex usage limits**. Hover to unfold the rings, then hover or click a ring for its usage windows, reset times, and reading age. A native GNOME Shell extension keeps placement working on Wayland and X11.

Built for **Ubuntu 24.04 / GNOME Shell 46**. This is an independent MIT-licensed port of [Vinz’s macOS CodeNotch](https://github.com/vinzdg/codenotch), based on upstream commit `01e363a5d90ef76611d43b4fa8ab4686767cb210`. It is not an upstream Linux release.

## Install

Requires Python 3, GNOME Shell 46, and `glib-compile-schemas` (normally present on Ubuntu Desktop). Building/testing also uses Node.js; running the extension does not.

```sh
make install
```

**Log out and back in**, then:

```sh
gnome-extensions enable codenotch@local
gnome-extensions prefs codenotch@local
```

The installer writes only to your user data directory and backs up an existing CodeNotch installation under `~/.local/share/codenotch/backups/`. It does not restart GNOME or enable the extension in your current session.

To build a shareable zip instead, run `make package`. The result is `dist/codenotch@local.shell-extension.zip`.

## Use

- Hover over the narrow pill at the right edge to expand it.
- Hover or click a ring to see details; **Refresh** requests a new reading.
- Click the gear for settings. Choose any edge, a monitor, and whether rings stay expanded.
- **Super+Shift+U** opens and focuses the notch. Tab moves through buttons; Escape closes it.
- Enable **Demo readings** to preview without reading credentials or accessing the network.
- Disable a provider to stop reading it and remove its cached reading.
- An inner moving arc means activity; amber means a session is waiting for you. Hover for session names and details. Codex activity is an explicitly labeled estimate from recent local writes.

Percentages mean **used**, not remaining. A dash means there is no reading; it never stands in for 0%. Dim rings and dated details identify stale readings. An elapsed reset time does not manufacture a fresh allowance.

## Data sources

| Provider | Source |
| --- | --- |
| Claude Code | `~/.claude/.credentials.json` (or `CLAUDE_CONFIG_DIR`), then Claude’s OAuth usage endpoint. Claude owns token refresh. |
| Cursor | `$XDG_CONFIG_HOME/Cursor/User/globalStorage/state.vscdb` (default `~/.config`), opened read-only with WAL support, then Cursor’s usage-summary endpoint. |
| Codex | Local `codex app-server` rate-limit request, with dated local rollout fallback under `CODEX_HOME` (default `~/.codex`). |

The helper never signs in, refreshes credentials, or writes to another tool’s files. Requests go to the owning vendor, without following redirects. Sanitized usage cache and rate-limit backoff live under `$XDG_CACHE_HOME/codenotch` (default `~/.cache/codenotch`), with private permissions. Tokens are not cached by CodeNotch or printed. Provider endpoints are internal interfaces and can change.

GNOME inherits your login environment, which may differ from your terminal. The reader checks `PATH`, `~/.local/bin/codex`, and standard `~/.nvm/versions/node` installations. It includes the selected binary’s directory in the child’s `PATH` so npm installs can find their sibling Node executable. For other locations, set `CODENOTCH_CODEX_BIN` in the login environment. Environment overrides must be present when GNOME starts.

## Scope

This port covers usage rings, hover details, four-edge placement, monitor selection, provider controls, polling, stale states, rate-limit backoff, local session activity, and demo mode. It does **not** include multi-profile accounts or an automatic updater. Antigravity is intentionally excluded. Other desktop environments and GNOME versions are not supported by this package.

Activity is read locally every three seconds, separately from slower quota polling. Claude session files and Cursor composer metadata provide explicit states where available. Codex recent-write activity is only a heuristic; lack of recent writes does not prove a turn finished. Unsupported or missing session metadata displays no detected activity. No hooks are injected into your tools.

## Verify and troubleshoot

```sh
make test                         # fixtures only; no account reads
make smoke                        # isolated headless GNOME, demo only
python3 reader/codenotch_reader.py --providers codex,claude,cursor --demo
gnome-extensions info codenotch@local
journalctl --user -b -o cat | rg -i codenotch
```

`make smoke` requires a working GNOME 46 headless renderer. It uses a separate D-Bus session, temporary configuration, and demo readings; it does not enable anything in the running desktop. Screenshots and results go in `.smoke/`.

The Overview detail-popup bug is **fixed** (user-confirmed 2026-09-06). Historical diagnosis and screencast — [docs/specs/overview-detail-popup.md](docs/specs/overview-detail-popup.md). Reload after edits: `make reload`.

For an expired credential, open the owning tool and use it normally, then refresh. For an unavailable reader, check `/usr/bin/python3`. Network failures preserve the last good reading as stale. Refresh does not bypass rate-limit backoff.

To disable:

```sh
gnome-extensions disable codenotch@local
```

To remove after disabling, move `~/.local/share/gnome-shell/extensions/codenotch@local` to Trash. The optional usage cache is `~/.cache/codenotch`; settings can be reset with `dconf reset -f /org/gnome/shell/extensions/codenotch/`.
