float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
}

float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash21(i);
    float b = hash21(i + vec2(1.0, 0.0));
    float c = hash21(i + vec2(0.0, 1.0));
    float d = hash21(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 5; i++) {
        v += a * noise(p);
        p *= 2.0;
        a *= 0.5;
    }
    return v;
}

vec3 palette(float t, vec3 a, vec3 b, vec3 c, vec3 d) {
    return a + b * cos(6.28318 * (c * t + d));
}

vec2 warp(vec2 p, float t) {
    vec2 q = vec2(fbm(p + vec2(0.0, 0.0)), fbm(p + vec2(5.2, 1.3)));
    vec2 r = vec2(fbm(p + 4.0 * q + vec2(1.7, 9.2) + 0.15 * t), fbm(p + 4.0 * q + vec2(8.3, 2.8) + 0.126 * t));
    return r;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
    vec2 p = uv * 2.0;
    vec2 r = warp(p, iTime * 0.3);
    float f = fbm(p + r * 2.0);

    vec3 deep = mix(vec3(0.0, 0.01, 0.03), vec3(0.0, 0.06, 0.11), clamp(uv.y * 0.5 + 0.5, 0.0, 1.0));
    vec3 col = deep;

    float pulse = 0.5 + 0.5 * sin(iTime * 1.8 + f * 3.0);
    vec3 glowCol = palette(f + iTime * 0.05, vec3(0.1, 0.3, 0.4), vec3(0.2, 0.4, 0.5), vec3(1.0, 0.8, 1.0), vec3(0.0, 0.3, 0.6));

    col += glowCol * f * pulse * 0.9;
    col += glowCol * smoothstep(0.6, 1.0, f) * 0.4;

    fragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
