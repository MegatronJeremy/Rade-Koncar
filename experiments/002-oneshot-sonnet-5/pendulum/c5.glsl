float sdSegment(vec2 p, vec2 a, vec2 b) {
    vec2 pa = p - a, ba = b - a;
    float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
    return length(pa - ba * h);
}

vec3 palette(float t, vec3 a, vec3 b, vec3 c, vec3 d) {
    return a + b * cos(6.28318 * (c * t + d));
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
    vec2 pivot = vec2(0.0, 0.65);
    float amp = 0.85;
    float len = 0.95;

    vec3 col = vec3(0.015, 0.015, 0.02);

    const int N = 24;
    for (int i = 0; i < N; i++) {
        float dt = float(i) * 0.02;
        float t = iTime - dt;
        float angle = amp * sin(t * 1.8);
        vec2 bob = pivot + len * vec2(sin(angle), -cos(angle));
        float dRod = sdSegment(uv, pivot, bob);
        float dBob = length(uv - bob) - 0.09;
        float fade = exp(-dt * 6.0);
        vec3 c = palette(float(i) / float(N), vec3(0.5,0.4,0.6), vec3(0.4,0.4,0.3), vec3(1.0,0.8,0.6), vec3(0.0,0.2,0.4));
        float glow = fade * (0.015 / (dBob * dBob * 40.0 + 0.02) + 0.3 * (1.0 - smoothstep(0.0, 0.02, dRod)));
        col += glow * c * 0.25;
    }

    fragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
