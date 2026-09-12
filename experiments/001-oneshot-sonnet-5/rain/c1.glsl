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

vec3 palette(float t, vec3 a, vec3 b, vec3 c, vec3 d) {
    return a + b * cos(6.28318 * (c * t + d));
}

vec3 bokehBG(vec2 uv, float t) {
    vec3 col = vec3(0.02, 0.02, 0.05);
    for (int i = 0; i < 12; i++) {
        float fi = float(i);
        vec2 c = vec2(hash21(vec2(fi, 2.1)) * 2.0 - 1.0, hash21(vec2(fi, 4.4)) * 2.0 - 1.0);
        c.x *= 1.6;
        float r = 0.04 + 0.08 * hash21(vec2(fi, 6.6));
        float d = length(uv - c);
        float glow = r * r / (d * d + 0.0008);
        vec3 tint = palette(hash21(vec2(fi, 8.8)), vec3(0.55, 0.5, 0.45), vec3(0.4, 0.35, 0.3), vec3(1.0), vec3(0.05, 0.2, 0.4));
        col += tint * glow * 0.045;
    }
    return col;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
    vec2 warpUV = uv * 2.0;
    vec2 q = vec2(fbm(warpUV + iTime * 0.05), fbm(warpUV + vec2(5.2, 1.3) + iTime * 0.04));
    vec2 r = vec2(fbm(warpUV + 4.0 * q + vec2(1.7, 9.2) + iTime * 0.03), fbm(warpUV + 4.0 * q + vec2(8.3, 2.8)));
    vec2 finalUV = uv + (r - 0.5) * 0.5;
    vec3 col = bokehBG(finalUV, iTime);
    float fog = fbm(uv * 3.0 + r * 2.0);
    col = mix(col, vec3(fog * 0.3 + 0.05), 0.15);
    vec2 streakUV = uv * vec2(8.0, 1.0);
    streakUV.y += iTime * 1.5;
    float streak = fbm(streakUV * vec2(1.0, 4.0));
    streak = smoothstep(0.55, 0.75, streak);
    col += streak * 0.08;
    fragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
