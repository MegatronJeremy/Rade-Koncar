float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
}

vec3 palette(float t, vec3 a, vec3 b, vec3 c, vec3 d) {
    return a + b * cos(6.28318 * (c * t + d));
}

vec3 bokehBG(vec2 uv, float t) {
    vec3 col = vec3(0.02, 0.02, 0.05);
    for (int i = 0; i < 14; i++) {
        float fi = float(i);
        vec2 c = vec2(hash21(vec2(fi, 1.7)) * 2.0 - 1.0, hash21(vec2(fi, 3.3)) * 2.0 - 1.0);
        c.x *= 1.7;
        c.y *= 1.1;
        c += 0.03 * vec2(sin(t * 0.1 + fi), cos(t * 0.08 + fi * 1.3));
        float r = 0.03 + 0.09 * hash21(vec2(fi, 5.1));
        float d = length(uv - c);
        float glow = r * r / (d * d + 0.0008);
        vec3 tint = palette(hash21(vec2(fi, 7.2)), vec3(0.55, 0.5, 0.45), vec3(0.4, 0.35, 0.3), vec3(1.0, 1.0, 1.0), vec3(0.0, 0.15, 0.35));
        col += tint * glow * 0.05;
    }
    return clamp(col, 0.0, 1.2);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
    vec2 warp = vec2(0.0);
    float dropAcc = 0.0;

    for (int layer = 0; layer < 3; layer++) {
        float fl = float(layer);
        vec2 guv = uv * (5.0 + fl * 2.0);
        guv.y += iTime * (0.4 + fl * 0.25) + fl * 10.0;
        vec2 id = floor(guv);
        vec2 lf = fract(guv) - 0.5;
        vec2 rnd = vec2(hash21(id + fl), hash21(id + fl + 5.0));
        vec2 offset = (rnd - 0.5) * 0.6;
        float size = 0.18 + 0.15 * hash21(id + fl + 9.0);
        float d = length(lf - offset) / size;
        float mask = smoothstep(1.0, 0.6, d);
        warp += (lf - offset) * mask * 0.35;
        dropAcc = max(dropAcc, mask);
    }

    vec2 sampleUV = uv + warp * 0.4;
    vec3 col = bokehBG(sampleUV, iTime);
    col = mix(col, col * 1.4 + 0.05, dropAcc);
    float spec = pow(dropAcc, 4.0);
    col += vec3(spec) * 0.3;
    col *= 1.0 - 0.15 * length(uv);
    fragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
