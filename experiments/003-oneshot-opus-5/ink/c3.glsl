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

    float t = iTime * 0.2;
    float r = length(uv);
    float a = atan(uv.y, uv.x);

    // polar noise to perturb radius
    float angularNoise = noise(vec2(a * 2.5, t * 0.8)) * 0.5
                       + noise(vec2(a * 5.0 + 1.3, t * 1.2)) * 0.25;

    // three concentric expanding rings of ink
    float ink = 0.0;
    for (int k = 0; k < 3; k++) {
        float kf = float(k);
        float phase = kf * 0.18 + 0.05;
        float front = clamp(t - phase, 0.0, 0.5) * 0.55;
        float rPerturbed = r - angularNoise * 0.04 * (1.0 + kf);
        float ring = 1.0 - smoothstep(front - 0.01, front + 0.025, rPerturbed);
        // hollow out inner rings so only the outermost edge bleeds
        float hole = smoothstep(front * 0.4 - 0.02, front * 0.4 + 0.02, rPerturbed);
        ink = max(ink, ring * mix(1.0, 0.15, hole) * (1.0 - kf * 0.25));
    }

    // dense core
    float core = 1.0 - smoothstep(0.0, 0.04 + t * 0.05, r);
    ink = max(ink, core);
    ink = clamp(ink, 0.0, 1.0);

    vec3 col = mix(vec3(1.0), vec3(0.03, 0.03, 0.06), ink);
    fragColor = vec4(col, 1.0);
}
