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

vec3 palette(float t, vec3 a, vec3 b, vec3 c, vec3 d) {
    return a + b * cos(6.28318 * (c * t + d));
}

vec3 bokehBG(vec2 uv) {
    vec3 col = vec3(0.02, 0.02, 0.05);
    for (int i = 0; i < 12; i++) {
        float fi = float(i);
        vec2 c = vec2(hash21(vec2(fi, 1.1)) * 2.0 - 1.0, hash21(vec2(fi, 2.2)) * 2.0 - 1.0);
        c.x *= 1.6;
        float r = 0.04 + 0.09 * hash21(vec2(fi, 3.3));
        float d = length(uv - c);
        float glow = r * r / (d * d + 0.001);
        vec3 tint = palette(hash21(vec2(fi, 4.4)), vec3(0.55, 0.5, 0.45), vec3(0.4, 0.35, 0.3), vec3(1.0), vec3(0.05, 0.2, 0.4));
        col += tint * glow * 0.04;
    }
    return col;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
    float clear = 0.0;
    float amp = 0.5;
    for (int i = 0; i < 4; i++) {
        float fi = float(i);
        vec2 p = uv * (2.0 + fi * 1.5);
        p.y += iTime * (0.3 + fi * 0.2);
        clear += amp * noise(p);
        amp *= 0.55;
    }
    clear = smoothstep(0.3, 0.9, clear);
    vec3 sharp = bokehBG(uv);
    vec3 blurred = bokehBG(uv * 0.4) * 0.6 + vec3(0.03);
    vec3 col = mix(blurred, sharp, clear);
    float drips = fbm(uv * vec2(6.0, 2.0) + vec2(0.0, iTime * 1.2));
    col += smoothstep(0.75, 0.85, drips) * 0.15;
    fragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
