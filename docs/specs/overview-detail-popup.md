# Spec: Overview detail popup must not stick

**Status:** fixed — user-confirmed 2026-09-06  
**Component:** `extension.js` — `_detail` chrome actor (`.codenotch-detail`)  
**Evidence:** [overview-detail-popup-2026-09-06.webm](../evidence/overview-detail-popup-2026-09-06.webm)

## Historical symptom

When the user opens GNOME Activities Overview (Super key), the usage **detail popup** stays visible over workspace thumbnails until the user hovers onto it and then off. Normal hover auto-collapse (300 ms) does not run while Overview is open.

The expanded ring pill (`_notch`) is not the primary report; the floating detail panel is.

## Reproduction

1. Install/enable `codenotch@local` on Ubuntu 24.04 / GNOME Shell 46 (Wayland).
2. Hover a provider ring (e.g. Codex at 100%) so the detail popup opens.
3. Press **Super** to enter Overview.
4. **Actual:** detail popup remains on screen over the workspace preview.
5. **Expected:** detail popup hides immediately and does not reappear until the user hovers a ring again after leaving Overview.
6. **Workaround observed:** hover onto the popup, then move off — the 300 ms `_hover()` timer finally hides it.

## Evidence summary (screencast)

| Time | Frame | What happens |
| --- | --- | --- |
| Start | Desktop | Codex detail popup open (Cx ring hovered) |
| Super | Overview | Workspace thumbnails visible; detail popup still on right |
| Exit / re-enter | Overview | Popup persists across Overview toggles |
| Hover on/off | Overview | Popup disappears only after mouse leave |

Extract frames locally:

```sh
gst-launch-1.0 -q filesrc location=docs/evidence/overview-detail-popup-2026-09-06.webm ! \
  decodebin ! videoconvert ! video/x-raw,format=RGB ! pngenc ! \
  multifilesink location=/tmp/cn-frame-%03d.png
```

## Root causes (confirmed during fix attempts)

### 1. False fix verification — broken `make dev-link`

`ln -sfn $(CURDIR) ~/.local/share/gnome-shell/extensions/codenotch@local` **does not replace** an existing directory. It created `codenotch@local/codenotch-ubuntu → repo` while GNOME kept loading a **stale copied** `extension.js`. All Overview fixes appeared to fail because the running extension was old code.

**Fix:** `make dev-link` must `rm -rf` the target directory before symlinking. `make reload` verifies `_onOverviewShowing` exists in the loaded file.

### 2. Overview detection race

`workareas-changed` → `_place()` can run **before** `Main.overview.visible` is true. Ring hover under a stationary cursor can call `_showDetail()` during the transition.

`showing-changed` with `visible === false` during animation previously called restore logic and undid hides.

### 3. Stuck hover blocks auto-collapse

When Overview guards returned early from `_hover()` **without** hiding, a detail panel with stale `hover === true` never hit the 300 ms collapse path. Hover-on-then-off was the only unblock — matching user reports.

### 4. `.hide()` alone is insufficient

`_detail` is a separate `Main.layoutManager.addChrome` actor above Overview. Hiding the actor may leave it pickable/visible during Overview; **`removeChrome()`** during Overview is required.

## Resolved behavior

User confirmed the reported bug is fixed on 2026-09-06. The following remain the regression checklist; this documentation update does not claim a new interactive test.

- Opening Overview hides the detail popup immediately.
- Detail popup does not reappear during Overview (including animation and workspace layout changes).
- Leaving Overview does not auto-reopen detail; user must hover/click a ring again.
- Overview settles hover/keyboard expansion to the configured `always-show` state; the closed handle stays attached to its edge.
- The installed symlink points to current repo code. A fresh GNOME session verifies that the running JavaScript is current.

## Implementation (current)

In `extension.js`:

