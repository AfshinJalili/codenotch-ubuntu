.PHONY: test package install smoke dev-link reload demo-assets
test:
	node --test tests/*.test.js
	python3 -m unittest discover -s tests -p 'test_*.py' -v
	glib-compile-schemas --strict schemas
	node --check extension.js
	node --check model.js
	node --check design.js
	node --check draw.js
	node --check glyphs.js
	node --check prefs.js
package:
	python3 scripts/package.py
install:
	python3 scripts/install.py
smoke:
	python3 scripts/smoke.py
demo-assets: smoke
	python3 scripts/export_demo_assets.py
dev-link:
	@rm -rf $(HOME)/.local/share/gnome-shell/extensions/codenotch@local
	@ln -sfn $(CURDIR) $(HOME)/.local/share/gnome-shell/extensions/codenotch@local
	glib-compile-schemas --strict schemas
	gnome-extensions enable codenotch@local
reload: dev-link
	gnome-extensions disable codenotch@local && gnome-extensions enable codenotch@local
	@test -f $(HOME)/.local/share/gnome-shell/extensions/codenotch@local/extension.js
	@grep -q '_onOverviewShowing' $(HOME)/.local/share/gnome-shell/extensions/codenotch@local/extension.js
