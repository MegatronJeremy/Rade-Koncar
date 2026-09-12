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

    float ink = 0.0;
    float totalWeight = 0.0;
    const int TRAILS = 8;
    for (int k = 0; k < TRAILS; k++) {
        float fk = float(k);
        float tk = max(iTime - fk * 0.22, 0.0);
        float weight = exp(-fk * 0.35);
        vec2 drift = vec2(sin(tk * 0.4 + fk) * 0.05, tk * 0.12);
        vec2 samplePos = p * 2.5 + drift * 3.0;
        float n = fbm(samplePos + vec2(0.0, -tk * 0.3));
        float radius = 0.1 + sqrt(tk) * 0.3;
        float mask = smoothstep(radius, radius - 0.3, length(p));
        float layerInk = smoothstep(0.45, 0.9, n) * mask;
        ink += layerInk * weight;
        totalWeight += weight;
    }
    ink = clamp(ink / max(totalWeight, 0.0001), 0.0, 1.0);
    ink = pow(ink, 0.8);

    vec3 col = mix(paper, inkCol, ink);
    fragColor = vec4(col, 1.0);
}
