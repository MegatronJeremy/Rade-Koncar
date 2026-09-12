float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
}

vec3 palette(float t, vec3 a, vec3 b, vec3 c, vec3 d) {
    return a + b * cos(6.28318 * (c * t + d));
}

vec3 bokehPolar(vec2 uv, float t) {
    vec3 col = vec3(0.02, 0.02, 0.05);
    for (int i = 0; i < 10; i++) {
        float fi = float(i);
        float ring = 0.25 + 0.55 * hash21(vec2(fi, 2.0));
        float ang = 6.2831 * hash21(vec2(fi, 9.0)) + t * 0.04 * hash21(vec2(fi, 3.0));
        vec2 c = ring * vec2(cos(ang), sin(ang));
        c.x *= 1.6;
        float r = 0.04 + 0.08 * hash21(vec2(fi, 4.0));
        float d = length(uv - c);
        float glow = r * r / (d * d + 0.001);
        vec3 tint = palette(hash21(vec2(fi, 6.0)), vec3(0.55, 0.5, 0.45), vec3(0.4, 0.4, 0.3), vec3(1.0), vec3(0.1, 0.2, 0.3));
        col += tint * glow * 0.04;
    }
    return col;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
    float r = length(uv);
    float a = atan(uv.y, uv.x);
    float ripple = sin(r * 20.0 - iTime * 3.0) * 0.002 * smoothstep(0.6, 0.0, r);
    vec2 dir = uv / (r + 0.0001);
    vec2 duv = uv + dir * ripple;
    vec3 col = bokehPolar(duv, iTime);
    float streaks = fract(a * 8.0 / 6.2831 + iTime * 0.3 + r * 2.0);
    float line = smoothstep(0.0, 0.03, streaks) * smoothstep(0.09, 0.06, streaks);
    col += line * 0.08 * smoothstep(1.0, 0.2, r);
    fragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
