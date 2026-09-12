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

vec3 palette(float t, vec3 a, vec3 b, vec3 c, vec3 d) {
    return a + b * cos(6.28318*(c*t+d));
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.y * 11.0;
    float breathe = 1.0 + 0.075*sin(iTime*0.9);
    vec2 buv = uv * breathe;

    // Horizontal yarn: sinusoidal centerline perturbed by low-freq noise
    float hPert = noise(vec2(buv.y*0.28, iTime*0.35))*1.6;
    float hWave = sin(buv.y*6.28318 + hPert);
    float hYarn = smoothstep(0.62, 0.82, abs(hWave));

    // Vertical yarn: same idea, rotated
    float vPert = noise(vec2(buv.x*0.28, iTime*0.35 + 5.0))*1.6;
    float vWave = sin(buv.x*6.28318 + vPert);
    float vYarn = smoothstep(0.62, 0.82, abs(vWave));

    // Over-under: which yarn sits on top at each grid crossing
    float cellX = mod(floor(buv.x), 2.0);
    float cellY = mod(floor(buv.y), 2.0);
    float onTop = mod(cellX + cellY, 2.0);  // 0=horizontal on top, 1=vertical

    float hFront = hYarn * (1.0 - onTop*0.72);
    float vFront = vYarn * (onTop*0.72 + 0.28);

    vec3 colH = palette(buv.y*0.07 + iTime*0.04,
        vec3(0.62, 0.46, 0.34), vec3(0.14,0.09,0.07),
        vec3(1,1,1), vec3(0.0,0.1,0.2));
    vec3 colV = palette(buv.x*0.07 + iTime*0.04 + 0.35,
        vec3(0.44, 0.34, 0.56), vec3(0.11,0.07,0.14),
        vec3(1,1,1), vec3(0.3,0.0,0.1));

    float wH = hFront, wV = vFront;
    float tot = wH + wV + 0.001;
    vec3 col = (colH*wH + colV*wV) / tot;
    col *= 0.72 + 0.30*max(wH, wV);

    // Fuzz
    col += noise(uv*4.5 + iTime*0.18)*0.045;
    col = clamp(col, 0.0, 1.0);
    fragColor = vec4(col, 1.0);
}