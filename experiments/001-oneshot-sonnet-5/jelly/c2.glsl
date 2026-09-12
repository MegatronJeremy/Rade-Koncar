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

vec3 palette(float t, vec3 a, vec3 b, vec3 c, vec3 d) {
    return a + b * cos(6.28318 * (c * t + d));
}

float particles(vec2 p, float t) {
    float v = 0.0;
    for (int i = 0; i < 4; i++) {
        float fi = float(i);
        vec2 q = p * (1.0 + fi * 0.7) + vec2(0.0, t * (0.08 + fi * 0.04));
        float n = noise(q * 8.0);
        v += smoothstep(0.86, 1.0, n) / (fi + 1.0);
    }
    return v;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
    vec3 col = mix(vec3(0.0, 0.015, 0.05), vec3(0.0, 0.05, 0.1), clamp(uv.y * 0.5 + 0.5, 0.0, 1.0));

    float p = particles(uv, iTime);
    vec3 pcol = palette(p + iTime * 0.1, vec3(0.0, 0.3, 0.4), vec3(0.3, 0.4, 0.5), vec3(1.0, 1.0, 0.8), vec3(0.2, 0.5, 0.7));
    col += pcol * p * 1.5;

    float bell = length(uv - vec2(0.0, 0.1));
    float pulse = 0.4 + 0.15 * sin(iTime * 2.0);
    float glow = exp(-pow(bell / pulse, 2.0) * 6.0);
    col += vec3(0.2, 0.8, 0.9) * glow * 0.5;

    fragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
