const { Clutter, GObject, GLib, PangoCairo, Pango, St } = imports.gi;
const Cairo = imports.cairo;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Drawing = Me.imports.drawing.Drawing;

let size = 400;

function combine(a, b, r) {
  let c = [0, 0, 0];
  for (let i = 0; i < 3; i++) {
    c[i] = a[i] * r + b[i] * (1 - r);
  }
  return c;
}

var Button = GObject.registerClass(
  {
    Properties: {},
    Signals: {},
  },
  class Button extends Clutter.Actor {
    _init(sz) {
      super._init();

      if (sz) size = sz;

      this.state = {
        traffic_light: true,
        uniform_color: [1.0, 1.0, 1.0, 1.0],
        color: [0.8, 0.0, 0.0, 1.0],
        color_hovered: [1.0, 0.0, 0.0, 1.0],
        unfocused_color: [0.8, 0.0, 0.0, 1.0],
        hovered_color: [1.0, 0.0, 0.0, 1.0],
        focused: true,
        type: 'circle',
      };

      this._canvas = new Clutter.Canvas();
      this._canvas.connect('draw', this._on_draw.bind(this));
      this._canvas.invalidate();
      this._canvas.set_size(size, size);
      this.set_size(size, size);
      this.set_content(this._canvas);
      this.reactive = false;
    }

    redraw() {
      this._canvas.invalidate();
    }

    set_state(s) {
      this.state = { ...this.state, ...s };
      this.redraw();
    }

    set_hovered(h) {
      this.set_state({
        ...this.state,
        hovered: h,
      });
    }

    _on_draw(canvas, ctx, width, height) {
      ctx.setOperator(Cairo.Operator.CLEAR);
      ctx.paint();

      ctx.setLineWidth(1);
      ctx.setLineCap(Cairo.LineCap.ROUND);
      ctx.setOperator(Cairo.Operator.SOURCE);

      ctx.save();
      ctx.translate(width / 2, height / 2);

      this.on_draw(ctx, width, height);

      ctx.restore();
      ctx.$dispose();
    }

    on_draw(ctx, width, height) {
      var types = [
        this._draw_circle_button,
        this._draw_square_button,
        this._draw_dash_button,
        this._draw_vertical_button,
        this._draw_slash_button,
        this._draw_back_slash_button,
      ];
      var _f;
      if (typeof this.state.type == 'string') {
        _f = this[`_draw_${this.state.type}_button`];
      } else {
        _f = types[this.state.type];
      }
      _f = _f ?? this._draw_circle_button;
      var func = _f.bind(this);
      func(ctx, width, height);
    }

    _get_color() {
      let clr = this.state.hovered
        ? this.state.color_hovered
        : this.state.color;

      if (this.state.focused) {
        if (!this.state.hovered && !this.state.traffic_light) {
          clr = this.state.uniform_color;
        }
        if (this.state.hovered && !this.state.hovered_traffic_light) {
          clr = this.state.hovered_color;
        }
      } else {
        if (!this.state.unfocused_traffic_light) {
          clr = this.state.unfocused_color;
        } else {
          clr = combine(clr, [0, 0, 0, 0], 0.8);
        }
      }

      return clr;
    }

    _draw_vertical_button(ctx, width, height) {
      ctx.rotate(90 * (Math.PI / 180));
      this._draw_dash_button(ctx, width, height);
    }

    _draw_crystal_button(ctx, width, height) {
      ctx.rotate(-45 * (Math.PI / 180));
      this.__draw_square_button(ctx, width * 1.4, height / 2, 0);
    }

    _draw_back_crystal_button(ctx, width, height) {
      ctx.rotate(45 * (Math.PI / 180));
      this.__draw_square_button(ctx, width * 1.4, height / 2, 0);
    }

    _draw_slash_button(ctx, width, height) {
      ctx.rotate(-45 * (Math.PI / 180));
      this._draw_dash_button(ctx, width * 0.88, height);
    }

    _draw_back_slash_button(ctx, width, height) {
      ctx.rotate(45 * (Math.PI / 180));
      this._draw_dash_button(ctx, width * 0.88, height);
    }

    _draw_circle_button(ctx, width, height) {
      let clr = this._get_color();
      Drawing.draw_circle(ctx, clr, 0, 0, width, false);
    }

    _draw_diamond_button(ctx, width, height) {
      ctx.rotate(45 * (Math.PI / 180));
      this.__draw_square_button(ctx, width * 0.65, height * 0.65, 0);
    }

    _draw_square_button(ctx, width, height) {
      this.__draw_square_button(ctx, width * 0.65, height * 0.65, 0);
    }

    _draw_dash_button(ctx, width, height) {
      this.__draw_square_button(ctx, width, height / 2, width * 0.25);
    }

    __draw_square_button(ctx, width, height, radius) {
      let clr = this._get_color();

      Drawing.draw_rounded_rect(
        ctx,
        clr,
        -width / 2,
        -height / 2,
        width,
        height,
        0,
        radius
      );
      // Drawing.draw_circle(ctx, clr, 0, 0, width, false);
    }

    destroy() {}
  }
);

// FF574F
// C19A32
// 2AD043
var CreateButtonIcon = (idx, sz, sx, sy, container, onClick, settings) => {
  let styles = [
    {
      color: [255 / 255, 87 / 255, 79 / 255, 1],
      color_hovered: [255 / 255, 42 / 255, 37 / 255, 1],
    },
    {
      color: [193 / 255, 154 / 255, 50 / 255, 1],
      color_hovered: [255 / 255, 193 / 255, 40 / 255, 1],
    },
    {
      color: [42 / 255, 208 / 255, 67 / 255, 1],
      color_hovered: [32 / 255, 255 / 255, 57 / 255, 1],
    },
  ];
  let btn = new St.Button({ name: `cwc-btn-${idx}` });
  container.add_child(btn);

  let bsz = sz;
  btn.set_size(bsz, bsz);
  btn.set_position(sx, sy);

  let icon = new St.Widget({ name: `cwc-btn-icon${idx}` });
  let d = new Button(120);
  d.set_scale(bsz / 120, bsz / 120);
  d.set_state(styles[idx]);
  icon.add_child(d);
  icon.set_size(btn.width, btn.height);
  icon.set_position(btn.x, btn.y);
  container.add_child(icon);

  btn.connect('notify::hover', () => {
    d.set_hovered(btn.hover);
  });
  btn.connect('clicked', () => {
    if (onClick) {
      onClick(idx);
    }
  });

  return d;
};
