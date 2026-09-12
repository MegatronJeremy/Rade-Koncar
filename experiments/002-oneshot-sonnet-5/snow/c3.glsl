float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
}

vec2 hash22(vec2 p) {
    float n = sin(dot(p, vec2(41.3, 289.1)));
    return fract(vec2(262144.0, 32768.0) * n);
}

float voronoi(vec2 p, out vec2 cellId) {
    vec2 ip = floor(p);
    vec2 fp = fract(p);
    float minD = 8.0;
    vec2 minC = vec2(0.0);
    for (int y = -1; y <= 1; y++) {
        for (int x = -1; x <= 1; x++) {
            vec2 offset = vec2(float(x), float(y));
            vec2 h = hash22(ip + offset);
            vec2 r = offset + h - fp;
            float d = dot(r, r);
            if (d < minD) {
                minD = d;
                minC = ip + offset;
            }
        }
    }
    cellId = minC;
    return sqrt(minD);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord.xy / iResolution.xy;
    vec2 p = uv;
    p.x *= iResolution.x / iResolution.y;

    vec3 col = mix(vec3(0.07, 0.08, 0.13), vec3(0.3, 0.35, 0.45), uv.y);

    float growth = clamp(iTime * 0.03, 0.0, 0.25);
    float groundNoise = hash21(vec2(floor(p.x * 40.0), 0.0));
    float ground = 0.1 + growth + groundNoise * 0.02;
    float pileMask = 1.0 - smoothstep(ground - 0.01, ground + 0.01, p.y);

    float snow = 0.0;
    for (int i = 0; i < 4; i++) {
        float fi = float(i);
        vec2 sp = p * (7.0 + fi * 5.0);
        sp.y += iTime * (0.5 + fi * 0.2) * 5.0;
        vec2 cellId;
        float d = voronoi(sp, cellId);
        float flakeSel = step(0.85, hash21(cellId + fi * 3.0));
        float flake = (1.0 - smoothstep(0.05, 0.28, d)) * flakeSel;
        snow += flake * (1.0 - fi * 0.15);
    }
    col += vec3(snow) * 0.95;

    vec2 cellId2;
    float cracks = voronoi(p * 25.0, cellId2);
    vec3 pileColor = vec3(0.92, 0.95, 1.0) - vec3(0.05) * smoothstep(0.0, 0.08, cracks);
    col = mix(col, pileColor, pileMask);

    fragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
