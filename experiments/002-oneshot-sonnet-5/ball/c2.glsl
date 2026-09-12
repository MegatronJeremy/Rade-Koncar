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

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;

    float floorY = -0.3;
    float period = 1.0;
    float tt = fract(iTime / period);
    float h = 4.0 * tt * (1.0 - tt);
    float radius = 0.15;
    vec2 center = vec2(0.0, floorY + radius + h * 0.5);

    vec2 warp = vec2(fbm(uv * 2.0 + iTime * 0.1), fbm(uv * 2.0 - iTime * 0.1 + 5.0));
    vec2 warpedUv = uv + (warp - 0.5) * 0.15;
    float pattern = fbm(warpedUv * 3.0 + vec2(0.0, iTime * 0.05));

    vec3 floorCol = mix(vec3(0.85), vec3(1.0), pattern);
    float floorMask = smoothstep(0.02, -0.02, uv.y - floorY);
    vec3 col = mix(vec3(0.75, 0.8, 0.85), floorCol, floorMask);

    float dBall = length(uv - center) - radius;
    float ballMask = smoothstep(0.01, -0.01, dBall);

    vec2 n2 = (uv - center) / radius;
    float nz = sqrt(max(1.0 - dot(n2, n2), 0.0));
    vec3 normal = normalize(vec3(n2, nz));
    vec3 lightDir = normalize(vec3(0.5, 0.7, 0.6));
    float diff = max(dot(normal, lightDir), 0.0);
    vec3 red = vec3(0.85, 0.1, 0.08) * (0.4 + 0.6 * diff);

    col = mix(col, red, ballMask);

    col = clamp(col, 0.0, 1.0);
    fragColor = vec4(col, 1.0);
}
