const { St, Shell, Gio, GLib, Gtk, Meta, Clutter } = imports.gi;

var Hook = class {
  attach(window) {
    this._window = window;

    let container = new St.Widget({ name: 'container' });
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

    this._reposition();
  }

  release() {
    this._window._parent.remove_child(this._container);
    this._window.disconnectObject(this);
  }

  _reposition() {
    let scale = St.ThemeContext.get_for_stage(global.stage).scale_factor;

    // compute
    let buffer_rect = this._window.get_buffer_rect();
    let frame_rect = this._window.get_frame_rect();

    let sx = frame_rect.x - buffer_rect.x;
    let sy = frame_rect.y - buffer_rect.y;

    let offset = [8 * scale, 6 * scale];
    let cw = 116 * scale;
    let ch = 34 * scale;

    this._container.set_position(sx + offset[0], sy + offset[1]);
    this._container.set_size(cw, ch);
    this._container.style = 'border: 2px solid magenta';
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

    let sx = 0;
    for (let i = 0; i < 3; i++) {
      let sz = 18 * scale;
      let btn = new St.Button({});
      btn.set_size(sz, sz);
      btn.set_position(sx, 0);
      sx += sz + 4 * scale;
    }
  }
};
