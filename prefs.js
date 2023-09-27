// loosely based on JustPerfection & Blur-My-Shell

import Gdk from 'gi://Gdk';
import Gtk from 'gi://Gtk';
import Gio from 'gi://Gio';

const GETTEXT_DOMAIN = 'custom-window-controls';

import { schemaId, SettingsKeys } from './preferences/keys.js';
import { PrefKeys } from './preferences/prefKeys.js';

import {
  ExtensionPreferences,
  gettext as _,
} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

import { pick, on_picking, on_picked } from './dbus/client.js';
const WINDOW_LIST_ID = 'window-list';

export default class Preferences extends ExtensionPreferences {
  constructor(metadata) {
    super(metadata);
    let iconTheme = Gtk.IconTheme.get_for_display(Gdk.Display.get_default());
    this.UIFolderPath = `${this.path}/ui`;
    iconTheme.add_search_path(`${this.UIFolderPath}/icons`);
    // ExtensionUtils.initTranslations(GETTEXT_DOMAIN);
  }

  _do_pick_window(builder, settings, remove_if_failed = false) {
    console.log('pick a window');
    // a mechanism to know if the extension is listening correcly
    let has_responded = false;
    let should_take_answer = true;

    // setTimeout((_) => {
    //   if (!has_responded) {
    //     console.log('picking failed!');
    //   }
    // }, 15);

    on_picking((_) => (has_responded = true));

    on_picked((wm_class) => {
      if (should_take_answer) {
        if (wm_class == 'window-not-found' || !wm_class) {
          console.log('not found');
          return;
        }
        if (this.windowListContains(settings, { wm_class })) {
          console.log('already exists');
          return;
        }
        let window_group = builder.get_object('windows-group');
        let pick_window = builder.get_object('pick-window');
        let data = this.addWindowRow(window_group, settings, wm_class);
        this.addToWindowList(window_group, settings, data);
      }
    });

    pick();
  }

  extractWindowList(settings) {
    let s = settings.get_string(WINDOW_LIST_ID) || '[]';
    let obj = [];
    try {
      obj = JSON.parse(s) || [];
      obj = obj
        .filter((i) => i != null)
        .map((i) => {
          if (typeof i === 'object') {
            return i;
          }
          return {
            wm_class: i,
          };
        });
    } catch (err) {
      obj = [];
    }
    if (obj == null) {
      obj = [];
    }
    return obj;
  }

  loadWindowList(builder, settings) {
    let window_group = builder.get_object('windows-group');
    let obj = this.extractWindowList(settings);
    obj.forEach((i) => {
      if (typeof i === 'string') {
        i = {
          wm_class: i,
        };
      }
      this.addWindowRow(window_group, settings, i);
    });
  }

  windowListContains(settings, data) {
    let obj = this.extractWindowList(settings);
    return obj.find((i) => {
      return i.wm_class == data.wm_class;
    });
  }

  addToWindowList(placeholder, settings, data) {
    console.log('add');
    let obj = this.extractWindowList(settings);
    let existing = false;
    obj.forEach((item) => {
      if (item.wm_class == data.wm_class) {
        existing = true;
        Object.keys(data).forEach((k) => {
          item[k] = data[k];
        });
      }
    });
    if (!existing) {
      obj.push(data);
    }
    console.log(obj);
    settings.set_string(WINDOW_LIST_ID, JSON.stringify(obj));
    return true;
  }

  removeFromWindowList(placeholder, settings, data) {
    console.log('remove');
    let obj = this.extractWindowList(settings);
    obj = obj.filter((i) => {
      return i.wm_class != data.wm_class;
    });
    settings.set_string(WINDOW_LIST_ID, JSON.stringify(obj));
  }

