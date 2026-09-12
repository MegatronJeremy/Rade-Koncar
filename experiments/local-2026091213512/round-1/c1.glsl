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

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
    float t = iTime;
    vec2 p = uv;
    p.y += 0.4;
    vec2 q = vec2(fbm(p * 3.0 + vec2(0.0, -t * 1.5)), fbm(p * 3.0 + vec2(5.2, -t * 1.5)));
    vec2 r = vec2(fbm(p * 3.0 + 4.0 * q + vec2(1.7, 9.2) + t * 0.5), fbm(p * 3.0 + 4.0 * q + vec2(8.3, 2.8) - t * 0.3));
    float f = fbm(p * 2.0 + 2.0 * r);
    float denom = 0.3 + p.y * 0.6;
    float envelope = exp(-8.0 * p.x * p.x / denom) * smoothstep(1.1, -0.1, p.y) * smoothstep(-0.15, 0.05, p.y);
    float intensity = clamp(f * envelope, 0.0, 1.0);
    vec3 col = palette(intensity, vec3(0.3, 0.1, 0.0), vec3(0.7, 0.4, 0.1), vec3(1.0, 1.0, 0.5), vec3(0.0, 0.1, 0.2));
    col *= intensity * 1.8;
    fragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}