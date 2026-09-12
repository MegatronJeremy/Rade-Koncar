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
    float v = 0.0; float a = 0.5;
    for (int i = 0; i < 4; i++) { v += a * noise(p); p *= 2.0; a *= 0.5; }
    return v;
}

// density of ink cloud at 3D point
float density(vec3 p, float t) {
    float spread = clamp(t * 0.5, 0.001, 0.55);
    // flatten drop onto paper: squash Y
    vec3 q = p * vec3(1.0, 0.4, 1.0);
    float d = length(q) / spread;
    float baseShape = 1.0 - smoothstep(0.7, 1.0, d);
    // wispy surface noise
    float n = fbm(p.xz * 6.0 + vec2(t * 0.3, 0.0)) * 0.4;
    return clamp(baseShape + n * (1.0 - d * 0.5), 0.0, 1.0);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
    float t = iTime * 0.22;

    // orthographic top-down view
    vec3 ro = vec3(uv.x, 1.0, uv.y);
    vec3 rd = vec3(0.0, -1.0, 0.0);

    float acc = 0.0;
    float step = 0.04;
    for (int i = 0; i < 48; i++) {
        vec3 p = ro + rd * (float(i) * step);
        acc += density(p, t) * step * 3.5;
        if (acc >= 1.0) break;
    }
    acc = clamp(acc, 0.0, 1.0);

    vec3 col = mix(vec3(1.0), vec3(0.04, 0.04, 0.07), acc);
    fragColor = vec4(col, 1.0);
}
