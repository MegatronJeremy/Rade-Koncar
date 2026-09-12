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
float fbm(vec2 p) {
    float v = 0.0; float a = 0.5;
    for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.0; a *= 0.5; }
    return v;
}
vec3 palette(float t, vec3 a, vec3 b, vec3 c, vec3 d) {
    return a + b * cos(6.28318 * (c * t + d));
}
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
    float t = iTime;
    float pulse = 0.5 + 0.5 * sin(t * 2.3);
    vec3 col = vec3(0.0, 0.008, 0.032);
    // water caustic shimmer layer
    float caustic = fbm(uv * 3.5 + t * 0.12) * fbm(uv * 4.2 - t * 0.09);
    col += vec3(0.0, 0.04, 0.12) * caustic;
    // jellyfish center
    vec2 jc = vec2(sin(t * 0.25) * 0.12, sin(t * 0.38) * 0.07);
    vec2 p = uv - jc;
    float rad = length(p);
    float angle = atan(p.x, p.y);
    float bellR = 0.17 * (1.0 + 0.1 * pulse);
    // layer 1: core bright nucleus
    float core = exp(-rad * rad / max(bellR * bellR * 0.06, 0.0001));
    col += vec3(0.5, 1.0, 0.9) * core * 0.7 * pulse;
    // layer 2: mid bell glow, scalloped
    float scallop = 1.0 + 0.12 * sin(angle * 8.0 + t * 2.0);
    float bellGlow = exp(-abs(rad - bellR * 0.6 * scallop) * 18.0);
    bellGlow *= smoothstep(bellR * 1.1, -bellR * 0.1, rad - p.y * 0.4);
    col += palette(rad / max(bellR, 0.001) + t * 0.1,
        vec3(0.05, 0.4, 0.6), vec3(0.08, 0.38, 0.38),
        vec3(1.0, 0.8, 0.5), vec3(0.0, 0.3, 0.62)) * bellGlow * 0.55;
    // layer 3: outer halo bloom (gaussian)
    float halo = exp(-rad * rad / max(bellR * bellR * 0.9, 0.0001));
    col += vec3(0.08, 0.45, 0.7) * halo * 0.25 * (0.5 + 0.5 * pulse);
    // layer 4: pulsing ring at edge
    float ring = exp(-abs(rad - bellR) * 55.0);
    ring *= smoothstep(0.0, -0.6, (p.y - bellR * 0.4) / max(bellR, 0.001));
    col += vec3(0.4, 1.0, 0.85) * ring * 0.6;
    // layer 5: bioluminescent particle field (sparse glowing orbs on tentacles)
    for (int i = 0; i < 18; i++) {
        float fi = float(i);
        vec2 seed = vec2(fi * 0.37, fi * 0.71);
        vec2 h = hash22(seed);
        // distribute along tentacle directions
        float ta = 6.28318 * floor(fi / 2.0) / 9.0;
        float along = 0.05 + h.x * 0.25;
        float particlePhase = h.y * 6.28318;
        float particlePulse = 0.5 + 0.5 * sin(t * 3.0 + particlePhase);
        float sway = 0.015 * sin(along * 6.0 - t * 1.8 + fi);
        vec2 ppos = jc + vec2(sin(ta) * bellR + sway, cos(ta) * bellR + along) + vec2(sway, 0.0);
        float pd = length(uv - ppos);
        float ptGlow = exp(-pd * pd / 0.0003) * particlePulse;
        vec3 ptCol = palette(h.x + t * 0.15,
            vec3(0.1, 0.5, 0.7), vec3(0.1, 0.4, 0.3),
            vec3(0.8, 0.6, 0.4), vec3(h.y, 0.2, 0.5));
        col += ptCol * ptGlow * 0.6;
    }
    col = clamp(col, 0.0, 1.0);
    fragColor = vec4(col, 1.0);
}