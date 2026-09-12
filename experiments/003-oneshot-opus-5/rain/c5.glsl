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

vec3 palette(float t, vec3 a, vec3 b, vec3 c, vec3 d) {
    return a + b * cos(6.28318 * (c * t + d));
}

// density of rain particles at a point in 3D (collapsed to xz + falling y)
float rainDensity(vec3 p) {
    // periodic falling particles: tile xz finely, check if near a streak
    vec2 cell = floor(p.xz * 8.0);
    float h = hash21(cell * 3.17);
    float fallOffset = h;
    float yPhase = fract(p.y * 0.5 + iTime * (0.8 + h * 0.6) + fallOffset);
    // streak: thin in xz, elongated in y
    vec2 xzOff = fract(p.xz * 8.0) - 0.5;
    float streak = exp(-dot(xzOff, xzOff) * 120.0) * smoothstep(0.12, 0.0, yPhase) * step(0.4, h);
    return streak;
}

// city light at world xz
vec3 cityLight(vec2 xz) {
    vec3 col = vec3(0.0);
    for (int i = 0; i < 10; i++) {
        float fi = float(i);
        vec2 lp = vec2(hash21(vec2(fi, 10.0)) * 4.0 - 2.0, hash21(vec2(fi, 20.0)) * 4.0 - 2.0);
        float d = length(xz - lp);
        float r = 0.3 + hash21(vec2(fi, 30.0)) * 0.5;
        float g = exp(-d * d / max(r * r, 1e-5));
        vec3 lc = mix(vec3(1.0, 0.55, 0.1), vec3(0.4, 0.7, 1.0), hash21(vec2(fi, 40.0)));
        col += lc * g * 0.4;
    }
    return col;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord - iResolution.xy * 0.5) / iResolution.y;

    // simple perspective ray: looking forward along -z
    vec3 ro = vec3(0.0, 2.0, 0.0);
    vec3 rd = normalize(vec3(uv.x, uv.y - 0.1, 1.2));

    // background: city lights on a far plane
    float tFar = 8.0;
    vec2 farXZ = (ro + rd * tFar).xz;
    vec3 bg = cityLight(farXZ);
    bg += vec3(0.0, 0.02, 0.08);
    bg = clamp(bg, 0.0, 1.0);

    // march through rain volume
    vec3 accum = vec3(0.0);
    float alpha = 0.0;
    float tStep = tFar / 40.0;
    for (int s = 0; s < 40; s++) {
        float t = (float(s) + 0.5) * tStep;
        vec3 p = ro + rd * t;
        float dens = rainDensity(p);
        if (dens > 0.001) {
            // rain strand color: reflect nearby city lights faintly
            vec3 rc = vec3(0.5, 0.6, 0.8) + cityLight(p.xz) * 0.3;
            float dt = dens * 0.9 * (1.0 - alpha);
            accum += rc * dt;
            alpha += dt;
            if (alpha > 0.95) break;
        }
    }

    vec3 col = accum + bg * (1.0 - clamp(alpha, 0.0, 1.0));
    fragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}