| Mechanism | Role |
| --- | --- |
| `_ignoreHover` | Set on `Main.overview` `showing`, cleared on `hidden` |
| `_overviewActive()` | `_ignoreHover` OR `Main.actionMode & OVERVIEW` OR `visible` OR `visibleTarget` OR `animationInProgress` |
| `_hideDetail(true)` | `.hide()` + `removeChrome()` during Overview |
| `_mountDetail()` | Re-`addChrome()` only when `_showDetail()` runs outside Overview |
| `_onOverviewShowing/Hiding` | Force-hide detail; clear keyboard focus |
| Idle after `workareas-changed` | Safety hide once layout settles |

Follow Ubuntu Dock's three-signal pattern (`showing`, `hiding`, `hidden`), not `showing-changed` alone.

## Agent workflow

**Reload extension (Wayland — no logout):**

```sh
make reload
```

**Verify the installed source path (this does not verify the in-memory module):**

```sh
readlink ~/.local/share/gnome-shell/extensions/codenotch@local
grep -q _onOverviewShowing ~/.local/share/gnome-shell/extensions/codenotch@local/extension.js
```

**Manual test:** reproduce steps above after reload.

**Headless regression (isolated GNOME Shell, demo data):**

```sh
make smoke
```

The smoke suite exercises real Overview transitions, including popup dismissal, interrupted collapse, repeated transitions across four edges, and always-show mode. Physical multi-monitor behavior still requires an interactive check.

## Related files

- `extension.js` — `_detail`, `_showDetail`, `_hideDetail`, `_onOverviewShowing`
- `Makefile` — `dev-link`, `reload`
- `scripts/install.py` — copies zip to `~/.local/.../codenotch@local` (overwrites symlink; prefer `make reload` for dev)

## History

| Date | Note |
| --- | --- |
| 2026-09-06 | Bug reported with screencast; multiple fix attempts; root cause included stale deployed extension |
| 2026-09-06 | Spec written; evidence archived under `docs/evidence/` |
| 2026-09-06 | User confirmed the reported bug is fixed; closed the report |

## 2026-09-07: unstable handle and orphan settings control

The follow-up recording showed a settings button remaining visible beside a closed
handle after Overview, along with inconsistent handle placement during transitions.

GNOME Shell's `LayoutManager._updateActorVisibility()` explicitly sets `visible`
on every actor registered with `trackFullscreen: true`. Both Overview entry and
exit call this code. Consequently, calling `.hide()` on the independently tracked
settings button could not preserve the collapsed state. The headless reproduction
failed with `Closed handle must not leave an orphan settings button after Overview`.

The settings button now lives inside `_orbChrome`: Shell controls fullscreen
visibility on the wrapper, while the extension controls the child button's visibility.
Overview entry cancels expansion motion and settles to `always-show` immediately.
Placement continues during Overview and is refreshed on exit; popups remain blocked.
Popup content is destroyed while still on-stage before unmounting, so subsequent
theme updates cannot revisit detached labels.
The notch shortcut runs only in normal mode, and Overview focus is no longer cleared
unless it belongs to CodeNotch.

Regression coverage in `make smoke` checks the interrupted-collapse path, hidden
settings and popup actors during/after Overview, edge attachment on all four edges,
and preservation of always-show mode. This supplements the earlier popup-only test.

### Reload verification limitation

On GNOME Shell 46, `make reload` runs disable/enable, which reuses the existing
extension instance and cached ES modules. Even `ReloadExtension` imports the same
cached module URI. The symlink and source-marker checks prove which files are on
disk, not which JavaScript is executing. This was verified against the installed
Shell's `ui/extensionSystem.js` (`_callExtensionEnable`, `_callExtensionInit`, and
`reloadExtension`). On Wayland, logout/login is the reliable activation path for
these JavaScript changes. The agent did not log the user out.

The 2026-09-07 fix passed `make test` and `make smoke` in a fresh isolated GNOME
session. `make reload` was run on the desktop and the extension reported ACTIVE
with no reported extension errors; those facts alone do not establish fresh code.
