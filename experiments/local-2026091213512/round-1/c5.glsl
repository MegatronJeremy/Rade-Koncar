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

float flameField(vec2 p, float t) {
    float sway = sin(t * 3.0 + p.y * 4.0) * 0.06 * p.y + (noise(vec2(p.y * 4.0, t * 3.0)) - 0.5) * 0.08 * p.y;
    p.x -= sway;
    float width = 0.2 * (1.0 - clamp(p.y, 0.0, 1.0)) + 0.02;
    float shape = smoothstep(width, width - 0.05, abs(p.x)) * smoothstep(-0.05, 0.05, p.y) * smoothstep(1.0, 0.4, p.y);
    return shape;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
    uv.y += 0.35;
    float t = iTime;
    vec3 col = vec3(0.0);
    const int ECHO = 8;
    for (int i = 0; i < ECHO; i++) {
        float fi = float(i);
        float delay = fi * 0.045;
        float w = pow(0.72, fi);
        float s = flameField(uv, t - delay);
        vec3 c = mix(vec3(1.0, 0.55, 0.05), vec3(0.5, 0.05, 0.0), fi / float(ECHO));
        col += c * s * w;
    }
    float vig = smoothstep(1.0, 0.15, length(uv - vec2(0.0, 0.1)));
    col *= vig;
    fragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}