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

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
    float r = length(uv);
    float ang = atan(uv.y, uv.x);

    float t = iTime;
    float coolFront = 0.15 + 0.25 * (0.5 + 0.5 * sin(t * 0.3));

    float angNoise = noise(vec2(ang * 3.0, t * 0.2)) * 0.15;
    float radNoise = noise(vec2(r * 8.0, ang * 2.0 + t * 0.1));

    float crackPattern = sin(ang * 14.0 + angNoise * 10.0 + r * 6.0) * 0.5 + 0.5;
    float crack = smoothstep(0.85, 0.98, crackPattern) * smoothstep(0.0, 0.7, r);

    float crustEdge = smoothstep(coolFront - 0.05, coolFront + 0.05, r + radNoise * 0.1 - 0.1);

    vec3 hotCol = mix(vec3(1.0, 0.95, 0.6), vec3(1.0, 0.4, 0.05), smoothstep(0.0, 0.5, r));
    vec3 crustCol = vec3(0.04, 0.035, 0.04) * (0.7 + 0.3 * radNoise);

    vec3 col = mix(hotCol, crustCol, crustEdge);
    col += vec3(1.0, 0.3, 0.02) * crack * (1.0 - crustEdge * 0.5);

    fragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
