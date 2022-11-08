/* extension.js
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 2 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

/* exported init */

const GETTEXT_DOMAIN = 'custom-window-controls';

const { GObject, St, Meta, Clutter, Gio } = imports.gi;

const ExtensionUtils = imports.misc.extensionUtils;
const Main = imports.ui.main;
const Me = ExtensionUtils.getCurrentExtension();
const { schemaId, settingsKeys, SettingsKeys } = Me.imports.preferences.keys;

const Hook = Me.imports.hook.Hook;

const runSequence = Me.imports.utils.runSequence;
const runOneShot = Me.imports.utils.runOneShot;
const runLoop = Me.imports.utils.runLoop;
const beginTimer = Me.imports.utils.beginTimer;
const clearAllTimers = Me.imports.utils.clearAllTimers;
const getRunningTimers = Me.imports.utils.getRunningTimers;
const ApplicationsService = Me.imports.dbus.services.ApplicationsService;

const _ = ExtensionUtils.gettext;

// some codes lifted from dash-to-dock intellihide
const handledWindowTypes = [
  Meta.WindowType.NORMAL,
  // Meta.WindowType.DOCK,
  Meta.WindowType.DIALOG,
  Meta.WindowType.MODAL_DIALOG,
  // Meta.WindowType.TOOLBAR,
  // Meta.WindowType.MENU,
  Meta.WindowType.UTILITY,
  // Meta.WindowType.SPLASHSCREEN
];

class Extension {
  constructor(uuid) {
    this._uuid = uuid;
    ExtensionUtils.initTranslations(GETTEXT_DOMAIN);
  }

  enable() {
    Main._customWindowControls = this;

    this.dbus = new ApplicationsService();
    this.dbus.export();

    this._gsettings = new Gio.Settings({
      schema_id: 'org.gnome.desktop.wm.preferences',
    });
    this._layout = this._gsettings.get_string('button-layout');

    this._settings = ExtensionUtils.getSettings(schemaId);
    this._settingsKeys = SettingsKeys;

    SettingsKeys.connectSettings(this._settings, (name, value) => {
      let n = name.replace(/-/g, '_');
      this[n] = value;

      switch (name) {
        case 'traffic-light-colors':
        case 'button-color':
        case 'control-button-style':
          this._updateButtonStyle();
          break;
        case 'button-layout':
          this._updateButtonLayout();
          break;
      }

      this._hookWindows();
    });
    Object.keys(SettingsKeys._keys).forEach((k) => {
      let key = SettingsKeys.getKey(k);
      let name = k.replace(/-/g, '_');
      this[name] = key.value;
      if (key.options) {
        this[`${name}_options`] = key.options;
      }
    });

    this._updateButtonLayout();
    this._updateButtonStyle();
    this._addEvents();

    // startup
    this._hookWindows();
  }

  disable() {
    clearAllTimers();

    this.dbus.unexport();
    this.dbus = null;

    this._gsettings.set_string('button-layout', this._layout || '');
    this._gsettings = null;

    SettingsKeys.disconnectSettings();
    this._settings = null;

    this._removeEvents();
    this._releaseWindows();
  }

  _updateButtonLayout() {
    if (this.button_layout != 0) {
      this.layout_right = this.button_layout == 2;
    } else {
      this.layout_right = this._layout.startsWith('appmenu');
    }
    this._gsettings.set_string(
      'button-layout',
      !this.layout_right
        ? 'close,minimize,maximize:appmenu'
        : 'appmenu:maximize,minimize,close'
    );
  }

  _updateButtonStyle() {
    this.button_style =
      this.control_button_style_options[this.control_button_style] || 'circle';
  }

  _addEvents() {
    Main.layoutManager.connectObject(
      'startup-complete',
      () => {
        this._hookWindows();
      },
      'monitors-changed',
      () => {
        this._hookWindows();
      },
      this
    );

    global.display.connectObject(
      'closing',
      () => {
        this._releaseWindows();
      },
      'window-created',
      (display, win) => {
        if (win && !win.get_wm_class_instance()) {
          const notify_id = win.connect('notify::wm-class', () => {
            this._hookWindows();
            win.disconnect(notify_id);
          });
        } else {
          this._hookWindows();
        }
      },
      // 'notify::focus-window',
      // () => {
      //   this._hookWindows();
      // },
      this
    );

    // global.stage.connectObject(
    //   'captured-event',
    //   this._handleEvent.bind(this),
    //   this
    // );
    Main.overview.connectObject(
      'showing',
      () => {
        this._setActiveHooks(false);
      },
      this
    );
    Main.overview.connectObject(
      'hidden',
      () => {
        this._setActiveHooks(true);
      },
      this
    );
  }

  _removeEvents() {
    global.stage.disconnectObject(this);
    global.display.disconnectObject(this);
  }

  _findWindows() {
    let actors = global.get_window_actors();
    let windows = actors.map((a) => {
      let w = a.get_meta_window();
      w._parent = a;
      return w;
    });
    windows = windows.filter((w) => w.get_window_type() in handledWindowTypes);
    windows = windows.filter((w) => w.can_close());
    return windows;
  }

  _findHookedWindows() {
    let hooked = this._findWindows();
    hooked.filter((w) => {
      return w._hook != null;
    });
    return hooked;
  }

  _setActiveHooks(t) {
    let windows = this._findHookedWindows();
    windows.forEach((w) => {
      w._hook.setActive(t);
    });
  }

  _hookWindows() {
    this._windows = this._findWindows();
    this._windows.forEach((w) => {
      if (!w._hook) {
        w._hook = new Hook();
        w._hook.extension = this;
        w._hook.attach(w);
      } else {
        w._hook.update();
      }
    });
  }

  _releaseWindows() {
    this._windows = this._findWindows();
    this._windows.forEach((w) => {
      if (w._hook) {
        w._hook.release();
        w._hook = null;
        delete w._hook;
      }
    });
  }

  // _handleEvent(actor, event) {
  //   if (event.type() == Clutter.EventType.BUTTON_PRESS ||
  //       event.type() == Clutter.EventType.TOUCH_BEGIN) {
  //       log(`${event.type()}`);
  //   }
  //   return Clutter.EVENT_PROPAGATE;
  // }
}

function init(meta) {
  return new Extension(meta.uuid);
}
