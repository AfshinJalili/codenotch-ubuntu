import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import Gtk from 'gi://Gtk';
import {ExtensionPreferences} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

export default class CodeNotchPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const settings = this.getSettings();
        window._settings = settings;
        const page = new Adw.PreferencesPage({title: 'CodeNotch', icon_name: 'utilities-system-monitor-symbolic'});
        window.add(page);
        const appearance = new Adw.PreferencesGroup({title: 'Placement', description: 'A quiet glance at your coding limits. Super+Shift+U opens the notch; Escape closes it.'});
        page.add(appearance);
        const edges = ['top', 'right', 'bottom', 'left'];
        const edge = new Adw.ComboRow({title: 'Screen edge', model: Gtk.StringList.new(['Top', 'Right', 'Bottom', 'Left']), selected: edges.indexOf(settings.get_string('edge'))});
        edge.connect('notify::selected', () => settings.set_string('edge', edges[edge.selected]));
        appearance.add(edge);
        const monitors = new Adw.SpinRow({title: 'Monitor', subtitle: '−1 follows the primary monitor; 0 is the first monitor.',
            adjustment: new Gtk.Adjustment({lower: -1, upper: 32, step_increment: 1, page_increment: 1}), digits: 0});
        settings.bind('monitor', monitors, 'value', Gio.SettingsBindFlags.DEFAULT);
        appearance.add(monitors);
        const addSwitch = (group, key, title, subtitle) => {
            const row = new Adw.SwitchRow({title, subtitle});
            settings.bind(key, row, 'active', Gio.SettingsBindFlags.DEFAULT);
            group.add(row);
        };
        addSwitch(appearance, 'always-show', 'Always show rings', 'Otherwise, hover over the small edge pill to unfold it.');
        const providers = new Adw.PreferencesGroup({title: 'Usage sources', description: 'Uses existing tool sign-ins. Turning a source off stops reads and removes its cached reading.'});
        page.add(providers);
        addSwitch(providers, 'claude', 'Claude Code', 'Reads the local Claude OAuth credential; run Claude to refresh an expired sign-in.');
        addSwitch(providers, 'cursor', 'Cursor', 'Reads the signed-in editor’s local session, without a second login.');
        addSwitch(providers, 'codex', 'Codex', 'Asks the local Codex app server; falls back to dated rollout readings.');
        const options = new Adw.PreferencesGroup({title: 'Refresh and preview'});
        page.add(options);
        const interval = new Adw.SpinRow({title: 'Refresh interval', subtitle: 'Seconds. Provider rate-limit backoff still applies.',
            adjustment: new Gtk.Adjustment({lower: 60, upper: 1800, step_increment: 60, page_increment: 300}), digits: 0});
        settings.bind('poll-seconds', interval, 'value', Gio.SettingsBindFlags.DEFAULT);
        options.add(interval);
        addSwitch(options, 'demo', 'Demo readings', 'Uses sample data. No accounts or network are read while enabled.');
        const limits = new Adw.PreferencesGroup({title: 'About this Ubuntu port', description: 'For Ubuntu 24.04 / GNOME 46. Codex activity is estimated from recent local writes. No automatic updates. Based on CodeNotch by Vinz (MIT).'});
        page.add(limits);
    }
}
