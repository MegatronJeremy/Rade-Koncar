float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord.xy / iResolution.xy;
    vec2 p = uv * 2.0 - 1.0;
    p.x *= iResolution.x / iResolution.y;

    float r = length(p);
    float a = atan(p.y, p.x + 1e-5);

    vec3 bg = vec3(0.03, 0.04, 0.08);
    vec3 col = bg;

    if (r < 1.0) {
        vec3 inside = mix(vec3(0.1, 0.12, 0.2), vec3(0.4, 0.45, 0.55), (p.y + 1.0) * 0.5);

        float growth = clamp(iTime * 0.03, 0.0, 0.5);
        float ground = -0.85 + growth + 0.05 * sin(p.x * 8.0);
        float pileMask = 1.0 - smoothstep(ground - 0.02, ground + 0.02, p.y);

        float snow = 0.0;
        for (int i = 0; i < 5; i++) {
            float fi = float(i);
            float swirl = a + r * 1.5 + iTime * (0.15 + fi * 0.05);
            float fall = r - iTime * (0.08 + fi * 0.03);
            vec2 polarGrid = vec2(swirl * (3.0 + fi), fall * (10.0 + fi * 4.0));
            vec2 id = floor(polarGrid);
            vec2 f = fract(polarGrid) - 0.5;
            vec2 jitter = vec2(hash21(id + fi), hash21(id + fi + 2.0)) - 0.5;
            float size = 0.08 + 0.05 * hash21(id + fi + 6.0);
            float d = length(f - jitter * 0.6);
            snow += (1.0 - smoothstep(size * 0.2, size, d)) * (1.0 - fi * 0.15);
        }

        inside += vec3(snow) * 0.9;
        inside = mix(inside, vec3(0.93, 0.96, 1.0), pileMask);
        col = mix(bg, inside, 1.0 - smoothstep(0.97, 1.0, r));
    }

    float rim = smoothstep(0.965, 0.98, r) * (1.0 - smoothstep(0.98, 1.0, r));
    col += vec3(0.5, 0.6, 0.75) * rim;

    fragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
