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

vec3 bokehLight(vec2 uv, vec2 pos, float radius, vec3 col) {
    vec2 delta = uv - pos;
    float dist = length(delta);
    // core glow
    float core = exp(-dist * dist / max(radius * radius * 0.05, 1e-5));
    // defocus ring (characteristic bokeh hexagonal edge) - approximated with gaussian ring
    float ring = exp(-pow(dist - radius * 0.7, 2.0) / max(radius * radius * 0.02, 1e-5));
    // polar angle modulation for lens aperture artifact
    float angle = atan(delta.y, delta.x);
    float aperture = 0.8 + 0.2 * cos(angle * 6.0); // hexagonal aperture
    return col * (core * 0.6 + ring * aperture * 0.5);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;
    float aspect = iResolution.x / iResolution.y;
    vec2 uvA = vec2(uv.x * aspect, uv.y);

    // scatter bokeh lights
    vec3 bg = vec3(0.0, 0.02, 0.07) * (1.0 - uv.y * 0.6);
    for (int i = 0; i < 18; i++) {
        float fi = float(i);
        vec2 seed = vec2(fi * 3.71, fi * 7.13);
        vec2 pos = vec2(hash21(seed) * aspect, hash21(seed + 1.0) * 0.85 + 0.05);
        float r = 0.05 + hash21(seed + 2.0) * 0.12;
        float hue = hash21(seed + 3.0);
        // warm orange/yellow or cool blue/white
        vec3 lc = mix(vec3(1.0, 0.55, 0.1), vec3(0.5, 0.75, 1.0), hue);
        float bright = 0.4 + hash21(seed + 4.0) * 0.6;
        // slow flicker
        bright *= 0.9 + 0.1 * sin(iTime * (1.0 + hash21(seed + 5.0) * 3.0) + fi);
        bg += bokehLight(uvA, pos, r, lc * bright);
    }
    bg = clamp(bg, 0.0, 1.0);

    // falling rain drops: use noise to simulate streaks
    float rain = 0.0;
    for (int j = 0; j < 3; j++) {
        float fj = float(j);
        float scale = 25.0 + fj * 15.0;
        float speed = 1.5 + fj * 0.8;
        float n = noise(uv * vec2(scale, scale * 0.15) + vec2(fj * 5.3, iTime * speed));
        rain += pow(n, 8.0) * (0.6 - fj * 0.15);
    }
    rain = clamp(rain, 0.0, 1.0);

    vec3 rainTint = vec3(0.3, 0.42, 0.65) + bg * 0.5;
    vec3 col = mix(bg, rainTint, rain);
    fragColor = vec4(col, 1.0);
}