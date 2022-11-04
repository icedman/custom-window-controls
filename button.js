const { Clutter, GObject, GLib, PangoCairo, Pango, St } = imports.gi;
const Cairo = imports.cairo;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Drawing = Me.imports.drawing.Drawing;

let size = 400;

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
        color: [0.8, 0.0, 0.0, 1.0],
        color_hovered: [1.0, 0.0, 0.0, 1.0],
      };

      this._canvas = new Clutter.Canvas();
      this._canvas.connect('draw', this.on_draw.bind(this));
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
      this.state = s;
      this.redraw();
    }

    set_hovered(h) {
      this.set_state({
        ...this.state,
        hovered: h,
      });
    }

    on_draw(canvas, ctx, width, height) {
      ctx.setOperator(Cairo.Operator.CLEAR);
      ctx.paint();

      ctx.setLineWidth(1);
      ctx.setLineCap(Cairo.LineCap.ROUND);
      ctx.setOperator(Cairo.Operator.SOURCE);

      ctx.save();
      ctx.translate(size / 2, size / 2);

      let clr = this.state.hovered
        ? this.state.color
        : this.state.color_hovered;

      Drawing.draw_circle(ctx, clr, 0, 0, size, false);

      ctx.restore();
      ctx.$dispose();
    }

    destroy() {}
  }
);

var CreateButtonIcon = (idx, sz, sx, sy, container, onClick) => {
  let styles = [
    {
      color: [1, 0, 0, 1],
      color_hovered: [0.8, 0, 0, 1],
    },
    {
      color: [1, 1, 0, 1],
      color_hovered: [0.8, 0.8, 0, 1],
    },
    {
      color: [0, 1, 0, 1],
      color_hovered: [0, 0.8, 0, 1],
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
    onClick(idx);
  });
};
