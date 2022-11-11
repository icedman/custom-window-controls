uniform sampler2D tex;

uniform vec4 control_rect;
uniform vec4 frame_rect;
uniform vec2 pixel_step;

void main() {
    vec2 tcoord = cogl_tex_coord_in[0].st;
    vec4 c = texture2D(tex, tcoord);
    cogl_color_out.rgba = c.rgba;

    vec4 cc = texture2D(tex, vec2(
      frame_rect[0] + pixel_step[0] * 5
      , tcoord.y));

    float force_scale = 1.0;
    if (cc.a < 0.5) {
      // vscode? ... pixel_step should double?
      cc = texture2D(tex, vec2(
      (frame_rect[0] + pixel_step[0] * 6) * 2
      , tcoord.y));

      force_scale = 2.0;
    }

    vec2 coord = cogl_tex_coord_in[0].xy;
    if (
      // coord.x > control_rect[0]
      // && coord.y > control_rect[1]
      // && coord.x <= control_rect[2] * 2
      // && coord.y <= control_rect[3] + pixel_step[1] * 4

      (control_rect[0] < 0.5 && coord.x < 0.5 ||
        control_rect[0] > 0.5 && coord.x > 0.5)
      && coord.y <= (control_rect[3] + pixel_step[1] * 4) * force_scale
        ) {
        // cogl_color_out = cc
        if (c.r > 0.6 && c.b > 0.6 && c.r - c.g > 0.4) {
          cogl_color_out = cc;
          return;
        }

    }

    // bottom radius
    if (
      (coord.x < frame_rect[0] + pixel_step[1] * 12 * force_scale ||
        coord.x > frame_rect[2] - pixel_step[1] * 12 * force_scale) &&
      coord.y > frame_rect[3] - pixel_step[1] * 12 * force_scale) {
      if (c.r > 0.6 && c.b > 0.6 && c.r - c.g > 0.4) {
        cc.a = 0;
        cogl_color_out = cc;
      }
    }
}