  addWindowRow(placeholder, settings, wm_class) {
    let builder = new Gtk.Builder();
    builder.add_from_file(`${this.UIFolderPath}/window-row.ui`);
    let row = builder.get_object('window-row-template');
    row._data = wm_class;
    if (typeof row._data === 'string') {
      row._data = {
        wm_class,
        'exclude-window': true,
        'close-button-only': false,
      };
    }

    if (!row._data.wm_class) return;
    row.title = row._data.wm_class;

    let prefKeys = new PrefKeys();
    prefKeys.setKeys({
      'exclude-window': {
        default_value: row._data['exclude-window'],
        widget_type: 'switch',
        callback: (v) => {
          row._data['exclude-window'] = v;
          this.addToWindowList(placeholder, settings, row._data);
        },
      },
      'close-button-only': {
        default_value: row._data['close-button-only'],
        widget_type: 'switch',
        callback: (v) => {
          row._data['close-button-only'] = v;
          this.addToWindowList(placeholder, settings, row._data);
        },
      },
    });
    prefKeys.connectBuilder(builder);

    let remove_button = builder.get_object('remove-window');
    remove_button.connect('clicked', () => {
      placeholder.remove(row);
      this.removeFromWindowList(placeholder, settings, row._data);
    });

    placeholder.add(row);
    return row._data;
  }

  addButtonEvents(window, builder, settings) {
    if (builder.get_object('pick-window')) {
      builder.get_object('pick-window').connect('clicked', () => {
        this._do_pick_window(builder, settings);
      });
    }
  }

  find(n, name) {
    if (n.get_name() == name) {
      return n;
    }
    let c = n.get_first_child();
    while (c) {
      let cn = this.find(c, name);
      if (cn) {
        return cn;
      }
      c = c.get_next_sibling();
    }
    return null;
  }

  dump(n, l) {
    let s = '';
    for (let i = 0; i < l; i++) {
      s += ' ';
    }
    print(`${s}${n.get_name()}`);
    let c = n.get_first_child();
    while (c) {
      this.dump(c, l + 1);
      c = c.get_next_sibling();
    }
  }

  addMenu(window, builder) {
    // let menu_util = builder.get_object('menu_util');
    // window.add(menu_util);

    // const page = builder.get_object('menu_util');
    // const pages_stack = page.get_parent(); // AdwViewStack
    // const content_stack = pages_stack.get_parent().get_parent(); // GtkStack
    // const preferences = content_stack.get_parent(); // GtkBox
    // const headerbar = preferences.get_first_child(); // AdwHeaderBar
    // headerbar.pack_start(builder.get_object('info_menu'));

    let headerbar = this.find(window, 'AdwHeaderBar');
    if (!headerbar) {
      return;
    }
    headerbar.pack_start(builder.get_object('info_menu'));
    
    // setup menu actions
    const actionGroup = new Gio.SimpleActionGroup();
    window.insert_action_group('prefs', actionGroup);

    // a list of actions with their associated link
    const actions = [
      {
        name: 'open-bug-report',
        link: 'https://github.com/icedman/custom-window-controls/issues',
      },
      {
        name: 'open-readme',
        link: 'https://github.com/icedman/custom-window-controls',
      },
      {
        name: 'open-license',
        link: 'https://github.com/icedman/custom-window-controls/blob/master/LICENSE',
      },
    ];

    actions.forEach((action) => {
      let act = new Gio.SimpleAction({ name: action.name });
      act.connect('activate', (_) =>
        Gtk.show_uri(window, action.link, Gdk.CURRENT_TIME)
      );
      actionGroup.add_action(act);
    });

    // window.remove(menu_util);
  }

  fillPreferencesWindow(window) {
    let builder = new Gtk.Builder();

    builder.add_from_file(`${this.UIFolderPath}/general.ui`);
    builder.add_from_file(`${this.UIFolderPath}/appearance.ui`);
    builder.add_from_file(`${this.UIFolderPath}/menu.ui`);
    window.add(builder.get_object('appearance'));
    window.add(builder.get_object('general'));
    window.set_search_enabled(true);

    let settings = this.getSettings(schemaId);
    let settingsKeys = SettingsKeys();
    settingsKeys.connectBuilder(builder);
    settingsKeys.connectSettings(settings);

    this.addButtonEvents(window, builder, settings);
    this.addMenu(window, builder);

    this.loadWindowList(builder, settings);
  }
}
