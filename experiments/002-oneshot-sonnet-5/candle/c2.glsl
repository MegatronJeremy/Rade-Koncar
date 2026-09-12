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

float density(vec3 p, float t) {
    float r = length(p.xz);
    float k = clamp((p.y + 0.5) / 1.1, 0.0, 1.0);
    float w = mix(0.35, 0.02, k);
    float base = 1.0 - smoothstep(w * 0.7, w * 1.2, r);
    base *= smoothstep(-0.6, -0.4, p.y) * smoothstep(0.65, 0.3, p.y);
    float n = noise(p.xz * 4.0 + vec2(0.0, -t * 3.0));
    n += 0.5 * noise(p.xz * 8.0 + vec2(t * 2.0, -t * 5.0));
    return max(base * (0.4 + 0.8 * n) - 0.1, 0.0);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
    float t = iTime;
    vec3 ro = vec3(0.0, 0.0, -2.0);
    vec3 rd = normalize(vec3(uv, 1.4));
    vec3 col = vec3(0.0);
    float transmittance = 1.0;
    float zpos = 0.0;
    for (int i = 0; i < 40; i++) {
        vec3 p = ro + rd * zpos;
        float dens = density(p - vec3(0.0, 0.15, 0.0), t);
        vec3 hot = vec3(1.0, 0.85, 0.4);
        vec3 outerc = vec3(0.9, 0.25, 0.02);
        vec3 c = mix(outerc, hot, clamp(dens * 1.5, 0.0, 1.0));
        col += transmittance * dens * c * 0.15;
        transmittance *= exp(-dens * 0.3);
        zpos += 0.06;
        if (transmittance < 0.01) break;
    }
    col = clamp(col, 0.0, 1.0);
    fragColor = vec4(col, 1.0);
}
