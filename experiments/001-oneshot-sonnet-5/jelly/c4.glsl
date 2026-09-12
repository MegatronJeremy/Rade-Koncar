vec3 palette(float t, vec3 a, vec3 b, vec3 c, vec3 d) {
    return a + b * cos(6.28318 * (c * t + d));
}

float sdEllipsoid(vec3 p, vec3 r) {
    float k0 = length(p / r);
    float k1 = length(p / (r * r)) + 1e-4;
    return k0 * (k0 - 1.0) / k1;
}

float map(vec3 p, float t) {
    float pulse = 0.5 + 0.5 * sin(t * 1.8);
    vec3 r = vec3(0.9, mix(0.55, 0.75, pulse), 0.9);
    return sdEllipsoid(p, r);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
    vec3 ro = vec3(0.0, 0.3, -3.0);
    vec3 rd = normalize(vec3(uv, 1.3));

    vec3 col = mix(vec3(0.0, 0.01, 0.03), vec3(0.0, 0.03, 0.08), clamp(uv.y * 0.5 + 0.5, 0.0, 1.0));

    float t = 0.0;
    float glow = 0.0;
    for (int i = 0; i < 48; i++) {
        vec3 p = ro + rd * t;
        float d = map(p, iTime);
        float density = exp(-abs(d) * 6.0) * 0.06;
        glow += density;
        t += max(d * 0.5, 0.03);
        if (t > 8.0) break;
    }

    vec3 glowCol = palette(glow * 2.0 + iTime * 0.1, vec3(0.0, 0.3, 0.4), vec3(0.2, 0.4, 0.5), vec3(1.0, 0.9, 1.0), vec3(0.3, 0.5, 0.7));
    col += glowCol * glow;

    fragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
