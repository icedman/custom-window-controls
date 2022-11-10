'user strict';

const { St, Shell, Gio, GLib, Gtk, Meta, Clutter } = imports.gi;
const Main = imports.ui.main;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const ColorEffect = Me.imports.effects.color_effect.ColorEffect;
const Button = Me.imports.button.Button;
const CreateButtonIcon = Me.imports.button.CreateButtonIcon;

const BTN_COUNT = 3;

var Hook = class {
  _windowSettingFromClass(wm) {
    this._button_count = BTN_COUNT;

    if (this.extension.window_list) {
      let blacklisted = this.extension.window_list.find((i) =>
        i['wm_class'].startsWith(wm)
      );
      this._customWindowSetting = blacklisted;
      if (blacklisted) {
        if (blacklisted['exclude-window']) {
          return true;
        }
      }
      // if (['google-chrome'].includes(wm)) {
      //   return;
      // }
    }

    if (this._customWindowSetting) {
      if (this._customWindowSetting['close-button-only']) {
        this._button_count = 1;
      }
    }

    return false;
  }

  attach(window) {
    this._window = window;
    this._window._hook = this;

    // exclude?
    this._wm = window.get_wm_class_instance();
    if (this._wm == '') return;

    if (this._windowSettingFromClass(this._wm)) {
      return;
    }

    this._attached = true;

    let border = new St.Widget({ name: 'cwc-border' });
    this._window._parent.add_child(border);
    this._border = border;
    this._border.set_reactive(false);
    // this._border.visible = false;

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
      this._redisplay();

      // do twice.. for wayland
      this.extension._hiTimer.runOnce(() => {
        this._deferredShow = false;
        this._redisplay();
      }, 10);
    });

    this._redisplay();

    // ubuntu (gnome 42) .. libadwait seems slow
    this.extension._hiTimer.runOnce(() => {
      this._deferredShow = false;
      this._redisplay();
    }, 200);
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

  update(force) {
    if (this._attached && this._windowSettingFromClass(this._wm)) {
      this.release();
      return;
    }
    if (!this._attached && !this._windowSettingFromClass(this._wm)) {
      this.attach(this._window);
      return;
    }
    if (this._button_icons && this._button_icons.length != this._button_count) {
      this._createButtons(true);
      this._redisplay();
      return;
    }
    this._updateButtonStyle();

    if (this._container && force) {
      this._createButtons(true);
      this._redisplay();
      return;
    }
  }

  _updateButtonStyle() {
    if (this._button_icons) {
      let traffic_light = this.extension.traffic_light_colors;
      let uniform_color = this.extension.button_color;
      let hovered_traffic_light = this.extension.hovered_traffic_light_colors;
      let hovered_color = this.extension.hovered_button_color;
      let unfocused_traffic_light =
        this.extension.unfocused_traffic_light_colors;
      let unfocused_color = this.extension.unfocused_button_color;

      // no magenta colors
      if (
        uniform_color[0] > 0.6 &&
        uniform_color[2] > 0.6 &&
        uniform_color[0] - uniform_color[1] > 0.4
      ) {
        traffic_light = true;
      }
      if (
        hovered_color[0] > 0.6 &&
        hovered_color[2] > 0.6 &&
        hovered_color[0] - hovered_color[1] > 0.4
      ) {
        hovered_traffic_light = true;
      }
      if (
        unfocused_color[0] > 0.6 &&
        unfocused_color[2] > 0.6 &&
        unfocused_color[0] - unfocused_color[1] > 0.4
      ) {
        unfocused_traffic_light = true;
      }

      this._button_icons.forEach((b) => {
        b.set_state({
          type: this.extension.button_style,
          traffic_light: traffic_light,
          uniform_color: uniform_color,
          hovered_traffic_light: hovered_traffic_light,
          hovered_color: hovered_color,
          unfocused_traffic_light: unfocused_traffic_light,
          unfocused_color: unfocused_color,
        });
      });
    }
  }

  setActive(t) {
    if (this._container) {
      this._container.style = t ? '' : 'background: rgba(255,255,255,0)';
      this._container.visible = t;
      this._effect.enabled = t;
    }
  }

  _precompute() {
    let scale = St.ThemeContext.get_for_stage(global.stage).scale_factor;
    let sz = 16;
    let cw = 38 * this._button_count * scale;
    let ch = 34 * scale;
    this._buttonSize = sz;
    this._scale = scale;
    this._controlWidth = cw;
    this._controlHeight = ch;
  }

  _redisplay() {
    this._precompute();
    let scale = this._scale;
    let cw = this._controlWidth;
    let ch = this._controlHeight;

    let buffer_rect = this._window.get_buffer_rect();
    let frame_rect = this._window.get_frame_rect();

    let x = frame_rect.x - buffer_rect.x;
    let y = frame_rect.y - buffer_rect.y;
    let sx = x;
    let sy = y;

    let offset = [6 * scale, 6 * scale];

    this._layout_right = this.extension.layout_right;
    if (this.extension.layout_right) {
      cw -= this._button_count * scale;
      sx += frame_rect.width;
      sx -= cw;
      sx -= offset[0] + 4;
      this._effect.x1 = sx / buffer_rect.width;
      this._effect.x2 = (sx + cw * 1.2) / buffer_rect.width;
      sx += offset[0];
    } else {
      sx += offset[0];
      if (this._window.is_fullscreen()) {
        sx += 2 * scale;
      }
      this._effect.x1 = sx / buffer_rect.width;
      this._effect.x2 = (sx + cw * 1.2) / buffer_rect.width;
    }

    sy += offset[1];
    this._effect.y1 = sy / buffer_rect.height;
    this._effect.y2 = (sy + ch * 2) / buffer_rect.height;

    // ... add settings
    // this._effect.focused = this._window.has_focus() ? 0.0 : 0.5;

    this._container.set_position(sx, sy);
    this._container.set_size(cw, ch);

    if (!this._deferredShow) {
      this._container.visible = !this._window.is_fullscreen();
    }

    this._button_icons.forEach((b) => {
      b.set_state({
        focused: this._window.has_focus(),
      });
    });

    this._border.style = '';
    this._border.set_position(x, y);
    this._border.set_size(frame_rect.width, frame_rect.height);
    if (this.extension.border_thickness) {
      let bg = (this._window.has_focus()
        ? this.extension.border_color
        : this.extension.unfocused_border_color) || [1, 1, 1, 1];
      let clr = bg.map((r) => Math.floor(255 * r));
      clr[3] = bg[3];
      let style = `border: ${
        this.extension.border_thickness
      }px solid rgba(${clr.join(',')});`;
      if (this.extension.border_radius) {
        style += ` border-radius: ${Math.floor(
          this.extension.border_radius
        )}px;`;
      }
      log(style);
      this._border.style = style;
    }
  }

  _onFocusWindow(w, e) {
    this._redisplay();
  }

  _onFullScreen() {
    this._redisplay();
  }

  _destroyButtons() {
    let children = this._container.get_children();
    children.forEach((c) => {
      this._container.remove_child(c);
    });
  }

  _createButtons(recreate) {
    this._precompute();
    let scale = this._scale;
    let cw = this._controlWidth;
    let ch = this._controlHeight;

    let children = this._container.get_children();
    if (children.length) {
      if (!recreate) {
        return;
      }
      this._destroyButtons();
    }

    let button_style = this.extension.button_style || 'circle';
    this._button_icons = [];

    let padding = 8 * scale;
    let spacing = 12 * scale;
    let sx = padding * 2;
    let sy = padding;
    let sz = this._buttonSize * scale;
    let dx = sz + spacing;
    if (this.extension.layout_right && this._button_count > 1) {
      sx += dx / 2;
    }
    for (let i = 0; i < this._button_count; i++) {
      let btn_idx = i;
      if (this.extension.layout_right) {
        btn_idx = this._button_count - i - 1;
      }
      let btn = CreateButtonIcon(
        btn_idx,
        sz,
        sx,
        sy,
        this._container,
        this._onButtonClicked.bind(this),
        this.extension
      );
      sx += dx;
      btn.set_state({
        focused: this._window.has_focus(),
      });
      this._button_icons.push(btn);
    }

    this._updateButtonStyle();
  }

  _onButtonClicked(id) {
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
