vec3 palette(float t, vec3 a, vec3 b, vec3 c, vec3 d) {
    return a + b * cos(6.28318 * (c * t + d));
}

float bellShape(vec2 p, float t) {
    float pulse = 0.5 + 0.5 * sin(t * 2.0);
    float r = mix(0.25, 0.38, pulse);
    vec2 q = p;
    q.y *= 1.2;
    return length(q) - r;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
    vec3 col = mix(vec3(0.0, 0.015, 0.04), vec3(0.0, 0.05, 0.1), clamp(uv.y * 0.5 + 0.5, 0.0, 1.0));

    vec2 pos = vec2(0.0, 0.05);

    for (int i = 0; i < 12; i++) {
        float fi = float(i);
        float dt = fi * 0.06;
        float tt = iTime - dt;
        float decay = exp(-fi * 0.35);
        vec2 p = uv - pos - vec2(sin(tt * 0.6) * 0.15, 0.0);
        float d = bellShape(p, tt);
        float glow = exp(-abs(d) * 22.0) * decay;
        vec3 c = palette(tt * 0.15, vec3(0.0, 0.3, 0.45), vec3(0.2, 0.4, 0.5), vec3(1.0, 1.0, 1.0), vec3(0.3, 0.55, 0.75));
        col += c * glow * 0.5;
    }

    fragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
