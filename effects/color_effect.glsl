uniform sampler2D tex;
uniform float red;
uniform float green;
uniform float blue;
uniform float blend;
uniform float x1;
uniform float y1;
uniform float x2;
uniform float y2;
uniform float focused;

void main() {
    vec4 c = texture2D(tex, cogl_tex_coord_in[0].st);
    vec2 coord = cogl_tex_coord_in[0].xy;

    vec4 cc = texture2D(tex, vec2(x1, coord.y));
    vec4 cout = vec4(0.,0.,0.,0.);
    if (coord.x >= x1 && coord.y >= y1 &&
        coord.x <= x2 && coord.y <= y2 &&
        c.r > 0.6 && c.b > 0.6 && c.r - c.g > 0.4
        ) {
        if (cc.r == 0 && cc.g == 0 && cc.b == 0) {
            c.a = 0;
        }
        cout = vec4(cc.r, cc.g, cc.b, c.a);
    } else {
        cout = vec4(c.r, c.g, c.b, c.a);
    }

    // if (coord.x < x1) {
    //     cout.a = 0.8;
    // }

    /*
    // tint the titlebar
    if ((coord.y <= y2*0.75) && ((c.r < 0.8 && c.g < 0.8 && c.b < 0.8)
        || c.r > 0.6 && c.b > 0.6 && c.r - c.g > 0.4)) {
        cout = vec4(cout.r*0.75, cout.g*0.75, cout.b, cout.a);
    }
    */

    // darken window
    if (focused > 0.1 && focused < 0.9) {
        float dw = 0.85;
        cout = vec4(cout.r*dw, cout.g*dw, cout.b*dw, cout.a*0.9);
    }

    cogl_color_out = cout;
}