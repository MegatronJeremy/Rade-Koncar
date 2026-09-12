float sdFlame(vec2 p, float t) {
    float sway = 0.10 * sin(t * 3.0 + p.y * 3.5) + 0.05 * sin(t * 7.0 - p.y * 2.0);
    p.x -= sway * (p.y + 0.5);
    float widthTop = 0.02;
    float widthBot = 0.30;
    float k = clamp((p.y + 0.55) / 1.05, 0.0, 1.0);
    float w = mix(widthBot, widthTop, k) + 0.02 * sin(t * 10.0 + p.y * 8.0) * (1.0 - k);
    w = max(w, 0.02);
    vec2 q = vec2(p.x / w, p.y - 0.05);
    float d = length(q) - 1.0;
    return d * w;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
    float t = iTime;
    vec2 p = uv;
    p.y += 0.15;

    float d = sdFlame(p, t);
    float core = smoothstep(0.05, -0.05, d);
    float glow = exp(-max(d, 0.0) * 8.0) * 0.5;

    vec3 hot = vec3(1.0, 0.95, 0.6);
    vec3 mid = vec3(1.0, 0.5, 0.05);
    vec3 outerc = vec3(0.6, 0.05, 0.0);

    float innerMix = smoothstep(-0.25, 0.05, d);
    vec3 flameCol = mix(hot, mid, clamp(innerMix * 1.5, 0.0, 1.0));
    flameCol = mix(flameCol, outerc, clamp(innerMix, 0.0, 1.0));

    vec3 col = vec3(0.0);
    col += flameCol * core;
    col += vec3(1.0, 0.4, 0.05) * glow;

    float wick = exp(-length(p - vec2(0.0, -0.35)) * 20.0);
    col += vec3(1.0, 0.6, 0.2) * wick * 0.3;

    col = clamp(col, 0.0, 1.0);
    fragColor = vec4(col, 1.0);
}
