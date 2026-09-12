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
    uv.y += 0.25;
    float t = iTime;
    float ang = atan(uv.x, uv.y);
    float rad = length(uv);
    vec3 col = vec3(0.0);
    const int LAYERS = 5;
    for (int i = 0; i < LAYERS; i++) {
        float fi = float(i);
        float petalFreq = 3.0 + fi;
        float wob = noise(vec2(fi * 10.0, t * 2.0 + fi)) * 0.6;
        float petal = 0.15 + 0.05 * sin(ang * petalFreq + t * 3.0 + fi * 2.0) + wob * 0.05;
        float ring = smoothstep(petal, petal - 0.06, rad * (1.0 + 0.3 * fi));
        float fadeTop = smoothstep(0.9, 0.1, rad);
        vec3 c = mix(vec3(1.0, 0.55, 0.05), vec3(1.0, 0.9, 0.5), fi / float(LAYERS));
        col += c * ring * fadeTop * (0.6 / (fi + 1.0));
    }
    float vig = smoothstep(1.0, 0.1, length(uv));
    col *= vig;
    fragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}