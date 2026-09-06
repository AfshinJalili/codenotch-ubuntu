#!/usr/bin/env python3
"""Exercise the real extension in an isolated GNOME Shell with demo data."""
import json
import os
from pathlib import Path
import shutil
import signal
import subprocess
import tempfile
import time

ROOT = Path(__file__).resolve().parent.parent
OUTPUT = ROOT / '.smoke'
OUTPUT.mkdir(exist_ok=True)
report = OUTPUT / 'result.json'
report.unlink(missing_ok=True)
(OUTPUT / 'prefs.json').unlink(missing_ok=True)
subprocess.run(['glib-compile-schemas', '--strict', str(ROOT / 'schemas')], check=True)
with tempfile.TemporaryDirectory(prefix='codenotch-smoke-') as folder:
    base = Path(folder)
    extension = base / 'data/gnome-shell/extensions/codenotch@local'
    extension.mkdir(parents=True)
    for name in ['metadata.json', 'extension.js', 'model.js', 'design.js', 'draw.js', 'glyphs.js',
                 'prefs.js', 'stylesheet.css']:
        shutil.copy2(ROOT / name, extension / name)
    for name in ['reader', 'schemas']:
        shutil.copytree(ROOT / name, extension / name)
    shutil.copy2(ROOT / 'tests/prefs-smoke.js', extension / 'prefs-smoke.js')
    (extension / 'extension.js').rename(extension / 'implementation.js')
    (extension / 'extension.js').write_text('''
import CodeNotch from './implementation.js';
import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
import Shell from 'gi://Shell';
import Clutter from 'gi://Clutter';
import St from 'gi://St';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
const output = GLib.getenv('CODENOTCH_SMOKE_OUTPUT');
const delay = ms => new Promise(resolve => GLib.timeout_add(GLib.PRIORITY_DEFAULT, ms, () => { resolve(); return GLib.SOURCE_REMOVE; }));
const assert = (value, message) => { if (!value) throw new Error(message); };
export default class Smoke extends CodeNotch {
    enable() {
        this.getSettings().set_boolean('demo', true);
        this.getSettings().set_boolean('always-show', true);
        super.enable();
        this.runSmoke().catch(error => GLib.file_set_contents(`${output}/result.json`, JSON.stringify({ok:false,error:String(error),stack:error.stack})));
    }
    async runSmoke() {
        await delay(2200);
        Main.overview.hide();
        await delay(700);
        assert(this._readings.length === 3, 'Three providers must render');
        assert(this._readings.every(p => p.windows.length && p.status === 'ok'), 'Demo readings must succeed');
        assert(this._activities.length === 3, 'Activity demo reader succeeds');
        this._keyboardOpen = true;
        const buttons = this._stack.get_children().map(c => c.get_first_child()).filter(Boolean);
        buttons[0].grab_key_focus();
        this._key({get_key_symbol: () => Clutter.KEY_Tab, get_state: () => 0});
        assert(global.stage.get_key_focus() === buttons[1], 'Tab moves between providers');
        this._keyboardOpen = false;
        const placements = [];
        for (const edge of ['right', 'top', 'left', 'bottom']) {
            this._settings.set_string('edge', edge);
            await delay(600);
            this._showDetail('claude');
            await delay(200);
            const a = this._area();
            assert(this._host.width > 10 && this._host.height > 10, 'Notch has size');
            assert(this._host.x >= a.x && this._host.y >= a.y, 'Notch begins inside work area');
            assert(this._host.x + this._host.width <= a.x + a.width + 1, 'Notch fits horizontally');
            assert(this._host.y + this._host.height <= a.y + a.height + 1, 'Notch fits vertically');
            const wrap = this._detail.get_first_child();
            const card = wrap.get_children().find(child => child.has_style_class_name('codenotch-detail'));
            const tail = wrap.get_children().find(child => child !== card);
            assert(tail.width <= 24 && tail.height <= 24, 'Tooltip pointer must not stretch with its card');
            const actions = card.get_last_child();
            assert(actions.y + actions.height <= card.height - 12, 'Actions remain inside card padding');
            for (const child of card.get_children())
                assert(child.x >= 12 && child.x + child.width <= card.width - 12, 'Card content respects horizontal padding');
            assert(this._focusTargets().includes(actions.get_first_child()), 'Card actions remain keyboard accessible');
            if (edge === 'top') assert(tail.y < card.y, 'Top-edge pointer faces the notch');
            if (edge === 'bottom') assert(tail.y > card.y, 'Bottom-edge pointer faces the notch');
            placements.push({edge, x:this._host.x,y:this._host.y,width:this._host.width,height:this._host.height});
            if (['right', 'top', 'left', 'bottom'].includes(edge)) {
                const stream = Gio.File.new_for_path(`${output}/${edge}.png`).replace(null, false, Gio.FileCreateFlags.NONE, null);
                const shot = new Shell.Screenshot();
                await new Promise((resolve,reject) => shot.screenshot(false, stream, (object,result) => {
                    try { object.screenshot_finish(result); stream.close(null); resolve(); } catch(error) { reject(error); }
                }));
            }
        }
        this._settings.set_string('edge', 'right');
        await delay(400);
        this._showDetail('claude');
        await delay(250);
        for (const provider of ['claude', 'cursor', 'codex']) {
            this._showDetail(provider);
            await delay(220);
            const card = this._detail.get_first_child().get_children().find(child => child.has_style_class_name('codenotch-detail'));
            const actions = card.get_last_child();
            assert(Math.abs(card.height - actions.y - actions.height - 16) <= 1, `${provider}: consistent 16px footer inset, got ${card.height - actions.y - actions.height} (${card.height}, ${actions.y}, ${actions.height})`);
            const stream = Gio.File.new_for_path(`${output}/${provider}-card.png`).replace(null, false, Gio.FileCreateFlags.NONE, null);
            const shot = new Shell.Screenshot();
            await new Promise((resolve, reject) => shot.screenshot(false, stream, (object, result) => {
                try { object.screenshot_finish(result); stream.close(null); resolve(); } catch (error) { reject(error); }
            }));
        }
        this._showDetail('claude');
        await delay(250);
        const originalY = this._detail.y;
        this._showDetail('cursor');
        await delay(40);
        this._showDetail('codex');
        await delay(260);
        assert(this._selected === 'codex' && this._detail.visible, 'Rapid switching selects latest provider');
        assert(this._detail.y !== originalY, 'Popup follows selected provider');
        assert(this._detail.translation_x === 0 && this._detail.translation_y === 0, 'Popup motion settles');
        const interfaceSettings = new Gio.Settings({schema_id: 'org.gnome.desktop.interface'});
        const animations = interfaceSettings.get_boolean('enable-animations');
        interfaceSettings.set_boolean('enable-animations', false);
        await delay(100);
        assert(!St.Settings.get().enable_animations, 'GNOME reduced motion setting propagates');
        this._showDetail('claude');
        await delay(60);
        assert(this._detail.translation_x === 0 && this._detail.translation_y === 0, 'Reduced motion places popup immediately');
        interfaceSettings.set_boolean('enable-animations', animations);
        await delay(100);
        this._showDetail('cursor');
        Main.overview.show();
        await delay(100);
        assert(!this._detail.visible && !this._detailMounted, 'Overview cancels and unmounts moving popup');
        assert(this._detail.get_n_children() === 0, 'Overview releases detached popup content');
        this._showDetail('codex');
        assert(!this._detail.visible, 'Overview blocks reopening');
        Main.overview.hide();
        await delay(600);
        assert(!this._detail.visible, 'Leaving Overview does not reopen popup');
        this._settings.set_string('edge', 'bottom');
        this._settings.set_boolean('cursor', false);
        await delay(600);
        assert(this._readings.length === 2 && !this._readings.some(p => p.id === 'cursor'), 'Disabled provider disappears');
        this._settings.set_boolean('always-show', false);
        await delay(500);
        assert(this._host.height <= 12, 'Bottom pill collapses');
        // Reproduce the video: collapse while entering Overview, then return.
        this._settings.set_string('edge', 'right');
        this._expanded = true;
        this._expandT = this._expandTarget = 1;
        this._render();
        await delay(100);
        this._expanded = false;
        this._expandTarget = 0;
        this._animateMotion();
        Main.overview.show();
        await delay(100);
        assert(!this._motionTimer && this._expandT === 0, 'Overview settles transient expansion and cancels motion');
        assert(!this._orb.visible, 'Overview must not revive the collapsed settings button');
        const overviewArea = this._area();
        assert(Math.abs(this._host.x + this._host.width - overviewArea.x - overviewArea.width) <= 1,
            'Collapsed handle stays attached to the edge during Overview');
        await delay(550);
        Main.overview.hide();
        await delay(650);
        const area = this._area();
        assert(Math.abs(this._host.x + this._host.width - area.x - area.width) <= 1,
            `Collapsed handle must return to screen edge: x=${this._host.x}, width=${this._host.width}, edge=${area.x + area.width}`);
        assert(!this._orb.visible, 'Closed handle must not leave an orphan settings button after Overview');
        // Visibility updates recur on every Overview cycle, even without a render.
        for (const edge of ['right', 'top', 'left', 'bottom']) {
            this._settings.set_string('edge', edge);
            await delay(100);
            Main.overview.show();
            await delay(350);
            assert(!this._orb.visible && !this._detail.visible, `${edge}: no orphan controls in Overview`);
            Main.overview.hide();
            await delay(400);
            const a = this._area();
            const h = this._host;
            const attached = edge === 'right' ? Math.abs(h.x + h.width - a.x - a.width) :
                edge === 'left' ? Math.abs(h.x - a.x) :
                edge === 'top' ? Math.abs(h.y - a.y) : Math.abs(h.y + h.height - a.y - a.height);
            assert(attached <= 1 && !this._orb.visible, `${edge}: closed handle stays attached after Overview`);
        }
        this._settings.set_boolean('always-show', true);
        await delay(500);
        Main.overview.show();
        await delay(350);
        assert(this._expanded && this._expandT === 1 && this._orb.visible, 'Overview preserves always-show mode');
        Main.overview.hide();
        await delay(400);
        assert(this._orb.visible && !this._detail.visible, 'Always-show restores without reopening a popup');
        const prefs = Gio.Subprocess.new(['/usr/bin/gjs', '-m', `${this.path}/prefs-smoke.js`, this.path], Gio.SubprocessFlags.NONE);
        await new Promise((resolve, reject) => prefs.wait_check_async(null, (p, result) => {
            try { p.wait_check_finish(result); resolve(); } catch (error) { reject(error); }
        }));
        assert(GLib.file_test(`${output}/prefs.json`, GLib.FileTest.EXISTS), 'Preferences constructed and presented');
        super.disable();
        assert(!this._poll && !this._activityPoll && !this._animation && !this._process && !this._activityProcess && !this._host, 'Disable releases owned resources');
        super.enable();
        await delay(600);
        assert(this._readings.length === 2, 'Re-enable works');
        super.disable();
        GLib.file_set_contents(`${output}/result.json`, JSON.stringify({ok:true, placements, checks:['demo reader','four edges','tooltip','rapid popup switching','reduced motion','Overview dismissal','Overview collapse race','Overview visibility across four edges','always-show Overview','provider disable','collapse','preferences window','disable','re-enable']}));
    }
}
''')
    env = dict(os.environ, XDG_DATA_HOME=str(base / 'data'), XDG_CONFIG_HOME=str(base / 'config'),
               XDG_CACHE_HOME=str(base / 'cache'), GSETTINGS_BACKEND='keyfile',
               CODENOTCH_SMOKE_OUTPUT=str(OUTPUT), GNOME_SHELL_SESSION_MODE='user',
               NO_AT_BRIDGE='1')
    # Isolated keyfile settings, never the user's dconf database.
    subprocess.run(['gsettings', 'set', 'org.gnome.shell', 'enabled-extensions', "['codenotch@local']"], env=env, check=True)
    subprocess.run(['gsettings', 'set', 'org.gnome.shell', 'disable-user-extensions', 'false'], env=env, check=True)
    with (OUTPUT / 'shell.log').open('w') as log:
        process = subprocess.Popen(['dbus-run-session', '--', 'gnome-shell', '--headless', '--wayland', '--no-x11',
                                    '--virtual-monitor', '1280x800'], env=env, stdout=log, stderr=log, start_new_session=True)
        try:
            deadline = time.monotonic() + 40
            while time.monotonic() < deadline and process.poll() is None and not report.exists():
                time.sleep(0.25)
        finally:
            try:
                os.killpg(process.pid, signal.SIGTERM)
            except ProcessLookupError:
                pass
            try:
                process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                os.killpg(process.pid, signal.SIGKILL)
                process.wait()
    if not report.exists():
        raise SystemExit(f'Smoke did not finish. See {OUTPUT / "shell.log"}')
    result = json.loads(report.read_text())
    print(json.dumps(result, indent=2))
    if not result.get('ok'):
        raise SystemExit(1)
