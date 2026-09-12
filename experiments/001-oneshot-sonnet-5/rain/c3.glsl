float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
}

vec2 hash2(vec2 p) {
    return vec2(hash21(p), hash21(p + vec2(17.0, 31.0)));
}

vec3 palette(float t, vec3 a, vec3 b, vec3 c, vec3 d) {
    return a + b * cos(6.28318 * (c * t + d));
}

float voronoi(vec2 p, float t, out vec2 cellCenter) {
    vec2 ip = floor(p);
    vec2 fp = fract(p);
    float minD = 8.0;
    vec2 minPoint = vec2(0.0);
    for (int y = -1; y <= 1; y++) {
        for (int x = -1; x <= 1; x++) {
            vec2 neighbor = vec2(float(x), float(y));
            vec2 pt = hash2(ip + neighbor);
            pt = 0.5 + 0.5 * sin(t * 0.4 + 6.2831 * pt);
            vec2 diff = neighbor + pt - fp;
            float d = length(diff);
            if (d < minD) {
                minD = d;
                minPoint = ip + neighbor + pt;
            }
        }
    }
    cellCenter = minPoint;
    return minD;
}

vec3 bokehBG(vec2 uv) {
    vec3 col = vec3(0.02, 0.02, 0.05);
    for (int i = 0; i < 12; i++) {
        float fi = float(i);
        vec2 c = vec2(hash21(vec2(fi, 1.5)) * 2.0 - 1.0, hash21(vec2(fi, 2.5)) * 2.0 - 1.0);
        c.x *= 1.6;
        float r = 0.04 + 0.08 * hash21(vec2(fi, 3.5));
        float d = length(uv - c);
        float glow = r * r / (d * d + 0.001);
        vec3 tint = palette(hash21(vec2(fi, 4.5)), vec3(0.55, 0.5, 0.45), vec3(0.4, 0.35, 0.3), vec3(1.0), vec3(0.05, 0.2, 0.4));
        col += tint * glow * 0.045;
    }
    return col;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
    vec2 guv = uv * 5.0;
    guv.y += iTime * 0.6;
    vec2 cellCenter;
    float d = voronoi(guv, iTime, cellCenter);
    float mask = smoothstep(0.5, 0.1, d);
    vec2 refr = (guv - cellCenter) * mask;
    vec3 col = bokehBG(uv + refr * 0.15);
    col += mask * 0.25 * vec3(0.9, 0.95, 1.0);
    fragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
