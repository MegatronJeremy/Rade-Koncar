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

// Voronoi returning distance and cell id
vec2 voronoi(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    float minDist = 8.0;
    float cellId = 0.0;
    for (int x = -1; x <= 1; x++) {
        for (int y = -1; y <= 1; y++) {
            vec2 n = vec2(float(x), float(y));
            vec2 g = i + n;
            vec2 o = vec2(hash21(g), hash21(g + 31.7));
            vec2 r = n + o - f;
            float d = dot(r, r);
            if (d < minDist) { minDist = d; cellId = hash21(g + 77.0); }
        }
    }
    return vec2(sqrt(minDist), cellId);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;

    // city blocks via voronoi
    vec2 vor = voronoi(uv * vec2(12.0, 8.0));
    float isLight = step(0.55, vor.y); // ~45% of cells lit
    float edgeDark = smoothstep(0.0, 0.1, vor.x); // dark at cell edges = building outlines
    vec3 lightCol = palette(vor.y, vec3(0.5), vec3(0.5), vec3(1.0), vec3(0.0, 0.33, 0.67));
    vec3 cityCol = lightCol * isLight * edgeDark * 0.7;

    // add a bokeh halo on lit cells
    float bokeh = exp(-vor.x * vor.x * 40.0) * isLight;
    cityCol += lightCol * bokeh * 0.5;

    cityCol += vec3(0.0, 0.02, 0.08) * (1.0 - uv.y);
    cityCol = clamp(cityCol, 0.0, 1.0);

    // rain noise overlay: two noise layers scrolling down
    float r1 = noise(uv * vec2(40.0, 5.0) + vec2(0.0, iTime * 3.0));
    float r2 = noise(uv * vec2(30.0, 4.0) + vec2(17.3, iTime * 2.2));
    float rain = pow(r1, 6.0) * 0.6 + pow(r2, 6.0) * 0.4;

    vec3 rainTint = vec3(0.4, 0.5, 0.7);
    vec3 col = mix(cityCol, rainTint, rain * 0.7);
    fragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}