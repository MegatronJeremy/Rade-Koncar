float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
}

float noise(vec2 p) {
    vec2 i = floor(p); vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash21(i), b = hash21(i+vec2(1,0)),
          c = hash21(i+vec2(0,1)), d = hash21(i+vec2(1,1));
    return mix(mix(a,b,f.x), mix(c,d,f.x), f.y);
}

float fbm(vec2 p) {
    float v = 0.0, a = 0.5;
    for (int i = 0; i < 5; i++) { v += a*noise(p); p *= 2.0; a *= 0.5; }
    return v;
}

vec3 palette(float t, vec3 a, vec3 b, vec3 c, vec3 d) {
    return a + b * cos(6.28318*(c*t+d));
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.y * 4.5;
    float lung = 0.09*sin(iTime*0.85);

    // Two-level warp: first warp, then warp the warped coords again
    vec2 q = vec2(fbm(uv + vec2(1.3, 0.7) + lung),
                  fbm(uv + vec2(8.2, 3.4) - lung));
    vec2 r = vec2(fbm(uv + 1.8*q + vec2(1.7, 9.2) + 0.15*iTime),
                  fbm(uv + 1.8*q + vec2(8.3, 2.8) - 0.15*iTime));
    float f = fbm(uv + 2.2*r);

    // Fiber streaks along dominant axis
    float streak = fbm(uv * vec2(0.5, 5.0) + vec2(0.0, iTime*0.12));
    f = mix(f, streak, 0.25);

    vec3 col = palette(f + 0.05*sin(iTime*0.6),
        vec3(0.72, 0.56, 0.40),
        vec3(0.22, 0.16, 0.10),
        vec3(1.0, 1.0, 1.0),
        vec3(0.05, 0.15, 0.25));
    col = clamp(col, 0.0, 1.0);
    fragColor = vec4(col, 1.0);
}