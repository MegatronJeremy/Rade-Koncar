float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
}

vec2 hash22(vec2 p) {
    return vec2(hash21(p), hash21(p + vec2(73.1, 21.9)));
}

vec3 palette(float t, vec3 a, vec3 b, vec3 c, vec3 d) {
    return a + b * cos(6.28318*(c*t+d));
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.y;
    float breathe = 1.0 + 0.055*sin(iTime*1.05);
    uv *= 9.0 * breathe;

    vec2 gi = floor(uv), gf = fract(uv);
    float d1 = 9.0, d2 = 9.0;
    vec2 minId = vec2(0.0);
    float minD1 = 9.0;

    for (int y = -1; y <= 1; y++) {
        for (int x = -1; x <= 1; x++) {
            vec2 nb = vec2(float(x), float(y));
            vec2 cid = gi + nb;
            vec2 rp = hash22(cid);
            rp = 0.5 + 0.42*sin(iTime*0.45 + 6.28318*rp);
            float dist = length(nb + rp - gf);
            if (dist < d1) { d2 = d1; d1 = dist; minId = cid; }
            else if (dist < d2) { d2 = dist; }
        }
    }

    float edge = d2 - d1;
    float rnd = hash21(minId);

    // Yarn cross-section: bright highlight at center, darker at edge (twist shading)
    float highlight = 1.0 - smoothstep(0.0, 0.28, d1);
    highlight = pow(highlight, 1.6);
    float groove = smoothstep(0.03, 0.10, edge);

    vec3 yarnCol = palette(rnd,
        vec3(0.60, 0.42, 0.52),
        vec3(0.18, 0.12, 0.10),
        vec3(1.0, 1.0, 1.0),
        vec3(rnd, rnd*0.4, 0.3));
    yarnCol = yarnCol*(0.45 + 0.65*highlight) * (groove*0.65 + 0.35);
    yarnCol = clamp(yarnCol, 0.0, 1.0);
    fragColor = vec4(yarnCol, 1.0);
}