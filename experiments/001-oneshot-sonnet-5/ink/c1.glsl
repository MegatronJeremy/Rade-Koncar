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
    vec2 p = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
    vec3 paper = vec3(0.97, 0.96, 0.93);
    vec3 inkCol = vec3(0.04, 0.05, 0.08);

    float t = iTime * 0.15;
    vec2 warp = vec2(fbm(p * 2.0 + vec2(0.0, t)), fbm(p * 2.0 + vec2(5.2, -t)));
    vec2 q = p + (warp - 0.5) * 0.6;
    float density = fbm(q * 2.2 - vec2(0.0, t * 0.5));

    float radius = 0.15 + sqrt(iTime * 0.5) * 0.25;
    float mask = smoothstep(radius, radius - 0.4, length(p));

    float ink = clamp(density * mask * 1.4, 0.0, 1.0);
    ink = smoothstep(0.15, 0.75, ink);

    vec3 col = mix(paper, inkCol, ink);
    fragColor = vec4(col, 1.0);
}
