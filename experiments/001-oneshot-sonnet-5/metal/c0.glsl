float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
}

vec2 hash22(vec2 p) {
    float n = hash21(p);
    float n2 = hash21(p + 17.13);
    return vec2(n, n2);
}

vec2 voronoi(vec2 p) {
    vec2 ip = floor(p);
    vec2 fp = fract(p);
    float f1 = 8.0;
    float f2 = 8.0;
    for (int y = -1; y <= 1; y++) {
        for (int x = -1; x <= 1; x++) {
            vec2 offset = vec2(float(x), float(y));
            vec2 pt = hash22(ip + offset);
            vec2 diff = offset + pt - fp;
            float d = dot(diff, diff);
            if (d < f1) {
                f2 = f1;
                f1 = d;
            } else if (d < f2) {
                f2 = d;
            }
        }
    }
    return vec2(sqrt(f1), sqrt(f2));
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;
    vec2 p = uv * 6.0;
    vec2 vf = voronoi(p + vec2(0.3 * sin(iTime * 0.4), 0.2 * cos(iTime * 0.3)));
    float edge = vf.y - vf.x;
    float crack = smoothstep(0.0, 0.06, edge);
    float cool = 0.5 + 0.5 * sin(iTime * 0.5 - 1.5708);
    vec3 darkCrust = vec3(0.05, 0.04, 0.045) * (0.6 + 0.4 * hash21(floor(p)));
    float glow = 1.0 - smoothstep(0.0, 0.15, edge);
    vec3 hot = mix(vec3(1.0, 0.8, 0.3), vec3(1.0, 0.25, 0.02), cool);
    vec3 col = mix(darkCrust, hot, glow * (0.4 + 0.6 * (1.0 - cool)));
    fragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
