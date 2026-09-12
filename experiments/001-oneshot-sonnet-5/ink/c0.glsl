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
    vec2 p = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
    vec3 paper = vec3(0.97, 0.96, 0.93);
    vec3 inkCol = vec3(0.04, 0.05, 0.08);

    float ink = 0.0;
    for (int i = 0; i < 4; i++) {
        float fi = float(i);
        float t0 = fi * 1.6;
        float tt = max(iTime * 0.5 - t0, 0.0);
        vec2 center = vec2(sin(fi * 2.3) * 0.35, cos(fi * 1.9 + 1.0) * 0.3);
        float r = sqrt(tt) * 0.4;
        float ang = atan(p.y - center.y, p.x - center.x);
        float wobble = (fbm(vec2(ang * 2.5, tt * 0.6 + fi * 10.0)) - 0.5) * 0.18;
        float d = length(p - center) - r - wobble;
        float edge = smoothstep(0.06, -0.06, d);
        float fade = exp(-tt * 0.25);
        ink = max(ink, edge * fade);
    }

    vec3 col = mix(paper, inkCol, clamp(ink, 0.0, 1.0));
    fragColor = vec4(col, 1.0);
}
