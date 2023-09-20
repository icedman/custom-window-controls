import Shell from 'gi://Shell';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';

let extensionDir = '';

const getShaderSource = (_) => {
  const SHADER_PATH = GLib.build_filenamev([
    extensionDir,
    'effects',
    'color_effect.glsl',
  ]);

  try {
    return Shell.get_file_contents_utf8_sync(SHADER_PATH);
  } catch (e) {
    log(`[d2dl] error loading shader from ${SHADER_PATH}: ${e}`);
    return null;
  }
};

let declarations = null;
let code = null;

const loadShader = () => {
  let source = getShaderSource() || '';
  let [decl, main] = source.split(/^.*?main\(\s?\)\s?/m);

  decl = decl.trim();
  main = main.trim().replace(/^[{}]/gm, '').trim();

  declarations = decl;
  code = main;
  // return { declarations, code: main };
};

export const initEffects = (path) => {
  extensionDir = path;
  loadShader();
};

export const ColorEffect = GObject.registerClass(
  {},
  class ColorEffect extends Shell.GLSLEffect {
    _init(params) {
      super._init(params);

      this._control = undefined;
      this._frame = undefined;
      this._pixel = undefined;

      this._texLocation = this.get_uniform_location('location');
      this._controlLocation = this.get_uniform_location('control_rect');
      this._frameLocation = this.get_uniform_location('frame_rect');
      this._pixelLocation = this.get_uniform_location('pixel_step');

      this.set_uniform_float(this._texLocation, 1, [0]);
    }

    vfunc_build_pipeline() {
      this.add_glsl_snippet(
        Shell.SnippetHook.FRAGMENT,
        declarations,
        code,
        true
      );
    }

    get control() {
      return this._control;
    }

    set control(v) {
      if (this._control === v) return;
      this._control = v;
      this.set_uniform_float(this._controlLocation, 4, this._control);
    }

    get frame() {
      return this._frame;
    }

    set frame(v) {
      if (this._frame === v) return;
      this._frame = v;
      this.set_uniform_float(this._frameLocation, 4, this._frame);
    }

    get pixel() {
      return this._pixel;
    }

    set pixel(v) {
      if (this._pixel === v) return;
      this._pixel = v;
      this.set_uniform_float(this._pixelLocation, 2, this._pixel);
    }
  }
);
