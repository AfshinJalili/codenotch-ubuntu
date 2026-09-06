# Agent notes

## Overview detail popup bug

When fixing GNOME Overview interaction, stale-deploy, or hover-stuck detail panel behavior, read:

**[docs/specs/overview-detail-popup.md](docs/specs/overview-detail-popup.md)**

Screencast evidence: [docs/evidence/overview-detail-popup-2026-09-06.webm](docs/evidence/overview-detail-popup-2026-09-06.webm)

Reload the extension after `extension.js` edits (Wayland — no logout):

```sh
make reload
```

Do not trust `make dev-link` unless `codenotch@local` is a symlink to this repo (not a directory containing a nested symlink).
