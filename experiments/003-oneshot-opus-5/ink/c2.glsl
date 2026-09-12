float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
}

vec2 hash22(vec2 p) {
    return vec2(hash21(p), hash21(p + vec2(31.41, 27.18)));
}

// returns distance to nearest voronoi cell
float voronoi(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    float minD = 9.0;
    for (int y = -1; y <= 1; y++) {
        for (int x = -1; x <= 1; x++) {
            vec2 neighbor = vec2(float(x), float(y));
            vec2 point = hash22(i + neighbor);
            vec2 diff = neighbor + point - f;
            float d = dot(diff, diff);
            minD = min(minD, d);
        }
    }
    return sqrt(minD);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;

    float t = iTime * 0.15;
    float radius = clamp(t * 0.6, 0.0, 0.6);

    // voronoi at moderate scale gives cracked/cellular bleed pattern
    float v = voronoi(uv * 7.0 + vec2(t * 0.2));

    // animate cells expanding from center
    float d = length(uv);
    // ink front: cells inside radius are filled, edge is voronoi-modulated
    float front = radius - d + 0.05 * (1.0 - v);
    float ink = smoothstep(-0.01, 0.04, front);

    // darker in center, slight rim effect
    float depthFade = 1.0 - 0.3 * smoothstep(0.0, radius * 0.8, d);
    ink *= depthFade;
    ink = clamp(ink, 0.0, 1.0);

    vec3 col = mix(vec3(1.0), vec3(0.03, 0.03, 0.05), ink);
    fragColor = vec4(col, 1.0);
}
