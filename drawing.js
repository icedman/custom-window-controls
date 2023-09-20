import PangoCairo from 'gi://PangoCairo';
import Pango from 'gi://Pango';
import Clutter from 'gi://Clutter';

export const Drawing = class {
  draw_rotated_line(ctx, color, width, angle, len) {
    ctx.save();
    ctx.rotate(angle);
    this.set_color(ctx, color, 1);
    ctx.setLineWidth(width);
    ctx.moveTo(0, 0);
    ctx.lineTo(0, len);
    ctx.stroke();
    ctx.restore();
  }

  draw_line(ctx, color, width, x, y, x2, y2) {
    ctx.save();
    this.set_color(ctx, color, 1);
    ctx.setLineWidth(width);
    ctx.moveTo(x, y);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.restore();
  }

  draw_circle(ctx, color, x, y, diameter, borderOnly) {
    ctx.save();
    this.set_color(ctx, color, 1);
    ctx.arc(x, y, diameter / 2 - diameter / 20, 0, 2 * Math.PI);
    if (borderOnly) {
      ctx.stroke();
    } else {
      ctx.fill();
    }
    ctx.restore();
  }

  draw_rect(ctx, color, x, y, h_size, v_size, line_width) {
    this.draw_rounded_rect(ctx, color, x, y, h_size, v_size, line_width, 0);
  }

  draw_rounded_rect(
    ctx,
    color,
    x,
    y,
    h_size,
    v_size,
    line_width,
    border_radius
  ) {
    ctx.save();
    this.set_color(ctx, color, 1);
    ctx.translate(x, y);
    ctx.setLineWidth(line_width);
    ctx.moveTo(border_radius, 0);
    ctx.lineTo(h_size - border_radius, 0);
    // ctx.lineTo(h_size, border_radius);

    if (border_radius > 0)
      ctx.curveTo(h_size - border_radius, 0, h_size, 0, h_size, border_radius);

    ctx.lineTo(h_size, v_size - border_radius);
    // ctx.lineTo(h_size - border_radius, h_size);

    if (border_radius > 0)
      ctx.curveTo(
        h_size,
        v_size - border_radius,
        h_size,
        v_size,
        h_size - border_radius,
        v_size
      );
    ctx.lineTo(border_radius, v_size);
    // ctx.lineTo(0, h_size - border_radius);

    if (border_radius > 0)
      ctx.curveTo(border_radius, v_size, 0, v_size, 0, v_size - border_radius);
    ctx.lineTo(0, border_radius);

    if (border_radius > 0)
      ctx.curveTo(0, border_radius, 0, 0, border_radius, 0);

    ctx.fill();
    ctx.restore();
  }

  draw_text(ctx, showtext, font = 'DejaVuSans 42') {
    ctx.save();
    let pl = PangoCairo.create_layout(ctx);
    pl.set_text(showtext, -1);
    pl.set_font_description(Pango.FontDescription.from_string(font));
    PangoCairo.update_layout(ctx, pl);
    let [w, h] = pl.get_pixel_size();
    ctx.relMoveTo(-w / 2, -h / 2);
    PangoCairo.show_layout(ctx, pl);
    ctx.relMoveTo(w / 2, 0);
    ctx.restore();
    return [w, h];
  }

  set_color(ctx, clr, alpha) {
    if (typeof clr === 'string') {
      const [, cc] = Clutter.Color.from_string(clr);
      ctx.setSourceRGBA(cc.red, cc.green, cc.blue, alpha);
    } else {
      if (clr.red) {
        ctx.setSourceRGBA(clr.red, clr.green, clr.blue, alpha);
      } else {
        ctx.setSourceRGBA(clr[0], clr[1], clr[2], alpha);
      }
    }
  }

  set_color_rgba(ctx, red, green, blue, alpha) {
    ctx.setSourceRGBA(red, green, blue, alpha);
  }
};
