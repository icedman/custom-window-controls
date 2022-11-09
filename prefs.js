// loosely based on JustPerfection & Blur-My-Shell

const { Adw, Gdk, GLib, Gtk, GObject, Gio, Pango } = imports.gi;
const Me = imports.misc.extensionUtils.getCurrentExtension();
const { SettingsKeys } = Me.imports.preferences.keys;
const UIFolderPath = Me.dir.get_child('ui').get_path();
const { pick, on_picking, on_picked } = Me.imports.dbus.client;

const GETTEXT_DOMAIN = 'custom-window-controls';
const Gettext = imports.gettext.domain('custom-window-controls');
const _ = Gettext.gettext;

const ExtensionUtils = imports.misc.extensionUtils;

const { schemaId, settingsKeys } = Me.imports.preferences.keys;
const { PrefKeys } = Me.imports.preferences.prefKeys;

function init() {
  let iconTheme = Gtk.IconTheme.get_for_display(Gdk.Display.get_default());
  iconTheme.add_search_path(`${UIFolderPath}/icons`);
  ExtensionUtils.initTranslations(GETTEXT_DOMAIN);
}

function _do_pick_window(builder, settings, remove_if_failed = false) {
  // a mechanism to know if the extension is listening correcly
  let has_responded = false;
  let should_take_answer = true;
  setTimeout((_) => {
    if (!has_responded) {
      log('picking failed!');
    }
  }, 15);

  on_picking((_) => (has_responded = true));

  on_picked((wm_class) => {
    if (should_take_answer) {
      if (wm_class == 'window-not-found' || !wm_class) {
        log('not found');
        return;
      }
      if (windowListContains(settings, { wm_class })) {
        log('already exists');
        return;
      }
      let window_group = builder.get_object('windows-group');
      let pick_window = builder.get_object('pick-window');
      let data = addWindowRow(window_group, settings, wm_class);
      addToWindowList(window_group, settings, data);
    }
  });

  pick();
}

const WINDOW_LIST_ID = 'window-list';

function extractWindowList(settings) {
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

function loadWindowList(builder, settings) {
  let window_group = builder.get_object('windows-group');
  let obj = extractWindowList(settings);
  obj.forEach((i) => {
    if (typeof i === 'string') {
      i = {
        wm_class: i,
      };
    }
    addWindowRow(window_group, settings, i);
  });
}

function windowListContains(settings, data) {
  let obj = extractWindowList(settings);
  return obj.find((i) => {
    return i.wm_class == data.wm_class;
  });
}
function addToWindowList(placeholder, settings, data) {
  log('add');
  let obj = extractWindowList(settings);
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
  log(obj);
  settings.set_string(WINDOW_LIST_ID, JSON.stringify(obj));
  return true;
}

function removeFromWindowList(placeholder, settings, data) {
  log('remove');
  let obj = extractWindowList(settings);
  obj = obj.filter((i) => {
    return i.wm_class != data.wm_class;
  });
  settings.set_string(WINDOW_LIST_ID, JSON.stringify(obj));
}

function addWindowRow(placeholder, settings, wm_class) {
  let builder = new Gtk.Builder();
  builder.add_from_file(`${UIFolderPath}/window-row.ui`);
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

  var prefKeys = new PrefKeys();
  prefKeys.setKeys({
    'exclude-window': {
      default_value: row._data['exclude-window'],
      widget_type: 'switch',
      callback: (v) => {
        row._data['exclude-window'] = v;
        addToWindowList(placeholder, settings, row._data);
      },
    },
    'close-button-only': {
      default_value: row._data['close-button-only'],
      widget_type: 'switch',
      callback: (v) => {
        row._data['close-button-only'] = v;
        addToWindowList(placeholder, settings, row._data);
      },
    },
  });
  prefKeys.connectBuilder(builder);

  let remove_button = builder.get_object('remove-window');
  remove_button.connect('clicked', () => {
    placeholder.remove(row);
    removeFromWindowList(placeholder, settings, row._data);
  });

  placeholder.add(row);
  return row._data;
}

function addButtonEvents(window, builder, settings) {
  if (builder.get_object('pick-window')) {
    builder.get_object('pick-window').connect('clicked', () => {
      _do_pick_window(builder, settings);
    });
  }
}

function addMenu(window, builder) {
  let menu_util = builder.get_object('menu_util');
  window.add(menu_util);

  const page = builder.get_object('menu_util');
  const pages_stack = page.get_parent(); // AdwViewStack
  const content_stack = pages_stack.get_parent().get_parent(); // GtkStack
  const preferences = content_stack.get_parent(); // GtkBox
  const headerbar = preferences.get_first_child(); // AdwHeaderBar
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

  window.remove(menu_util);
}

function fillPreferencesWindow(window) {
  let builder = new Gtk.Builder();

  builder.add_from_file(`${UIFolderPath}/general.ui`);
  builder.add_from_file(`${UIFolderPath}/appearance.ui`);
  builder.add_from_file(`${UIFolderPath}/menu.ui`);
  window.add(builder.get_object('general'));
  window.add(builder.get_object('appearance'));
  window.set_search_enabled(true);

  SettingsKeys.connectBuilder(builder);
  SettingsKeys.connectSettings(ExtensionUtils.getSettings(schemaId));

  let settings = ExtensionUtils.getSettings(schemaId);
  addButtonEvents(window, builder, settings);
  addMenu(window, builder);

  loadWindowList(builder, settings);
}
