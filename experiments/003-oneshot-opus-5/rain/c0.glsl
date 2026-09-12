float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
}

vec3 palette(float t, vec3 a, vec3 b, vec3 c, vec3 d) {
    return a + b * cos(6.28318 * (c * t + d));
}

vec3 cityBokeh(vec2 uv) {
    vec3 col = vec3(0.0);
    for (int ix = 0; ix < 7; ix++) {
        for (int iy = 0; iy < 7; iy++) {
            vec2 cell = floor(uv * 5.0) + vec2(float(ix) - 3.0, float(iy) - 3.0);
            float h = hash21(cell);
            if (h > 0.6) {
                vec2 jitter = vec2(hash21(cell + 13.7), hash21(cell + 27.3)) - 0.5;
                vec2 center = (cell + 0.5 + jitter * 0.7) / 5.0;
                float dist = length(uv - center);
                float r = 0.04 + hash21(cell + 1.1) * 0.08;
                float glow = exp(-dist * dist / max(r * r * 0.4, 1e-5));
                vec3 lc = palette(hash21(cell + 2.2), vec3(0.5), vec3(0.5), vec3(1.0), vec3(0.0, 0.33, 0.67));
                col += lc * glow * 0.9;
            }
        }
    }
    return col;
}

float streak(vec2 uv) {
    float COLS = 38.0;
    float ci = floor(uv.x * COLS);
    float speed = 0.6 + hash21(vec2(ci, 0.0)) * 1.8;
    float off = hash21(vec2(ci, 1.0));
    float len = 0.04 + hash21(vec2(ci, 2.0)) * 0.1;
    float y = fract(uv.y + iTime * speed + off);
    float x = fract(uv.x * COLS) - 0.5;
    return smoothstep(len, 0.0, y) * smoothstep(0.018, 0.0, abs(x));
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;
    vec3 bg = cityBokeh(uv);
    bg += vec3(0.0, 0.04, 0.12) * (1.0 - uv.y * 0.8);
    bg = clamp(bg, 0.0, 1.0);

    float r1 = streak(uv);
    float r2 = streak(uv * vec2(1.9, 1.4) + vec2(0.41, 0.0)) * 0.5;
    float rain = clamp(r1 + r2, 0.0, 1.0);

    vec3 rainCol = vec3(0.35, 0.45, 0.65) + bg * 0.6;
    vec3 col = mix(bg, rainCol, rain * 0.85);
    fragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}