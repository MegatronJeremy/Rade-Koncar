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

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
    vec3 ro = vec3(0.0, 0.0, -1.0);
    vec3 rd = normalize(vec3(uv, 1.2));
    float t = 0.0;
    float density = 0.0;
    for (int i = 0; i < 32; i++) {
        vec3 p = ro + rd * t;
        float n = fbm(p.xy * 0.8 + vec2(0.0, iTime * 0.15) + p.z * 0.1);
        float d = n * 0.5 - 0.15;
        density += max(d, 0.0) * 0.05;
        t += 0.15;
        if (t > 4.5) break;
    }

    vec3 bokehCol = vec3(0.0);
    for (int i = 0; i < 10; i++) {
        float fi = float(i);
        vec3 lp = vec3((hash21(vec2(fi, 1.0)) * 2.0 - 1.0) * 1.8, (hash21(vec2(fi, 2.0)) * 2.0 - 1.0) * 1.0, 1.5 + 2.5 * hash21(vec2(fi, 3.0)));
        vec2 proj = lp.xy / lp.z;
        float r = 0.03 * lp.z + 0.02;
        float d = length(uv - proj);
        float glow = r * r / (d * d + 0.001);
        vec3 tint = palette(hash21(vec2(fi, 5.0)), vec3(0.55, 0.5, 0.45), vec3(0.4, 0.4, 0.3), vec3(1.0), vec3(0.1, 0.25, 0.4));
        bokehCol += tint * glow * 0.03;
    }

    vec3 col = bokehCol * (1.0 - density * 0.6) + vec3(0.02, 0.02, 0.05);

    vec2 ruv = uv * vec2(10.0, 1.0);
    ruv.y += iTime * 2.0;
    vec2 rid = floor(ruv);
    vec2 rf = fract(ruv);
    float streak = hash21(rid);
    float line = smoothstep(0.0, 0.05, rf.x) * smoothstep(0.12, 0.07, rf.x);
    col += line * 0.06 * step(0.6, streak);

    fragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
