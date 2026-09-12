float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
}

float sdCircle(vec2 p, float r) {
    return length(p) - r;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 res = iResolution.xy;
    vec2 uv = fragCoord.xy / res;
    float aspect = res.x / res.y;
    vec2 p = uv;
    p.x *= aspect;

    vec3 sky = mix(vec3(0.05, 0.07, 0.15), vec3(0.35, 0.4, 0.55), uv.y);
    vec3 col = sky;

    float growth = clamp(iTime * 0.04, 0.0, 0.3);
    float pile = 1e5;
    for (int i = 0; i < 8; i++) {
        float fi = float(i);
        float cx = (fi + 0.5) / 8.0 * aspect;
        float rnd = hash21(vec2(fi, 1.0));
        float r = 0.09 + 0.05 * rnd + growth * 0.5;
        vec2 center = vec2(cx, 0.02);
        float d = sdCircle(p - center, r);
        pile = min(pile, d);
    }
    float pileMask = 1.0 - smoothstep(-0.01, 0.01, pile);

    float snow = 0.0;
    for (int i = 0; i < 5; i++) {
        float fi = float(i);
        float speed = 0.06 + fi * 0.025;
        float scale = 8.0 + fi * 5.0;
        vec2 gv = p * scale;
        gv.y += iTime * speed * 12.0 + fi * 17.3;
        vec2 id = floor(gv);
        vec2 f = fract(gv) - 0.5;
        vec2 jitter = vec2(hash21(id + fi), hash21(id + fi + 3.3)) - 0.5;
        float size = 0.06 + 0.05 * hash21(id + fi + 7.1);
        float d = length(f - jitter * 0.7);
        float flake = 1.0 - smoothstep(size * 0.2, size, d);
        snow += flake * (1.0 - fi * 0.15);
    }
    col += vec3(snow) * 0.9;
    col = mix(col, vec3(0.95, 0.97, 1.0), pileMask);

    fragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
