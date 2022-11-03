const { St, Shell, Gio, GLib, Gtk, Meta, Clutter } = imports.gi;
const Main = imports.ui.main;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const ColorEffect = Me.imports.effects.color_effect.ColorEffect;

// settings = new Gio.Settings({ schema_id: 'org.gnome.desktop.wm.preferences' });
// layout = s.get_string('button-layout');

const BTN_COUNT = 3;

var Hook = class {
  attach(window) {
    this._window = window;

    let container = new St.Widget({ name: 'cwc-container' });
    this._window._parent.add_child(container);
    this._container = container;
    this._container.set_reactive(true);
    this._container.set_track_hover(true);

    this._createButtons(true);

    global.display.connectObject(
      'notify::focus-window',
      this._onFocusWindow.bind(this),
      'in-fullscreen-changed',
      this._onFullScreen.bind(this),
      this
    );

    window.connectObject(
      // 'position-changed',
      // this._reposition.bind(this),
      'size-changed',
      this._reposition.bind(this),
      this
    );

    window._parent.connectObject(
      // 'captured-event',
      // this._handleEvent.bind(this),
      'destroy',
      this.release.bind(this),
      this
    );

    this._effect = new ColorEffect({
      name: 'cwc-color',
      color: [1.0, 0.0, 1.0, 1.0],
      x1: 0.0,
      y1: 0.0,
      x2: 0.5,
      y2: 0.5,
    });

    window._parent.add_effect_with_name('cwc-color', this._effect);

    this._reposition();
  }

  release() {
    this._window._parent.remove_child(this._container);
    this._window._parent.disconnectObject(this);
    this._window.disconnectObject(this);
    this._window._parent.remove_effect_by_name('cwc-color');
  }

  _reposition() {
    let scale = St.ThemeContext.get_for_stage(global.stage).scale_factor;

    // compute
    let buffer_rect = this._window.get_buffer_rect();
    let frame_rect = this._window.get_frame_rect();

    let sx = frame_rect.x - buffer_rect.x;
    let sy = frame_rect.y - buffer_rect.y;

    let offset = [8 * scale, 6 * scale];
    let cw = 38 * BTN_COUNT * scale;
    let ch = 34 * scale;

    sx += offset[0];
    sy += offset[1];
    this._container.set_position(sx, sy);
    this._container.set_size(cw, ch);

    this._effect.x1 = sx / buffer_rect.width;
    this._effect.y1 = sy / buffer_rect.height;
    this._effect.x2 = (sx + cw + 6) / buffer_rect.width;
    this._effect.y2 = (sy + ch + 6) / buffer_rect.height;

    this._container.visible = !this._window.is_fullscreen();
  }

  _onFocusWindow(w, e) {}

  _onFullScreen() {}

  _createButtons(recreate) {
    let children = this._container.get_children();
    if (children.length) {
      if (!recreate) {
        return;
      }
      children.forEach((c) => {
        this._container.remove_child(c);
      });
    }

    let scale = St.ThemeContext.get_for_stage(global.stage).scale_factor;

    let padding = 8 * scale;
    let spacing = 12 * scale;
    let sx = padding;
    let sy = padding;
    for (let i = 0; i < BTN_COUNT; i++) {
      let sz = 15 * scale;
      let btn = new St.Button({ name: `cwc-btn-${i}` });
      this._container.add_child(btn);
      btn.set_size(sz, sz);
      btn.set_position(sx, sy);
      sx += sz + spacing;
      btn.connect('clicked', () => {
        this._onButtonClicked(i);
      });
    }
  }

  _onButtonClicked(id) {
    // log(`clicked ${id}`);
    switch (id) {
      case 0:
        this._window.delete(0);
        break;
      case 1:
        this._window.minimize();
        break;
      case 2:
        if (this._window.get_maximized() == 0) {
          this._window.maximize(Meta.MaximizeFlags.BOTH);
        } else {
          this._window.unmaximize(Meta.MaximizeFlags.BOTH);
        }
        break;
    }
  }
};
