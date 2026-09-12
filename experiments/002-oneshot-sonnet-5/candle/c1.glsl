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
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
    float t = iTime;
    vec2 p = uv;
    p.y += 0.15;

    float sway = 0.09 * sin(t * 2.2 + p.y * 3.0);
    vec2 pw = p;
    pw.x -= sway * (p.y + 0.5);
    float k = clamp((pw.y + 0.55) / 1.05, 0.0, 1.0);
    float w = mix(0.30, 0.015, k);
    w = max(w, 0.02);
    vec2 q = vec2(pw.x / w, pw.y - 0.05);
    float d = length(q) - 1.0;
    float mask = smoothstep(0.05, -0.05, d);

    vec2 warpP = p * 3.0 + vec2(0.0, -t * 2.0);
    vec2 warp = vec2(fbm(warpP), fbm(warpP + vec2(5.2, 1.3))) - 0.5;
    float n = fbm(p * 4.0 + warp * 1.5 + vec2(0.0, -t * 3.0));

    vec3 hot = vec3(1.0, 0.9, 0.5);
    vec3 mid = vec3(1.0, 0.45, 0.05);
    vec3 outerc = vec3(0.5, 0.02, 0.0);
    vec3 col = mix(outerc, mid, clamp(n * 1.4, 0.0, 1.0));
    col = mix(col, hot, clamp((n - 0.4) * 2.0, 0.0, 1.0) * (1.0 - k));

    vec3 finalCol = col * mask;
    finalCol += vec3(1.0, 0.5, 0.1) * exp(-max(d, 0.0) * 6.0) * 0.35;

    finalCol = clamp(finalCol, 0.0, 1.0);
    fragColor = vec4(finalCol, 1.0);
}
