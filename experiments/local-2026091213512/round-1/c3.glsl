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
    return noise(p.xy + p.z * 37.2);
}

float density(vec3 p, float t) {
    float height = p.y + 0.4;
    float radius = length(p.xz);
    float taper = 0.25 * (1.0 - clamp(height, 0.0, 1.0)) + 0.02;
    float shape = smoothstep(taper, taper * 0.3, radius) * smoothstep(-0.05, 0.05, height) * smoothstep(1.0, 0.3, height);
    float n = noise3(p * 3.0 + vec3(0.0, -t * 2.0, t * 1.3));
    return shape * (0.5 + 0.5 * n);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
    vec3 ro = vec3(0.0, 0.0, -1.6);
    vec3 rd = normalize(vec3(uv, 1.0));
    float t = iTime;
    vec3 col = vec3(0.0);
    float transmittance = 1.0;
    const int STEPS = 40;
    float dt = 0.06;
    vec3 p = ro;
    for (int i = 0; i < STEPS; i++) {
        p += rd * dt;
        float dens = density(p, t);
        vec3 c = mix(vec3(0.4, 0.05, 0.0), vec3(1.0, 0.7, 0.2), dens);
        col += transmittance * dens * c * dt * 6.0;
        transmittance *= exp(-dens * dt * 3.0);
        if (transmittance < 0.02) break;
    }
    fragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}