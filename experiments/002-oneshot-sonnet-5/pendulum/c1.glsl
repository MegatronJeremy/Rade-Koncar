float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
}

float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash21(i);
    float b = hash21(i + vec2(1.0, 0.0));
    float c = hash21(i + vec2(0.0, 1.0));
    float d = hash21(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 5; i++) {
        v += a * noise(p);
        p *= 2.0;
        a *= 0.5;
    }
    return v;
}

vec3 palette(float t, vec3 a, vec3 b, vec3 c, vec3 d) {
    return a + b * cos(6.28318 * (c * t + d));
}

float sdSegment(vec2 p, vec2 a, vec2 b) {
    vec2 pa = p - a, ba = b - a;
    float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
    return length(pa - ba * h);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
    float angle = 0.8 * sin(iTime * 1.6);
    vec2 pivot = vec2(0.0, 0.7);
    float len = 1.0;
    vec2 bob = pivot + len * vec2(sin(angle), -cos(angle));

    float s = sin(angle);
    float c = cos(angle);
    mat2 rot = mat2(c, -s, s, c);
    vec2 wp = rot * (uv - pivot);
    wp += 0.3 * vec2(fbm(wp * 2.0 + iTime * 0.2), fbm(wp * 2.0 - iTime * 0.15));
    float n = fbm(wp * 3.0 + iTime * 0.1);

    vec3 col = palette(n, vec3(0.3,0.3,0.4), vec3(0.4,0.4,0.3), vec3(1.0,1.0,0.7), vec3(0.0,0.15,0.25));

    float dRod = sdSegment(uv, pivot, bob);
    float dBob = length(uv - bob) - 0.1;
    col = mix(col, vec3(1.0), 1.0 - smoothstep(0.0, 0.015, dRod));
    col = mix(col, vec3(0.05,0.05,0.08), 1.0 - smoothstep(0.0, 0.02, dBob));

    fragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
