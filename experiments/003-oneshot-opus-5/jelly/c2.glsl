float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
}
vec2 hash22(vec2 p) {
    return vec2(hash21(p), hash21(p + vec2(3.7, 1.9)));
}
float noise(vec2 p) {
    vec2 i = floor(p); vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash21(i), b = hash21(i + vec2(1,0)), c = hash21(i + vec2(0,1)), d = hash21(i + vec2(1,1));
    return mix(mix(a,b,f.x), mix(c,d,f.x), f.y);
}
vec3 palette(float t, vec3 a, vec3 b, vec3 c, vec3 d) {
    return a + b * cos(6.28318 * (c * t + d));
}
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;
    // map to [-1.5, 1.5] x [-1.5, 1.5] Voronoi grid
    vec2 gp = uv * 3.0 - 1.5;
    float t = iTime;
    // find 3 closest Voronoi cells in 4x3 grid
    float minD1 = 9.9, minD2 = 9.9, minD3 = 9.9;
    vec2 minCell = vec2(0.0);
    float minId = 0.0;
    for (int x = -2; x <= 2; x++) {
        for (int y = -1; y <= 1; y++) {
            vec2 cell = vec2(float(x), float(y));
            vec2 h = hash22(cell);
            // each jellyfish drifts on its own Lissajous
            float phase = h.x * 6.28318;
            vec2 drift = vec2(
                h.x * 0.25 * sin(t * (0.3 + h.y * 0.3) + phase),
                h.y * 0.15 * cos(t * (0.4 + h.x * 0.2) + phase + 1.0)
            );
            vec2 p = cell + h * 0.5 + drift - gp;
            float d = length(p);
            if (d < minD1) { minD3 = minD2; minD2 = minD1; minD1 = d; minCell = cell + h * 0.5 + drift; minId = hash21(cell); }
            else if (d < minD2) { minD3 = minD2; minD2 = d; }
            else if (d < minD3) { minD3 = d; }
        }
    }
    // per-cell pulse driven by unique id
    float cellPhase = minId * 6.28318;
    float pulse = 0.5 + 0.5 * sin(t * 2.2 + cellPhase);
    // radial distance from the nearest cell center
    float r = length(gp - minCell);
    float bellR = 0.28 * (1.0 + 0.1 * pulse);
    // bell dome
    float dome = smoothstep(bellR + 0.02, bellR - 0.02, r);
    // edge ring
    float ring = exp(-abs(r - bellR) * 35.0);
    // cell border (deep water gaps)
    float border = smoothstep(0.04, 0.12, minD2 - minD1);
    // bioluminescent glow falls off with r
    float glow = exp(-r * r / max(bellR * bellR * 0.3, 0.0001)) * pulse;
    vec3 jellCol = palette(minId + r / max(bellR, 0.001) * 0.5 + t * 0.08,
        vec3(0.04, 0.35, 0.55), vec3(0.08, 0.4, 0.4),
        vec3(0.9, 0.7, 0.4), vec3(minId, 0.3, 0.6));
    vec3 bgCol = vec3(0.0, 0.01, 0.04) + 0.005 * noise(uv * 5.0 + t * 0.06) * vec3(0.0, 0.3, 1.0);
    vec3 col = bgCol;
    col += jellCol * dome * border * 0.65;
    col += vec3(0.3, 1.0, 0.95) * glow * border * 0.4;
    col += vec3(0.5, 1.0, 0.9) * ring * border * 0.45;
    col = clamp(col, 0.0, 1.0);
    fragColor = vec4(col, 1.0);
}