float sdSegment(vec2 p, vec2 a, vec2 b) {
    vec2 pa = p - a, ba = b - a;
    float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
    return length(pa - ba * h);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
    vec2 pivot = vec2(0.0, 0.6);
    vec2 rel = uv - pivot;
    float r = length(rel);
    float ang = atan(rel.x, -rel.y);

    float amp = 0.9;
    float len = 0.9;
    float angle = amp * sin(iTime * 1.8);

    vec3 col = vec3(0.02, 0.02, 0.04);
    float rings = sin(r * 40.0 - iTime * 2.0) * 0.5 + 0.5;
    col += 0.04 * rings * vec3(0.2, 0.3, 0.5);

    const int N = 10;
    for (int i = 0; i < N; i++) {
        float t = iTime - float(i) * 0.035;
        float ga = amp * sin(t * 1.8);
        float gd = abs(ang - ga);
        gd = min(gd, 6.2831853 - gd);
        float m = smoothstep(0.04, 0.0, gd) * smoothstep(len + 0.06, len - 0.03, r) * smoothstep(0.08, 0.14, r);
        float fade = 1.0 - float(i) / float(N);
        vec3 c = (i == 0) ? vec3(0.4, 0.7, 1.0) : vec3(1.0, 0.5, 0.2);
        col += m * fade * fade * 0.5 * c;
    }

    vec2 bob = pivot + len * vec2(sin(angle), -cos(angle));
    float dRod = sdSegment(uv, pivot, bob);
    float dBob = length(uv - bob) - 0.08;
    col = mix(col, vec3(0.9), 1.0 - smoothstep(0.0, 0.012, dRod));
    col = mix(col, vec3(1.0, 0.3, 0.25), 1.0 - smoothstep(0.0, 0.02, dBob));

    fragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
