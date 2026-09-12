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

    float t = iTime * 0.12;
    float spread = clamp(t * 0.9, 0.0, 0.55);

    // two layers of domain warp — gives that feathery capillary look
    vec2 q = vec2(fbm(uv * 3.0 + vec2(0.0, t)),
                  fbm(uv * 3.0 + vec2(5.2, 1.3 + t)));
    vec2 r = vec2(fbm(uv * 3.0 + 4.0 * q + vec2(1.7, 9.2)),
                  fbm(uv * 3.0 + 4.0 * q + vec2(8.3, 2.8 + t * 0.5)));

    float f = fbm(uv * 2.5 + 4.0 * r);

    // ink is concentrated near origin; warp pulls it outward over time
    float d = length(uv) - spread * (0.7 + 0.5 * f);
    float ink = 1.0 - smoothstep(-0.02, 0.08, d);
    ink = clamp(ink, 0.0, 1.0);

    vec3 col = mix(vec3(1.0), vec3(0.03, 0.03, 0.06), ink);
    fragColor = vec4(col, 1.0);
}
