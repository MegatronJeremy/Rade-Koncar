float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
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
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
    float t = iTime;
    // two jellyfish offset in time and space
    vec3 col = vec3(0.0, 0.01, 0.04);
    // water shimmer
    col += 0.007 * noise(uv * 5.0 + t * 0.09) * vec3(0.0, 0.35, 1.0);
    for (int j = 0; j < 2; j++) {
        float fj = float(j);
        float tOff = fj * 1.3;
        float tLocal = t + tOff;
        float pulse = 0.5 + 0.5 * sin(tLocal * 2.4);
        vec2 jc = vec2(sin(tLocal * 0.31 + fj * 2.1) * 0.22, sin(tLocal * 0.19 + fj * 3.7) * 0.1);
        vec2 p = uv - jc;
        float rad = length(p);
        float theta = atan(p.x, p.y); // 0 at top
        // polar bell boundary with pulsing + scallop
        float bellR = (0.13 + 0.03 * fj) * (1.0 + 0.11 * pulse);
        float bellBound = bellR * (1.0 + 0.08 * sin(theta * 8.0 + tLocal * 1.8));
        // radial wave rings expanding outward from center
        float rn = rad / max(bellBound, 0.001);
        // 3 concentric pulsing rings inside dome
        float rings = 0.0;
        for (int ri = 1; ri <= 3; ri++) {
            float fr = float(ri);
            float ringR = fr * 0.28 + 0.05 * pulse;
            rings += exp(-abs(rn - ringR) * 28.0) * (1.0 - fr * 0.2);
        }
        rings = clamp(rings, 0.0, 1.0);
        // dome mask: inside bell boundary, upper half
        float dome = smoothstep(bellBound + 0.01, bellBound - 0.01, rad)
                    * smoothstep(bellBound * 0.05, -bellBound * 0.05, p.y - bellBound * 0.4);
        float innerGlow = exp(-rad * rad / max(bellBound * bellBound * 0.18, 0.0001)) * pulse;
        // rim light at bell boundary
        float rim = exp(-abs(rad - bellBound) * 65.0) * dome;
        vec3 jCol = palette(rn * 0.5 + tLocal * 0.07 + fj * 0.4,
            vec3(0.05 + fj * 0.05, 0.35, 0.55), vec3(0.07, 0.4, 0.38),
            vec3(1.0, 0.9, 0.5), vec3(fj * 0.3, 0.25, 0.6));
        col += jCol * dome * (0.45 + 0.45 * rings);
        col += vec3(0.25, 0.85, 1.0) * innerGlow * 0.35;
        col += vec3(0.45, 1.0, 0.9) * rim * 0.55;
        // tentacle polar fans below bell
        for (int k = 0; k < 10; k++) {
            float fk = float(k);
            float ta = 6.28318 * fk / 10.0;
            vec2 tdir = vec2(sin(ta), 1.0); // mostly downward
            vec2 base = jc + vec2(sin(ta), cos(ta)) * bellBound * 0.9;
            vec2 q = uv - base;
            float along = q.y;
            float sway = 0.02 * sin(along * 8.0 - tLocal * 2.0 + fk * 0.7);
            float td = abs(q.x - sway) - 0.0022;
            float fade = smoothstep(0.0, 0.03, along) * smoothstep(0.22, 0.04, along);
            col += vec3(0.1, 0.85 + fj * 0.1, 0.85) * 0.45 * fade * smoothstep(0.006, 0.0, td);
        }
    }
    col = clamp(col, 0.0, 1.0);
    fragColor = vec4(col, 1.0);
}