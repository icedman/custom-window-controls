uniform sampler2D tex;
uniform float red;
uniform float green;
uniform float blue;
uniform float blend;
uniform float x1;
uniform float y1;
uniform float x2;
uniform float y2;

void main() {
    vec4 c = texture2D(tex, cogl_tex_coord_in[0].st);
    vec2 coord = cogl_tex_coord_in[0].xy;

    vec4 cc = texture2D(tex, vec2(x1, coord.y));
    if (coord.x >= x1 && coord.y >= y1 &&
        coord.x <= x2 && coord.y <= y2 &&
        c.r > 0.6 && c.b > 0.6 && c.r - c.g > 0.4
        ) {
        cogl_color_out = vec4(cc.r, cc.g, cc.b, c.a);
    } else {
        cogl_color_out = vec4(c.r, c.g, c.b, c.a);
    }
}