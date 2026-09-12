float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
}

vec2 hash22(vec2 p) {
    float n = hash21(p);
    float m = hash21(p + 17.13);
    return vec2(n, m);
}

float voronoi(vec2 p) {
    vec2 ip = floor(p);
    vec2 fp = fract(p);
    float minDist = 8.0;
    for (int y = -1; y <= 1; y++) {
        for (int x = -1; x <= 1; x++) {
            vec2 offset = vec2(float(x), float(y));
            vec2 pt = hash22(ip + offset);
            vec2 diff = offset + pt - fp;
            float d = length(diff);
            minDist = min(minDist, d);
        }
    }
    return minDist;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;

    float floorY = -0.3;
    float period = 1.0;
    float tt = fract(iTime / period);
    float h = 4.0 * tt * (1.0 - tt);
    float radius = 0.15;
    vec2 center = vec2(0.0, floorY + radius + h * 0.5);

    float v = voronoi(uv * 6.0);
    vec3 tileCol = mix(vec3(0.9), vec3(1.0), smoothstep(0.0, 0.4, v));
    float grout = smoothstep(0.03, 0.06, v);
    tileCol *= mix(0.7, 1.0, grout);

    float floorMask = smoothstep(0.02, -0.02, uv.y - floorY);
    vec3 col = mix(vec3(0.7, 0.75, 0.8), tileCol, floorMask);

    float distToCenter = length(uv - vec2(center.x, floorY));
    float shadow = smoothstep(0.35, 0.0, distToCenter) * (1.0 - 0.5 * h);
    col = mix(col, col * 0.65, shadow * floorMask);

    float dBall = length(uv - center) - radius;
    float ballMask = smoothstep(0.01, -0.01, dBall);
    vec2 n2 = (uv - center) / radius;
    float nz = sqrt(max(1.0 - dot(n2, n2), 0.0));
    vec3 normal = normalize(vec3(n2, nz));
    float diff = max(dot(normal, normalize(vec3(0.5, 0.7, 0.6))), 0.0);
    vec3 red = vec3(0.85, 0.1, 0.08) * (0.4 + 0.6 * diff);
    col = mix(col, red, ballMask);

    col = clamp(col, 0.0, 1.0);
    fragColor = vec4(col, 1.0);
}
