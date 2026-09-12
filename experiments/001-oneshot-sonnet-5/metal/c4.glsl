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

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;
    vec2 p = uv * 10.0;

    float cycle = mod(iTime * 0.15, 1.0);
    vec3 accumHot = vec3(0.0);
    vec3 accumDark = vec3(0.0);
    float totalW = 0.0;

    const int LAYERS = 6;
    for (int i = 0; i < LAYERS; i++) {
        float fi = float(i);
        vec2 cell = floor(p + fi * 3.7);
        float plateHash = hash21(cell);
        float localNoise = noise(p * (1.0 + fi * 0.3) + fi * 12.3);
        float grown = step(plateHash, cycle);
        float w = 1.0 / (fi + 1.0);
        accumHot += w * vec3(1.0, 0.4 + 0.3 * localNoise, 0.05) * (1.0 - grown);
        accumDark += w * vec3(0.05, 0.04, 0.045) * (0.6 + 0.4 * localNoise) * grown;
        totalW += w;
    }

    vec3 col = (accumHot + accumDark) / max(totalW, 1e-4);

    vec2 cellf = floor(p);
    float here = step(hash21(cellf), cycle);
    float rightN = step(hash21(cellf + vec2(1.0, 0.0)), cycle);
    float upN = step(hash21(cellf + vec2(0.0, 1.0)), cycle);
    vec2 f = fract(p);
    float edgeX = smoothstep(0.0, 0.08, f.x) * smoothstep(1.0, 0.92, f.x);
    float edgeY = smoothstep(0.0, 0.08, f.y) * smoothstep(1.0, 0.92, f.y);
    float boundary = (1.0 - edgeX) + (1.0 - edgeY);
    boundary = clamp(boundary, 0.0, 1.0) * here * (1.0 - rightN * upN);

    col += vec3(1.0, 0.35, 0.03) * boundary * 0.8;

    fragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
