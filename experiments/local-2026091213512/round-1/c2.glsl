float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
    float t = iTime;
    vec3 col = vec3(0.0);
    vec2 basePos = vec2(0.0, -0.3);
    float flick = 0.9 + 0.1 * sin(t * 10.0) + 0.05 * sin(t * 23.0 + 1.0);
    float baseGlow = flick * 0.18 / (length(uv - basePos) * 8.0 + 0.05);
    col += vec3(1.0, 0.5, 0.1) * clamp(baseGlow, 0.0, 1.5);

    const int N = 24;
    for (int i = 0; i < N; i++) {
        float fi = float(i);
        vec2 seed = vec2(fi, fi * 3.1);
        float speed = 0.3 + hash21(seed) * 0.4;
        float life = fract(t * speed * 0.3 + hash21(seed + 1.0));
        float xOff = (hash21(seed + 2.0) - 0.5) * 0.25;
        vec2 pos = vec2(xOff + sin(t * 2.0 + fi) * 0.03, -0.35 + life * 0.9);
        float d = length(uv - pos);
        float size = mix(0.02, 0.002, life);
        float ember = size / (d * 20.0 + 0.01);
        float fade = smoothstep(1.0, 0.6, life);
        vec3 emberColor = mix(vec3(1.0, 0.4, 0.05), vec3(0.6, 0.05, 0.0), life);
        col += emberColor * clamp(ember, 0.0, 1.0) * fade;
    }
    fragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}