const { St, Shell, Gio, GLib, Gtk, Meta, Clutter } = imports.gi;
const Main = imports.ui.main;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const ColorEffect = Me.imports.effects.color_effect.ColorEffect;
const Button = Me.imports.button.Button;
const CreateButtonIcon = Me.imports.button.CreateButtonIcon;

const runSequence = Me.imports.utils.runSequence;
const runOneShot = Me.imports.utils.runOneShot;
const runLoop = Me.imports.utils.runLoop;
const beginTimer = Me.imports.utils.beginTimer;
const clearAllTimers = Me.imports.utils.clearAllTimers;
const getRunningTimers = Me.imports.utils.getRunningTimers;

const BTN_COUNT = 3;

var Hook = class {
  attach(window) {
    // exclude?
    let wm = window.get_wm_class_instance();
    if (wm == '') return;
    if (['google-chrome'].includes(wm)) {
      return;
    }

    this._attached = true;
    this._window = window;
    this._window._hook = this;

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

    window._parent.connectObject('destroy', this.release.bind(this), this);

    this._effect = new ColorEffect({
      name: 'cwc-color',
      color: [1.0, 0.0, 1.0, 1.0],
      x1: 0.0,
      y1: 0.0,
      x2: 0.5,
      y2: 0.5,
    });

    this._deferredShow = true;
    this._container.visible = false;

    window._parent.add_effect_with_name('cwc-color', this._effect);
    window._parent.get_texture().connect('size-changed', () => {
      this._reposition();
    });

    this._reposition();

    beginTimer(
      runOneShot(() => {
        this._deferredShow = false;
        this._reposition();
      }, 0.16)
    );
  }

  release() {
    if (!this._attached) {
      return;
    }
    this._attached = false;
    this._destroyButtons();
    this._window._parent.remove_child(this._container);
    this._window._parent.disconnectObject(this);
    this._window.disconnectObject(this);
    this._window._parent.remove_effect_by_name('cwc-color');
  }

  setActive(t) {
    if (this._container) {
      this._container.style = t ? '' : 'background: rgba(255,255,255,0)';
      // this._container.visible = t;
      this._effect.enabled = t;
    }
  }

  _reposition() {
    let scale = St.ThemeContext.get_for_stage(global.stage).scale_factor;

    // compute
    let buffer_rect = this._window.get_buffer_rect();
    let frame_rect = this._window.get_frame_rect();

    let sx = frame_rect.x - buffer_rect.x;
    let sy = frame_rect.y - buffer_rect.y;

    let offset = [5 * scale, 6 * scale];
    let cw = 38 * BTN_COUNT * scale;
    let ch = 34 * scale;

    sx += offset[0];
    sy += offset[1];
    this._container.set_position(sx, sy);
    this._container.set_size(cw, ch);

    this._effect.x1 = sx / buffer_rect.width;
    this._effect.y1 = sy / buffer_rect.height;
    this._effect.x2 = (sx + cw * 2) / buffer_rect.width;
    this._effect.y2 = (sy + ch * 2) / buffer_rect.height;

    if (!this._deferredShow) {
      this._container.visible = !this._window.is_fullscreen();
    }
  }

  _onFocusWindow(w, e) {
    this._reposition();
  }

  _onFullScreen() {
    this._reposition();
  }

  _destroyButtons() {
    let children = this._container.get_children();
    children.forEach((c) => {
      this._container.remove_child(c);
    });
  }

  _createButtons(recreate) {
    let children = this._container.get_children();
    if (children.length) {
      if (!recreate) {
        return;
      }
      this._destroyButtons();
    }

    let scale = St.ThemeContext.get_for_stage(global.stage).scale_factor;

    let padding = 8 * scale;
    let spacing = 12 * scale;
    let sx = padding * 2;
    let sy = padding;
    for (let i = 0; i < BTN_COUNT; i++) {
      let sz = 16 * scale;
      CreateButtonIcon(
        i,
        sz,
        sx,
        sy,
        this._container,
        this._onButtonClicked.bind(this)
      );
      sx += sz + spacing;
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
