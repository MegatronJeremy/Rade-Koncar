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

    // drop hits at t=0, spreads slowly
    float t = iTime * 0.18;
    float radius = t * 0.55;
    float dist = length(uv);

    // perturb boundary with noise so it looks fibrous
    float angle = atan(uv.y, uv.x);
    float boundary = radius + 0.04 * noise(vec2(angle * 3.0, t * 4.0));

    // ink density: full inside, feathered edge
    float ink = 1.0 - smoothstep(boundary - 0.015, boundary + 0.03, dist);

    // secondary wispy tendrils
    float tendrils = noise(uv * 14.0 + vec2(0.0, t * 0.5));
    float tendrilMask = smoothstep(boundary + 0.04, boundary - 0.01, dist) *
                        smoothstep(0.0, boundary * 0.7, dist);
    ink = max(ink, tendrils * tendrilMask * 0.6);

    ink = clamp(ink, 0.0, 1.0);
    vec3 col = mix(vec3(1.0), vec3(0.04, 0.04, 0.07), ink);
    fragColor = vec4(col, 1.0);
}
