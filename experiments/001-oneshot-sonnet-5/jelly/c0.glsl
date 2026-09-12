vec3 palette(float t, vec3 a, vec3 b, vec3 c, vec3 d) {
    return a + b * cos(6.28318 * (c * t + d));
}

float sdEllipse(vec2 p, vec2 r) {
    return (length(p / r) - 1.0) * min(r.x, r.y);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
    vec2 p = uv;
    p.y += 0.12;

    float pulse = 0.5 + 0.5 * sin(iTime * 1.5);
    float bellH = mix(0.26, 0.36, pulse);
    vec2 r = vec2(0.30, bellH);
    float d = sdEllipse(p, r);

    vec3 deep = mix(vec3(0.0, 0.01, 0.03), vec3(0.0, 0.05, 0.11), clamp(uv.y * 0.5 + 0.5, 0.0, 1.0));
    vec3 col = deep;

    vec3 bellCol = palette(pulse * 0.4 + 0.15, vec3(0.0, 0.3, 0.4), vec3(0.0, 0.4, 0.5), vec3(1.0, 1.0, 1.0), vec3(0.3, 0.5, 0.7));

    float bellGlow = exp(-abs(d) * 16.0);
    col += bellCol * bellGlow * 1.2;

    float inside = smoothstep(0.02, -0.05, d);
    col += bellCol * inside * 0.18;

    for (int i = 0; i < 8; i++) {
        float fi = float(i);
        float tx = (fi / 7.0 - 0.5) * 0.5;
        float wob = sin(iTime * 2.0 + fi * 1.7) * 0.05;
        float ty = clamp((-p.y + bellH * 0.6) / 0.55, 0.0, 1.0);
        float wave = sin(ty * 6.0 + iTime * 3.0 + fi) * 0.05 * ty;
        float tdist = abs(p.x - tx - wave - wob * ty);
        float mask = step(-bellH * 0.6, -p.y) * (1.0 - ty);
        float glow = exp(-tdist * 70.0) * mask;
        col += bellCol * glow * 0.6;
    }

    fragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
