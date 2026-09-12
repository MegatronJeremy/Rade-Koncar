vec2 hash22(vec2 p) {
    p = vec2(dot(p, vec2(127.1,311.7)), dot(p, vec2(269.5,183.3)));
    return fract(sin(p) * 43758.5453);
}

vec3 palette(float t, vec3 a, vec3 b, vec3 c, vec3 d) {
    return a + b * cos(6.28318 * (c * t + d));
}

float voronoi(vec2 p) {
    vec2 ip = floor(p);
    vec2 fp = fract(p);
    float minD = 8.0;
    for (int y = -1; y <= 1; y++) {
        for (int x = -1; x <= 1; x++) {
            vec2 g = vec2(float(x), float(y));
            vec2 o = hash22(ip + g);
            vec2 pos = g + 0.5 + 0.4 * sin(6.2831 * o + iTime * 0.6) - fp;
            float d = length(pos);
            minD = min(minD, d);
        }
    }
    return minD;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
    vec2 pivot = vec2(0.0, 0.7);
    float angle = 0.8 * sin(iTime * 1.6);
    vec2 bob = pivot + 1.0 * vec2(sin(angle), -cos(angle));

    vec2 p = uv * 4.0 + vec2(sin(angle) * 0.6, 0.0);
    float d = voronoi(p);

    vec3 cellColor = palette(d * 1.5, vec3(0.25,0.2,0.3), vec3(0.4,0.4,0.4), vec3(1.0,1.0,1.0), vec3(0.1,0.2,0.3));
    float edge = smoothstep(0.0, 0.05, d);
    vec3 col = mix(vec3(0.02,0.02,0.03), cellColor, edge);

    float dBob = length(uv - bob) - 0.09;
    col = mix(col, vec3(1.0,0.4,0.2), 1.0 - smoothstep(0.0, 0.02, dBob));

    fragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
