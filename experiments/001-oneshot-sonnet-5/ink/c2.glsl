float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
}

vec2 hash22(vec2 p) {
    float n1 = hash21(p);
    float n2 = hash21(p + 17.13);
    return vec2(n1, n2);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 p = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
    vec3 paper = vec3(0.97, 0.96, 0.93);
    vec3 inkCol = vec3(0.04, 0.05, 0.08);

    float scale = 4.0;
    vec2 gp = p * scale;
    vec2 ip = floor(gp);
    vec2 fp = fract(gp);

    float minDist = 10.0;
    for (int y = -1; y <= 1; y++) {
        for (int x = -1; x <= 1; x++) {
            vec2 neighbor = vec2(float(x), float(y));
            vec2 cellId = ip + neighbor;
            vec2 rnd = hash22(cellId);
            float drift = iTime * 0.08 * (0.5 + rnd.x);
            vec2 pointPos = neighbor + 0.5 + 0.35 * vec2(sin(drift + rnd.x * 6.28), cos(drift + rnd.y * 6.28));
            float d = length(pointPos - fp);
            minDist = min(minDist, d);
        }
    }

    float radiusGrow = 0.4 + 0.12 * sin(iTime * 0.25);
    float ink = smoothstep(radiusGrow, radiusGrow - 0.35, minDist);
    float centerFade = smoothstep(1.4, 0.1, length(p));
    ink *= centerFade;

    vec3 col = mix(paper, inkCol, clamp(ink, 0.0, 1.0));
    fragColor = vec4(col, 1.0);
}
