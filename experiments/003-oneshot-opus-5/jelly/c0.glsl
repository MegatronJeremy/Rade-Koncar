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
    // jellyfish drifts gently
    vec2 jpos = vec2(sin(t * 0.23) * 0.12, 0.05 + sin(t * 0.37) * 0.06);
    vec2 p = uv - jpos;
    float angle = atan(p.x, p.y); // 0 at top
    float rad = length(p);
    // pulsing bell radius, scalloped edge
    float pulse = 0.5 + 0.5 * sin(t * 2.8);
    float bellR = 0.16 * (1.0 + 0.10 * pulse);
    float scallop = 0.012 * sin(angle * 8.0 + t * 1.5);
    float edge = bellR + scallop;
    // dome mask: upper hemisphere (p.y < bellR*0.4 means above equator in Y-down)
    float inDome = smoothstep(edge + 0.008, edge - 0.008, rad) * step(p.y, bellR * 0.45);
    // inner radial bands
    float bands = 0.5 + 0.5 * sin(rad / max(edge, 0.001) * 12.0 - t * 3.0);
    // tentacles hanging down from bell edge
    float tents = 0.0;
    for (int i = 0; i < 10; i++) {
        float fi = float(i);
        float ta = 6.28318 * fi / 10.0;
        vec2 base = jpos + vec2(sin(ta), cos(ta)) * bellR * 0.85;
        vec2 q = uv - base;
        // sway and taper downward
        float along = q.y; // positive = down
        float sway = 0.018 * sin(along * 9.0 - t * 2.2 + fi * 1.3);
        float td = abs(q.x - sway) - 0.0025;
        float visible = smoothstep(0.0, 0.05, along) * smoothstep(0.28, 0.08, along);
        tents += visible * smoothstep(0.007, 0.0, td);
    }
    tents = clamp(tents, 0.0, 1.0);
    // deep water bg
    vec3 bg = vec3(0.0, 0.015, 0.045) + 0.008 * noise(uv * 4.0 + t * 0.08) * vec3(0.0, 0.4, 1.0);
    // bioluminescent palette: cyan/violet
    vec3 jellCol = palette(rad / max(edge, 0.001) * 0.6 + t * 0.12,
        vec3(0.05, 0.35, 0.55), vec3(0.05, 0.35, 0.35),
        vec3(1.0, 0.8, 0.4), vec3(0.0, 0.25, 0.6));
    float innerGlow = exp(-rad * rad / max(bellR * bellR * 0.25, 0.0001));
    vec3 col = bg;
    col += jellCol * inDome * (0.55 + 0.35 * bands);
    col += vec3(0.3, 0.9, 1.0) * innerGlow * 0.35 * (0.7 + 0.3 * pulse);
    col += vec3(0.1, 0.85, 0.9) * tents * 0.55;
    // rim glow at bell edge
    float rim = exp(-abs(rad - edge) * 80.0) * inDome;
    col += vec3(0.4, 1.0, 0.9) * rim * 0.5;
    col = clamp(col, 0.0, 1.0);
    fragColor = vec4(col, 1.0);
}