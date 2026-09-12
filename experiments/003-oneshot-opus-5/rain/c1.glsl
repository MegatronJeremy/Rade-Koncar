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

float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 5; i++) {
        v += a * noise(p);
        p *= 2.0;
        a *= 0.5;
    }
    return v;
}

vec3 cityLayer(vec2 uv) {
    vec3 col = vec3(0.0);
    for (int ix = 0; ix < 7; ix++) {
        for (int iy = 0; iy < 5; iy++) {
            vec2 cell = vec2(float(ix), float(iy));
            float h = hash21(cell * 7.31);
            if (h > 0.45) {
                vec2 center = (cell + vec2(hash21(cell), hash21(cell + 9.1))) / vec2(7.0, 5.0);
                float dist = length(uv - center);
                float r = 0.06 + hash21(cell + 3.3) * 0.09;
                float g = exp(-dist * dist / max(r * r * 0.5, 1e-5));
                float hue = hash21(cell + 5.5);
                vec3 lc = mix(vec3(1.0, 0.5, 0.1), vec3(0.3, 0.6, 1.0), hue);
                col += lc * g * 0.8;
            }
        }
    }
    return col;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;

    // rain rivulets on glass via fbm domain warp
    vec2 warpUV = uv * vec2(6.0, 12.0) + vec2(0.0, iTime * 0.3);
    float wx = fbm(warpUV + vec2(1.7, 9.2)) - 0.5;
    float wy = fbm(warpUV + vec2(8.3, 2.8)) - 0.5;
    // stronger vertical flow
    vec2 warp = vec2(wx * 0.015, wy * 0.04 + 0.02);

    // sample background through distorted UV
    vec2 bgUV = uv + warp;
    vec3 bg = cityLayer(clamp(bgUV, 0.0, 1.0));
    bg += vec3(0.0, 0.03, 0.1) * (1.0 - uv.y);
    bg = clamp(bg, 0.0, 1.0);

    // glass wetness mask (brighter where glass is wet)
    float wetness = fbm(uv * vec2(4.0, 8.0) + vec2(0.0, iTime * 0.15));
    wetness = smoothstep(0.4, 0.7, wetness);
    vec3 glassSheen = vec3(0.25, 0.32, 0.5) * wetness * 0.4;

    vec3 col = bg + glassSheen;
    fragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}