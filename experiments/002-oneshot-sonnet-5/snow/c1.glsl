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

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 res = iResolution.xy;
    vec2 uv = fragCoord.xy / res;
    vec2 p = uv;
    p.x *= res.x / res.y;

    vec3 col = mix(vec3(0.06, 0.08, 0.16), vec3(0.5, 0.55, 0.65), uv.y * 0.8);

    float growth = clamp(iTime * 0.03, 0.0, 0.25);
    vec2 wp = vec2(p.x * 2.0, iTime * 0.05);
    vec2 warp = vec2(fbm(wp + 1.3), fbm(wp + 5.7));
    float ground = 0.1 + growth + 0.06 * fbm(p * 3.0 + warp * 1.5);
    float pileMask = 1.0 - smoothstep(ground - 0.015, ground + 0.015, p.y);

    vec2 wind = vec2(fbm(p * 1.5 + iTime * 0.1) - 0.5, 0.0) * 0.3;
    float snow = 0.0;
    for (int i = 0; i < 5; i++) {
        float fi = float(i);
        vec2 sp = p + wind * (fi + 1.0);
        sp *= 6.0 + fi * 5.0;
        sp.y += iTime * (0.5 + fi * 0.15) * 6.0;
        vec2 id = floor(sp);
        vec2 f = fract(sp) - 0.5;
        vec2 jitter = vec2(hash21(id + fi * 2.0), hash21(id + fi * 2.0 + 4.0)) - 0.5;
        float size = 0.05 + 0.04 * hash21(id + fi + 9.0);
        float d = length(f - jitter * 0.6);
        snow += (1.0 - smoothstep(size * 0.2, size, d)) * (1.0 - fi * 0.15);
    }
    col += vec3(snow) * 0.85;

    vec3 pileColor = vec3(0.93, 0.96, 1.0) * (0.9 + 0.1 * fbm(p * 8.0));
    col = mix(col, pileColor, pileMask);

    fragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
