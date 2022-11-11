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

var Chamfer = GObject.registerClass(
  {
    Properties: {},
    Signals: {},
  },
  class Chamfer extends Clutter.Actor {
    _init(sz) {
      super._init();

      if (sz) size = sz;

      this.state = {
        width: 0,
        color: [0.8, 0.0, 0.0, 1.0],
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
      let clr = [1, 0, 1, 1];
      ctx.save();

      ctx.save();
      Drawing.set_color(ctx, clr, 1);
      ctx.setLineWidth(2.5);
      ctx.moveTo(-width / 2, -height / 2);
      ctx.curveTo(
        -width / 2,
        -height / 2,
        -width / 2,
        height / 2,
        width / 2,
        height / 2
      );
      ctx.fill();
      ctx.restore();

      ctx.save();
      Drawing.set_color(ctx, this.state.color, 1);
      ctx.setLineWidth(2.5);
      ctx.moveTo(-width / 2, -height / 2);
      ctx.curveTo(
        -width / 2,
        -height / 2,
        -width / 2,
        height / 2,
        width / 2,
        height / 2
      );
      ctx.stroke();
      ctx.restore();

      ctx.restore();
    }

    destroy() {}
  }
);
