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

float groundHeight(vec2 xz, float growth) {
    return -1.0 + growth + 0.15 * fbm(xz * 0.5);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord.xy - 0.5 * iResolution.xy) / iResolution.y;

    vec3 ro = vec3(0.0, 0.2, -2.5);
    vec3 rd = normalize(vec3(uv, 1.0));

    float growth = clamp(iTime * 0.02, 0.0, 0.5);

    vec3 col = mix(vec3(0.05, 0.06, 0.12), vec3(0.3, 0.35, 0.45), clamp(uv.y * 0.5 + 0.5, 0.0, 1.0));

    float t = 0.0;
    float hit = 0.0;
    vec3 pos = ro;
    for (int i = 0; i < 48; i++) {
        pos = ro + rd * t;
        float gh = groundHeight(pos.xz, growth);
        float d = pos.y - gh;
        if (d < 0.01) {
            hit = 1.0;
            break;
        }
        t += max(d * 0.5, 0.02);
        if (t > 12.0) break;
    }

    if (hit > 0.5) {
        float shade = 0.85 + 0.15 * fbm(pos.xz * 4.0);
        col = vec3(0.92, 0.95, 1.0) * shade;
        float fog = clamp(t / 12.0, 0.0, 1.0);
        col = mix(col, vec3(0.3, 0.35, 0.45), fog * 0.6);
    }

    float snow = 0.0;
    for (int i = 0; i < 5; i++) {
        float fi = float(i);
        vec2 sp = uv * (8.0 + fi * 5.0);
        sp.y += iTime * (1.0 + fi * 0.4) * 3.0;
        vec2 id = floor(sp);
        vec2 f = fract(sp) - 0.5;
        vec2 jitter = vec2(hash21(id + fi), hash21(id + fi + 2.5)) - 0.5;
        float size = 0.06 + 0.05 * hash21(id + fi + 8.0);
        float d = length(f - jitter * 0.6);
        snow += (1.0 - smoothstep(size * 0.15, size, d)) * (1.0 - fi * 0.15);
    }
    col += vec3(snow) * 0.8;

    fragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
