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

// one column of dripping water
float drip(vec2 uv, float col, float t) {
    float cx = fract(uv.x * 50.0 - col * 0.618);
    float speed = 0.4 + hash21(vec2(col, 0.0)) * 1.2;
    float cy = fract(uv.y + t * speed + hash21(vec2(col, 1.0)));
    float blobY = hash21(vec2(col, 2.0 + floor(uv.y + t * speed)));
    // drip bead
    float bead = exp(-cy * cy * 300.0 - cx * cx * 1200.0) * step(0.5, blobY);
    // tail trailing upward from bead
    float tail = smoothstep(0.08, 0.0, cy) * smoothstep(0.006, 0.0, abs(cx)) * step(0.5, blobY);
    return clamp(bead * 2.0 + tail * 0.5, 0.0, 1.0);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;

    // blurry city lights using fbm
    vec2 bgUV = uv * 3.0 + vec2(0.5, 0.2);
    float city = fbm(bgUV);
    vec3 bg = palette(city, vec3(0.1, 0.1, 0.2), vec3(0.2, 0.2, 0.3), vec3(1.0, 1.0, 1.0), vec3(0.0, 0.15, 0.4));
    // punch some bright point lights through
    for (int i = 0; i < 12; i++) {
        float fi = float(i);
        vec2 lp = vec2(hash21(vec2(fi, 0.0)), hash21(vec2(fi, 1.0)) * 0.9 + 0.05);
        float d = length(uv - lp);
        float r = 0.04 + hash21(vec2(fi, 2.0)) * 0.06;
        float g = exp(-d * d / max(r * r * 0.5, 1e-5));
        vec3 lc = mix(vec3(1.0, 0.6, 0.1), vec3(0.4, 0.7, 1.0), hash21(vec2(fi, 3.0)));
        bg += lc * g * 0.7;
    }
    bg = clamp(bg, 0.0, 1.0);

    // layered drip columns at different densities
    float d1 = 0.0;
    for (float c = 0.0; c < 20.0; c++) {
        d1 += drip(uv, c, iTime);
    }
    float d2 = 0.0;
    for (float c = 0.0; c < 15.0; c++) {
        d2 += drip(uv * vec2(0.7, 1.2) + vec2(0.23, 0.0), c + 20.0, iTime * 0.8);
    }
    float wetMask = clamp(d1 + d2, 0.0, 1.0);

    vec3 wetColor = vec3(0.3, 0.4, 0.65) + bg * 0.55;
    vec3 col = mix(bg, wetColor, wetMask * 0.9);
    fragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}