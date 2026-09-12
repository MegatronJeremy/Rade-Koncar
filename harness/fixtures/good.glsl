float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
               mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}

float fbm(vec2 p) {
    float a = 0.5;
    float s = 0.0;
    for (int i = 0; i < 5; i++) {
        s += a * noise(p);
        p *= 2.02;
        a *= 0.5;
    }
    return s;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;

    float warp = fbm(uv * 2.0 + vec2(0.0, iTime * 0.35));
    float bands = fbm(uv * 3.5 + warp * 1.5 + vec2(iTime * 0.6, -iTime * 0.2));

    float ring = sin(length(uv) * 12.0 - iTime * 2.0 + bands * 4.0) * 0.5 + 0.5;

    vec3 cold = vec3(0.05, 0.12, 0.30);
    vec3 warm = vec3(0.95, 0.55, 0.15);
    vec3 col = mix(cold, warm, clamp(bands * 1.4 - 0.1, 0.0, 1.0));
    col += ring * 0.35 * vec3(0.8, 0.9, 1.0);
    col *= 1.0 - 0.6 * length(uv);

    fragColor = vec4(col, 1.0);
}
