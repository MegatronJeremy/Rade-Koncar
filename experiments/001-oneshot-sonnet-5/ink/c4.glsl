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

float noise3(vec3 p) {
    vec2 xy = p.xy + vec2(37.2, 17.7) * p.z;
    return noise(xy);
}

float fbm3(vec3 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 4; i++) {
        v += a * noise3(p);
        p *= 2.02;
        a *= 0.5;
    }
    return v;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 p = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
    vec3 paper = vec3(0.97, 0.96, 0.93);
    vec3 inkCol = vec3(0.03, 0.04, 0.07);

    float tt = iTime * 0.3;
    vec3 dropCenter = vec3(0.0, 0.5 - tt * 0.25, 0.0);
    float dropRadius = 0.12 + sqrt(iTime * 0.3) * 0.28;

    float accum = 0.0;
    const int STEPS = 24;
    float zStart = -0.9;
    float zEnd = 0.9;
    float dz = (zEnd - zStart) / float(STEPS);
    for (int i = 0; i < STEPS; i++) {
        float z = zStart + dz * float(i);
        vec3 q = vec3(p, z);
        float dist = length(q - dropCenter) - dropRadius;
        float turbulence = fbm3(q * 3.0 + vec3(0.0, tt * 0.6, 0.0)) - 0.5;
        float density = smoothstep(0.35, -0.15, dist + turbulence * 0.3);
        accum += density * dz * 2.2;
    }
    accum = clamp(accum, 0.0, 1.0);

    vec3 col = mix(paper, inkCol, accum);
    fragColor = vec4(col, 1.0);
}
