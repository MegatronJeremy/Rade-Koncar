vec2 hash2(vec2 p) {
    p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
    return fract(sin(p) * 43758.5453);
}

float voronoi(vec2 p, float t) {
    vec2 ip = floor(p);
    vec2 fp = fract(p);
    float minD = 1.0;
    for (int y = -1; y <= 1; y++) {
        for (int x = -1; x <= 1; x++) {
            vec2 g = vec2(float(x), float(y));
            vec2 o = hash2(ip + g);
            o = 0.5 + 0.5 * sin(t * 2.0 + 6.2831 * o);
            vec2 r = g + o - fp;
            float d = dot(r, r);
            minD = min(minD, d);
        }
    }
    return sqrt(minD);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
    float t = iTime;
    vec2 p = uv;
    p.y += 0.35;

    float k = clamp((p.y + 0.5) / 1.1, 0.0, 1.0);
    float width = mix(0.4, 0.02, k);
    float sway = 0.08 * sin(t * 2.0 + p.y * 3.0);
    float envelope = 1.0 - smoothstep(width * 0.8, width * 1.3, abs(p.x - sway * (1.0 - k)));
    envelope *= smoothstep(-0.55, -0.35, p.y) * smoothstep(0.75, 0.15, p.y);

    vec2 vp = p * 6.0 + vec2(0.0, -t * 1.5);
    float v = voronoi(vp, t);
    float cell = 1.0 - smoothstep(0.0, 0.5, v);

    vec3 hot = vec3(1.0, 0.9, 0.5);
    vec3 mid = vec3(1.0, 0.45, 0.05);
    vec3 outerc = vec3(0.5, 0.03, 0.0);
    vec3 col = mix(outerc, mid, clamp(cell * 1.4, 0.0, 1.0));
    col = mix(col, hot, clamp((cell - 0.55) * 2.2, 0.0, 1.0));
    col *= envelope;

    vec2 sp = p * 3.0 + vec2(0.0, -t * 0.8);
    float sv = voronoi(sp + 17.0, t * 1.3);
    float spark = smoothstep(0.04, 0.0, sv) * smoothstep(0.9, 0.2, p.y) * step(0.0, p.y);
    col += vec3(1.0, 0.6, 0.2) * spark * 0.6;

    col = clamp(col, 0.0, 1.0);
    fragColor = vec4(col, 1.0);
}
