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
    // water caustic background via two-layer fbm warp
    vec2 q = uv * 2.5;
    vec2 warp1 = vec2(fbm(q + t * 0.15), fbm(q + vec2(5.2, 1.3) + t * 0.12));
    vec2 warp2 = vec2(fbm(q + 4.0 * warp1 + t * 0.08), fbm(q + 4.0 * warp1 + vec2(1.7, 9.2) + t * 0.07));
    float waterF = fbm(q + 4.0 * warp2);
    vec3 waterCol = mix(vec3(0.0, 0.02, 0.07), vec3(0.0, 0.08, 0.18), waterF);
    // jellyfish bell via warped radial field
    float pulse = 0.5 + 0.5 * sin(t * 2.5);
    vec2 jc = vec2(sin(t * 0.27) * 0.1, sin(t * 0.41) * 0.05);
    vec2 pj = uv - jc;
    // warp the distance field for organic shape
    vec2 jq = pj * 4.0;
    float jWarp = fbm(jq + t * 0.5) * 0.18;
    float jrad = length(pj) + jWarp * 0.5;
    float bellR = 0.18 * (1.0 + 0.12 * pulse);
    // bell: soft disk with warped edge
    float bell = smoothstep(bellR + 0.03, bellR - 0.03, jrad) * step(pj.y, bellR * 0.5);
    // internal texture: warped fbm brightness
    float jTex = fbm(pj * 8.0 + t * 0.4);
    // trailing tentacles: domain warped vertical streaks
    vec2 tq = uv - jc - vec2(0.0, bellR);
    float txWarp = fbm(tq * 3.0 + vec2(0.0, t * 0.3)) * 0.1;
    float tyWarp = fbm(tq * 3.0 + vec2(7.3, t * 0.25)) * 0.12;
    vec2 tw = tq + vec2(txWarp, tyWarp);
    // thin vertical streaks
    float tStreak = 0.0;
    for (int i = 0; i < 7; i++) {
        float fi = float(i);
        float ox = (fi - 3.0) * 0.04;
        float streak = exp(-abs(tw.x - ox) * 55.0);
        float fade = smoothstep(0.0, 0.04, tw.y) * smoothstep(0.35, 0.08, tw.y);
        tStreak += streak * fade;
    }
    tStreak = clamp(tStreak, 0.0, 1.0);
    float innerR = length(pj) / max(bellR, 0.001);
    vec3 jellCol = palette(innerR * 0.7 + jTex * 0.3 + t * 0.1,
        vec3(0.05, 0.4, 0.6), vec3(0.1, 0.35, 0.4),
        vec3(0.8, 1.0, 0.5), vec3(0.1, 0.3, 0.65));
    vec3 col = waterCol;
    col += jellCol * bell * (0.5 + 0.4 * jTex);
    col += vec3(0.2, 0.9, 1.0) * exp(-jrad * jrad / 0.04) * 0.3 * pulse;
    col += vec3(0.15, 0.8, 0.85) * tStreak * 0.5;
    col = clamp(col, 0.0, 1.0);
    fragColor = vec4(col, 1.0);
}