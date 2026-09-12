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

float flameSDF(vec2 p, float t) {
    float flick = noise(vec2(p.y * 3.0, t * 4.0)) - 0.5;
    float sway = sin(t * 3.0 + p.y * 2.0) * 0.05 * p.y;
    p.x -= sway + flick * 0.06 * p.y;
    float width = 0.22 * (1.0 - p.y) * (1.0 - p.y) + 0.02;
    float d = abs(p.x) - width;
    d = max(d, p.y - 1.0);
    d = max(d, -p.y);
    return d;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
    vec2 p = uv;
    p.y += 0.35;
    float t = iTime;
    float d = flameSDF(p, t);
    float core = smoothstep(0.05, -0.02, d);
    float glow = smoothstep(0.35, -0.05, d);
    vec3 col = vec3(0.0);
    vec3 glowColor = mix(vec3(0.6, 0.1, 0.0), vec3(1.0, 0.5, 0.0), glow);
    col += glowColor * glow * 0.6;
    vec3 coreColor = mix(vec3(1.0, 0.6, 0.05), vec3(1.0, 0.95, 0.6), core);
    col += coreColor * core;
    float vig = smoothstep(1.2, 0.2, length(uv));
    col *= vig;
    fragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}