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

// thin capillary strand: distance to an angular-radial curve
float strand(vec2 uv, float angleOffset, float t) {
    float r = length(uv);
    float a = atan(uv.y, uv.x) - angleOffset;
    // strand travels radially, wiggles in angle over time
    float maxR = clamp(t * 0.55, 0.0, 0.52);
    float reach = smoothstep(maxR, maxR - 0.05, r); // only exists inside front
    // wobble
    float wobble = 0.18 * noise(vec2(r * 8.0, t * 1.5 + angleOffset));
    float aDist = abs(mod(a + 3.14159, 6.28318) - 3.14159) - wobble;
    float strandWidth = 0.025 * (1.0 - r / 0.55);
    return reach * (1.0 - smoothstep(0.0, strandWidth, aDist));
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
    float t = iTime * 0.18;

    // solid core
    float r = length(uv);
    float core = 1.0 - smoothstep(0.0, 0.06 + t * 0.08, r);

    // 8 capillary strands at irregular angles
    float branches = 0.0;
    for (int k = 0; k < 8; k++) {
        float kf = float(k);
        float base = kf * 0.7854; // ~pi/4
        float jitter = (hash21(vec2(kf, 17.3)) - 0.5) * 0.6;
        branches = max(branches, strand(uv, base + jitter, t));
    }

    // diffuse halo at the front
    float spread = clamp(t * 0.55, 0.0, 0.52);
    float halo = (1.0 - smoothstep(spread - 0.04, spread + 0.01, r))
               * noise(uv * 12.0 + vec2(t)) * 0.35;

    float ink = clamp(core + branches + halo, 0.0, 1.0);
    vec3 col = mix(vec3(1.0), vec3(0.03, 0.03, 0.06), ink);
    fragColor = vec4(col, 1.0);
}
