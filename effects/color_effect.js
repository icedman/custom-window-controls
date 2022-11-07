// Adapted from from Blur-My-Shell

'use strict';

const { GLib, GObject, Gio, Clutter, Shell } = imports.gi;
const ExtensionUtils = imports.misc.extensionUtils;

const Me = ExtensionUtils.getCurrentExtension();

const SHADER_PATH = GLib.build_filenamev([
  Me.path,
  'effects',
  'color_effect.glsl',
]);

const get_shader_source = (_) => {
  try {
    return Shell.get_file_contents_utf8_sync(SHADER_PATH);
  } catch (e) {
    log(`[d2dl] error loading shader from ${SHADER_PATH}: ${e}`);
    return null;
  }
};

/// New Clutter Shader Effect that simply mixes a color in, the class applies
/// the GLSL shader programmed into vfunc_get_static_shader_source and applies
/// it to an Actor.
///
/// Clutter Shader Source Code:
/// https://github.com/GNOME/clutter/blob/master/clutter/clutter-shader-effect.c
///
/// GJS Doc:
/// https://gjs-docs.gnome.org/clutter10~10_api/clutter.shadereffect
var ColorEffect = new GObject.registerClass(
  {
    GTypeName: 'D2DLColorEffect',
    Properties: {
      red: GObject.ParamSpec.double(
        `red`,
        `Red`,
        `Red value in shader`,
        GObject.ParamFlags.READWRITE,
        0.0,
        1.0,
        0.4
      ),
      green: GObject.ParamSpec.double(
        `green`,
        `Green`,
        `Green value in shader`,
        GObject.ParamFlags.READWRITE,
        0.0,
        1.0,
        0.4
      ),
      blue: GObject.ParamSpec.double(
        `blue`,
        `Blue`,
        `Blue value in shader`,
        GObject.ParamFlags.READWRITE,
        0.0,
        1.0,
        0.4
      ),
      blend: GObject.ParamSpec.double(
        `blend`,
        `Blend`,
        `Amount of blending between the colors`,
        GObject.ParamFlags.READWRITE,
        0.0,
        1.0,
        0.4
      ),
      x1: GObject.ParamSpec.double(
        `x1`,
        `x1`,
        `x1`,
        GObject.ParamFlags.READWRITE,
        0.0,
        1.0,
        0.4
      ),
      x2: GObject.ParamSpec.double(
        `x2`,
        `x2`,
        `x2`,
        GObject.ParamFlags.READWRITE,
        0.0,
        1.0,
        0.4
      ),
      y1: GObject.ParamSpec.double(
        `y1`,
        `y1`,
        `y1`,
        GObject.ParamFlags.READWRITE,
        0.0,
        1.0,
        0.4
      ),
      y2: GObject.ParamSpec.double(
        `y2`,
        `y2`,
        `y2`,
        GObject.ParamFlags.READWRITE,
        0.0,
        1.0,
        0.4
      ),
      focused: GObject.ParamSpec.double(
        `focused`,
        `focused`,
        `focused`,
        GObject.ParamFlags.READWRITE,
        0.0,
        1.0,
        0.4
      ),
    },
  },
  class ColorShader extends Clutter.ShaderEffect {
    _init(params) {
      this._red = null;
      this._green = null;
      this._blue = null;
      this._blend = null;
      this._x1 = null;
      this._x2 = null;
      this._y1 = null;
      this._y2 = null;
      this._focused = null;

      this._static = true;

      // initialize without color as a parameter

      let _color = params.color;
      delete params.color;

      super._init(params);

      // set shader source

      this._source = get_shader_source();

      if (this._source) this.set_shader_source(this._source);

      // set shader color

      if (_color) this.color = _color;
      this.x1 = params._x1 || 0.0;
      this.y1 = params._y1 || 0.0;
      this.x2 = params._x2 || 0.0;
      this.y2 = params._y2 || 0.0;
      this.focused = params._focused || 0.0;

      this.update_enabled();
    }

    get red() {
      return this._red;
    }

    set red(value) {
      if (this._red !== value) {
        this._red = value;

        this.set_uniform_value('red', parseFloat(this._red - 1e-6));
      }
    }

    get green() {
      return this._green;
    }

    set green(value) {
      if (this._green !== value) {
        this._green = value;

        this.set_uniform_value('green', parseFloat(this._green - 1e-6));
      }
    }

    get blue() {
      return this._blue;
    }

    set blue(value) {
      if (this._blue !== value) {
        this._blue = value;

        this.set_uniform_value('blue', parseFloat(this._blue - 1e-6));
      }
    }

    get blend() {
      return this._blend;
    }

    set blend(value) {
      if (this._blend !== value) {
        this._blend = value;

        this.set_uniform_value('blend', parseFloat(this._blend - 1e-6));
      }
      this.update_enabled();
    }

    set color(rgba) {
      let [r, g, b, a] = rgba;
      this.red = r;
      this.green = g;
      this.blue = b;
      this.blend = a;
    }

    get color() {
      return [this.red, this.green, this.blue, this.blend];
    }

    /// False set function, only cares about the color. Too hard to change.
    set(params) {
      this.color = params.color;
    }

    get x1() {
      return this._x1;
    }

    set x1(value) {
      if (this._x1 !== value) {
        this._x1 = value;

        this.set_uniform_value('x1', parseFloat(this._x1 - 1e-6));
      }
      this.update_enabled();
    }

    get y1() {
      return this._y1;
    }

    set y1(value) {
      if (this._y1 !== value) {
        this._y1 = value;

        this.set_uniform_value('y1', parseFloat(this._y1 - 1e-6));
      }
      this.update_enabled();
    }

    get x2() {
      return this._x2;
    }

    set x2(value) {
      if (this._x2 !== value) {
        this._x2 = value;

        this.set_uniform_value('x2', parseFloat(this._x2 - 2e-6));
      }
      this.update_enabled();
    }

    get y2() {
      return this._y2;
    }

    set y2(value) {
      if (this._y2 !== value) {
        this._y2 = value;

        this.set_uniform_value('y2', parseFloat(this._y2 - 1e-6));
      }
      this.update_enabled();
    }

    get focused() {
      return this._focused;
    }

    set focused(value) {
      if (this._focused !== value) {
        this._focused = value;

        this.set_uniform_value('focused', parseFloat(this._focused - 1e-6));
      }
      this.update_enabled();
    }

    update_enabled() {
      this.set_enabled(this.blend > 0 && this._static);
    }

    vfunc_paint_target(paint_node = null, paint_context = null) {
      this.set_uniform_value('tex', 0);

      if (paint_node && paint_context)
        super.vfunc_paint_target(paint_node, paint_context);
      else if (paint_node) super.vfunc_paint_target(paint_node);
      else super.vfunc_paint_target();
    }
  }
);
