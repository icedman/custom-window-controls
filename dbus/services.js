// Lifted from from Blur-My-Shell

'use strict';

import Gio from 'gi://Gio';
import GLib from 'gi://GLib';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import {
  LookingGlass,
  Inspector,
} from 'resource:///org/gnome/shell/ui/lookingGlass.js';

const load_file = (path) => {
  const [, buffer] = GLib.file_get_contents(path);
  const contents = imports.byteArray.toString(buffer);
  GLib.free(buffer);
  return contents;
};

let iface = {};

export const ApplicationsService = class {
  constructor(path) {
    iface = load_file(path + '/dbus/iface.xml');
    this.DBusImpl = Gio.DBusExportedObject.wrapJSObject(iface, this);
  }

  /// Pick Window for Preferences Page, exported to DBus client.
  pick() {
    // emit `picking` signal to know we are listening
    const send_picking_signal = (_) =>
      this.DBusImpl.emit_signal('picking', null);

    // emit `picked` signal to send wm_class
    const send_picked_signal = (wm_class) =>
      this.DBusImpl.emit_signal('picked', new GLib.Variant('(s)', [wm_class]));

    // notify the preferences that we are listening
    send_picking_signal();

    // A very interesting way to pick a window:
    // 1. Open LookingGlass to mask all event handles of window
    // 2. Use inspector to pick window, thats is also lookingGlass do
    // 3. Close LookingGlass when done
    // It will restore event handles of window

    // open then hide LookingGlass
    const looking_glass = Main.createLookingGlass();
    looking_glass.open();
    looking_glass.hide();

    // inspect window now
    const inspector = new Inspector(Main.createLookingGlass());
    inspector.connect('target', (me, target, x, y) => {
      // remove border effect when window is picked.
      const effect_name = 'lookingGlass_RedBorderEffect';
      target
        .get_effects()
        .filter((e) => e.toString().includes(effect_name))
        .forEach((e) => target.remove_effect(e));

      // get wm_class_instance property of window, then pass it to DBus
      // client

      let actor = target;
      while (actor) {
        if (actor.toString().includes('WindowActor')) {
          break;
        }
        actor = actor.get_parent();
      }

      if (!actor) {
        return send_picked_signal('window-not-found');
      }

      // if (actor.toString().includes('MetaSurfaceActor')) actor = target.get_parent();
      // if (actor.toString().includes('ContainerActor')) actor = actor.get_parent();
      // if (actor.toString().includes('cwc-')) actor = actor.get_parent();
      // if (!actor.toString().includes('WindowActor'))
      //   return send_picked_signal('window-not-found');

      let wm_class_instance = actor.meta_window.get_wm_class_instance();
      let wm_class = actor.meta_window.get_wm_class();
      send_picked_signal(
        wm_class_instance || wm_class
          ? `${wm_class_instance}::${wm_class}`
          : 'window-not-found'
      );
    });

    // close LookingGlass when we're done
    inspector.connect('closed', (_) => looking_glass.close());
  }

  export() {
    this.DBusImpl.export(
      Gio.DBus.session,
      '/github/icedman/customWindowControls'
    );
  }

  unexport() {
    this.DBusImpl.unexport();
  }
};
