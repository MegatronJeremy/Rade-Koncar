float hash11(float n) {
    return fract(sin(n) * 43758.5453123);
}

float lineDist(vec2 p, vec2 a, vec2 b) {
    vec2 pa = p - a;
    vec2 ba = b - a;
    float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-5), 0.0, 1.0);
    return length(pa - ba * h);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;

    float d = 10.0;
    const int NUM = 10;
    for (int i = 0; i < NUM; i++) {
        float fi = float(i);
        float ang = fi * 2.399963 + hash11(fi) * 1.5;
        float len = 0.35 + 0.25 * hash11(fi + 50.0);
        vec2 dir = vec2(cos(ang), sin(ang));
        vec2 a = vec2(0.0);
        vec2 b = dir * len;
        vec2 perp = vec2(-dir.y, dir.x);
        vec2 mid = mix(a, b, 0.5) + perp * (hash11(fi + 100.0) - 0.5) * 0.15;
        float d1 = lineDist(uv, a, mid);
        float d2 = lineDist(uv, mid, b);
        d = min(d, min(d1, d2));
    }

    float pulse = 0.5 + 0.5 * sin(iTime * 1.2);
    float glowWidth = mix(0.008, 0.03, pulse);
    float crack = exp(-d * d / (glowWidth * glowWidth) * 8.0);

    float r = length(uv);
    float crustNoise = fract(sin(dot(floor(uv * 40.0), vec2(12.9898, 78.233))) * 43758.5453);
    vec3 crustCol = mix(vec3(0.06, 0.045, 0.04), vec3(0.12, 0.09, 0.08), crustNoise) * (1.0 - 0.3 * r);

    vec3 hotCol = mix(vec3(1.0, 0.55, 0.05), vec3(1.0, 0.9, 0.5), pulse * 0.4);
    vec3 col = crustCol + hotCol * crack;

    fragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
