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

    float r = length(p);
    float theta = atan(p.y, p.x);

    float t = iTime * 0.3;
    float growth = 0.15 + sqrt(iTime * 0.4) * 0.3;
    float fingerNoise = fbm(vec2(theta * 3.0, t)) + 0.5 * fbm(vec2(theta * 7.0 - t * 0.5, t * 0.7));
    float fingerRadius = growth * (0.6 + 0.5 * fingerNoise);

    float d = r - fingerRadius;
    float edge = smoothstep(0.08, -0.08, d);
    float dilution = exp(-r * 1.2) * exp(-iTime * 0.05);
    float ink = edge * clamp(dilution * 2.0 + 0.3, 0.0, 1.0);

    vec3 col = mix(paper, inkCol, clamp(ink, 0.0, 1.0));
    fragColor = vec4(col, 1.0);
}
