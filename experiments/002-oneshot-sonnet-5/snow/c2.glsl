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
    vec2 uv = fragCoord.xy / iResolution.xy;
    vec2 p = uv;
    p.x *= iResolution.x / iResolution.y;

    vec3 col = mix(vec3(0.08, 0.09, 0.14), vec3(0.4, 0.45, 0.55), uv.y);

    float growth = clamp(iTime * 0.035, 0.0, 0.28);
    float h1 = fbm(vec2(p.x * 3.0, 0.0));
    float h2 = fbm(vec2(p.x * 7.0 + 5.0, 0.0));
    float ground = 0.09 + growth + h1 * 0.05 + h2 * 0.025;
    float pileMask = 1.0 - smoothstep(ground - 0.012, ground + 0.012, p.y);

    float snow = 0.0;
    for (int i = 0; i < 4; i++) {
        float fi = float(i);
        vec2 sp = p * (10.0 + fi * 6.0);
        sp.y += iTime * (0.4 + fi * 0.2) * 5.0;
        float n = fbm(sp);
        float layer = smoothstep(0.78 - fi * 0.03, 0.86, n);
        snow += layer * (1.0 - fi * 0.18);
    }
    col += vec3(snow) * 0.9;

    vec3 pileColor = vec3(0.92, 0.95, 1.0) * (0.88 + 0.12 * h2);
    col = mix(col, pileColor, pileMask);

    fragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
