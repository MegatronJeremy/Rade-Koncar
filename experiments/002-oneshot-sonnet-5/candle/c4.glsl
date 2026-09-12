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

float layer(vec2 p, float t, float seed) {
    vec2 q = p;
    q.y += t;
    q.x += 0.15 * sin(t * 2.0 + seed * 6.0 + p.y * 3.0);
    float n = noise(q * 3.0 + seed * 10.0);
    n += 0.5 * noise(q * 6.0 + seed * 20.0);
    return n / 1.5;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
    float t = iTime;
    vec2 p = uv;
    p.y += 0.4;

    float k = clamp((p.y + 0.5) / 1.1, 0.0, 1.0);
    float width = mix(0.35, 0.03, k);
    float envelope = 1.0 - smoothstep(width * 0.8, width * 1.3, abs(p.x));
    envelope *= smoothstep(-0.55, -0.35, p.y) * smoothstep(0.7, 0.2, p.y);

    float acc = 0.0;
    for (int i = 0; i < 5; i++) {
        float fi = float(i);
        acc += layer(p * (1.0 + 0.1 * fi), -t * (0.6 + 0.15 * fi), fi) * (1.0 / (1.0 + fi * 0.6));
    }
    acc /= 2.2;
    acc *= envelope;

    vec3 hot = vec3(1.0, 0.9, 0.55);
    vec3 mid = vec3(1.0, 0.45, 0.05);
    vec3 outerc = vec3(0.4, 0.02, 0.0);
    vec3 col = mix(outerc, mid, clamp(acc * 1.6, 0.0, 1.0));
    col = mix(col, hot, clamp((acc - 0.45) * 2.2, 0.0, 1.0));
    col *= envelope;

    col = clamp(col, 0.0, 1.0);
    fragColor = vec4(col, 1.0);
}
