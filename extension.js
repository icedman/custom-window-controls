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
 *
 */

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import Meta from 'gi://Meta';
import GLib from 'gi://GLib';
import Gio from 'gi://Gio';

import { Style } from './style.js';
import { Timer } from './timer.js';
import { Hook } from './hook.js';
import { ApplicationsService } from './dbus/services.js';

import { schemaId, SettingsKeys } from './preferences/keys.js';
import { initEffects } from './effects/color_effect.js';

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

import {
  Extension,
  gettext as _,
} from 'resource:///org/gnome/shell/extensions/extension.js';

export default class CustomWindowControlsExt extends Extension {
  enable() {
    initEffects(this.dir.get_path());


    this._style = new Style();

    this._hiTimer = new Timer();
    this._hiTimer.initialize(25);

    this.dbus = new ApplicationsService(this.dir.get_path());
    this.dbus.export();

    this._gsettings = new Gio.Settings({
      schema_id: 'org.gnome.desktop.wm.preferences',
    });
    this._layout = this._gsettings.get_string('button-layout');

    this._settings = this.getSettings(schemaId);
    this._settingsKeys = SettingsKeys();

    this._settingsKeys.connectSettings(this._settings, (name, value) => {
      let n = name.replace(/-/g, '_');
      this[n] = value;

      switch (name) {
        case 'traffic-light-colors':
        case 'button-color':
        case 'hovered-traffic-light-colors':
        case 'hovered-button-color':
        case 'unfocused-traffic-light-colors':
        case 'unfocused-button-color':
        case 'control-button-style':
          this._updateButtonStyle();
          break;
        case 'border-thickness':
        case 'border-color':
        case 'border-radius':
        case 'unfocused-border-color':
        case 'button-layout':
          this._updateButtonLayout();
          this._hookWindows(true);
          break;
        case 'enable-button-skin':
          this._releaseWindows();
          if (value) {
            this._hookWindows(true);
          }
          break;
      }

      this._hookWindows();
    });
    Object.keys(this._settingsKeys._keys).forEach((k) => {
      let key = this._settingsKeys.getKey(k);
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
    this._style = null;

    this._hiTimer.stop();
    this._hiTimer = null;

    this.dbus.unexport();
    this.dbus = null;

    this._gsettings.set_string('button-layout', this._layout || '');
    this._gsettings = null;

    this._settingsKeys.disconnectSettings();
    this._settingsKeys = null;
    this._settings = null;

    this._removeEvents();
    this._releaseWindows();

    this.button_style = null;
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

  _readFile(filename) {
    let input_file = Gio.file_new_for_path(filename);
    let size = input_file
      .query_info('standard::size', Gio.FileQueryInfoFlags.NONE, null)
      .get_size();
    let stream = input_file.open_readwrite(null).get_input_stream();
    let data = stream.read_bytes(size, null).get_data();
    stream.close(null);
    return data;
  }

  _writeFile(filename, content) {
    let fn = Gio.File.new_for_path(filename);
    const [, etag] = fn.replace_contents(
      content,
      null,
      false,
      Gio.FileCreateFlags.REPLACE_DESTINATION,
      null
    );
  }

  _updateButtonStyle() {
    this.button_style =
      this.control_button_style_options[this.control_button_style] || 'circle';

    // make dirs
    try {
      Gio.File.new_for_path('.config/gtk-3.0').make_directory_with_parents(
        null
      );
    } catch (err) {
      //
    }
    try {
      Gio.File.new_for_path('.config/gtk-4.0').make_directory_with_parents(
        null
      );
    } catch (err) {
      //
    }

    {
      let gtk3css = this._readFile(
        `${this.dir.get_path()}/ui/window-theme/gtk-3.0/gtk.css`
      );
      this._writeFile(`.config/gtk-3.0/gtk.css`, gtk3css);
      let gtk4css = this._readFile(
        `${this.dir.get_path()}/ui/window-theme/gtk-4.0/gtk.css`
      );
      this._writeFile(`.config/gtk-4.0/gtk.css`, gtk4css);
    }

    // ['circle', 'square', 'dash', 'vertical', 'slash', 'back_slash']
    let styles = ['dot', 'sq', 'rr', 'rr90', 'rr135', 'rr45'];
    let style = styles[this.control_button_style] || 'dot';

    let dot = String(
      this._readFile(`${this.dir.get_path()}/ui/window-theme/${style}.svg`)
    );
    let doth = String(
      this._readFile(`${this.dir.get_path()}/ui/window-theme/${style}h.svg`)
    );

    ['gtk-4.0', 'gtk-3.0'].forEach((gtk) => {
      let maxcolor = `rgba(0,250,0)`;
      let maxcolorh = `rgba(0,250,0)`;
      let mincolor = `rgba(255,245,0)`;
      let mincolorh = `rgba(255,245,0)`;
      let closecolor = `rgba(255,0,0)`;
      let closecolorh = `rgba(255,0,0)`;

      if (!this.traffic_light_colors) {
        maxcolor = `rgba(${this._style.rgba(this.button_color)})`;
        mincolor = `rgba(${this._style.rgba(this.button_color)})`;
        closecolor = `rgba(${this._style.rgba(this.button_color)})`;
      }

      if (!this.hovered_traffic_light_colors) {
        maxcolorh = `rgba(${this._style.rgba(this.hovered_button_color)})`;
        mincolorh = `rgba(${this._style.rgba(this.hovered_button_color)})`;
        closecolorh = `rgba(${this._style.rgba(this.hovered_button_color)})`;
      }

      // max
      {
        let dotcolored = dot.replace('fill="#ffffff"', `fill="${maxcolor}"`);
        let dotcoloredh = doth.replace('fill="#ffffff"', `fill="${maxcolorh}"`);
        this._writeFile(`.config/${gtk}/max.svg`, dotcolored);
        this._writeFile(`.config/${gtk}/maxh.svg`, dotcoloredh);
      }

      // min
      {
        let dotcolored = dot.replace('fill="#ffffff"', `fill="${mincolor}"`);
        let dotcoloredh = doth.replace('fill="#ffffff"', `fill="${mincolorh}"`);
        this._writeFile(`.config/${gtk}/min.svg`, dotcolored);
        this._writeFile(`.config/${gtk}/minh.svg`, dotcoloredh);
      }

      // close
      {
        let dotcolored = dot.replace('fill="#ffffff"', `fill="${closecolor}"`);
        let dotcoloredh = doth.replace(
          'fill="#ffffff"',
          `fill="${closecolorh}"`
        );
        this._writeFile(`.config/${gtk}/close.svg`, dotcolored);
        this._writeFile(`.config/${gtk}/closeh.svg`, dotcoloredh);
      }
    });
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
    Main.overview.disconnectObject(this);
    Main.layoutManager.disconnectObject(this);
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
      if (w._hook) {
        w._hook.setActive(t);
      }
    });
  }

  _hookWindows(force) {
    // if (!this.enable_button_skin) {
    //   return;
    // }
    // this._windows = this._findWindows();
    // this._windows.forEach((w) => {
    //   if (!w._hook) {
    //     w._hook = new Hook();
    //     w._hook.extension = this;
    //     w._hook.attach(w);
    //   } else {
    //     w._hook.update(force);
    //   }
    // });
  }

  _releaseWindows() {
    // this._windows = this._findWindows();
    // this._windows.forEach((w) => {
    //   if (w._hook) {
    //     w._hook.release();
    //     w._hook = null;
    //     delete w._hook;
    //   }
    // });
    // this._windows = null;
  }
}
