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

const { GObject, St, Meta } = imports.gi;

const ExtensionUtils = imports.misc.extensionUtils;
const Main = imports.ui.main;
const Me = ExtensionUtils.getCurrentExtension();
const { schemaId, settingsKeys, SettingsKeys } = Me.imports.preferences.keys;

const KeyboardShortcuts = Me.imports.keybinding.KeyboardShortcuts;
const Hook = Me.imports.hook.Hook;

const runSequence = Me.imports.utils.runSequence;
const runOneShot = Me.imports.utils.runOneShot;
const runLoop = Me.imports.utils.runLoop;
const beginTimer = Me.imports.utils.beginTimer;
const clearAllTimers = Me.imports.utils.clearAllTimers;
const getRunningTimers = Me.imports.utils.getRunningTimers;

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

    this._settings = ExtensionUtils.getSettings(schemaId);
    this._settingsKeys = SettingsKeys;

    SettingsKeys.connectSettings(this._settings, (name, value) => {
      let n = name.replace(/-/g, '_');
      this[n] = value;
    });
    Object.keys(SettingsKeys._keys).forEach((k) => {
      let key = SettingsKeys.getKey(k);
      let name = k.replace(/-/g, '_');
      this[name] = key.value;
    });

    this._addEvents();

    // startup
    this._hookWindows();
  }

  disable() {
    clearAllTimers();

    SettingsKeys.disconnectSettings();
    this._settings = null;

    this._removeEvents();
    this._releaseWindows();
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
      'notify::focus-window',
      this._onFocusWindow.bind(this),
      this
    );
  }

  _removeEvents() {
    global.stage.disconnectObject(this);
    global.display.disconnectObject(this);
  }

  _onFocusWindow(w, e) {
    // hook!
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

  _hookWindows() {
    this._windows = this._findWindows();
    this._windows.forEach((w) => {
      if (!w._hook) {
        w._hook = new Hook();
        w._hook.attach(w);
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
}

function init(meta) {
  return new Extension(meta.uuid);
}
