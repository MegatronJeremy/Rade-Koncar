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
    float t = iTime * 0.3;

    vec2 warp1 = vec2(fbm(uv * 2.0 + vec2(0.0, t)), fbm(uv * 2.0 + vec2(5.2, -t)));
    vec2 warp2 = uv + warp1 * 0.8;
    float n = fbm(warp2 * 3.0 + warp1 * 2.0);

    float cool = 0.5 + 0.5 * sin(iTime * 0.4);
    float crustThresh = mix(0.35, 0.65, cool);

    float crackMask = smoothstep(crustThresh - 0.03, crustThresh, n) * (1.0 - smoothstep(crustThresh, crustThresh + 0.08, n));

    vec3 hotCol = palette(n, vec3(0.6, 0.25, 0.1), vec3(0.4, 0.25, 0.1), vec3(1.0, 1.0, 1.0), vec3(0.0, 0.05, 0.1));
    vec3 darkCol = vec3(0.03, 0.025, 0.03) + 0.02 * n;

    vec3 col = mix(darkCol, hotCol, smoothstep(crustThresh, crustThresh - 0.25, n));
    col += vec3(1.0, 0.45, 0.05) * crackMask * 1.5;

    fragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
